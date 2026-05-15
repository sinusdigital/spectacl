import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLogoUrl } from "@/lib/logoUtils";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { withEntityAuth } from "@/lib/permissions";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const competitor = await prisma.competitor.findUnique({ where: { id }, select: { entityId: true } });
        if (!competitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const authResult = await withEntityAuth(competitor.entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;

        const { name, website, aliases } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        let normalizedWebsite = website;
        if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
            normalizedWebsite = `https://${website}`;
        }

        // Get current competitor to check if website changed
        const currentCompetitor = await prisma.competitor.findUnique({
            where: { id },
            select: { website: true, logoUrl: true },
        });

        // Fetch new logo URL if website changed
        let logoUrl = currentCompetitor?.logoUrl;
        if (normalizedWebsite && normalizedWebsite !== currentCompetitor?.website) {
            logoUrl = await fetchLogoUrl(normalizedWebsite);
        } else if (!normalizedWebsite) {
            logoUrl = null;
        }

        const updatedCompetitor = await prisma.competitor.update({
            where: { id },
            data: { name, website: normalizedWebsite, logoUrl, aliases },
        });

        return NextResponse.json(updatedCompetitor);
    } catch (error) {
        console.error("Error updating competitor:", error);
        return NextResponse.json(
            { error: "Error updating competitor" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch the entityId before deleting the competitor
        const competitor = await prisma.competitor.findUnique({
            where: { id },
            select: { entityId: true }
        });

        if (!competitor) {
            return NextResponse.json(
                { error: "Competitor not found" },
                { status: 404 }
            );
        }

        const authResult = await withEntityAuth(competitor.entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;

        await prisma.competitor.delete({
            where: { id },
        });

        let jobId = null;
        try {
            // Trigger rescan of past answers to recalculate without this competitor
            const job = await analysisQueue.add('rescan-entity-answers', { entityId: competitor.entityId }, { priority: 5 });
            jobId = job.id;
            console.log(`[API] Enqueued rescan job for entity ${competitor.entityId} after competitor deletion, with ID ${jobId}`);
        } catch (jobError) {
             console.error("Error enqueuing rescan job:", jobError);
        }

        return NextResponse.json({ success: true, jobId });
    } catch (error) {
        console.error("Error deleting competitor:", error);
        return NextResponse.json(
            { error: "Error deleting competitor" },
            { status: 500 }
        );
    }
}
