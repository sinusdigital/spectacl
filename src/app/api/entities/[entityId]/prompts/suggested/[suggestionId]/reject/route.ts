
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from '@/lib/permissions';
import { maybeEnqueueAutoRefill } from "@/lib/queue/refillSuggestedPrompts";

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
            data: { status: "rejected" }
        });

        // If this was the last suggestion, kick off a background refill.
        const refillEnqueued = await maybeEnqueueAutoRefill(entityId);

        return NextResponse.json({ ...updated, refillEnqueued });
    } catch (error) {
        console.error("Error rejecting suggestion:", error);
        return NextResponse.json({ error: "Failed to reject suggestion" }, { status: 500 });
    }
}
