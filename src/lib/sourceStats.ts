import { prisma } from "@/lib/prisma";

/**
 * Updates domain source statistics for a prompt after analysis completion
 * This runs after each analysis result is created to keep stats up-to-date
 */
export async function updateSourceStats(promptId: string, analysisResultId: string) {
    try {
        // Fetch the analysis result with links
        const result = await prisma.analysisResult.findUnique({
            where: { id: analysisResultId },
            select: { links: true }
        });

        if (!result || !result.links || result.links.length === 0) {
            return; // No links to process
        }

        // Group links by domain
        const domainCounts: Record<string, number> = {};
        result.links.forEach(link => {
            domainCounts[link.domain] = (domainCounts[link.domain] || 0) + 1;
        });

        // Update source stats for each domain
        for (const [domain, count] of Object.entries(domainCounts)) {
            await prisma.domainCitation.upsert({
                where: {
                    promptId_domain: { promptId, domain }
                },
                update: {
                    count: { increment: count },
                    presence: { increment: 1 },
                    lastSeen: new Date()
                },
                create: {
                    promptId,
                    domain,
                    count,
                    presence: 1,
                    lastSeen: new Date()
                }
            });
        }

        console.log(`[SourceStats] Updated stats for ${Object.keys(domainCounts).length} domains in prompt ${promptId}`);
    } catch (error) {
        console.error(`[SourceStats] Error updating source stats for prompt ${promptId}:`, error);
        // Don't throw - source stats are non-critical
    }
}

/**
 * Backfill source statistics for all existing prompts
 * Run this once during deployment to populate the DomainCitation table
 */
export async function backfillSourceStats() {
    try {
        console.log('[SourceStats] Starting backfill...');
        
        const prompts = await prisma.prompt.findMany({
            select: { id: true }
        });

        let processed = 0;
        for (const prompt of prompts) {
            // Get all analysis results for this prompt
            const results = await prisma.analysisResult.findMany({
                where: { promptId: prompt.id },
                select: { id: true, links: true }
            });

            // Aggregate domain stats
            const domainStats: Record<string, { count: number; presence: number }> = {};
            
            results.forEach(result => {
                const domainsInResult = new Set<string>();
                
                result.links?.forEach(link => {
                    if (!domainStats[link.domain]) {
                        domainStats[link.domain] = { count: 0, presence: 0 };
                    }
                    domainStats[link.domain].count++;
                    domainsInResult.add(link.domain);
                });

                // Increment presence for each unique domain in this result
                domainsInResult.forEach(domain => {
                    domainStats[domain].presence++;
                });
            });

            // Batch insert/update source stats
            for (const [domain, stats] of Object.entries(domainStats)) {
                await prisma.domainCitation.upsert({
                    where: {
                        promptId_domain: { promptId: prompt.id, domain }
                    },
                    update: {
                        count: stats.count,
                        presence: stats.presence,
                        lastSeen: new Date()
                    },
                    create: {
                        promptId: prompt.id,
                        domain,
                        count: stats.count,
                        presence: stats.presence,
                        lastSeen: new Date()
                    }
                });
            }

            processed++;
            if (processed % 10 === 0) {
                console.log(`[SourceStats] Processed ${processed}/${prompts.length} prompts`);
            }
        }

        console.log(`[SourceStats] Backfill complete. Processed ${processed} prompts.`);
    } catch (error) {
        console.error('[SourceStats] Backfill failed:', error);
        throw error;
    }
}
