/**
 * Dynamic metrics calculation with optional filtering.
 * getDynamicMetrics — live calculation from AnalysisResult/AnalysisMention.
 * getLatestMetrics — fetch latest persisted MetricSnapshot.
 */

import { prisma } from "@/lib/prisma";
import {
    calcVisibility,
    calcShareOfVoice,
    calcChange,
    calcPositionChange,
    calcLinkPercentage,
    roundMetric,
    roundMetricNullable
} from "./calculations";
import { resolveModelIds, buildAnalysisResultWhere, type FilterOptions } from "./queryHelpers";
import { TRACKED_MENTION_WHERE } from "./mention-utils";
import { computeBrandRows, BRAND_MENTIONS_SELECT } from "./brandMentionRates";

const TIMEFRAMES = {
    weekly: 7,
    standard: 30,
    extended: 90
};

/**
 * Fetch the latest persisted MetricSnapshot for an entity and its competitors.
 */
export async function getLatestMetrics(entityId: string, timeframe: 'weekly' | 'standard' | 'extended' = 'standard') {
    const entityMetric = await prisma.metricSnapshot.findFirst({
        where: { entityId, timeframe },
        orderBy: { createdAt: 'desc' }
    });

    const competetitorMetricsRaw = await prisma.metricSnapshot.findMany({
        where: {
            competitor: { entityId },
            timeframe
        },
        orderBy: { createdAt: 'desc' },
        include: { competitor: true }
    });

    // Deduplicate to get only latest per competitor
    const seen = new Set();
    const competitorMetrics = [];
    for (const m of competetitorMetricsRaw) {
        if (m.competitorId && !seen.has(m.competitorId)) {
            seen.add(m.competitorId);
            competitorMetrics.push(m);
        }
    }

    return {
        entity: entityMetric,
        competitors: competitorMetrics
    };
}

/**
 * Calculate metrics dynamically with optional filtering by tags, intents, models, and prompt.
 * Uses a Prisma transaction for consistent reads across current and previous periods.
 */
