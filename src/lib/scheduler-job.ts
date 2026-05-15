import { prisma } from "@/lib/prisma";
import { createPendingAnalysisRecords } from "@/lib/analysis";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { calculateNextSlot } from "@/lib/scheduling";
import { isSelfHosted } from "@/lib/mode";

type SchedulerResult = {
    success: boolean;
    processed: number;
    results: { promptId: string; status: string; reason?: string; error?: string }[];
    error?: string;
};

export async function processDuePrompts(): Promise<SchedulerResult> {
    try {
        console.log("[Scheduler] Checking for due prompts...");

        const now = new Date();
        const duePrompts = await prisma.prompt.findMany({
            where: {
                status: 'Running',
                nextRunAt: {
                    lte: now
                }
            },
            include: {
                entity: true
            }
        });

        if (duePrompts.length === 0) {
            return { success: true, processed: 0, results: [] };
        }

        console.log(`[Scheduler] Found ${duePrompts.length} prompts due.`);

        // Batch-fetch all unique spaces upfront (avoids N+1 per-prompt space queries)
        const uniqueSpaceIds = [...new Set(duePrompts.map(p => p.entity.spaceId).filter(Boolean))] as string[];
        const spaceRows = await prisma.space.findMany({
            where: { id: { in: uniqueSpaceIds } },
            select: { id: true, subscriptionStatus: true, trialEndsAt: true, plan: true, isLocked: true },
        });
        const spaceMap = new Map(spaceRows.map(s => [s.id, s]));

        const checkRun = await prisma.checkRun.create({ data: {} });

        const results = await Promise.all(duePrompts.map(async (prompt) => {
            try {
                // Check trial/lock state for this prompt's space
                const spaceId = prompt.entity.spaceId;
                if (spaceId) {
                    const space = spaceMap.get(spaceId) ?? null;

                    if (space) {
                        // Admin-locked spaces are always blocked (not billing — works in both modes)
                        if (space.isLocked) {
                            return { promptId: prompt.id, status: 'skipped', reason: 'space_locked' };
                        }

                        // Trial/subscription checks only apply in cloud mode
                        if (!isSelfHosted()) {
                            const isLocked = space.subscriptionStatus === 'INCOMPLETE';
                            const isExpiredTrial =
                                space.subscriptionStatus === 'TRIALING' &&
                                space.trialEndsAt !== null &&
                                new Date(space.trialEndsAt) < now;

                            // Auto-lock expired trials
                            if (isExpiredTrial) {
                                await prisma.space.update({
                                    where: { id: spaceId },
                                    data: { subscriptionStatus: 'INCOMPLETE' }
                                });
                                console.log(`[Scheduler] Trial expired for space ${spaceId} — locking.`);
                                return { promptId: prompt.id, status: 'skipped', reason: 'trial_expired' };
                            }

                            if (isLocked) {
                                return { promptId: prompt.id, status: 'skipped', reason: 'space_locked' };
                            }
                        }
                    }
                }

                const analysisResultIds = await createPendingAnalysisRecords(prompt.id, checkRun.id);

                // Deterministic jobId prevents duplicate enqueues from concurrent scheduler ticks.
                // BullMQ silently rejects duplicate jobIds — the second attempt is a no-op.
                // Hourly bucket ensures the same prompt can be re-enqueued in the next window.
                const timeBucket = Math.floor(Date.now() / (60 * 60 * 1000));
                try {
                    await analysisQueue.add('analyze-prompt', {
                        promptId: prompt.id,
                        resultIds: analysisResultIds
                    }, {
                        jobId: `prompt-${prompt.id}-${timeBucket}`,
                        priority: 10, // Batch scheduled jobs — lower priority than manual triggers
                    });
                } catch (enqueueError) {
                    // BullMQ throws on duplicate jobId — this prompt was already enqueued this hour
                    console.warn(`[Scheduler] Duplicate job skipped for prompt ${prompt.id}:`, enqueueError);
                    return { promptId: prompt.id, status: 'skipped', reason: 'already_enqueued' };
                }

                const nextRun = calculateNextSlot(prompt.frequency);

                await prisma.prompt.update({
                    where: { id: prompt.id },
                    data: {
                        lastRunAt: new Date(),
                        nextRunAt: nextRun
                    }
                });

                return { promptId: prompt.id, status: 'enqueued' };
            } catch (error) {
                console.error(`[Scheduler] Failed to enqueue prompt ${prompt.id}:`, error);
                return { promptId: prompt.id, status: 'error', error: String(error) };
            }
        }));

        await prisma.checkRun.update({
            where: { id: checkRun.id },
            data: { completedAt: new Date() }
        });

        return { success: true, processed: results.length, results };

    } catch (error) {
        console.error("[Scheduler] Error processing due prompts:", error);
        return {
            success: false,
            processed: 0,
            results: [],
            error: String(error)
        };
    }
}

/**
 * Sweep all expired trials and lock them.
 * Sets subscriptionStatus → INCOMPLETE and pauses all Running prompts
 * so stale prompts don't fire if the user later upgrades.
 */
export async function processExpiredTrials(): Promise<{ locked: number }> {
    // Self-hosted mode: no trials to expire
    if (isSelfHosted()) return { locked: 0 };

    const now = new Date();

    const expiredSpaces = await prisma.space.findMany({
        where: {
            subscriptionStatus: 'TRIALING',
            trialEndsAt: { lt: now },
        },
        select: { id: true },
    });

    if (expiredSpaces.length === 0) return { locked: 0 };

    const spaceIds = expiredSpaces.map(s => s.id);

    // Lock all expired trial spaces
    await prisma.space.updateMany({
        where: { id: { in: spaceIds } },
        data: { subscriptionStatus: 'INCOMPLETE' },
    });

    // Pause all Running prompts in those spaces so they don't auto-fire on upgrade
    await prisma.prompt.updateMany({
        where: {
            status: 'Running',
            entity: { spaceId: { in: spaceIds } },
        },
        data: { status: 'Paused' },
    });

    console.log(`[TrialSweep] Locked ${spaceIds.length} expired trial(s) and paused their prompts.`);

    return { locked: spaceIds.length };
}

/**
 * Mark all PENDING invitations whose expiresAt has passed as EXPIRED.
 */
export async function expireInvitations(): Promise<{ expired: number }> {
    const result = await prisma.spaceInvitation.updateMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
        console.log(`[InvitationExpiry] Expired ${result.count} invitation(s)`);
    }

    return { expired: result.count };
}
