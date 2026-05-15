import { StructuredRankingResponse } from "@/types/ranking";

/**
 * Attempt to repair truncated JSON by closing open brackets/braces.
 * Only handles the common case where the LLM response was cut off mid-output.
 */
function repairTruncatedJson(json: string): string {
    // Trim trailing commas and whitespace
    let repaired = json.replace(/,\s*$/, '');

    // Count open vs close brackets
    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escape = false;

    for (const ch of repaired) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') braces++;
        if (ch === '}') braces--;
        if (ch === '[') brackets++;
        if (ch === ']') brackets--;
    }

    // If we're inside a string, close it
    if (inString) repaired += '"';

    // Close open brackets/braces
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }

    return repaired;
}

/**
 * Safely parses the LLM response string to extract structured ranking data.
 * Handles complete JSON, markdown-wrapped JSON, and truncated JSON responses.
 */
export function parseRankingResponse(response: string | null | undefined): StructuredRankingResponse | null {
    if (!response) return null;

    try {
        // Try parsing the whole string as JSON first
        const data = JSON.parse(response);
        return normalizeRankingData(data);
    } catch {
        // If that fails, try to extract JSON from markdown code blocks
        try {
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/{[\s\S]*}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                return normalizeRankingData(data);
            }
        } catch {
            // Fall through to truncated repair
        }
    }

    // Last resort: try to repair truncated JSON
    try {
        const jsonStart = response.indexOf('{');
        if (jsonStart >= 0) {
            const repaired = repairTruncatedJson(response.slice(jsonStart));
            const data = JSON.parse(repaired);
            return normalizeRankingData(data);
        }
    } catch (repairError) {
        console.error("Failed to repair truncated ranking JSON:", repairError);
    }

    return null;
}

function cleanMarkdown(text: string): string {
    // Clean markdown artifacts like [Name](#entity-highlight) or [Name](#competitor-highlight)
    return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

function cleanStringArray(arr: unknown): string[] | undefined {
    if (!Array.isArray(arr)) return undefined;
    return arr.filter((s): s is string => typeof s === 'string').map(cleanMarkdown);
}

function normalizeRankingData(data: unknown): StructuredRankingResponse {
    const rawData = data as Record<string, unknown>;

    // Accept both `market_ranking` and `competitive_ranking` as top-level keys
    if (!rawData.market_ranking && rawData.competitive_ranking) {
        rawData.market_ranking = rawData.competitive_ranking;
        delete rawData.competitive_ranking;
    }

    if (!rawData?.market_ranking) return rawData as unknown as StructuredRankingResponse;
    const marketRanking = rawData.market_ranking as Record<string, unknown>;

    // Accept `sources` nested inside market_ranking
    if (!rawData.sources && marketRanking.sources) {
        rawData.sources = marketRanking.sources;
    }

    if (!Array.isArray(marketRanking.entities)) return rawData as unknown as StructuredRankingResponse;

    const entities = marketRanking.entities as Record<string, unknown>[];
    marketRanking.entities = entities.map((entity) => {
        const rawName = (entity.name as string) || (entity.company as string) || (entity.entity as string) || "Unknown Entity";
        const cleanName = cleanMarkdown(rawName);

        return {
            ...entity,
            name: cleanName,
            market_share: (entity.market_share as string) || (entity.market_share_estimate as string) || (entity.share as string) || (entity.percentage as string),
            market_position: typeof entity.market_position === 'string' ? cleanMarkdown(entity.market_position) : undefined,
            strengths: cleanStringArray(entity.strengths),
            weaknesses: cleanStringArray(entity.weaknesses),
            relevance_for_buyer: typeof entity.relevance_for_buyer === 'string'
                ? cleanMarkdown(entity.relevance_for_buyer)
                : typeof entity.relevance_to_context === 'string'
                    ? cleanMarkdown(entity.relevance_to_context as string)
                    : undefined,
        };
    });

    return rawData as unknown as StructuredRankingResponse;
}
