/**
 * Metric snapshot persistence — entity and competitor snapshots.
 * Unified logic replaces two near-identical functions.
 */

import { prisma } from "@/lib/prisma";
import { calcVisibility, calcShareOfVoice, calcLinkPercentage, roundMetric } from "./calculations";

const TIMEFRAMES = {
    weekly: 7,
    standard: 30,
    extended: 90
};

type SnapshotTarget =
    | { type: 'entity'; entityId: string }
    | { type: 'competitor'; competitorId: string; entityId: string };

/**
 * Unified snapshot calculation and persistence.
 * Replaces calculateAndSaveEntitySnapshot + calculateAndSaveCompetitorSnapshot.
 */
async function calculateAndSaveSnapshot(target: SnapshotTarget, timeframe: 'weekly' | 'standard' | 'extended') {
    const days = TIMEFRAMES[timeframe];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entityId = target.entityId;

    // Base WHERE: all analysis results for this entity's prompts in timeframe
    const resultWhere = {
        prompt: {
            entityId,
            ranking: { is: null }
        },
        createdAt: { gte: startDate }
    };

    // Batch all read queries into a single $transaction to reduce DB roundtrips.
    // Previously 5-6 sequential queries per call; now 1 roundtrip.
    let totalCount: number;
    let mentionCount: number;
    let position: number | null;
    let visibility: number;
    let shareOfVoice: number;

    if (target.type === 'entity') {
        const [total, entityMentions, positionAgg, totalMarketMentions, primaryMentions] = await prisma.$transaction([
            prisma.analysisResult.count({ where: resultWhere }),
            prisma.analysisResult.count({ where: { ...resultWhere, mentioned: true } }),
            prisma.analysisResult.aggregate({
                where: { ...resultWhere, position: { not: 0 } },
                _avg: { position: true },
            }),
            prisma.analysisMention.count({ where: { analysisResult: resultWhere } }),
            prisma.analysisMention.count({
                where: { analysisResult: resultWhere, isPrimaryEntity: true },
            }),
        ]);

        totalCount = total;
        mentionCount = entityMentions;
        position = positionAgg._avg.position ?? null;
        visibility = calcVisibility(mentionCount, totalCount);
        shareOfVoice = calcShareOfVoice(primaryMentions, totalMarketMentions);
    } else {
        const competitorWhere = {
            competitorId: target.competitorId,
            analysisResult: resultWhere,
        };

        const [total, compMentions, aggregates, totalMarketMentions] = await prisma.$transaction([
            prisma.analysisResult.count({ where: resultWhere }),
            prisma.analysisMention.count({ where: competitorWhere }),
            prisma.analysisMention.aggregate({
                where: competitorWhere,
                _avg: { position: true },
            }),
            prisma.analysisMention.count({ where: { analysisResult: resultWhere } }),
        ]);

        totalCount = total;
        mentionCount = compMentions;
        position = aggregates._avg.position ?? null;
        visibility = calcVisibility(mentionCount, totalCount);
        shareOfVoice = calcShareOfVoice(mentionCount, totalMarketMentions);
    }

    // 4. Link percentage (mock)
    const linkPercentage = calcLinkPercentage(visibility);

    // 5. Persist snapshot
    await prisma.metricSnapshot.create({
        data: {
            ...(target.type === 'entity'
                ? { entityId: target.entityId }
                : { competitorId: target.competitorId }),
            timeframe,
            visibility: roundMetric(visibility),
            totalCount,
            mentionCount,
            shareOfVoice: roundMetric(shareOfVoice),
            position: position !== null ? roundMetric(position) : null,
            linkPercentage: roundMetric(linkPercentage, 0)
        }
    });
}

/**
 * Update all metrics for an entity and its competitors.
 * Called by the analysis worker after a job completes.
 */
export async function updateEntityMetrics(entityId: string) {
    console.log(`[Metrics] Updating metrics for entity ${entityId}`);

    // Entity snapshots (both timeframes in parallel)
    await Promise.all([
        calculateAndSaveSnapshot({ type: 'entity', entityId }, 'standard'),
        calculateAndSaveSnapshot({ type: 'entity', entityId }, 'extended'),
    ]);

    // Competitor snapshots (all in parallel)
    const competitors = await prisma.competitor.findMany({
        where: { entityId },
        select: { id: true },
    });

    await Promise.all(
        competitors.flatMap(comp => [
            calculateAndSaveSnapshot({ type: 'competitor', competitorId: comp.id, entityId }, 'standard'),
            calculateAndSaveSnapshot({ type: 'competitor', competitorId: comp.id, entityId }, 'extended'),
        ])
    );
}
