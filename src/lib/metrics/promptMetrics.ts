/**
 * Prompt-level metrics — denormalized onto the Prompt record.
 * Latest run snapshot + time-window metrics (7d, 30d, 90d).
 */

import { prisma } from "@/lib/prisma";
import { calcVisibility, calcShareOfVoice, roundMetric, roundMetricNullable } from "./calculations";
import { isTrackedMention, type TrackedMentionShape } from "./mention-utils";

/**
 * Update denormalized metrics on a Prompt record after analysis completes.
 * Calculates latest run snapshot + period-based metrics (7d, 30d, 90d).
 */
export async function updatePromptMetrics(promptId: string) {
    console.log(`[Metrics] Updating metrics for prompt ${promptId}`);

    // Find the latest checkRunId that has at least one completed result
    const lastResult = await prisma.analysisResult.findFirst({
        where: { promptId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        select: { checkRunId: true, createdAt: true }
    });

    if (!lastResult) {
        await prisma.prompt.update({
            where: { id: promptId },
            data: {
                lastMentionRate: null,
                lastAvgPosition: null,
                lastShareOfVoice: null
            }
        });
        return;
    }

    // Fetch all completed results for this specific Check Run
    const results = await prisma.analysisResult.findMany({
        where: {
            promptId,
            checkRunId: lastResult.checkRunId,
            status: 'completed'
        },
        include: { mentions: true }
    });

    if (results.length === 0) return;

    // Calculate latest run metrics
    const { mentionRate, avgPosition, shareOfVoice } = calculateMetricsFromResults(results);

    // Update Prompt with all metrics
    await prisma.prompt.update({
        where: { id: promptId },
        data: {
            lastMentionRate: roundMetric(mentionRate),
            lastAvgPosition: roundMetricNullable(avgPosition),
            lastShareOfVoice: roundMetric(shareOfVoice),

            // Time window metrics
            ...(await calculatePeriodMetrics(promptId, 7, '7d')),
            ...(await calculatePeriodMetrics(promptId, 30, '30d')),
            ...(await calculatePeriodMetrics(promptId, 90, '90d'))
        }
    });
}

interface ResultForMetrics {
    mentioned: boolean;
    position: number | null;
    mentions?: TrackedMentionShape[];
}

/**
 * Calculate mention rate, avg position, and share of voice from a set of results.
 */
function calculateMetricsFromResults(results: ResultForMetrics[]) {
    const total = results.length;
    const mentionedCount = results.filter(r => r.mentioned).length;
    const mentionRate = calcVisibility(mentionedCount, total);

    // Average position (non-zero only)
    const validPositions = results
        .filter(r => r.position !== null && r.position > 0)
        .map(r => r.position as number);
    const avgPosition = validPositions.length > 0
        ? validPositions.reduce((a, b) => a + b, 0) / validPositions.length
        : null;

    // Share of voice
    let totalMarketMentions = 0;
    let primaryEntityMentions = 0;

    results.forEach(result => {
        // Only tracked mentions (entity + tracked competitors) count toward market share.
        // Suggested-brand mentions (brand-extraction output) are excluded.
        const tracked = (result.mentions ?? []).filter(isTrackedMention);
        totalMarketMentions += tracked.length;
        primaryEntityMentions += tracked.filter(m => m.isPrimaryEntity).length;
    });

    const shareOfVoice = calcShareOfVoice(primaryEntityMentions, totalMarketMentions);

    return { mentionRate, avgPosition, shareOfVoice };
}

/**
 * Calculate metrics for a specific time window (7d, 30d, 90d).
 */
async function calculatePeriodMetrics(promptId: string, days: number, suffix: '7d' | '30d' | '90d') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await prisma.analysisResult.findMany({
        where: {
            promptId,
            createdAt: { gte: startDate },
            status: 'completed'
        },
        include: { mentions: true }
    });

    if (results.length === 0) {
        return {
            [`mentionRate${suffix}`]: null,
            [`avgPosition${suffix}`]: null,
            [`shareOfVoice${suffix}`]: null
        };
    }

    const { mentionRate, avgPosition, shareOfVoice } = calculateMetricsFromResults(results);

    return {
        [`mentionRate${suffix}`]: roundMetric(mentionRate),
        [`avgPosition${suffix}`]: roundMetricNullable(avgPosition),
        [`shareOfVoice${suffix}`]: roundMetric(shareOfVoice)
    };
}
