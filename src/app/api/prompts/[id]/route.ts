import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPendingAnalysisRecords } from "@/lib/analysis";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { calculateNextSlot } from "@/lib/scheduling";
import { getColorForTag } from "@/lib/colors";
import { revalidateTag } from "next/cache";
import { withPromptAuth } from "@/lib/permissions";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await withPromptAuth(id);
        if (authResult.error) return authResult.error;

        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const order = searchParams.get('order') || 'desc';
        const skipCount = searchParams.get('skipCount') === 'true';
        const showFailed = searchParams.get('showFailed') === 'true';

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Filter out failed results unless explicitly requested
        const statusFilter = showFailed ? {} : { status: { not: 'failed' } };

        // Fetch prompt with paginated results
        const prompt = await prisma.prompt.findUnique({
            where: { id },
            include: {
                tags: true,
                analysisResults: {
                    where: statusFilter,
                    orderBy: { [sortBy]: order },
                    skip,
                    take: limit,
                    include: {
                        mentions: {
                            include: {
                                competitor: {
                                    select: { name: true, logoUrl: true, website: true }
                                }
                            }
                        },
                        links: true
                    }
                }
            },
        });

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt not found" },
                { status: 404 }
            );
        }

        // Only get total count if not skipped (expensive query)
        let totalResults = 0;
        if (!skipCount) {
            totalResults = await prisma.analysisResult.count({
                where: { promptId: id, ...statusFilter }
            });
        }

        // Return with pagination metadata
        return NextResponse.json({
            ...prompt,
            pagination: skipCount ? undefined : {
                page,
                limit,
                total: totalResults,
                hasMore: skip + limit < totalResults,
                totalPages: Math.ceil(totalResults / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching prompt:", error);
        return NextResponse.json(
            { error: "Error fetching prompt" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await withPromptAuth(id, { requireWrite: true });
        if (authResult.error) return authResult.error;

        // Perform cascading delete in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete AnalysisResults
            await tx.analysisResult.deleteMany({
                where: { promptId: id }
            });

            // 2. Delete the Prompt itself
            await tx.prompt.delete({
                where: { id }
            });
        });

        revalidateTag(`prompt-${id}`, 'default');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting prompt:", error);
        return NextResponse.json(
            { error: "Error deleting prompt" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await withPromptAuth(id, { requireWrite: true });
        if (authResult.error) return authResult.error;

        const body = await request.json();
        const { intent, status, frequency, llms, nextRunAt, triggerAnalysis, tags, language } = body;

        // Fetch current state to make decisions
        const currentPrompt = await prisma.prompt.findUnique({ where: { id } });
        if (!currentPrompt) {
            return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
        }

        const dataToUpdate: Prisma.PromptUpdateInput = {};
        if (intent !== undefined) dataToUpdate.intent = intent;
        if (status !== undefined) dataToUpdate.status = status;
        if (llms !== undefined) dataToUpdate.llms = llms;
        // nextRunAt from body takes precedence if provided (even null)
        if (nextRunAt !== undefined) dataToUpdate.nextRunAt = nextRunAt;

        // Logic for Frequency Change
        if (frequency !== undefined) {
            dataToUpdate.frequency = frequency;

            // Check effective status (new status from body OR existing status from DB)
            const effectiveStatus = status !== undefined ? status : currentPrompt.status;

            // Auto-reschedule if frequency changes AND we are Running
            if (effectiveStatus === 'Running') {
                if (nextRunAt === undefined) {
                    dataToUpdate.nextRunAt = calculateNextSlot(frequency);
                }
            }
        }

        // Logic for Status Change (Pause/Resume)
        // Only if status is changing
        // Debug logs
        console.log(`[API] Status Change Check. Incoming: ${status}, Current: ${currentPrompt.status}, CurrentNextRun: ${currentPrompt.nextRunAt}`);

        if (status !== undefined && status !== currentPrompt.status) {
            console.log(`[API] Status is changing from ${currentPrompt.status} to ${status}`);
            if (status === 'Paused') {
                // Clear schedule if not explicitly provided
                if (nextRunAt === undefined) {
                    console.log(`[API] Pausing - clearing nextRunAt`);
                    dataToUpdate.nextRunAt = null;
                }
            } else if (status === 'Running') {
                // Resumed. Ensure we have a schedule.
                console.log(`[API] Resuming. nextRunAt in body: ${nextRunAt}, in DB: ${currentPrompt.nextRunAt}`);

                // Always recalculate schedule on Resume if not manually provided.
                // This ensures we don't end up with stale dates or nulls.
                if (nextRunAt === undefined) {
                    const freq = frequency || currentPrompt.frequency;
                    const newSlot = calculateNextSlot(freq);
                    console.log(`[API] Calculating new slot for frequency ${freq}: ${newSlot}`);
                    dataToUpdate.nextRunAt = newSlot;
                }
            }
        }

        if (language !== undefined) dataToUpdate.language = language || null;

        if (tags !== undefined) {
            dataToUpdate.tags = {
                set: [], // Clear existing
                connectOrCreate: tags.map((tagName: string) => ({
                    where: { name_entityId: { name: tagName, entityId: currentPrompt.entityId } },
                    create: {
                        name: tagName,
                        entityId: currentPrompt.entityId,
                        color: getColorForTag(tagName)
                    }
                }))
            };
        }

        await prisma.prompt.update({
            where: { id },
            data: dataToUpdate,
        });

        // Check for "Run Now" condition: Status is Running OR Explicit Trigger
        console.log(`[API] PUT received for ${id}. Status: ${status}, Trigger: ${triggerAnalysis}`);

        // Only trigger immediate analysis if explicitly requested. 
        // Simply resuming ('Running') should NOT trigger a run, only schedule enable.
        if (triggerAnalysis === true) {
            console.log(`[API] Triggering immediate analysis for prompt ${id}`);
            try {
                // 1. Create Pending Records
                const resultIds = await createPendingAnalysisRecords(id);
                console.log(`[API] createPendingAnalysisRecords returned ${resultIds.length} IDs`);

                if (resultIds.length > 0) {
                    // 2. Enqueue Job (fast lane — user-initiated manual trigger)
                    await analysisQueue.add('analyze-prompt', {
                        promptId: id,
                        resultIds
                    }, {
                        priority: 1,
                    });
                    console.log(`[API] Enqueued fast-lane job for prompt ${id} with ${resultIds.length} results`);
                } else {
                    console.log(`[API] No results to enqueue for prompt ${id}`);
                }

                // Reschedule for next run after manual execution
                // We use the effective frequency (new or existing)
                const effectiveFrequency = frequency || currentPrompt.frequency;
                const nextSlot = calculateNextSlot(effectiveFrequency);

                await prisma.prompt.update({
                    where: { id },
                    data: { nextRunAt: nextSlot }
                });

            } catch (err: unknown) {
                console.error("Immediate analysis trigger failed:", err);
            }
        }

        // Invalidate Cache for this prompt
        revalidateTag(`prompt-${id}`, 'default');

        // Status changes affect metrics (SQL filters by prompt status),
        // so invalidate metrics cache to ensure overview reflects the change immediately
        if (status) {
            revalidateTag('metrics', 'default');
        }

        // We can just return the updated prompt by re-fetching it (it will be fresh from DB, 
        // but let's use the cached getter to verify or just fetch normally to ensure consistency in response?)
        // Fetching normally is safer for the PUT response to ensure it reflects exactly what we just wrote
        // before the cache might have caught up (though Next.js cache should invalidate instantly).
        // Let's rely on the DB fetch here to be 100% sure we return correct data to the UI.
        const updatedPrompt = await prisma.prompt.findUnique({
            where: { id },
            include: {
                tags: true,
                analysisResults: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        mentions: {
                            include: {
                                competitor: {
                                    select: { name: true, logoUrl: true, website: true }
                                }
                            }
                        },
                        links: true
                    }
                }
            }
        });



        return NextResponse.json(updatedPrompt);
    } catch (error) {
        console.error("Error updating prompt:", error);
        return NextResponse.json(
            { error: "Error updating prompt" },
            { status: 500 }
        );
    }
}
