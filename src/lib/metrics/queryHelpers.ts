/**
 * Shared query construction helpers for metrics.
 * Model resolution, Prisma WHERE builders, raw SQL condition builders.
 */

import { prisma } from "@/lib/prisma";

/**
 * Resolve model IDs to all possible name variants for matching.
 * Checks modelConfig (entity-level), DEFAULT_MODELS (global), and includes raw IDs.
 *
 * Previously duplicated 3× across getDynamicMetrics, _getEntityVisibilityHistory,
 * and _getCompetitorVisibilityHistory.
 */
export async function resolveModelIds(entityId: string, modelIds: string[]): Promise<string[]> {
    if (!modelIds || modelIds.length === 0) return [];

    const configs = await prisma.modelConfig.findMany({
        where: {
            entityId,
            modelId: { in: modelIds }
        }
    });

    const { DEFAULT_MODELS } = await import("@/types/models");

    const names = new Set<string>();
    modelIds.forEach(id => {
        names.add(id); // Add ID itself just in case
        const config = configs.find(c => c.modelId === id);
        if (config?.name) names.add(config.name);
        const supported = DEFAULT_MODELS.find(m => m.id === id);
        if (supported?.name) names.add(supported.name);
    });

    return Array.from(names);
}

/** Options for building analysis result WHERE clauses */
export interface FilterOptions {
    tagNames?: string[];
    intents?: string[];
    promptId?: string;
    resolvedModels?: string[];
    includePaused?: boolean;
}

/**
 * Build a Prisma WHERE clause for AnalysisResult queries.
 *
 * Previously duplicated as baseWhere/prevBaseWhere in getDynamicMetrics (lines 283-331).
 * Now called twice with different date ranges:
 *   buildAnalysisResultWhere(entityId, { gte: startDate }, opts)
 *   buildAnalysisResultWhere(entityId, { gte: prevStartDate, lt: startDate }, opts)
 */
export function buildAnalysisResultWhere(
    entityId: string,
    dateRange: { gte?: Date; lt?: Date },
    options: FilterOptions = {}
) {
    const { tagNames, intents, promptId, resolvedModels, includePaused } = options;
    const hasTags = tagNames && tagNames.length > 0;
    const hasIntents = intents && intents.length > 0;
    const hasModels = resolvedModels && resolvedModels.length > 0;

    return {
        prompt: {
            entityId,
            ...(promptId ? { id: promptId } : { ranking: { is: null } }),
            ...(hasTags ? {
                tags: {
                    some: {
                        name: { in: tagNames }
                    }
                }
            } : {}),
            ...(hasIntents ? {
                intent: { in: intents as ('Informational' | 'Commercial' | 'Navigational' | 'Transactional')[] }
            } : {}),
            ...(!includePaused ? { status: 'Running' as const } : {})
        },
        createdAt: dateRange,
        status: 'success',
        ...(hasModels ? {
            llmModel: { in: resolvedModels }
        } : {})
    };
}

/** Result from buildSqlConditions */
export interface SqlConditions {
    params: any[];
    promptIdCondition: string;
    tagCondition: string;
    pausedCondition: string;
    intentCondition: string;
    modelCondition: string;
    tagJoin: string;
}

/**
 * Build raw SQL conditions for history queries.
 *
 * Previously duplicated between _getEntityVisibilityHistory (lines 619-648)
 * and _getCompetitorVisibilityHistory (lines 720-749). Identical logic.
 */
export function buildSqlConditions(
    entityId: string,
    options: {
        tagNames?: string[];
        intents?: string[];
        resolvedModels?: string[];
        promptId?: string;
        includePaused?: boolean;
    }
): SqlConditions {
    const { tagNames, intents, resolvedModels, promptId, includePaused } = options;
    const hasTags = tagNames && tagNames.length > 0;
    const hasIntents = intents && intents.length > 0;
    const hasModels = resolvedModels && resolvedModels.length > 0;

    const params: any[] = [entityId];
    let paramIdx = 2;

    let promptIdCondition = '';
    if (promptId) {
        params.push(promptId);
        promptIdCondition = `AND "Prompt"."id" = $${paramIdx++}`;
    } else {
        promptIdCondition = `AND NOT EXISTS (SELECT 1 FROM "Ranking" WHERE "Ranking"."promptId" = "Prompt"."id")`;
    }

    let tagCondition = '';
    if (hasTags) {
        params.push(tagNames);
        tagCondition = `AND "Tag"."name" = ANY($${paramIdx++})`;
    }

    const pausedCondition = !includePaused ? `AND "Prompt"."status" = 'Running'` : '';

    let intentCondition = '';
    if (hasIntents) {
        params.push(intents);
        intentCondition = `AND "Prompt"."intent" = ANY($${paramIdx++})`;
    }

    let modelCondition = '';
    if (hasModels) {
        params.push(resolvedModels);
        modelCondition = `AND "AnalysisResult"."llmModel" = ANY($${paramIdx++})`;
    }

    const tagJoin = hasTags ? `
        JOIN "_PromptToTag" ON "Prompt"."id" = "_PromptToTag"."A"
        JOIN "Tag" ON "_PromptToTag"."B" = "Tag"."id"
    ` : '';

    return {
        params,
        promptIdCondition,
        tagCondition,
        pausedCondition,
        intentCondition,
        modelCondition,
        tagJoin
    };
}
