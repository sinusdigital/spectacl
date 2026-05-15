/**
 * Visibility history queries — daily aggregated metrics using raw SQL.
 * Entity history and per-competitor history.
 */

import { prisma } from "@/lib/prisma";
import { resolveModelIds, buildSqlConditions } from "./queryHelpers";

type EntityHistoryRow = { date: Date; total: number; mentioned: number; avg_position: number | null };
type CompetitorMentionRow = { date: Date; competitorId: string; name: string; mentioned: number; avg_position: number | null };
type EntityHistoryPoint = { date: Date; total: number; mentioned: number; visibility: number; position: number | null };
type CompetitorHistoryPoint = { date: Date; mentioned: number; total: number; visibility: number; position: number | null };

/**
 * Get daily visibility history for an entity.
 * Returns date, total results, mentioned count, visibility %, and avg position per day.
 */
async function _getEntityVisibilityHistory(
    entityId: string,
    tagNames?: string[],
    intents?: string[],
    modelIds?: string[],
    promptId?: string,
    includePaused = false
) {
    const resolvedModels = modelIds ? await resolveModelIds(entityId, modelIds) : [];

    const { params, promptIdCondition, tagCondition, pausedCondition, intentCondition, modelCondition, tagJoin } =
        buildSqlConditions(entityId, {
            tagNames,
            intents,
            resolvedModels: resolvedModels.length > 0 ? resolvedModels : undefined,
            promptId,
            includePaused
        });

    const query = `
        SELECT
            DATE("AnalysisResult"."createdAt") as date,
            COUNT(DISTINCT "AnalysisResult"."id")::int as total,
            SUM(CASE WHEN "AnalysisResult"."mentioned" = true THEN 1 ELSE 0 END)::int as mentioned,
            AVG(NULLIF("AnalysisResult"."position", 0))::float as avg_position
        FROM "AnalysisResult"
        JOIN "Prompt" ON "AnalysisResult"."promptId" = "Prompt"."id"
        ${tagJoin}
        WHERE "Prompt"."entityId" = $1
        AND "AnalysisResult"."status" = 'success'
        ${pausedCondition}
        ${promptIdCondition}
        ${tagCondition}
        ${intentCondition}
        ${modelCondition}
        GROUP BY DATE("AnalysisResult"."createdAt")
        ORDER BY date ASC
    `;

    const history = await prisma.$queryRawUnsafe<EntityHistoryRow[]>(query, ...params);

    return history.map(row => ({
        date: row.date,
        total: row.total,
        mentioned: row.mentioned,
        visibility: row.total > 0 ? (row.mentioned / row.total) * 100 : 0,
        position: row.avg_position !== null ? row.avg_position : null
    }));
}

export const getEntityVisibilityHistory = _getEntityVisibilityHistory;

/**
 * Get daily visibility history per competitor.
 * Fetches entity history first, then competitor mention counts per day.
 */
export async function getCompetitorVisibilityHistory(
    entityId: string,
    tagNames?: string[],
    intents?: string[],
    modelIds?: string[],
    promptId?: string,
    includePaused = false
) {
    const entityHistory = await _getEntityVisibilityHistory(entityId, tagNames, intents, modelIds, promptId, includePaused);
    return _getCompetitorVisibilityHistory(entityId, entityHistory, tagNames, intents, modelIds, promptId, includePaused);
}

async function _getCompetitorVisibilityHistory(
    entityId: string,
    entityHistory: EntityHistoryPoint[],
    tagNames?: string[],
    intents?: string[],
    modelIds?: string[],
    promptId?: string,
    includePaused = false
) {
    const resolvedModels = modelIds ? await resolveModelIds(entityId, modelIds) : [];

    const { params, promptIdCondition, tagCondition, pausedCondition, intentCondition, modelCondition, tagJoin } =
        buildSqlConditions(entityId, {
            tagNames,
            intents,
            resolvedModels: resolvedModels.length > 0 ? resolvedModels : undefined,
            promptId,
            includePaused
        });

    const query = `
        SELECT
            DATE("AnalysisResult"."createdAt") as date,
            "AnalysisMention"."competitorId",
            "Competitor"."name" as name,
            COUNT(DISTINCT "AnalysisMention"."id")::int as mentioned,
            AVG(NULLIF("AnalysisMention"."position", 0))::float as avg_position
        FROM "AnalysisMention"
        JOIN "AnalysisResult" ON "AnalysisMention"."analysisResultId" = "AnalysisResult"."id"
        JOIN "Prompt" ON "AnalysisResult"."promptId" = "Prompt"."id"
        JOIN "Competitor" ON "AnalysisMention"."competitorId" = "Competitor"."id"
        ${tagJoin}
        WHERE "Prompt"."entityId" = $1
        AND "AnalysisResult"."status" = 'success'
        ${pausedCondition}
        ${promptIdCondition}
        ${tagCondition}
        ${intentCondition}
        ${modelCondition}
        GROUP BY DATE("AnalysisResult"."createdAt"), "AnalysisMention"."competitorId", "Competitor"."name"
        ORDER BY date ASC
    `;

    const mentions = await prisma.$queryRawUnsafe<CompetitorMentionRow[]>(query, ...params);

    // Group by Competitor
    const competitorsMap = new Map<string, { id: string; name: string; history: CompetitorHistoryPoint[] }>();

    const getTotalForDate = (date: Date) => {
        const dStr = date.toISOString().split('T')[0];
        const dayStat = entityHistory.find(h => {
            const hDate = new Date(h.date).toISOString().split('T')[0];
            return hDate === dStr;
        });
        return dayStat ? dayStat.total : 0;
    };

    mentions.forEach(row => {
        if (!competitorsMap.has(row.competitorId)) {
            competitorsMap.set(row.competitorId, {
                id: row.competitorId,
                name: row.name,
                history: []
            });
        }

        const total = getTotalForDate(row.date);
        const visibility = total > 0 ? (row.mentioned / total) * 100 : 0;

        competitorsMap.get(row.competitorId)?.history.push({
            date: row.date,
            mentioned: row.mentioned,
            total,
            visibility,
            position: row.avg_position !== null ? row.avg_position : null
        });
    });

    return Array.from(competitorsMap.values());
}
