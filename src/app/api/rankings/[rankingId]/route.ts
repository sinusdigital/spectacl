
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireSpaceMembership } from "@/lib/permissions";

/**
 * Resolve a ranking's spaceId by joining through entity.
 * Returns null if the ranking doesn't exist or has no space.
 */
async function getRankingSpaceId(rankingId: string): Promise<string | null> {
    const ranking = await prisma.ranking.findUnique({
        where: { id: rankingId },
        select: { entity: { select: { spaceId: true } } },
    });
    return ranking?.entity?.spaceId ?? null;
}

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ rankingId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { rankingId } = await props.params;

        const spaceId = await getRankingSpaceId(rankingId);
        if (!spaceId) {
            return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
        }
        await requireSpaceMembership(session.user.id, spaceId);

        const ranking = await prisma.ranking.findUnique({
            where: { id: rankingId },
            include: {
                prompt: {
                    include: {
                        analysisResults: {
                            take: 90,
                            orderBy: { createdAt: 'desc' },
                            include: { mentions: true }
                        }
                    }
                },
                competitors: true,
                entity: true
            }
        });

        if (!ranking) {
            return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
        }

        return NextResponse.json(ranking);

    } catch (error) {
        if (error instanceof Error && error.message.includes('Not a member')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.error("Error fetching ranking:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ rankingId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { rankingId } = await props.params;

        const spaceId = await getRankingSpaceId(rankingId);
        if (!spaceId) {
            return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
        }
        await requireSpaceMembership(session.user.id, spaceId);

        const body = await req.json();
        const { name, isArchived } = body;

        const data: Record<string, unknown> = {};
        if (typeof name === 'string') data.name = name;
        if (typeof isArchived === 'boolean') data.isArchived = isArchived;

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const ranking = await prisma.ranking.update({
            where: { id: rankingId },
            data,
            include: { prompt: true }
        });

        // When archiving, pause the prompt so the scheduler skips it.
        // When unarchiving, resume the prompt.
        if (typeof isArchived === 'boolean' && ranking.promptId) {
            await prisma.prompt.update({
                where: { id: ranking.promptId },
                data: {
                    status: isArchived ? 'Paused' : 'Running',
                    ...(isArchived ? {} : { nextRunAt: new Date() }),
                }
            });
        }

        return NextResponse.json(ranking);

    } catch (error) {
        if (error instanceof Error && error.message.includes('Not a member')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.error("Error updating ranking:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ rankingId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { rankingId } = await props.params;

        const spaceId = await getRankingSpaceId(rankingId);
        if (!spaceId) {
            return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
        }
        await requireSpaceMembership(session.user.id, spaceId);

        // Find ranking to get promptId
        const ranking = await prisma.ranking.findUnique({
            where: { id: rankingId }
        });

        if (!ranking) {
            return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
        }

        // Delete Prompt — cascade deletes the Ranking and all analysis results
        await prisma.prompt.delete({
            where: { id: ranking.promptId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Not a member')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.error("Error deleting ranking:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
