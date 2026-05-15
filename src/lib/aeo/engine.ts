/**
 * AEO engine (Phase 3, step 3).
 *
 * Orchestrates trigger-based selection of playbook items for an entity.
 * - `rankPlaybookItems` — pure function. Given playbook items + metrics, ranks
 *   them by total fired-trigger weight. Items with no triggers get a small
 *   baseline weight so new entities (no metrics yet) still get suggestions.
 * - `runEngine` — async orchestration: loads metrics + active playbook from
 *   Prisma, calls rank, returns top N with their fired-trigger context.
 *
 * Selection moves from "LLM picks 8 items" to "rules pick the items whose
 * triggers actually fire on this entity's metrics". The LLM call still has
 * a job: personalizing description text for the chosen items (Phase 4 will
 * formalize this split).
 */

import type { AeoPlaybookItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
    evaluateTriggers,
    type EntityMetricsInput,
    type Trigger,
    type TriggerResult,
} from "./triggers";

/** Items with no authored triggers still qualify as candidates, just outranked
 *  by items whose triggers fire. Without this, a freshly-created entity (no
 *  metrics yet) would only ever surface items that match the metric-less
 *  default — which is none of them. */
const BASELINE_WEIGHT_NO_TRIGGERS = 0.5;

/** Soft tiebreaker for items with equal totalWeight: prefer higher impact /
 *  lower effort. */
function tiebreaker(a: AeoPlaybookItem, b: AeoPlaybookItem): number {
    const impactDelta = b.defaultImpact - a.defaultImpact;
    if (impactDelta !== 0) return impactDelta;
    return a.defaultEffort - b.defaultEffort;
}

export interface RankedPlaybookItem {
    item: AeoPlaybookItem;
    totalWeight: number;
    /** True when at least one trigger fired (vs. baseline-only ranking). */
    isTriggered: boolean;
    /** Fired triggers, in evaluation order. Used to persist triggerContext. */
    fired: TriggerResult[];
}

interface RankOptions {
    /** How many items to return. Default 8. */
    topN?: number;
}

/**
 * Pure ranker. Test-friendly: no I/O.
 *
 * 1. Evaluate every active item's triggers against the metrics input.
 * 2. Items with no triggers get the baseline weight.
 * 3. Sort by totalWeight desc, then by impact desc / effort asc.
 * 4. Return top N.
 */
export function rankPlaybookItems(
    items: AeoPlaybookItem[],
    metrics: EntityMetricsInput,
    opts: RankOptions = {},
): RankedPlaybookItem[] {
    const topN = opts.topN ?? 8;

    const ranked: RankedPlaybookItem[] = items.map((item) => {
        const triggers = parseTriggers(item.triggers);
        if (triggers.length === 0) {
            return { item, totalWeight: BASELINE_WEIGHT_NO_TRIGGERS, isTriggered: false, fired: [] };
        }
        const { totalWeight, fired } = evaluateTriggers(triggers, metrics);
        return { item, totalWeight, isTriggered: fired.length > 0, fired };
    });

    ranked.sort((a, b) => {
        const weightDelta = b.totalWeight - a.totalWeight;
        if (weightDelta !== 0) return weightDelta;
        return tiebreaker(a.item, b.item);
    });

    return ranked.slice(0, topN);
}

/**
 * Async orchestration. Loads everything the ranker needs, calls it, returns
 * the ranked top-N. Intended caller: the /analyze route (selection step).
 */
export async function runEngine(entityId: string, opts: RankOptions = {}): Promise<RankedPlaybookItem[]> {
    const [items, metrics] = await Promise.all([
        prisma.aeoPlaybookItem.findMany({ where: { isActive: true } }),
        loadEntityMetricsInput(entityId),
    ]);
    return rankPlaybookItems(items, metrics, opts);
}

// ─── Metric loader ─────────────────────────────────────────────────────────

const TIMEFRAME = "standard"; // 30-day window — matches MetricSnapshot default
const SOURCE_BREAKDOWN_DAYS = 30;

/**
 * Pulls the entity's latest MetricSnapshot, the average of competitors' latest
 * snapshots, and a domain-type breakdown of cited links over the last 30d.
 * Anything missing degrades gracefully — null/empty fields are tolerated by
 * the trigger evaluator.
 */
