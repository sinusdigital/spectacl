import { prisma } from "@/lib/prisma";
import { updateEntityMetrics, updatePromptMetrics } from "@/lib/metrics";
import { createLLMProvider } from "@/lib/llm/factory";
import { runAnalysisParsers } from "@/lib/parsers";
import { calculatePositions } from "@/lib/parsers/positions";
import { processBrandSuggestions } from "./suggestions";
import { getSpaceModelConfigs, type ResolvedModelConfig } from "./spaces";
import { updateSourceStats } from "./sourceStats";
import { getProviderLimiter } from "@/lib/queue/rateLimiter";
import { withLLMRetry } from "@/lib/llm/retry";
import { SystemSettings } from "@/lib/settings";
import { getInternalTaskModel } from "@/lib/internal-models";



/**
 * Stage 1: Create pending records immediately.
 * Call this from the Next.js API route.
 */
export async function createPendingAnalysisRecords(promptId: string, existingCheckRunId?: string) {
    console.log(`[Analysis] Preparation started for prompt: ${promptId}`);

    const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
            entity: true
        }
    });

    if (!prompt) {
        throw new Error("Prompt not found");
    }

    if (!prompt.entity.spaceId) {
        throw new Error("Entity must belong to a space");
    }

    // Ranking prompts pin to a single model by design; the model is now resolved
    // from InternalTaskModel('ranking') and may be outside the customer-facing
    // GlobalModel registry. Keep prompt.llms in sync for backward compatibility.
    const isRankingPrompt = prompt.intent === 'Competitor Analysis';
    if (isRankingPrompt) {
        const rankingModel = await getInternalTaskModel('ranking');
        const rankingPin = rankingModel.modelId;
        if (!prompt.llms || !Array.isArray(prompt.llms) || prompt.llms[0] !== rankingPin) {
            console.log(`[Analysis] Pinning ranking prompt ${promptId} to internal task model: ${rankingModel.provider}/${rankingPin}`);
            await prisma.prompt.update({ where: { id: promptId }, data: { llms: [rankingPin] } });
            prompt.llms = [rankingPin];
        }

        const checkRunId = existingCheckRunId ?? (await prisma.checkRun.create({ data: {} })).id;
        const pending = await prisma.analysisResult.create({
            data: {
                promptId: prompt.id,
                checkRunId,
                llmModel: rankingModel.displayName ?? `${rankingModel.provider}/${rankingPin}`,
                llmProvider: rankingModel.provider,
                response: "",
                status: 'pending',
                mentioned: false,
            },
        });
        return [pending.id];
    }

    // Fetch space model configs
    const { configs: spaceConfigs, llmProvider } = await getSpaceModelConfigs(prompt.entity.spaceId);
    const modelConfigs = spaceConfigs.filter(c => c.isEnabled && c.hasApiKey);
    console.log(`[Analysis] Available enabled configs with API keys: ${modelConfigs.length} (${modelConfigs.map(c => c.name).join(', ')})`);

    // Determine target models
    let targetConfigs: ResolvedModelConfig[] = [];
    if (llmProvider === 'MANAGED') {
        // MANAGED mode: the platform owns the roster. Always fan out across every
        // currently-enabled master-key model, ignoring the prompt's frozen llms list
        // so newly-added providers fire immediately instead of staying silent.
        targetConfigs = modelConfigs;
        if (prompt.llms && Array.isArray(prompt.llms) && prompt.llms.length > 0) {
            const stored = prompt.llms as string[];
            const covered = new Set(modelConfigs.flatMap(c => [c.id, c.modelId, c.name]));
            const stale = stored.filter(id => !covered.has(id));
            const missing = modelConfigs
                .filter(c => !stored.includes(c.id) && !stored.includes(c.modelId) && !stored.includes(c.name))
                .map(c => c.name);
            if (stale.length > 0 || missing.length > 0) {
                console.log(`[Analysis] MANAGED mode — ignoring prompt.llms. stale=[${stale.join(', ')}] newly-enabled=[${missing.join(', ')}]`);
            }
        }
    } else if (prompt.llms && Array.isArray(prompt.llms) && prompt.llms.length > 0) {
        targetConfigs = modelConfigs.filter(c =>
            prompt.llms.includes(c.id) || prompt.llms.includes(c.modelId) || prompt.llms.includes(c.name)
        );
        // Fallback: if prompt.llms specified but nothing matched, use all enabled configs.
        if (targetConfigs.length === 0) {
            console.warn(`[Analysis] prompt.llms [${prompt.llms.join(', ')}] matched nothing in enabled configs — falling back to all enabled configs`);
            targetConfigs = modelConfigs;
        }
    } else {
        targetConfigs = modelConfigs;
    }
    console.log(`[Analysis] Target configs after filtering by preferred LLMs: ${targetConfigs.length}`);

    const checkRunId = existingCheckRunId ?? (await prisma.checkRun.create({ data: {} })).id;

    if (targetConfigs.length === 0) {
        // Create a single failure record if no models
        await prisma.analysisResult.create({
            data: {
                promptId: prompt.id,
                checkRunId: checkRunId,
                llmModel: "System",
                response: "",
                status: 'failed',
                errorMessage: "No active models configured.",
                mentioned: false,
            },
        });
        return [];
    }

    // Create PENDING records
    console.log(`[Analysis] Creating ${targetConfigs.length} pending records...`);
    const pendingResults = await Promise.all(targetConfigs.map(async (config: ResolvedModelConfig) => {
        return prisma.analysisResult.create({
            data: {
                promptId: prompt.id,
                checkRunId: checkRunId,
                llmModel: config.name,
                llmProvider: config.provider,
                response: "",
                status: 'pending',
                mentioned: false,
            }
        });
    }));

    // Return IDs to be enqueued
    return pendingResults.map(r => r.id);
}

