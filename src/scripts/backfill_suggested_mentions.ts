/**
 * Backfill script for AnalysisMention.suggestedCompetitorId.
 *
 * For every (SuggestedCompetitor, AnalysisResult) pair where the result's response
 * text contains the suggestion's name (case-insensitive substring, mirroring
 * MentionParser's pattern), insert an AnalysisMention row with
 *   { suggestedCompetitorId, competitorId: null, isPrimaryEntity: false, detectedName }.
 *
 * Idempotent: skips pairs that already have a matching mention row.
 *
 * Run with: npx tsx src/scripts/backfill_suggested_mentions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Counters {
    inserted: number;
    skippedExisting: number;
    skippedNoMatch: number;
    entitiesScanned: number;
    suggestionsScanned: number;
    resultsScanned: number;
}

async function main() {
    console.log('[backfill] Starting AnalysisMention.suggestedCompetitorId backfill...');

    const counters: Counters = {
        inserted: 0,
        skippedExisting: 0,
        skippedNoMatch: 0,
        entitiesScanned: 0,
        suggestionsScanned: 0,
        resultsScanned: 0,
    };

    // 1. Group SuggestedCompetitors by entity
    const entitiesWithSuggestions = await prisma.suggestedCompetitor.findMany({
        select: { id: true, name: true, entityId: true },
        orderBy: [{ entityId: 'asc' }, { id: 'asc' }],
    });

    const byEntity = new Map<string, { id: string; name: string }[]>();
    for (const s of entitiesWithSuggestions) {
        const list = byEntity.get(s.entityId) ?? [];
        list.push({ id: s.id, name: s.name });
        byEntity.set(s.entityId, list);
    }

    counters.entitiesScanned = byEntity.size;
    counters.suggestionsScanned = entitiesWithSuggestions.length;

    if (entitiesWithSuggestions.length === 0) {
        console.log('[backfill] No SuggestedCompetitor rows found. Nothing to backfill.');
        return counters;
    }

    // 2. For each entity, walk its analysis results and substring-match
    for (const [entityId, suggestions] of byEntity.entries()) {
        // Pull every successful AnalysisResult for prompts under this entity.
        const results = await prisma.analysisResult.findMany({
            where: {
                status: 'success',
                prompt: { entityId },
            },
            select: { id: true, response: true },
        });
        counters.resultsScanned += results.length;

        if (results.length === 0) continue;

        // Pre-fetch existing AnalysisMention rows for these (analysisResultId, suggestedCompetitorId)
        // pairs so we skip dupes on idempotent re-runs.
        const existing = await prisma.analysisMention.findMany({
            where: {
                suggestedCompetitorId: { in: suggestions.map(s => s.id) },
                analysisResultId: { in: results.map(r => r.id) },
            },
            select: { analysisResultId: true, suggestedCompetitorId: true },
        });
        const existingPairs = new Set(
            existing.map(e => `${e.analysisResultId}:${e.suggestedCompetitorId}`)
        );

        const toInsert: { analysisResultId: string; suggestedCompetitorId: string; detectedName: string; isPrimaryEntity: false }[] = [];

        for (const result of results) {
            const responseLower = result.response.toLowerCase();
            for (const suggestion of suggestions) {
                const lower = suggestion.name.toLowerCase();
                if (!responseLower.includes(lower)) {
                    counters.skippedNoMatch++;
                    continue;
                }
                const pairKey = `${result.id}:${suggestion.id}`;
                if (existingPairs.has(pairKey)) {
                    counters.skippedExisting++;
                    continue;
                }
                toInsert.push({
                    analysisResultId: result.id,
                    suggestedCompetitorId: suggestion.id,
                    detectedName: suggestion.name,
                    isPrimaryEntity: false,
                });
                existingPairs.add(pairKey);
            }
        }

        if (toInsert.length > 0) {
            await prisma.analysisMention.createMany({
                data: toInsert,
                skipDuplicates: true,
            });
            counters.inserted += toInsert.length;
            console.log(`[backfill] entity ${entityId}: inserted ${toInsert.length} mention rows across ${results.length} results.`);
        }
    }

    return counters;
}

main()
    .then((counters) => {
        console.log('[backfill] Done.');
        console.log(`[backfill] Summary: inserted=${counters.inserted}, skipped (already existed)=${counters.skippedExisting}, skipped (no substring match)=${counters.skippedNoMatch}, entities scanned=${counters.entitiesScanned}, suggestions scanned=${counters.suggestionsScanned}, results scanned=${counters.resultsScanned}`);
    })
    .catch((e) => {
        console.error('[backfill] Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
