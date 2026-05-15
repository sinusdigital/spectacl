import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { status } = body;

        if (!["suggested", "tracked", "untracked"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const updated = await prisma.suggestedCompetitor.update({
            where: { id },
            data: { status },
        });

        // If status is tracked, we don't necessarily create the competitor here 
        // because the frontend handles that via its own POST /competitors.
        // But for consistency, we just update the suggestion record.

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating suggestion:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await prisma.suggestedCompetitor.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting suggestion:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
