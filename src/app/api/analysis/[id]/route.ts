import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireSpaceMembership } from "@/lib/permissions";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Resolve space via analysisResult -> prompt -> entity -> space
        const result = await prisma.analysisResult.findUnique({
            where: { id },
            select: { prompt: { select: { entity: { select: { spaceId: true } } } } },
        });

        if (!result?.prompt?.entity?.spaceId) {
            return NextResponse.json({ error: "Analysis result not found" }, { status: 404 });
        }

        await requireSpaceMembership(session.user.id, result.prompt.entity.spaceId);

        await prisma.analysisResult.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Not a member')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        console.error("Error deleting analysis result:", error);
        return NextResponse.json(
            { error: "Error deleting analysis result" },
            { status: 500 }
        );
    }
}
