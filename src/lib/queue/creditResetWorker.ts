import { prisma } from "@/lib/prisma";
import { Worker, Job } from 'bullmq';
import connection from './connection';
import { calculateMonthlyCreditsFromDb, getActiveModelCount, DAYS_PER_MONTH, type PlanKey } from '@/lib/billing/plans';
import { isSelfHosted } from '@/lib/mode';

console.log('[Worker] Starting Credit Reset Worker...');

const worker = new Worker(
    'credit-reset-queue',
    async (job: Job) => {
        console.log(`[Worker] Processing job ${job.id}:`, job.name);

        if (job.name === 'reset-credits-scan') {
            await processCreditResets();
        }
    },
    {
        connection,
        concurrency: 1, // Periodic batch operation, no need for high concurrency
    }
);

async function processCreditResets() {
    // Self-hosted mode: credits are always unlimited, no resets needed
    if (isSelfHosted()) {
        console.log('[Worker] Self-hosted mode — skipping credit reset scan.');
        return;
    }

    console.log('[Worker] Scanning for trial spaces due for credit reset...');

    const now = new Date();
    const modelCount = await getActiveModelCount();

    // Cutoff: creditResetDate older than DAYS_PER_MONTH days ago.
    // Only trial spaces are handled here — paid (ACTIVE) spaces get their
    // credits reset by the Mollie webhook when a recurring payment succeeds,
    // keeping credit and billing cycles aligned by design.
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_PER_MONTH);

    try {
        const spacesToReset = await prisma.space.findMany({
            where: {
                creditResetDate: { lt: cutoffDate },
                subscriptionStatus: 'TRIALING',
            },
        });

        console.log(`[Worker] Found ${spacesToReset.length} spaces due for reset (${modelCount} active models).`);

        for (const space of spacesToReset) {
            const limit = await calculateMonthlyCreditsFromDb(space.plan as PlanKey, modelCount);

            console.log(`[Worker] Resetting credits for space ${space.slug}: used=${space.llmCreditsUsed}, new limit=${limit}`);

            await prisma.space.update({
                where: { id: space.id },
                data: {
                    llmCreditsRemaining: limit,
                    llmCreditsUsed: 0,
                    creditResetDate: now,
                },
            });
        }
    } catch (error) {
        console.error('[Worker] Error processing credit resets:', error);
        throw error;
    }
}

worker.on('completed', (job) => {
    console.log(`[Worker] Credit Reset Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Credit Reset Job ${job?.id} failed: ${err.message}`);
});

export default worker;