export async function loadEntityMetricsInput(entityId: string): Promise<EntityMetricsInput> {
    const [entitySnap, competitorSnaps, breakdown] = await Promise.all([
        prisma.metricSnapshot.findFirst({
            where: { entityId, timeframe: TIMEFRAME },
            orderBy: { createdAt: "desc" },
        }),
        loadLatestCompetitorSnapshots(entityId),
        loadSourceTypeBreakdown(entityId),
    ]);

    const entity = entitySnap
        ? {
            visibility: entitySnap.visibility,
            position: entitySnap.position,
            shareOfVoice: entitySnap.shareOfVoice,
            mentionCount: entitySnap.mentionCount,
            linkPercentage: entitySnap.linkPercentage,
        }
        : {
            // Sensible "no data" defaults — visibility 0 / linkPct 0 / position null.
            // These will fire most "low" thresholds, so a fresh entity gets useful
            // foundational On-Page suggestions even before its first scan.
            visibility: 0,
            position: null,
            shareOfVoice: 0,
            mentionCount: 0,
            linkPercentage: 0,
        };

    return {
        entity,
        competitorAvg: competitorSnaps.length > 0 ? averageCompetitorSnaps(competitorSnaps) : undefined,
        sourceTypes: breakdown,
    };
}

async function loadLatestCompetitorSnapshots(entityId: string) {
    // Latest snapshot per competitor for this entity. Mirrors getLatestMetrics
    // in src/lib/metrics/dynamic.ts but kept inline so engine.ts stays
    // self-contained.
    const rows = await prisma.metricSnapshot.findMany({
        where: { competitor: { entityId }, timeframe: TIMEFRAME },
        orderBy: { createdAt: "desc" },
    });
    const seen = new Set<string>();
    const latest: typeof rows = [];
    for (const r of rows) {
        if (r.competitorId && !seen.has(r.competitorId)) {
            seen.add(r.competitorId);
            latest.push(r);
        }
    }
    return latest;
}

function averageCompetitorSnaps(rows: { visibility: number; position: number | null; shareOfVoice: number }[]) {
    const visibility = avg(rows.map((r) => r.visibility));
    const shareOfVoice = avg(rows.map((r) => r.shareOfVoice));
    const positions = rows.map((r) => r.position).filter((p): p is number => p !== null);
    const position = positions.length > 0 ? avg(positions) : null;
    return { avgVisibility: visibility, avgPosition: position, avgShareOfVoice: shareOfVoice };
}

function avg(xs: number[]): number {
    if (xs.length === 0) return 0;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Count distinct AnalysisLinks grouped by Domain.type.name, scoped to the
 * entity's analyses over the last N days. Empty result for entities with
 * no analyses yet (the trigger evaluator handles missing keys as 0).
 */
async function loadSourceTypeBreakdown(entityId: string): Promise<Record<string, number>> {
    // Raw SQL because Prisma can't express the 4-table join (AnalysisLink →
    // AnalysisResult → Prompt → entity, then AnalysisLink.domain → Domain →
    // DomainType) in a single query. Same pattern history.ts uses.
    const rows = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT dt."name" AS name, COUNT(DISTINCT al.id) AS count
        FROM "AnalysisLink" al
        JOIN "AnalysisResult" ar ON ar.id = al."analysisResultId"
        JOIN "Prompt" p ON p.id = ar."promptId"
        JOIN "Domain" d ON d.domain = al.domain
        JOIN "DomainType" dt ON dt.id = d."typeId"
        WHERE p."entityId" = ${entityId}
          AND ar."createdAt" >= NOW() - (${SOURCE_BREAKDOWN_DAYS} || ' days')::interval
        GROUP BY dt."name"
    `;
    const out: Record<string, number> = {};
    for (const r of rows) {
        out[r.name] = Number(r.count);
    }
    return out;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Triggers are stored as JSONB. Defensively parse: ignore malformed entries
 * rather than crashing the whole engine.
 */
function parseTriggers(raw: unknown): Trigger[] {
    if (!Array.isArray(raw)) return [];
    const out: Trigger[] = [];
    for (const t of raw) {
        if (!t || typeof t !== "object") continue;
        const kind = (t as { kind?: unknown }).kind;
        if (kind === "metric_threshold" || kind === "missing_source_type" || kind === "worse_than_competitor_avg") {
            out.push(t as Trigger);
        }
    }
    return out;
}
