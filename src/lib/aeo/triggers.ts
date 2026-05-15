/**
 * AEO trigger evaluators (Phase 3, step 1).
 *
 * Pure functions: given an `EntityMetricsInput` snapshot, evaluate whether a
 * trigger fires for a particular playbook tactic. No I/O, no Prisma — the
 * orchestrator (engine.ts) is responsible for fetching metrics and calling
 * these.
 *
 * Triggers are stored as JSONB on `AeoPlaybookItem.triggers`. An item can
 * have multiple triggers; the engine sums their weights to rank items.
 *
 * Invariants:
 * - `evaluateTrigger` never throws. Unknown trigger kinds return `{ fired: false }`.
 * - `explanation` is end-user-facing copy. It must read naturally in a sentence
 *   like "Suggested because <explanation>".
 */

/** Entity-level metrics the engine cares about. Mirrors `MetricSnapshot` but
 *  flat and comparable. */
export interface EntityMetricSnapshot {
    visibility: number;        // 0-1, % of analyses where entity is mentioned
    position: number | null;   // avg position when mentioned (1 = first); null if never mentioned
    shareOfVoice: number;      // 0-1
    mentionCount: number;      // raw mention total over the timeframe
    linkPercentage: number;    // 0-1, share of mentions that include a link
}

/** Aggregate of competitor metrics (averaged across tracked competitors). */
export interface CompetitorAggregate {
    avgVisibility: number;
    avgPosition: number | null;
    avgShareOfVoice: number;
}

/** Mention counts grouped by Domain.type.name (e.g. "Review Site", "Forum"). */
export type SourceTypeBreakdown = Record<string, number>;

export interface EntityMetricsInput {
    entity: EntityMetricSnapshot;
    competitorAvg?: CompetitorAggregate;
    /** Map of domain-type-name → mention count. Missing keys treated as 0. */
    sourceTypes?: SourceTypeBreakdown;
}

// ─── Trigger schema ────────────────────────────────────────────────────────

type EntityMetricKey = keyof EntityMetricSnapshot;
type CompetitorMetricKey = "visibility" | "position" | "shareOfVoice";

export type Trigger =
    | {
        kind: "metric_threshold";
        metric: EntityMetricKey;
        op: "lt" | "gt" | "lte" | "gte";
        value: number;
        weight?: number;
    }
    | {
        kind: "missing_source_type";
        typeName: string;
        weight?: number;
    }
    | {
        kind: "worse_than_competitor_avg";
        metric: CompetitorMetricKey;
        /** Minimum delta (entity vs competitor avg) below which the trigger fires.
         *  For "position" lower is better, so the delta is reversed. */
        minDelta: number;
        weight?: number;
    };

export interface TriggerResult {
    fired: boolean;
    /** Weight applied if fired (default 1). */
    weight: number;
    /** Numeric or string value snapshot at evaluation time, for the audit trail. */
    value?: number | string | null;
    /** Human-readable "Suggested because <explanation>" copy. Only set when fired. */
    explanation?: string;
}

const NOT_FIRED: TriggerResult = { fired: false, weight: 0 };

// ─── Evaluator ─────────────────────────────────────────────────────────────

export function evaluateTrigger(trigger: Trigger, input: EntityMetricsInput): TriggerResult {
    const weight = trigger.weight ?? 1;

    try {
        switch (trigger.kind) {
            case "metric_threshold":
                return evalMetricThreshold(trigger, input, weight);
            case "missing_source_type":
                return evalMissingSourceType(trigger, input, weight);
            case "worse_than_competitor_avg":
                return evalWorseThanCompetitorAvg(trigger, input, weight);
            default: {
                // Exhaustiveness guard — TS will catch missing cases here.
                const _exhaustive: never = trigger;
                void _exhaustive;
                return NOT_FIRED;
            }
        }
    } catch {
        return NOT_FIRED;
    }
}

/** Evaluate every trigger on an item; sum fired weights for ranking. */
export function evaluateTriggers(
    triggers: Trigger[],
    input: EntityMetricsInput,
): { totalWeight: number; fired: TriggerResult[] } {
    const fired: TriggerResult[] = [];
    let totalWeight = 0;
    for (const t of triggers) {
        const r = evaluateTrigger(t, input);
        if (r.fired) {
            fired.push(r);
            totalWeight += r.weight;
        }
    }
    return { totalWeight, fired };
}

