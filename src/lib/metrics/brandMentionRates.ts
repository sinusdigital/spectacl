/**
 * Single source of truth for brand mention rates.
 *
 * Used by both `getDynamicMetrics` (competitor visibility on the overview
 * charts) and the `/api/prompts/[id]/detected-brands` API. Counting an
 * unwanted divergence: previously the overview chart counted *every*
 * `AnalysisMention` row per competitor while detected-brands counted
 * unique results — so a brand mentioned multiple times in one answer would
 * inflate the overview chart's "mention rate" but not the detected-brands
 * value. Both surfaces now route through this function.
 *
 * Mention rate = (number of unique results where the brand appeared) /
 * (total results in scope) × 100. Bounded by [0, 100] by definition.
 *
 * Two entry points:
 *   - `computeBrandMentionRates({ where })` — full async fn, runs the query
 *     itself. Used by the detected-brands API.
 *   - `computeBrandRows(rawResults)` — pure JS aggregation only. Lets
 *     callers (e.g. `getDynamicMetrics`) include the `findMany` inside
 *     their own `$transaction` for a single roundtrip.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SUFFIX_RE = /\s+(inc|llc|ltd|gmbh|co|corp|corporation|limited|sa|ag|bv|nv)\.?$/i;
const PUNCT_RE = /[.,!?;:'"()\[\]{}]/g;
// "Koenig & Bauer (KBA)" — strip the parens + ticker before matching.
const PARENS_RE = /\s*\([^)]*\)\s*/g;
// Normalize all unicode whitespace (incl. non-breaking, em/en spaces).
const WHITESPACE_RE = /[\s\u00A0\u2000-\u200D\u202F\u205F\u3000]+/g;

export function normalizeBrandName(name: string): string {
    return name
        .normalize("NFKC")
        .toLowerCase()
        .replace(PARENS_RE, " ")
        .replace(PUNCT_RE, "")
        .replace(WHITESPACE_RE, " ")
        .replace(SUFFIX_RE, "")
        .trim();
}

export interface BrandMentionRow {
    /** The primary entity itself (only one row will have this set). */
    isPrimaryEntity: boolean;
    /** Set when matched to a tracked Competitor. */
    competitorId: string | null;
    /** Set when matched to a SuggestedCompetitor. */
    suggestedCompetitorId: string | null;
    /** Normalized name key — also the join key for unmatched ("new") brands. */
    normalizedKey: string;
    /** Most-frequent original casing observed in the underlying mentions. */
    canonicalName: string;

    /** Unique results (deduped per `analysisResultId`) where this brand appeared. */
    runsMentioned: number;
    /** Total `AnalysisMention` rows — useful for share-of-voice calcs. */
    mentionRowCount: number;
    /** (runsMentioned / totalRuns) × 100, NOT rounded. Caller decides display. */
    mentionRate: number;
    /** Average position across mentions where `position` was non-null. */
    avgPosition: number | null;
    /** Most recent `analysisResult.createdAt` where this brand appeared. */
    lastSeenAt: Date | null;
}

export interface BrandMentionRatesResult {
    totalRuns: number;
    rows: BrandMentionRow[];
}

/** Shape `computeBrandRows` expects — match this in your `findMany` select. */
export type BrandMentionRawResults = Array<{
    id: string;
    createdAt: Date;
    mentions: Array<{
        detectedName: string;
        position: number | null;
        competitorId: string | null;
        suggestedCompetitorId: string | null;
        isPrimaryEntity: boolean;
    }>;
}>;

/** Prisma `select` to pass to `analysisResult.findMany` for use with `computeBrandRows`. */
export const BRAND_MENTIONS_SELECT = {
    id: true,
    createdAt: true,
    mentions: {
        select: {
            detectedName: true,
            position: true,
            competitorId: true,
            suggestedCompetitorId: true,
            isPrimaryEntity: true,
        },
    },
} satisfies Prisma.AnalysisResultSelect;

interface Acc {
    normalizedKey: string;
    canonicalCounts: Map<string, number>;
    runsMentioned: number;
    mentionRowCount: number;
    seenInRunIds: Set<string>;
    positionSum: number;
    positionCount: number;
    lastSeenAt: Date | null;
    competitorId: string | null;
    suggestedCompetitorId: string | null;
    isPrimaryEntity: boolean;
}

/**
 * Pure JS aggregation. Given an array of analysis results with their
 * mentions, returns one row per detected brand with deduped counts.
 * Use when you already ran the `findMany` (e.g. inside a transaction).
 */
export function computeBrandRows(results: BrandMentionRawResults): BrandMentionRatesResult {
    const totalRuns = results.length;
    const map = new Map<string, Acc>();

    for (const result of results) {
        for (const m of result.mentions) {
            const key = normalizeBrandName(m.detectedName);
            if (!key) continue;

            let entry = map.get(key);
            if (!entry) {
                entry = {
                    normalizedKey: key,
                    canonicalCounts: new Map(),
                    runsMentioned: 0,
                    mentionRowCount: 0,
                    seenInRunIds: new Set(),
                    positionSum: 0,
                    positionCount: 0,
                    lastSeenAt: result.createdAt,
                    competitorId: null,
                    suggestedCompetitorId: null,
                    isPrimaryEntity: false,
                };
                map.set(key, entry);
            }
            entry.mentionRowCount++;
            entry.canonicalCounts.set(
                m.detectedName,
                (entry.canonicalCounts.get(m.detectedName) ?? 0) + 1,
            );
            if (!entry.seenInRunIds.has(result.id)) {
                entry.runsMentioned++;
                entry.seenInRunIds.add(result.id);
            }
            if (m.position != null) {
                entry.positionSum += m.position;
                entry.positionCount++;
            }
            if (entry.lastSeenAt == null || result.createdAt > entry.lastSeenAt) {
                entry.lastSeenAt = result.createdAt;
            }
            if (m.competitorId && !entry.competitorId) entry.competitorId = m.competitorId;
            if (m.suggestedCompetitorId && !entry.suggestedCompetitorId) {
                entry.suggestedCompetitorId = m.suggestedCompetitorId;
            }
            if (m.isPrimaryEntity) entry.isPrimaryEntity = true;
        }
    }

    const rows: BrandMentionRow[] = Array.from(map.values()).map(entry => {
        // Pick the most-frequent original casing as the display name.
        let best = "";
        let bestCount = -1;
        for (const [name, count] of entry.canonicalCounts) {
            if (count > bestCount) {
                best = name;
                bestCount = count;
            }
        }
        return {
            isPrimaryEntity: entry.isPrimaryEntity,
            competitorId: entry.competitorId,
            suggestedCompetitorId: entry.suggestedCompetitorId,
            normalizedKey: entry.normalizedKey,
            canonicalName: best,
            runsMentioned: entry.runsMentioned,
            mentionRowCount: entry.mentionRowCount,
            mentionRate: totalRuns > 0 ? (entry.runsMentioned / totalRuns) * 100 : 0,
            avgPosition: entry.positionCount > 0 ? entry.positionSum / entry.positionCount : null,
            lastSeenAt: entry.lastSeenAt,
        };
    });

    return { totalRuns, rows };
}

/**
 * Async wrapper — runs the query itself. Use when you don't need to batch
 * with other queries (e.g. the detected-brands API).
 */
export async function computeBrandMentionRates(args: {
    where: Prisma.AnalysisResultWhereInput;
}): Promise<BrandMentionRatesResult> {
    const results = await prisma.analysisResult.findMany({
        where: args.where,
        select: BRAND_MENTIONS_SELECT,
    });
    return computeBrandRows(results);
}
