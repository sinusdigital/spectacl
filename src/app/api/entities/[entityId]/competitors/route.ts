import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLogoUrl, extractDomain, scrapeAndStoreLogo } from "@/lib/logoUtils";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;
        console.log(`[API] Fetching competitors for entity ${entityId}`);

        const competitors = await prisma.competitor.findMany({
            where: { entityId },
            // orderBy: { name: 'asc' } // Temporarily removed for debugging
        });

        return NextResponse.json(competitors);
    } catch (error) {
        console.error("Error fetching competitors:", error);
        return NextResponse.json(
            { error: "Error fetching competitors" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;
        const body = await request.json();
        const { names, competitors: competitorsList } = body;

        console.log(`[API] Creating competitors for ${entityId}`, { names, listLength: competitorsList?.length });

        if (!names && (!competitorsList || !Array.isArray(competitorsList))) {
            return NextResponse.json(
                { error: "Competitor names or list are required" },
                { status: 400 }
            );
        }

        const createdCompetitors = [];

        if (competitorsList && Array.isArray(competitorsList)) {
            // Process sequentially to avoid Promise.all failure race conditions and better debugging
            for (const c of competitorsList) {
                try {
                    let logoUrl: string | null = null;
                    if (c.website) {
                        try {
                            logoUrl = await fetchLogoUrl(c.website);
                        } catch (e) {
                            console.error("Error fetching logo:", e);
                        }
                    }

                    let primaryColor = null;
                    let darkVibrantColor = null;

                    const competitorDomain = c.website ? extractDomain(c.website) : null;
                    if (competitorDomain) {
                        try {
                            await scrapeAndStoreLogo(competitorDomain);
                            const stored = await prisma.domain.findUnique({
                                where: { domain: competitorDomain },
                                select: { logoBytes: true },
                            });
                            if (stored?.logoBytes) {
                                const { extractBrandColor } = await import("@/lib/colorUtils");
                                const colors = await extractBrandColor(Buffer.from(stored.logoBytes));
                                primaryColor = colors.vibrant;
                                darkVibrantColor = colors.darkVibrant;
                            }
                        } catch (e) {
                            console.error("Error extracting color:", e);
                        }
                    }

                    const newCompetitor = await prisma.competitor.create({
                        data: {
                            name: c.name,
                            website: c.website || null,
                            logoUrl,
                            primaryColor,
                            darkVibrantColor,
                            entityId
                        }
                    });
                    createdCompetitors.push(newCompetitor);

                    // Promote pre-existing brand-extraction mentions to the new
                    // Competitor. Without this, the Detected Brands table would lose
                    // the freshly-tracked brand because the rescan parser only finds
                    // it if the literal stored name appears as a substring of the
                    // response (often false when the LLM extracted a longer form).
                    // Keeping suggestedCompetitorId set so the mentions also survive
                    // future rescans (which only delete suggestedCompetitorId IS NULL).
                    try {
                        const matchingSuggested = await prisma.suggestedCompetitor.findFirst({
                            where: {
                                entityId,
                                name: { equals: c.name, mode: 'insensitive' },
                            },
                            select: { id: true },
                        });
                        if (matchingSuggested) {
                            await prisma.analysisMention.updateMany({
                                where: {
                                    suggestedCompetitorId: matchingSuggested.id,
                                    competitorId: null,
                                },
                                data: { competitorId: newCompetitor.id },
                            });
                        }
                    } catch (promoteErr) {
                        console.error("Error promoting suggested mentions:", promoteErr);
                    }
                } catch (innerError) {
                    console.error("Error creating individual competitor:", innerError);
                }
            }
        } else {
            // Backward compatibility
            const competitorNames = names.split(',').map((name: string) => name.trim()).filter((name: string) => name);
            for (const name of competitorNames) {
                try {
                    const newComp = await prisma.competitor.create({
                        data: {
                            name,
                            entityId
                        }
                    });
                    createdCompetitors.push(newComp);
                } catch (e) {
                    console.error("Error creating competitor by name:", e);
                }
            }
        }

        let jobId = null;
        if (createdCompetitors.length > 0) {
            try {
                // Trigger rescan of past answers to check for mentions of these new competitors
                const job = await analysisQueue.add('rescan-entity-answers', { entityId }, { priority: 5 });
                jobId = job.id;
                console.log(`[API] Enqueued rescan job for entity ${entityId} with ID ${jobId}`);
            } catch (jobError) {
                console.error("Error enqueuing rescan job:", jobError);
            }
        }

        return NextResponse.json({ competitors: createdCompetitors, jobId });
    } catch (error) {
        console.error("Error creating competitors:", error);
        return NextResponse.json(
            { error: "Error creating competitors" },
            { status: 500 }
        );
    }
}
