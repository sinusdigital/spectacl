/**
 * POST /api/entities/[entityId]/prompts/discovery
 *
 * User hit "Generate" in the DiscoveryModal. We:
 *  1. Validate required inputs (entityDescription, personas).
 *  2. Persist the inputs on Entity.discoveryInputs so the modal can pre-fill
 *     next time and the auto-refill worker can reuse them.
 *  3. Enqueue a `refill-suggested-prompts` job with priority 1.
 *
 * No synchronous LLM call. The caller polls `/prompts/suggested` to see
 * the new rows land.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withEntityAuth } from "@/lib/permissions";
import { analysisQueue } from "@/lib/queue/analysisQueue";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId, { requireWrite: true });
        if (authResult.error) return authResult.error;

        const body = await req.json();
        const entityDescription = typeof body?.entityDescription === "string"
            ? body.entityDescription.trim()
            : "";
        const personas = typeof body?.personas === "string"
            ? body.personas.trim()
            : "";
        const entityDomain = typeof body?.entityDomain === "string"
            ? body.entityDomain.trim()
            : "";
        const language = typeof body?.language === "string"
            ? body.language.trim()
            : "";

        if (!entityDescription || !personas) {
            return NextResponse.json(
                { error: "entityDescription and personas are required" },
                { status: 400 }
            );
        }

        // Verify entity exists + belongs to a space
        const entity = await prisma.entity.findUnique({
            where: { id: entityId },
            select: { id: true, spaceId: true },
        });
        if (!entity?.spaceId) {
            return NextResponse.json(
                { error: "Entity must belong to a space" },
                { status: 400 }
            );
        }

        // Persist inputs so future auto-refills and modal pre-fills use them.
        // Store only the user-controlled fields; entityName is always derived.
        await prisma.entity.update({
            where: { id: entityId },
            data: {
                discoveryInputs: {
                    entityDescription,
                    entityDomain: entityDomain || undefined,
                    personas,
                    language: language || undefined,
                },
            },
        });

        // Enqueue the generation job. Deterministic jobId dedupes concurrent
        // submits (e.g. modal double-click, or modal submit racing an auto refill).
        await analysisQueue.add(
            "refill-suggested-prompts",
            { entityId, source: "manual" },
            {
                jobId: `refill-suggested-${entityId}`,
                priority: 1,
            }
        );

        return NextResponse.json({ enqueued: true }, { status: 202 });
    } catch (error) {
        console.error("Error in prompt discovery enqueue:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