export async function getDynamicMetrics(
    entityId: string,
    tagNames: string[],
    timeframe: 'weekly' | 'standard' | 'extended' = 'standard',
    modelIds?: string[],
    intents?: string[],
    promptId?: string,
    includePaused = false
) {
    const days = TIMEFRAMES[timeframe];
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    const prevStartDate = new Date();
    prevStartDate.setDate(startDate.getDate() - days);

    // Resolve model IDs once
    const resolvedModels = modelIds ? await resolveModelIds(entityId, modelIds) : [];

    // Build WHERE clauses using shared helper (eliminates 50-line duplication)
    const filterOpts: FilterOptions = {
        tagNames,
        intents,
        promptId,
        resolvedModels: resolvedModels.length > 0 ? resolvedModels : undefined,
        includePaused
    };

    const baseWhere = buildAnalysisResultWhere(entityId, { gte: startDate }, filterOpts);
    const prevBaseWhere = buildAnalysisResultWhere(entityId, { gte: prevStartDate, lt: startDate }, filterOpts);

    // Use transaction to ensure consistent read.
    // For competitor mention rate, we need DEDUPED-per-result counts (so a
    // brand mentioned twice in one answer counts as one). The old `groupBy`
    // returned raw row counts, which inflated competitor visibility above
    // detected-brands. We now pull `analysisResult.findMany` with mentions
    // and feed it through `computeBrandRows` (shared with detected-brands).
    const [
        // Current Period
        totalCount,
        mentionCount,
        currentTotalMarketMentions,
        currentEntityMentions,
        entityAggregates,
        competitors,
        currentBrandRaw,

        // Previous Period
        prevTotalCount,
        prevMentionCount,
        prevTotalMarketMentions,
        prevEntityMentions,
        prevEntityAggregates,
        prevBrandRaw
    ] = await prisma.$transaction([
        // Current period
        prisma.analysisResult.count({ where: baseWhere }),
        prisma.analysisResult.count({ where: { ...baseWhere, mentioned: true } }),
        prisma.analysisMention.count({ where: { AND: [TRACKED_MENTION_WHERE, { analysisResult: baseWhere }] } }),
        prisma.analysisMention.count({ where: { analysisResult: baseWhere, isPrimaryEntity: true } }),
        prisma.analysisResult.aggregate({ where: baseWhere, _avg: { position: true } }),
        prisma.competitor.findMany({ where: { entityId } }),
        prisma.analysisResult.findMany({ where: baseWhere, select: BRAND_MENTIONS_SELECT }),

        // Previous period
        prisma.analysisResult.count({ where: prevBaseWhere }),
        prisma.analysisResult.count({ where: { ...prevBaseWhere, mentioned: true } }),
        prisma.analysisMention.count({ where: { AND: [TRACKED_MENTION_WHERE, { analysisResult: prevBaseWhere }] } }),
        prisma.analysisMention.count({ where: { analysisResult: prevBaseWhere, isPrimaryEntity: true } }),
        prisma.analysisResult.aggregate({ where: prevBaseWhere, _avg: { position: true } }),
        prisma.analysisResult.findMany({ where: prevBaseWhere, select: BRAND_MENTIONS_SELECT }),
    ]);

    const currentBrandRows = computeBrandRows(currentBrandRaw).rows;
    const prevBrandRows = computeBrandRows(prevBrandRaw).rows;

    // --- Process Entity Metrics ---
    const visibility = calcVisibility(mentionCount, totalCount);
    const prevVisibility = calcVisibility(prevMentionCount, prevTotalCount);
    const visibilityChange = calcChange(visibility, prevVisibility, prevTotalCount > 0);

    const shareOfVoice = calcShareOfVoice(currentEntityMentions, currentTotalMarketMentions);
    const prevShareOfVoice = calcShareOfVoice(prevEntityMentions, prevTotalMarketMentions);
    const shareOfVoiceChange = calcChange(shareOfVoice, prevShareOfVoice, prevTotalMarketMentions > 0);

    const position = entityAggregates._avg.position;
    const prevPosition = prevEntityAggregates._avg.position;
    const positionChange = calcPositionChange(position, prevPosition);

    const entityMetric = {
        visibility,
        visibilityChange: roundMetricNullable(visibilityChange),
        totalCount,
        mentionCount,
        shareOfVoice: roundMetric(shareOfVoice),
        shareOfVoiceChange: roundMetricNullable(shareOfVoiceChange),
        position,
        positionChange: roundMetricNullable(positionChange),
        linkPercentage: calcLinkPercentage(visibility)
    };

    // --- Process Competitor Metrics ---
    // `runsMentioned` (deduped per result) drives mention rate.
    // `mentionRowCount` (raw row count) drives share-of-voice — paired with
    // `currentTotalMarketMentions` which is also a raw row count, so the
    // ratio stays self-consistent.
    interface CompetitorStat {
        runsMentioned: number;
        mentionRowCount: number;
        avgPosition: number | null;
    }
    const statsMap = new Map<string, CompetitorStat>();
    currentBrandRows.forEach(row => {
        if (row.competitorId) {
            statsMap.set(row.competitorId, {
                runsMentioned: row.runsMentioned,
                mentionRowCount: row.mentionRowCount,
                avgPosition: row.avgPosition,
            });
        }
    });

    const prevStatsMap = new Map<string, CompetitorStat>();
    prevBrandRows.forEach(row => {
        if (row.competitorId) {
            prevStatsMap.set(row.competitorId, {
                runsMentioned: row.runsMentioned,
                mentionRowCount: row.mentionRowCount,
                avgPosition: row.avgPosition,
            });
        }
    });

    const competitorMetrics = competitors.map(comp => {
        // Current
        const stats = statsMap.get(comp.id);
        const compRunsMentioned = stats?.runsMentioned || 0;
        const compMentionRowCount = stats?.mentionRowCount || 0;
        // Visibility = % of runs the brand appeared in (deduped). Aligns with
        // the entity's own mention rate and the detected-brands view.
        const compVisibility = calcVisibility(compRunsMentioned, totalCount);
        const compPosition = stats?.avgPosition !== null && stats?.avgPosition !== undefined ? stats.avgPosition : null;
        // Share of voice keeps using raw row counts on both sides — the
        // double-count cancels in the numerator/denominator ratio.
        const compShareOfVoice = calcShareOfVoice(compMentionRowCount, currentTotalMarketMentions);

        // Previous
        const prevStats = prevStatsMap.get(comp.id);
        const prevCompRunsMentioned = prevStats?.runsMentioned || 0;
        const prevCompMentionRowCount = prevStats?.mentionRowCount || 0;
        const prevCompVisibility = calcVisibility(prevCompRunsMentioned, prevTotalCount);
        const prevCompPosition = prevStats?.avgPosition !== null && prevStats?.avgPosition !== undefined ? prevStats.avgPosition : null;
        const prevCompShareOfVoice = calcShareOfVoice(prevCompMentionRowCount, prevTotalMarketMentions);

        // Deltas
        const compVisibilityChange = calcChange(compVisibility, prevCompVisibility, prevTotalCount > 0);
        const compShareOfVoiceChange = calcChange(compShareOfVoice, prevCompShareOfVoice, prevTotalMarketMentions > 0);
        const compPositionChange = calcPositionChange(compPosition, prevCompPosition);

        return {
            competitorId: comp.id,
            visibility: compVisibility,
            visibilityChange: roundMetricNullable(compVisibilityChange),
            // `mentionCount` here keeps its old meaning (raw rows) for
            // consumers that read it. New consumers should prefer `visibility`.
            mentionCount: compMentionRowCount,
            totalCount,
            shareOfVoice: roundMetric(compShareOfVoice),
            shareOfVoiceChange: roundMetricNullable(compShareOfVoiceChange),
            position: compPosition,
            positionChange: roundMetricNullable(compPositionChange),
            linkPercentage: calcLinkPercentage(compVisibility, 0.6)
        };
    });

    return {
        entity: entityMetric,
        competitors: competitorMetrics
    };
}
