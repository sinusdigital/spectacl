import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireSpaceMembership } from "@/lib/permissions";

/**
 * Resolve a tag's spaceId by joining through entity.
 */
async function getTagSpaceId(tagId: string): Promise<string | null> {
    const tag = await prisma.tag.findUnique({
        where: { id: tagId },
        select: { entity: { select: { spaceId: true } } },
    });
    return tag?.entity?.spaceId ?? null;
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ tagId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { tagId } = await params;

        const spaceId = await getTagSpaceId(tagId);
        if (!spaceId) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 });
        }
        await requireSpaceMembership(session.user.id, spaceId);

        const body = await request.json();
        const { name, color } = body;

        const tag = await prisma.tag.update({
            where: { id: tagId },
            data: { name, color },
        });

        return NextResponse.json(tag);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Not a member')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.error("Error updating tag:", error);
        return NextResponse.json(
            { error: "Error updating tag" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ tagId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { tagId } = await params;

        const spaceId = await getTagSpaceId(tagId);
        if (!spaceId) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 });
        }
        await requireSpaceMembership(session.user.id, spaceId);

        await prisma.tag.delete({ where: { id: tagId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Not a member')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.error("Error deleting tag:", error);
        return NextResponse.json(
            { error: "Error deleting tag" },
            { status: 500 }
        );
    }
}
