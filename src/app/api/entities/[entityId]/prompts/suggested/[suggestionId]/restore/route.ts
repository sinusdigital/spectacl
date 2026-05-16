
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from '@/lib/permissions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ entityId: string, suggestionId: string }> }
) {
    try {
        const { entityId, suggestionId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;

        const updated = await prisma.suggestedPrompt.update({
            where: { id: suggestionId },
            data: { status: "suggested" }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error restoring suggestion:", error);
        return NextResponse.json({ error: "Failed to restore suggestion" }, { status: 500 });
    }
}
