import { prisma } from "@/lib/prisma";
import { createLLMProvider } from "@/lib/llm/factory";
import { scrapeWebsiteContent } from "@/lib/scraper";
import { getInternalTaskModel } from "@/lib/internal-models";
import type { AeoPlaybookItem } from "@prisma/client";
import { runEngine, type RankedPlaybookItem } from "./engine";
import type { TriggerResult } from "./triggers";

/** Persisted on EntitySuggestion.triggerContext for items selected via fired
 *  triggers. The drawer reads this to render "Suggested because…". */
export interface TriggerContext {
    fired: { kind: string; weight: number; value?: number | string | null; explanation?: string }[];
    totalWeight: number;
}

export interface SelectedTactic {
    item: AeoPlaybookItem;
    personalizedDescription: string;
    /** null when the item came from the engine's baseline (no triggers fired). */
    triggerContext: TriggerContext | null;
}

export interface SelectionResult {
    tactics: SelectedTactic[];
    /** Raw LLM text — useful for admin preview/debug. Empty when personalization
     *  was skipped. */
    rawLlmText: string;
}

export class AeoSelectionError extends Error {
    constructor(message: string, public readonly code: "no_website" | "scrape_failed" | "model_unavailable" | "no_playbook" | "parse_failed") {
        super(message);
        this.name = "AeoSelectionError";
    }
}

/**
 * Phase 4 selector: deterministic selection via the trigger engine, with
 * decoupled + cached LLM personalization on the chosen items only.
 *
 * Flow:
 *   1. Engine ranks playbook items by fired-trigger weight → top 8.
 *   2. Cache check: for each picked item, if an existing Suggested row already
 *      has a personalized description (≠ playbook default), reuse it. Skips
 *      LLM for that item.
 *   3. Credit guard: if the entity's space is out of credits, skip the LLM
 *      entirely. Items without a cache hit fall back to the playbook default.
 *   4. LLM call (if any items remain) — only personalizes the cache-misses.
 *   5. Return SelectedTactic[] with triggerContext attached so the drawer can
 *      render "Suggested because…".
 *
 * The engine is the selector; the LLM is a personalizer with a cheap fallback.
 */
