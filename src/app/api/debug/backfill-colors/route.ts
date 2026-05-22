import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractBrandColor } from "@/lib/colorUtils";
import { extractDomain, scrapeAndStoreLogo } from "@/lib/logoUtils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
    try {
        // Admin-only — this modifies competitors across all spaces
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log("[Backfill] Starting brand color backfill...");
        const competitors = await prisma.competitor.findMany({
            where: {
                logoUrl: {
                    not: null
                }
            }
        });

        console.log(`[Backfill] Found ${competitors.length} competitors with logos.`);

        let updatedCount = 0;
        const errors = [];

        for (const competitor of competitors) {
            try {
                const domain = extractDomain(competitor.website ?? competitor.logoUrl ?? null);
                if (!domain) continue;

                await scrapeAndStoreLogo(domain);
                const stored = await prisma.domain.findUnique({
                    where: { domain },
                    select: { logoBytes: true },
                });
                if (!stored?.logoBytes) continue;

                const colors = await extractBrandColor(Buffer.from(stored.logoBytes));

                if (colors.vibrant || colors.darkVibrant) {
                    await prisma.competitor.update({
                        where: { id: competitor.id },
                        data: {
                            primaryColor: colors.vibrant,
                            darkVibrantColor: colors.darkVibrant
                        }
                    });
                    updatedCount++;
                }
            } catch (error: unknown) {
                console.error(`[Backfill] Error updating competitor ${competitor.name}:`, error);
                errors.push({ name: competitor.name, error: error instanceof Error ? error.message : String(error) });
            }
        }

        return NextResponse.json({
            success: true,
            totalProcessed: competitors.length,
            updatedCount,
            errors
        });

    } catch (error) {
        console.error("[Backfill] Critical error:", error);
        return NextResponse.json(
            { error: "Internal Server Error during backfill" },
            { status: 500 }
        );
    }
}
