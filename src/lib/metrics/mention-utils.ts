/**
 * Shared helpers for distinguishing "tracked" mentions (the entity itself + its
 * tracked competitors) from "suggested-brand" mentions written by the
 * brand-extraction pipeline.
 *
 * Single source of truth — every SOV / mention-count aggregation in the app must
 * use these so brand-extraction output never silently inflates denominators.
 *
 * Pure TS — no Prisma client runtime, safe to import from client components.
 */

import type { Prisma } from "@prisma/client";

/**
 * Prisma where clause matching only tracked mentions. Use in `prisma.analysisMention.count`,
 * `groupBy`, `findMany`, etc.
 *
 * Compose via `AND`:
 *   { AND: [TRACKED_MENTION_WHERE, { analysisResult: baseWhere }] }
 */
export const TRACKED_MENTION_WHERE: Prisma.AnalysisMentionWhereInput = {
    OR: [
        { isPrimaryEntity: true },
        { competitorId: { not: null } },
    ],
};

export interface TrackedMentionShape {
    isPrimaryEntity: boolean;
    competitor?: unknown | null;
    competitorId?: string | null;
}

/**
 * Client-side equivalent of TRACKED_MENTION_WHERE. Accepts either an `m.competitor`
 * relation (when the row was fetched with `include: { competitor: true }`) or
 * `m.competitorId` (raw row).
 */
export function isTrackedMention(m: TrackedMentionShape): boolean {
    if (m.isPrimaryEntity) return true;
    if (m.competitor) return true;
    if (m.competitorId) return true;
    return false;
}

/**
 * Share of voice = entity mentions / tracked mentions × 100, rounded.
 * Returns 0 when there are no tracked mentions.
 */
export function calculateSov<M extends TrackedMentionShape>(mentions: M[]): number {
    const tracked = mentions.filter(isTrackedMention);
    if (tracked.length === 0) return 0;
    const entityMentions = tracked.filter(m => m.isPrimaryEntity).length;
    return Math.round((entityMentions / tracked.length) * 100);
}
