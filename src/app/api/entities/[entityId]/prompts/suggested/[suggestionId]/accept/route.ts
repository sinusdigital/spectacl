
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
        const body = await request.json().catch(() => ({}));

        // 1. Get the suggestion
        const suggestion = await prisma.suggestedPrompt.findUnique({
            where: { id: suggestionId }
        });

        if (!suggestion) {
            return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
        }

        // 2. Transact: Update status -> Create Prompt
        const result = await prisma.$transaction(async (tx) => {
            // Update suggestion
            await tx.suggestedPrompt.update({
                where: { id: suggestionId },
                data: { status: "accepted" }
            });

            // Create real prompt
            const newPrompt = await tx.prompt.create({
                data: {
                    text: suggestion.text,
                    intent: suggestion.intent || "Informational", // Default or map intent?
                    entityId: entityId,
                    status: "Running", // Default to running? Or Paused?
                    frequency: "Every24Hours",
                    llms: body.llms || [],
                    nextRunAt: body.nextRunAt || null
                }
            });
            return newPrompt;
        });

        // If this was the last suggestion, kick off a background refill.
        // Non-blocking and never throws (maybeEnqueueAutoRefill swallows errors).
        const refillEnqueued = await maybeEnqueueAutoRefill(entityId);

        return NextResponse.json({ ...result, refillEnqueued });
    } catch (error) {
        console.error("Error accepting suggestion:", error);
        return NextResponse.json({ error: "Failed to accept suggestion" }, { status: 500 });
    }
}
