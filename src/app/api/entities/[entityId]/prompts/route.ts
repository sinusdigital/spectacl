import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPendingAnalysisRecords } from "@/lib/analysis";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { calculateNextSlot } from "@/lib/scheduling";
import { getColorForTag } from "@/lib/colors";
import { withEntityAuth } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ entityId: string }> }
) {
    try {
        const { entityId } = await params;
        const authResult = await withEntityAuth(entityId);
        if (authResult.error) return authResult.error;
        const { searchParams } = new URL(request.url);
        const tagsParam = searchParams.get("tags");
        const tags = tagsParam ? tagsParam.split(",") : [];

        const intentsParam = searchParams.get("intents");
        const intents = intentsParam ? intentsParam.split(",") : [];

        const where: Prisma.PromptWhereInput = { entityId };
        if (tags.length > 0) {
            where.tags = {
                some: {
                    name: { in: tags }
                }
            };
        }
        if (intents.length > 0) {
            where.intent = { in: intents as ('Informational' | 'Commercial' | 'Navigational' | 'Transactional')[] };

        }

        // Exclude prompts that are part of a Ranking
        where.ranking = null;

        const prompts = await prisma.prompt.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: {
                tags: true,
                analysisResults: {
                    take: 10, // Limit to latest 10 results to reduce payload size
                    orderBy: { createdAt: 'desc' },
                    include: {
                        links: true,
                        mentions: true
                    }
                }
            }
        });

        return NextResponse.json(prompts);
    } catch (error) {
        console.error("Error fetching prompts:", error);
        return NextResponse.json(
            { error: "Error fetching prompts" },
            { status: 500 }
        );
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

        // Fetch entity to get spaceId for guarding
        const entity = await prisma.entity.findUnique({
            where: { id: entityId },
            select: { spaceId: true }
        });

        if (entity?.spaceId) {
            const { ensureSpaceNotHalted } = await import("@/lib/billing/access");
            const haltedResponse = await ensureSpaceNotHalted(entity.spaceId);
            if (haltedResponse) return haltedResponse;
        }

        const body = await request.json();
        const { text, intent, status, frequency, llms, nextRunAt, tags, language } = body;

        if (!text) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        const finalFrequency = frequency || "Every24Hours";
        const finalStatus = status || "Running";

        // Logic for initial run date:
        // 1. If explicitly provided (e.g. "Run Now"), use it.
        // 2. If 'Running' and not provided, calculate next slot.
        // 3. If 'Paused', ensure it is null.
        let finalNextRunAt: Date | null = null;

        if (nextRunAt) {
            finalNextRunAt = new Date(nextRunAt);
        } else if (finalStatus === 'Running') {
            finalNextRunAt = calculateNextSlot(finalFrequency);
        } else {
            finalNextRunAt = null;
        }

        // Limit Check: Global Active Prompts
        if (finalStatus === 'Running') {
            const entity = await prisma.entity.findUnique({
                where: { id: entityId }
            });

            if (entity?.spaceId) {
                const space = await prisma.space.findUnique({ where: { id: entity.spaceId } });
                
                if (space) {
                    const { getPlanLimitsFromDb } = await import("@/lib/billing/plans");
                    const limits = await getPlanLimitsFromDb(space.plan);
                    
                    if (limits.maxActivePrompts !== -1) {
                        // Count all active prompts in this space
                        const spaceEntities = await prisma.entity.findMany({
                            where: { spaceId: entity.spaceId, isArchived: false },
                            select: { id: true }
                        });
                        const spaceEntityIds = spaceEntities.map(e => e.id);
                        
                        const currentActiveCount = await prisma.prompt.count({
                            where: {
                                entityId: { in: spaceEntityIds },
                                status: 'Running'
                            }
                        });
                        
                        if (currentActiveCount >= limits.maxActivePrompts) {
                             return NextResponse.json(
                                { error: `Active prompt limit reached for ${space.plan} plan (${limits.maxActivePrompts} active prompts). Upgrade your plan or pause existing prompts.` },
                                { status: 403 }
                            );
                        }
                    }
                }
            }
        }

        const prompt = await prisma.prompt.create({
            data: {
                text,
                intent: intent || "Informational",
                status: finalStatus,
                frequency: finalFrequency,
                llms: llms || [],
                nextRunAt: finalNextRunAt,
                entityId,
                language: language || null,
                tags: tags ? {
                    connectOrCreate: tags.map((tagName: string) => ({
                        where: { name_entityId: { name: tagName, entityId } },
                        create: {
                            name: tagName,
                            entityId,
                            color: getColorForTag(tagName)
                        }
                    }))
                } : undefined
            },
            include: {
                tags: true
            }
        });

        // Trigger analysis if requested
        if (body.triggerAnalysis === true) {
            console.log(`[API] Triggering immediate analysis for new prompt ${prompt.id}`);
            try {
                const resultIds = await createPendingAnalysisRecords(prompt.id);
                if (resultIds.length > 0) {
                    await analysisQueue.add('analyze-prompt', {
                        promptId: prompt.id,
                        resultIds
                    }, {
                        priority: 1, // Fast lane — user-initiated, skip ahead of batch jobs
                    });

                    // Reschedule for next run
                    const nextSlot = calculateNextSlot(finalFrequency);
                    await prisma.prompt.update({
                        where: { id: prompt.id },
                        data: { nextRunAt: nextSlot }
                    });
                }
            } catch (err) {
                console.error("Immediate analysis trigger failed for new prompt:", err);
            }
        }

        return NextResponse.json(prompt);
    } catch (error) {
        console.error("Error creating prompt:", error);
        return NextResponse.json(
            { error: "Error creating prompt" },
            { status: 500 }
        );
    }
}
