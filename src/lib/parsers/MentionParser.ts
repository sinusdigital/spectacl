
import { Parser, AnalysisInput, ParserResult, MentionResult } from "./types";

export class MentionParser implements Parser {
    name = "MentionParser";

    async parse(input: AnalysisInput): Promise<ParserResult> {
        if (!input.response) {
            return { mentioned: false, mentions: [] };
        }

        const responseLower = input.response.toLowerCase();
        const mentions: MentionResult[] = [];

        // Helper to find all occurrences
        const findMatches = (names: string[]): string[] => {
            // Filter names that are present in the response
            return names.filter(name => name && responseLower.includes(name.toLowerCase()));
        };

        // 1. Check Primary Entity
        if (input.entity.name) {
            const aliases = (input.entity.aliases as string[]) || [];
            const targetNames = [input.entity.name, ...aliases].filter(Boolean);

            const matches = findMatches(targetNames);
            if (matches.length > 0) {
                mentions.push({
                    isPrimaryEntity: true,
                    detectedName: matches[0],
                    mentioned: true
                });
            }
        }

        // 2. Check Competitors
        if (input.competitors && input.competitors.length > 0) {
            for (const competitor of input.competitors) {
                if (!competitor.name) continue;

                const aliases = (competitor.aliases as string[]) || [];
                const targetNames = [competitor.name, ...aliases].filter(Boolean);

                const matches = findMatches(targetNames);
                if (matches.length > 0) {
                    mentions.push({
                        isPrimaryEntity: false,
                        competitorId: competitor.id,
                        detectedName: matches[0],
                        mentioned: true
                    });
                }
            }
        }

        // Calculate legacy boolean 'mentioned' (true if primary entity is mentioned)
        const entityMentioned = mentions.some(m => m.isPrimaryEntity && m.mentioned);

        return {
            mentioned: entityMentioned,
            mentions: mentions
        };
    }
}
