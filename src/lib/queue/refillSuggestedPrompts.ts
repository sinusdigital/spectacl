/**
 * Worker handler for the `refill-suggested-prompts` job.
 *
 * Called by both manual discovery (modal submit, priority 1) and auto refill
 * (accept/reject hits zero suggestions, priority 5). Same code path — only the
 * `source` field differs so we can apply a per-entity cooldown to the auto path.
 */

import { prisma } from "@/lib/prisma";
import { isSelfHosted } from "@/lib/mode";
import { SystemSettings } from "@/lib/settings";
import { generateSuggestions, GenerateSuggestionsInputs } from "@/lib/prompts/generateSuggestions";
import { getInternalTaskModel } from "@/lib/internal-models";
import { analysisQueue } from "./analysisQueue";
import connection from "./connection";

const COOLDOWN_SECONDS = 120;
const AVOID_TEXTS_LIMIT = 10;

export interface RefillJobData {
    entityId: string;
    count?: number;
    source: "manual" | "auto";
}

function parseDiscoveryInputs(raw: unknown): GenerateSuggestionsInputs | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const entityDescription = typeof r.entityDescription === "string" ? r.entityDescription : "";
    const personas = typeof r.personas === "string" ? r.personas : "";
    if (!entityDescription.trim() || !personas.trim()) return null;
    return {
        entityName: "", // filled in by caller from entity.name
        entityDescription,
        personas,
        entityDomain: typeof r.entityDomain === "string" ? r.entityDomain : undefined,
        language: typeof r.language === "string" ? r.language : undefined,
    };
}

export async function executeRefillSuggestedPrompts(data: RefillJobData): Promise<void> {
    const { entityId, count, source } = data;

    const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        select: {
            id: true,
            name: true,
            spaceId: true,
            discoveryInputs: true,
        },
    });

    if (!entity) {
        console.warn(`[Refill] entity ${entityId} not found — skipping`);
        return;
    }
    if (!entity.spaceId) {
        console.warn(`[Refill] entity ${entityId} has no space — skipping`);
        return;
    }

    const baseInputs = parseDiscoveryInputs(entity.discoveryInputs);
    if (!baseInputs) {
        console.warn(`[Refill] entity ${entityId} has no discoveryInputs — skipping (user needs to run manual discovery first)`);
        return;
    }

    // Gate: space lock
    const space = await prisma.space.findUnique({
        where: { id: entity.spaceId },
        select: { isLocked: true, llmCreditsRemaining: true },
    });
    if (!space) {
        console.warn(`[Refill] space ${entity.spaceId} not found — skipping`);
        return;
    }
    if (space.isLocked) {
        console.warn(`[Refill] space ${entity.spaceId} is locked — skipping`);
        return;
    }

    // Gate: credit exhaustion (skip, don't deduct — credits belong to analysis)
    const isUnlimitedCredits = isSelfHosted() || space.llmCreditsRemaining === -1;
    const allowNegativeCredits = isUnlimitedCredits
        ? true
        : (await SystemSettings.get("allow_negative_credits")) === "true";
    if (!isUnlimitedCredits && !allowNegativeCredits && space.llmCreditsRemaining <= 0) {
        console.warn(`[Refill] space ${entity.spaceId} out of credits — skipping`);
        return;
    }

    // Resolve internal task model (platform-internal, env-keyed — not customer BYOK)
    let modelConfig;
    try {
        modelConfig = await getInternalTaskModel('suggested_prompts');
    } catch (err) {
        console.warn(`[Refill] internal task model unavailable for suggested_prompts:`, err);
        return;
    }

    // Build "avoid" list from existing prompts (tracked + already-suggested) to reduce near-duplicates
    const [existingPrompts, existingSuggestions] = await Promise.all([
        prisma.prompt.findMany({
            where: { entityId },
            select: { text: true },
            orderBy: { createdAt: "desc" },
            take: AVOID_TEXTS_LIMIT,
        }),
        prisma.suggestedPrompt.findMany({
            where: { entityId, status: { in: ["suggested", "accepted"] } },
            select: { text: true },
            orderBy: { createdAt: "desc" },
            take: AVOID_TEXTS_LIMIT,
        }),
    ]);
    const avoidTexts = Array.from(
        new Set([...existingPrompts, ...existingSuggestions].map(p => p.text))
    ).slice(0, AVOID_TEXTS_LIMIT);

    // Generate
    const inputs: GenerateSuggestionsInputs = {
        ...baseInputs,
        entityName: entity.name,
        targetCount: count,
        avoidTexts,
    };

    const results = await generateSuggestions(modelConfig, inputs);

    if (results.length === 0) {
        console.warn(`[Refill] LLM returned 0 prompts for entity ${entityId} — giving up for this run`);
        return;
    }

    // Persist. Unique (entityId, text) + skipDuplicates keeps exact dupes out.
    const created = await prisma.suggestedPrompt.createMany({
        data: results.map(r => ({
            text: r.text,
            intent: r.intent,
            entityId,
            status: "suggested",
        })),
        skipDuplicates: true,
    });
    console.log(`[Refill] entity ${entityId} source=${source} — persisted ${created.count}/${results.length} new suggestions`);

    // Per-entity cooldown — only for auto refills triggered by accept/reject.
    // Manual modal submits respect the user's explicit button press.
    if (source === "auto" && created.count > 0) {
        try {
            await connection.set(`refill:cooldown:${entityId}`, "1", "EX", COOLDOWN_SECONDS);
        } catch (err) {
            console.warn(`[Refill] failed to set cooldown key for ${entityId}:`, err);
        }
    }
}

/**
 * Called from accept/reject routes after the mutation.
 * Checks if the entity just hit 0 remaining suggestions; if so, and inputs
 * are persisted, and no cooldown is active, enqueues an auto refill job.
 *
 * Fire-and-forget in practice — failures only log, never throw.
 *
 * Returns `true` if a refill was enqueued so the caller can surface it to the
 * client (who uses the flag to flip `isGeneratingDiscovery` and start polling).
 */
export async function maybeEnqueueAutoRefill(entityId: string): Promise<boolean> {
    try {
        const remaining = await prisma.suggestedPrompt.count({
            where: { entityId, status: "suggested" },
        });
        if (remaining > 0) return false;

        const entity = await prisma.entity.findUnique({
            where: { id: entityId },
            select: { discoveryInputs: true },
        });
        if (!entity?.discoveryInputs) return false;

        const cooldownKey = `refill:cooldown:${entityId}`;
        const inCooldown = await connection.exists(cooldownKey);
        if (inCooldown) {
            console.log(`[Refill] entity ${entityId} in cooldown — skipping auto enqueue`);
            return false;
        }

        await analysisQueue.add(
            "refill-suggested-prompts",
            { entityId, count: 3, source: "auto" },
            {
                jobId: `refill-suggested-${entityId}`,
                priority: 5,
            }
        );
        return true;
    } catch (err) {
        console.warn(`[Refill] maybeEnqueueAutoRefill failed for ${entityId}:`, err);
        return false;
    }
}