/**
 * Stage 2: Execute the job.
 * Call this from the BullMQ Worker.
 */
export async function executeAnalysisJob(promptId: string, resultIds: string[]) {
    console.log(`[Analysis] Execution started for ${resultIds.length} results on prompt ${promptId}`);

    const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
            entity: {
                include: {
                    competitors: true
                }
            }
        }
    });

    if (!prompt) throw new Error("Prompt not found during execution");

    const entity = prompt.entity;
    const competitors = entity.competitors || [];

    if (!entity.spaceId) {
        throw new Error("Entity must belong to a space");
    }

    // Look up space credit balance (used for deduction after each LLM call)
    const space = await prisma.space.findUnique({
        where: { id: entity.spaceId },
        select: { llmCreditsRemaining: true },
    });
    if (!space) {
        throw new Error(`Space ${entity.spaceId} not found — cannot execute analysis`);
    }
    // Self-hosted mode: all credits are unlimited (no billing enforcement)
    const { isSelfHosted } = await import('@/lib/mode');
    const isUnlimitedCredits = isSelfHosted() || space.llmCreditsRemaining === -1;

    // Check if negative credits are allowed (admin toggle — handles mid-cycle model drift)
    const allowNegativeCredits = isUnlimitedCredits
        ? false
        : (await SystemSettings.get('allow_negative_credits')) === 'true';

    const isRankingPrompt = prompt.intent === 'Competitor Analysis';

    // For ranking prompts, the model is platform-internal (may be outside GlobalModel registry).
    // For all other prompts, resolve via space configs.
    const rankingTaskModel = isRankingPrompt ? await getInternalTaskModel('ranking') : null;

    // Fetch space model configs — fetch ALL (including disabled) so Stage 2 can always
    // resolve a config by name. Stage 1 already gated on key availability.
    const { configs: spaceConfigs } = isRankingPrompt
        ? { configs: [] as ResolvedModelConfig[] }
        : await getSpaceModelConfigs(entity.spaceId, { includeDisabled: true });

    // Fetch maxOutputTokens from GlobalModel registry keyed by modelId
    const globalModels = isRankingPrompt
        ? []
        : await prisma.globalModel.findMany({
            where: { modelId: { in: spaceConfigs.map(c => c.modelId) } },
            select: { modelId: true, maxOutputTokens: true }
        });
    const maxOutputTokensMap = new Map(globalModels.map(gm => [gm.modelId, gm.maxOutputTokens]));

    // Fetch the specific pending records we need to process
    const resultsToProcess = await prisma.analysisResult.findMany({
        where: { id: { in: resultIds } }
    });

    await Promise.all(resultsToProcess.map(async (record) => {
        try {
            let config: { provider: string; modelId: string; name: string; apiKey: string };
            let maxOutputTokens: number;

            if (rankingTaskModel) {
                config = {
                    provider: rankingTaskModel.provider,
                    modelId: rankingTaskModel.modelId,
                    name: rankingTaskModel.displayName ?? `${rankingTaskModel.provider}/${rankingTaskModel.modelId}`,
                    apiKey: rankingTaskModel.apiKey,
                };
                // Ranking prompts produce large structured JSON — ensure ample tokens
                maxOutputTokens = Math.max(rankingTaskModel.maxOutputTokens, 4096);
            } else {
                // Find config by name (matches what was stored in llmModel during Stage 1).
                // Also fall back to matching by id/modelId in case the display name changed.
                const spaceConfig = spaceConfigs.find(c => c.name === record.llmModel)
                    ?? spaceConfigs.find(c => c.id === record.llmModel || c.modelId === record.llmModel);
                if (!spaceConfig) throw new Error(`Configuration for "${record.llmModel}" not found — available: [${spaceConfigs.map(c => c.name).join(', ')}]`);
                if (!spaceConfig.apiKey) throw new Error(`No API key for model "${spaceConfig.name}" — ensure the master key is set in Admin`);
                config = {
                    provider: spaceConfig.provider,
                    modelId: spaceConfig.modelId,
                    name: spaceConfig.name,
                    apiKey: spaceConfig.apiKey,
                };
                maxOutputTokens = maxOutputTokensMap.get(spaceConfig.modelId) ?? 1500;
            }

            // Update status to 'running' and set initial progress
            await prisma.analysisResult.update({
                where: { id: record.id },
                data: {
                    status: 'running',
                    progressStep: 'Initializing...'
                }
            });

            console.log(`[Analysis] [${config.name}] Generating...`);

            // Update progress: Waiting for LLM
            await prisma.analysisResult.update({
                where: { id: record.id },
                data: { progressStep: `Waiting for ${config.name}...` }
            });

            // Credit exhaustion guard: check remaining credits before each LLM call.
            // Skipped when negative credits are enabled (admin toggle for mid-cycle model drift).
            if (!isUnlimitedCredits && !allowNegativeCredits) {
                const creditCheck = await prisma.space.findUnique({
                    where: { id: entity.spaceId! },
                    select: { llmCreditsRemaining: true },
                });
                if (!creditCheck || creditCheck.llmCreditsRemaining <= 0) {
                    throw new Error(`Credit limit reached for space ${entity.spaceId} — skipping LLM call`);
                }
            }

            const provider = createLLMProvider(config, config.apiKey ?? undefined, maxOutputTokens);
            const limiter = getProviderLimiter(config.provider);
            const contextualText = prompt.language
                ? `${prompt.text}\n\nContext: Answer from the perspective of the ${prompt.language} market.`
                : prompt.text;
            const start = Date.now();
            const llmRes = await limiter.schedule(() =>
                withLLMRetry(() => provider.generate(contextualText), `${config.provider}/${config.modelId}`)
            );
            const duration = Date.now() - start;
            console.log(`[Analysis] [${config.name}] Done inside ${duration}ms (rate-limited via ${config.provider})`);

            // Deduct 1 credit for this successful LLM call (skip unlimited spaces).
            if (!isUnlimitedCredits) {
                if (allowNegativeCredits) {
                    // Negative credits enabled: always deduct, let balance go below zero.
                    // Admin monitors spaces with negative balances for misuse.
                    await prisma.space.update({
                        where: { id: entity.spaceId! },
                        data: {
                            llmCreditsRemaining: { decrement: 1 },
                            llmCreditsUsed: { increment: 1 },
                        },
                    });
                } else {
                    // Strict mode: atomic floor check prevents concurrent workers pushing credits negative.
                    const updated = await prisma.space.updateMany({
                        where: { id: entity.spaceId!, llmCreditsRemaining: { gt: 0 } },
                        data: {
                            llmCreditsRemaining: { decrement: 1 },
                            llmCreditsUsed: { increment: 1 },
                        },
                    });
                    if (updated.count === 0) {
                        console.warn(`[Analysis] Credit deduction skipped — space ${entity.spaceId} already at 0`);
                    }
                }
            }

            // Update progress: Analyzing response
            await prisma.analysisResult.update({
                where: { id: record.id },
                data: { progressStep: 'Analyzing response...' }
            });

            const responseText = llmRes.text;

            // --- Parsing Logic (Same as before) ---
            const analysisData = await runAnalysisParsers(entity, competitors, responseText);

            const entityAliases = entity.aliases || [];
            const allTargets = [
                entity.name, ...entityAliases,
                ...competitors.flatMap(c => [c.name, ...(c.aliases || [])])
            ].filter(Boolean) as string[];

            const positionMap = calculatePositions(responseText, allTargets);

            const getBestPosition = (names: string[]) => {
                const positions = names.map(n => positionMap.get(n.toLowerCase()))
                    .filter(p => p !== undefined && p !== null) as number[];
                return positions.length > 0 ? Math.min(...positions) : null;
            };

            const isMentioned = analysisData.mentioned ?? false;
            const entityPosition = getBestPosition([entity.name, ...entityAliases]);

            // Link Extraction
            const urlRegex = /(https?:\/\/[^\s()]+(?:\([^)\s]*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g;
            const foundUrls = responseText.match(urlRegex) || [];

            // Update progress: Saving
            await prisma.analysisResult.update({
                where: { id: record.id },
                data: { progressStep: 'Saving results...' }
            });

            // Update to Success
            await prisma.analysisResult.update({
                where: { id: record.id },
                data: {
                    response: responseText,

                    position: entityPosition,
                    mentioned: isMentioned,
                    status: 'success',
                    progressStep: null, // Clear progress on success
                    errorMessage: null,

                    mentions: {
                        create: analysisData.mentions?.map(m => {
                            let pos = null;
                            if (m.isPrimaryEntity) {
                                pos = entityPosition;
                            } else if (m.competitorId) {
                                const comp = competitors.find(c => c.id === m.competitorId);
                                if (comp) {
                                    const aliases = comp.aliases || [];
                                    pos = getBestPosition([comp.name, ...aliases]);
                                }
                            }
                            if (pos === null) {
                                pos = getBestPosition([m.detectedName]);
                            }
                            return {
                                isPrimaryEntity: m.isPrimaryEntity,
                                detectedName: m.detectedName,
                                competitorId: m.competitorId,
                                position: pos
                            };
                        })
                    },
                    links: {
                        create: (() => {
                            const uniqueCleanLinks = new Map<string, string>();
                            foundUrls.forEach(url => {
                                try {
                                    const cleanUrl = url;
                                    if (!cleanUrl) return;
                                    const domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
                                    uniqueCleanLinks.set(cleanUrl, domain);
                                } catch { /* invalid URL */ }
                            });
                            return Array.from(uniqueCleanLinks.entries()).map(([url, domain]) => ({ url, domain }));
                        })()
                    }
                }
            });

            // Update source statistics for this result
            await updateSourceStats(promptId, record.id);

        } catch (error: unknown) {
            console.error(`[Analysis] [${record.llmModel}] Failed:`, error);
            await prisma.analysisResult.update({
                where: { id: record.id },
                data: {
                    status: 'failed',
                    progressStep: null,
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }));

    // Post-analysis tasks
    await prisma.prompt.update({
        where: { id: promptId },
        data: { lastRunAt: new Date() }
    });

    await updateEntityMetrics(entity.id);
    await updatePromptMetrics(promptId);


    // Suggestions
    // Note: We might want to move this to a separate job in the future
    const freshResults = await prisma.analysisResult.findMany({
        where: { id: { in: resultIds }, status: 'success' },
        select: { id: true, response: true },
    });
    const resultPairs = freshResults.map(r => ({ analysisResultId: r.id, response: r.response }));

    if (resultPairs.length > 0) {
        await processBrandSuggestions(entity.id, entity.name, resultPairs);
    }
}


/**
 * Rescans all successful answers for an entity to detect mentions of new competitors.
 * This should be called when a competitor is added.
 */
export async function rescanEntityAnswers(entityId: string) {
    console.log(`[Analysis] Rescanning answers for entity: ${entityId}`);

    const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        include: {
            competitors: true
        }
    });

    if (!entity) throw new Error("Entity not found");
    
    const competitors = entity.competitors || [];

    // Fetch confirmed successful results
    const results = await prisma.analysisResult.findMany({
        where: {
            prompt: { entityId },
            status: 'success'
        },
        include: {
            mentions: true
        }
    });

    console.log(`[Analysis] Found ${results.length} results to rescan`);

    for (const record of results) {
        try {
            // Re-run parsers with current competitor list
            const analysisData = await runAnalysisParsers(entity, competitors, record.response);

            // Recalculate positions based on updated name list
            const entityAliases = entity.aliases || [];
            const allTargets = [
                entity.name, ...entityAliases,
                ...competitors.flatMap(c => [c.name, ...(c.aliases || [])])
            ].filter(Boolean) as string[];

            const positionMap = calculatePositions(record.response, allTargets);
            
            const getBestPosition = (names: string[]) => {
                const positions = names.map(n => positionMap.get(n.toLowerCase()))
                    .filter(p => p !== undefined && p !== null) as number[];
                return positions.length > 0 ? Math.min(...positions) : null;
            };

            const isMentioned = analysisData.mentioned ?? false;
            const entityPosition = getBestPosition([entity.name, ...entityAliases]);

            // Create new mention objects
            const newMentionsData = analysisData.mentions?.map(m => {
                let pos = null;
                if (m.isPrimaryEntity) {
                    pos = entityPosition;
                } else if (m.competitorId) {
                    const comp = competitors.find(c => c.id === m.competitorId);
                    if (comp) {
                        const aliases = comp.aliases || [];
                        pos = getBestPosition([comp.name, ...aliases]);
                    }
                }
                if (pos === null) {
                    pos = getBestPosition([m.detectedName]);
                }
                return {
                    isPrimaryEntity: m.isPrimaryEntity,
                    detectedName: m.detectedName,
                    competitorId: m.competitorId,
                    position: pos
                };
            }) || [];

            // Update in transaction: delete old mentions, create new ones, update result fields
            await prisma.$transaction(async (tx) => {
                // Delete only parser-generated mentions. Brand-extraction mentions
                // (suggestedCompetitorId set, competitorId null) aren't recreated by
                // the rescan path — wiping them would make every previously-suggested
                // brand vanish from Detected Brands every time anyone tracks anything.
                await tx.analysisMention.deleteMany({
                    where: {
                        analysisResultId: record.id,
                        suggestedCompetitorId: null,
                    },
                });

                // Update result and create new mentions
                await tx.analysisResult.update({
                    where: { id: record.id },
                    data: {
                        mentioned: isMentioned,
                        position: entityPosition,
                        // Update sentiment if needed, but usually stays same unless we want to re-parse it
                        // sentiment: analysisData.sentiment ?? record.sentiment, 
                        mentions: {
                            create: newMentionsData
                        }
                    }
                });
            });

        } catch (error) {
            console.error(`[Analysis] Failed to rescan result ${record.id}:`, error);
        }
    }

    // Update metrics after ensuring all data is fresh
    await updateEntityMetrics(entity.id);

    // Update individual prompt metrics so the Prompts Table updates immediately
    const prompts = await prisma.prompt.findMany({
        where: { entityId },
        select: { id: true }
    });

    console.log(`[Analysis] Updating metrics for ${prompts.length} prompts`);
    for (const p of prompts) {
        await updatePromptMetrics(p.id);
    }

    console.log(`[Analysis] Rescan complete for entity: ${entityId}`);
}
