
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;
        const suggestions = await prisma.suggestedPrompt.findMany({
            where: { entityId },
            orderBy: { createdAt: "desc" }
        });

        if (process.env.NODE_ENV === "development") {
            const statusCounts = suggestions.reduce<Record<string, number>>((acc, s) => {
                acc[s.status] = (acc[s.status] ?? 0) + 1;
                return acc;
            }, {});
            console.log(`[suggested-prompts] entityId=${entityId} total=${suggestions.length} statuses=${JSON.stringify(statusCounts)}`);
        }

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
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

        console.log(`[API] Creating suggestions for entity ${entityId}:`, body);

        // Expecting an array of prompts or a single prompt
        const prompts = Array.isArray(body) ? body : [body];

        const created = await prisma.$transaction(
            prompts.map((p: { text: string; intent: string }) =>
                prisma.suggestedPrompt.create({
                    data: {
                        text: p.text,
                        intent: p.intent,
                        entityId: entityId,
                        status: "suggested"
                    }
                })
            )
        );

        return NextResponse.json(created);
    } catch (error) {
        console.error("Error creating suggestions:", error);
        return NextResponse.json({
            error: "Failed to create suggestions",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
