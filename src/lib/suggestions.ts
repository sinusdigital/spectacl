import { prisma } from "@/lib/prisma";
import { createLLMProvider } from "./llm/factory";
import { getInternalTaskModel } from "./internal-models";

export type BrandSuggestionsResult = {
    skippedReason?:
        | "no-space"
        | "no-llm-config"
        | "empty-input"
        | "llm-parse-failed"
        | "llm-call-failed";
    brandsFound: number;
    newSuggestions: number;
    skippedDuplicates: number;
    llmModel?: string;
    sampleNewNames?: string[];
    error?: string;
};

export interface BrandExtractionResultInput {
    analysisResultId: string;
    response: string;
}

export async function processBrandSuggestions(
    entityId: string,
    entityName: string,
    results: BrandExtractionResultInput[]
): Promise<BrandSuggestionsResult> {
    // 1. Get entity to find space
    const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        select: { spaceId: true }
    });

    if (!entity?.spaceId) {
        console.warn(`[Suggestions] Entity ${entityId} has no space. Skipping brand extraction.`);
        return { skippedReason: "no-space", brandsFound: 0, newSuggestions: 0, skippedDuplicates: 0 };
    }

    // 2. Resolve internal task model (platform-internal, env-keyed — not customer BYOK)
    let taskModel;
    try {
        taskModel = await getInternalTaskModel('brand_extraction');
    } catch (err) {
        console.warn(`[Suggestions] Brand extraction internal model unavailable:`, err);
        return { skippedReason: "no-llm-config", brandsFound: 0, newSuggestions: 0, skippedDuplicates: 0 };
    }

    // Combine contents into a single LLM call (no extra tokens vs. before).
    const fullText = results.map(r => r.response).join("\n\n---\n\n");
    if (!fullText.trim()) {
        return { skippedReason: "empty-input", brandsFound: 0, newSuggestions: 0, skippedDuplicates: 0, llmModel: taskModel.modelId };
    }

    try {
        const provider = createLLMProvider(
            { provider: taskModel.provider, modelId: taskModel.modelId, name: taskModel.displayName ?? taskModel.modelId },
            taskModel.apiKey,
            taskModel.maxOutputTokens,
        );
        const extractionPrompt = `[SYSTEM: CRITICAL INSTRUCTION]
Extract brand names (competitors/partners) and their official websites from the text below.
- PRIMARY ENTITY TO EXCLUDE: "${entityName}"
- FORMAT: Return ONLY a JSON array: [{"name": "Brand", "website": "https://brand.com"}]
- NO INTRO: Do not say "Here is the list".
- NO OUTRO: No additional text.
- NO BOLDING: Do not use **.
- NO_BRANDS: If none found, return ONLY []

TEXT TO ANALYZE:
---
${fullText}
---`;

        const res = await provider.generate(extractionPrompt);
        let brandData: { name: string, website?: string }[] = [];

        try {
            const cleanedText = res.text.trim().replace(/^```json|```$/g, "");
            brandData = JSON.parse(cleanedText);
        } catch {
            console.error("[Suggestions] Failed to parse LLM JSON:", res.text);
            return { skippedReason: "llm-parse-failed", brandsFound: 0, newSuggestions: 0, skippedDuplicates: 0, llmModel: taskModel.modelId, error: res.text.slice(0, 200) };
        }

        if (!Array.isArray(brandData) || brandData.length === 0) {
            return { brandsFound: 0, newSuggestions: 0, skippedDuplicates: 0, llmModel: taskModel.modelId };
        }

        // 2. Fetch existing names to avoid duplicates
        const existingCompetitors = await prisma.competitor.findMany({
            where: { entityId },
            select: { name: true, aliases: true }
        });

        const existingSuggestions = await prisma.suggestedCompetitor.findMany({
            where: { entityId },
            select: { name: true }
        });

        const forbiddenNames = new Set([
            entityName.toLowerCase(),
            ...existingCompetitors.flatMap(c => [
                c.name.toLowerCase(),
                ...(c.aliases as string[] || []).map(a => a.toLowerCase())
            ]),
            ...existingSuggestions.map((s: { name: string }) => s.name.toLowerCase())
        ]);

        console.log(`[Suggestions] Identified ${brandData.length} potential brands. Checking for new ones...`);

        const newSuggestions: { name: string; website: string | null; entityId: string; status: string }[] = [];
        let skippedDuplicates = 0;
        for (const item of brandData) {
            if (!item.name) continue;
            const name = item.name.trim().replace(/\*\*/g, "").replace(/^["']|["']$/g, "");

            // Re-run basic filter if needed
            const lower = name.toLowerCase();
            if (lower.length <= 2) continue;
            if (lower.split(" ").length > 4) continue;
            if (lower.includes("here is") || lower.includes("here are")) continue;

            if (!forbiddenNames.has(lower)) {
                newSuggestions.push({
                    name,
                    website: item.website || null,
                    entityId,
                    status: "suggested"
                });
                forbiddenNames.add(lower);
            } else {
                skippedDuplicates++;
            }
        }

        if (newSuggestions.length > 0) {
            console.log(`[Suggestions] Adding ${newSuggestions.length} new brand suggestions for entity ${entityId}.`);
            await prisma.suggestedCompetitor.createMany({
                data: newSuggestions,
                skipDuplicates: true
            });
        }

        // Per-result attribution: scan each result's response text for every brand we extracted
        // (both new and pre-existing suggestions). One AnalysisMention row per (result, brand) match,
        // keyed by suggestedCompetitorId. Mirrors MentionParser's case-insensitive substring pattern.
        const allBrandNames = brandData
            .map(b => (b.name || "").trim().replace(/\*\*/g, "").replace(/^["']|["']$/g, ""))
            .filter(n => n.length > 2 && n.split(" ").length <= 4);

        if (allBrandNames.length > 0 && results.length > 0) {
            const suggestionRows = await prisma.suggestedCompetitor.findMany({
                where: { entityId, name: { in: allBrandNames } },
                select: { id: true, name: true },
            });
            const suggestionByName = new Map(suggestionRows.map(s => [s.name.toLowerCase(), s]));

            const mentionRows: { analysisResultId: string; suggestedCompetitorId: string; detectedName: string }[] = [];
            for (const result of results) {
                const responseLower = result.response.toLowerCase();
                for (const brandName of allBrandNames) {
                    const lower = brandName.toLowerCase();
                    if (!responseLower.includes(lower)) continue;
                    const suggestion = suggestionByName.get(lower);
                    if (!suggestion) continue;
                    mentionRows.push({
                        analysisResultId: result.analysisResultId,
                        suggestedCompetitorId: suggestion.id,
                        detectedName: brandName,
                    });
                }
            }

            if (mentionRows.length > 0) {
                await prisma.analysisMention.createMany({
                    data: mentionRows.map(r => ({
                        analysisResultId: r.analysisResultId,
                        suggestedCompetitorId: r.suggestedCompetitorId,
                        detectedName: r.detectedName,
                        isPrimaryEntity: false,
                    })),
                });
                console.log(`[Suggestions] Wrote ${mentionRows.length} AnalysisMention rows for ${suggestionRows.length} suggested brands across ${results.length} results.`);
            }
        }

        return {
            brandsFound: brandData.length,
            newSuggestions: newSuggestions.length,
            skippedDuplicates,
            llmModel: taskModel.modelId,
            sampleNewNames: newSuggestions.slice(0, 5).map(s => s.name),
        };
    } catch (error) {
        console.error(`[Suggestions] Brand extraction failed:`, error);
        return {
            skippedReason: "llm-call-failed",
            brandsFound: 0,
            newSuggestions: 0,
            skippedDuplicates: 0,
            llmModel: taskModel.modelId,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
export async function discoverCompetitors(entityId: string) {
    // 1. Get entity to find spaceId
    const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        select: { name: true, website: true, spaceId: true }
    });

    if (!entity?.spaceId) {
        throw new Error("Entity or space not found for discovery.");
    }

    // 2. Resolve internal task model (platform-internal, env-keyed)
    const taskModel = await getInternalTaskModel('competitor_discovery');

    try {
        const provider = createLLMProvider(
            { provider: taskModel.provider, modelId: taskModel.modelId, name: taskModel.displayName ?? taskModel.modelId },
            taskModel.apiKey,
            taskModel.maxOutputTokens,
        );
        const discoveryPrompt = `[SYSTEM: CRITICAL INSTRUCTION]
As a market researcher, identify the top 6 direct competitors for the following brand.
BRAND: "${entity.name}"
${entity.website ? `WEBSITE: ${entity.website}` : ''}

For each competitor, provide:
1. Brand Name
2. Official Primary Website URL

FORMAT: Return ONLY a JSON array: [{"name": "Competitor Name", "website": "https://competitor.com"}]
- NO INTRO/OUTRO.
- ONLY 6 COMPETITORS.
- Ensure URLs are correct and active.`;

        const res = await provider.generate(discoveryPrompt);
        const cleanedText = res.text.trim().replace(/^```json|```$/g, "");
        const competitors: { name: string, website: string }[] = JSON.parse(cleanedText);

        return competitors.slice(0, 6);
    } catch (error) {
        console.error("[Suggestions] AI Competitor discovery failed:", error);
        return [];
    }
}
