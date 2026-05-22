import { PrismaClient } from '@prisma/client';
import { extractBrandColor } from '../lib/colorUtils';
import { extractDomain, scrapeAndStoreLogo } from '../lib/logoUtils';

const prisma = new PrismaClient();

async function main() {
    console.log("[Backfill] Starting brand color backfill (Script)...");
    const competitors = await prisma.competitor.findMany({
        where: {
            logoUrl: {
                not: null
            }
        }
    });

    console.log(`[Backfill] Found ${competitors.length} competitors with logos.`);

    let updatedCount = 0;

    for (const competitor of competitors) {
        try {
            const domain = extractDomain(competitor.website ?? competitor.logoUrl ?? null);
            if (!domain) continue;

            console.log(`Processing ${competitor.name} (${domain})...`);
            await scrapeAndStoreLogo(domain);
            const stored = await prisma.domain.findUnique({
                where: { domain },
                select: { logoBytes: true },
            });
            if (!stored?.logoBytes) {
                console.log(`  -> No bytes scraped for ${competitor.name}`);
                continue;
            }

            const colors = await extractBrandColor(Buffer.from(stored.logoBytes));

            if (colors.vibrant || colors.darkVibrant) {
                await prisma.competitor.update({
                    where: { id: competitor.id },
                    data: {
                        primaryColor: colors.vibrant,
                        darkVibrantColor: colors.darkVibrant
                    }
                });
                console.log(`  -> Updated ${competitor.name}: Primary=${colors.vibrant}, Dark=${colors.darkVibrant}`);
                updatedCount++;
            } else {
                console.log(`  -> No colors found for ${competitor.name}`);
            }
        } catch (error: unknown) {
            console.error(`[Backfill] Error updating competitor ${competitor.name}:`, error);
        }
    }

    console.log(`[Backfill] Completed. Updated ${updatedCount} competitors.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