export async function selectTacticsForEntity(entityId: string): Promise<SelectionResult> {
    const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, website: true, spaceId: true },
    });

    if (!entity?.website) {
        throw new AeoSelectionError("Entity has no website URL defined.", "no_website");
    }

    // 1. Engine selection. Throws "no_playbook" if there are zero active items.
    const ranked = await runEngine(entityId, { topN: 8 });
    if (ranked.length === 0) {
        throw new AeoSelectionError("No active AEO playbook items found. Configure tactics on /admin/aeo-playbook.", "no_playbook");
    }

    // 2. Cache check. Load existing Suggested rows for the engine-picked slugs;
    //    a row whose description differs from the playbook default was
    //    personalized previously and is safe to reuse.
    const slugs = ranked.map((r) => r.item.slug);
    const existingRows = await prisma.entitySuggestion.findMany({
        where: { entityId, tacticId: { in: slugs }, status: "Suggested" },
        select: { tacticId: true, description: true },
    });
    const cachedBySlug = new Map<string, string>();
    for (const row of existingRows) {
        if (!row.tacticId) continue;
        const item = ranked.find((r) => r.item.slug === row.tacticId)?.item;
        if (!item) continue;
        if (row.description && row.description !== item.description) {
            cachedBySlug.set(row.tacticId, row.description);
        }
    }
    const itemsNeedingLLM = ranked.filter((r) => !cachedBySlug.has(r.item.slug));

    // 3. Credit guard. Spaces with `llmCreditsRemaining === -1` are unlimited
    //    (self-hosted, FOUNDER); otherwise require > 0 to spend on personalization.
    let canPersonalize = true;
    if (entity.spaceId) {
        const space = await prisma.space.findUnique({
            where: { id: entity.spaceId },
            select: { llmCreditsRemaining: true },
        });
        if (space) {
            canPersonalize = space.llmCreditsRemaining === -1 || space.llmCreditsRemaining > 0;
        }
    }

    // 4. LLM personalization for the cache-misses, if allowed.
    const personalizedBySlug = new Map<string, string>();
    let rawLlmText = "";

    const shouldCallLLM = canPersonalize && itemsNeedingLLM.length > 0;
    if (shouldCallLLM) {
        const siteContent = await scrapeWebsiteContent(entity.website);
        if (!siteContent || siteContent.length < 500) {
            throw new AeoSelectionError("Could not fetch sufficient content from the website.", "scrape_failed");
        }

        let taskModel;
        try {
            taskModel = await getInternalTaskModel("aeo_personalization");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "AEO personalization model not configured.";
            throw new AeoSelectionError(msg, "model_unavailable");
        }

        const prompt = buildPersonalizationPrompt(entity.name, entity.website, siteContent, itemsNeedingLLM);
        const provider = createLLMProvider(
            { provider: taskModel.provider, modelId: taskModel.modelId, name: taskModel.displayName ?? taskModel.modelId },
            taskModel.apiKey,
            taskModel.maxOutputTokens,
        );
        const llmResponse = await provider.generate(prompt);
        rawLlmText = llmResponse.text;

        let parsed: { tacticId?: string; personalizedDescription?: string }[] = [];
        try {
            const jsonStr = llmResponse.text.replace(/^```json/, "").replace(/```$/, "").trim();
            parsed = JSON.parse(jsonStr);
        } catch {
            throw new AeoSelectionError("Failed to parse analysis results.", "parse_failed");
        }
        for (const row of parsed) {
            if (row.tacticId && row.personalizedDescription) {
                personalizedBySlug.set(row.tacticId, row.personalizedDescription);
            }
        }
    }

    // 5. Combine: cache hit > fresh LLM > playbook default fallback.
    const tactics: SelectedTactic[] = ranked.map((r) => ({
        item: r.item,
        personalizedDescription:
            cachedBySlug.get(r.item.slug) ??
            personalizedBySlug.get(r.item.slug) ??
            r.item.description,
        triggerContext: triggerContextFromRanked(r),
    }));

    return { tactics, rawLlmText };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function triggerContextFromRanked(r: RankedPlaybookItem): TriggerContext | null {
    if (!r.isTriggered) return null;
    return {
        totalWeight: r.totalWeight,
        fired: r.fired.map(serializeTriggerResult),
    };
}

function serializeTriggerResult(t: TriggerResult): TriggerContext["fired"][number] {
    // Strip out the fired flag (always true at this point) and keep only fields
    // useful for "Suggested because…" rendering and audit.
    return {
        kind: (t as TriggerResult & { kind?: string }).kind ?? "unknown",
        weight: t.weight,
        value: t.value ?? null,
        explanation: t.explanation,
    };
}

function buildPersonalizationPrompt(
    entityName: string,
    websiteUrl: string,
    siteContent: string,
    ranked: RankedPlaybookItem[],
): string {
    const tacticsContext = ranked
        .map((r) => {
            const reasonLine = r.isTriggered
                ? `\n  Reason: ${r.fired.map((f) => f.explanation).filter(Boolean).join("; ")}`
                : "";
            return `- ID: ${r.item.slug}\n  Title: ${r.item.title}\n  Channel: ${r.item.channel}\n  Category: ${r.item.category}\n  Default desc: ${r.item.description}${reasonLine}`;
        })
        .join("\n\n");

    return `
[SYSTEM]
You are an expert in Answer Engine Optimization (AEO). The selection has already been done — your only job is to personalize each chosen tactic for this specific entity using concrete examples from their website. Do NOT add or remove tactics.

[CONTEXT: WEBSITE CONTENT]
Target Entity: ${entityName}
URL: ${websiteUrl}
Content Preview:
${siteContent.slice(0, 8000)} ...

[CONTEXT: SELECTED TACTICS]
${tacticsContext}

[INSTRUCTION]
For EACH tactic listed above (by ID), write a "Personalized Description" that uses specific examples from the website content to explain WHY this tactic applies to ${entityName} and HOW to implement it. If a "Reason" is provided, weave it into the explanation. Format the description as markdown — short paragraphs and bullet lists are fine.

[FORMAT]
Return ONLY a raw JSON array (no markdown formatting around the JSON itself).
Structure:
[
  {
    "tacticId": "geo_1",
    "personalizedDescription": "Your 'About' page mentions..."
  },
  ...
]
`;
}