// ─── Per-kind implementations ──────────────────────────────────────────────

const METRIC_LABEL: Record<EntityMetricKey, string> = {
    visibility: "visibility",
    position: "average position",
    shareOfVoice: "share of voice",
    mentionCount: "total mentions",
    linkPercentage: "link inclusion rate",
};

function evalMetricThreshold(
    t: Extract<Trigger, { kind: "metric_threshold" }>,
    input: EntityMetricsInput,
    weight: number,
): TriggerResult {
    const actual = input.entity[t.metric];
    if (actual === null || actual === undefined) return NOT_FIRED;

    const cmp = compare(actual, t.op, t.value);
    if (!cmp) return NOT_FIRED;

    return {
        fired: true,
        weight,
        value: actual,
        explanation: explainMetricThreshold(t, actual),
    };
}

function evalMissingSourceType(
    t: Extract<Trigger, { kind: "missing_source_type" }>,
    input: EntityMetricsInput,
    weight: number,
): TriggerResult {
    const breakdown = input.sourceTypes ?? {};
    const count = breakdown[t.typeName] ?? 0;
    if (count > 0) return NOT_FIRED;

    return {
        fired: true,
        weight,
        value: 0,
        explanation: `you have no mentions from ${t.typeName.toLowerCase()} sources`,
    };
}

function evalWorseThanCompetitorAvg(
    t: Extract<Trigger, { kind: "worse_than_competitor_avg" }>,
    input: EntityMetricsInput,
    weight: number,
): TriggerResult {
    const competitors = input.competitorAvg;
    if (!competitors) return NOT_FIRED;

    const competitorValue = readCompetitorMetric(competitors, t.metric);
    const entityValue = readEntityMetric(input.entity, t.metric);

    if (competitorValue === null || entityValue === null) return NOT_FIRED;

    // For "position", lower is better. For everything else, higher is better.
    // Trigger fires when entity is meaningfully *worse* by at least minDelta.
    const positionMetric = t.metric === "position";
    const delta = positionMetric
        ? entityValue - competitorValue          // worse = larger position number
        : competitorValue - entityValue;          // worse = smaller value than peers

    if (delta < t.minDelta) return NOT_FIRED;

    return {
        fired: true,
        weight,
        value: Number(delta.toFixed(3)),
        explanation: explainCompetitorGap(t.metric, entityValue, competitorValue),
    };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function compare(a: number, op: "lt" | "gt" | "lte" | "gte", b: number): boolean {
    switch (op) {
        case "lt": return a < b;
        case "gt": return a > b;
        case "lte": return a <= b;
        case "gte": return a >= b;
    }
}

function readEntityMetric(e: EntityMetricSnapshot, key: CompetitorMetricKey): number | null {
    return e[key];
}

function readCompetitorMetric(c: CompetitorAggregate, key: CompetitorMetricKey): number | null {
    switch (key) {
        case "visibility": return c.avgVisibility;
        case "position": return c.avgPosition;
        case "shareOfVoice": return c.avgShareOfVoice;
    }
}

function explainMetricThreshold(
    t: Extract<Trigger, { kind: "metric_threshold" }>,
    actual: number,
): string {
    const label = METRIC_LABEL[t.metric];
    const direction = t.op === "lt" || t.op === "lte" ? "below" : "above";
    return `your ${label} is ${direction} ${formatMetric(t.metric, t.value)} (currently ${formatMetric(t.metric, actual)})`;
}

function explainCompetitorGap(
    metric: CompetitorMetricKey,
    entityValue: number,
    competitorValue: number,
): string {
    const label = METRIC_LABEL[metric];
    return `your ${label} (${formatMetric(metric, entityValue)}) trails competitors' average (${formatMetric(metric, competitorValue)})`;
}

function formatMetric(metric: EntityMetricKey, value: number): string {
    if (metric === "visibility" || metric === "shareOfVoice" || metric === "linkPercentage") {
        return `${(value * 100).toFixed(0)}%`;
    }
    if (metric === "position") {
        return `#${value.toFixed(1)}`;
    }
    return String(Math.round(value));
}
