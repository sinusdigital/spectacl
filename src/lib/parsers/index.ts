
import { Entity, Competitor } from "@prisma/client";
import { Parser, ParserResult } from "./types";
import { MentionParser } from "./MentionParser";

// Registry of available parsers
const PARSERS: Parser[] = [
    new MentionParser(),
];

export async function runAnalysisParsers(entity: Entity, competitors: Competitor[], response: string): Promise<ParserResult> {
    console.log(`[Parsers] Running analysis for entity: ${entity.name} with ${competitors.length} competitors`);

    const context = {
        entity,
        competitors,
        response
    };

    let aggregatedResults: ParserResult = {};

    for (const parser of PARSERS) {
        try {
            console.log(`[Parsers] Running ${parser.name}...`);
            const result = await parser.parse(context);

            // Deep merge logic (simplified)
            // Special handling for arrays like 'mentions' to concatenate them instead of overwriting?
            // For now, MentionParser is the only one producing mentions, so we can just assign or spread.

            const { mentions, ...otherResults } = result;

            aggregatedResults = {
                ...aggregatedResults,
                ...otherResults,
                // Merge mentions array
                mentions: [
                    ...(aggregatedResults.mentions || []),
                    ...(mentions || [])
                ]
            };
        } catch (error) {
            console.error(`[Parsers] Error in ${parser.name}:`, error);
        }
    }

    return aggregatedResults;
}

export * from './types';
export * from './MentionParser';
