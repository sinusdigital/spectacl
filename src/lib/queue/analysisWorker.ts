import { prisma } from "@/lib/prisma";
import { Worker, Job } from 'bullmq';
import connection from './connection';
import { executeAnalysisJob } from '@/lib/analysis';

import { processDuePrompts } from '@/lib/scheduler-job';

// Hard timeout for analysis jobs — frees worker slot if an LLM call hangs.
// BullMQ's stall detection moves the job to "failed" but doesn't reclaim the slot.
const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`[Timeout] ${label} exceeded ${ms / 1000}s limit`)), ms);
        promise.then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

console.log('[Worker] Starting Analysis Worker...');

const worker = new Worker(
    'analysis-queue',
    async (job: Job) => {
        console.log(`[Worker] Processing job ${job.id}:`, job.name);

        if (job.name === 'analyze-prompt') {
            const { promptId, resultIds } = job.data;
            if (!promptId || !resultIds) {
                throw new Error('Invalid job data: missing promptId or resultIds');
            }

            // Extend lock before long LLM calls to prevent false stalls
            await job.extendLock(job.id ?? '', 300_000);
            await withTimeout(
                executeAnalysisJob(promptId, resultIds),
                ANALYSIS_TIMEOUT_MS,
                `analyze-prompt ${promptId}`
            );
        } else if (job.name === 'scheduler-tick') {
            console.log('[Worker] Processing scheduler tick');
            await processDuePrompts();
        } else if (job.name === 'rescan-entity-answers') {
            const { entityId } = job.data;
            if (!entityId) {
                throw new Error('Invalid job data: missing entityId');
            }
            // Dynamic import to avoid circular dependencies if any, or just standard import
            const { rescanEntityAnswers } = await import('@/lib/analysis');
            await rescanEntityAnswers(entityId);
        } else if (job.name === 'refill-suggested-prompts') {
            const { entityId, count, source } = job.data;
            if (!entityId || !source) {
                throw new Error('Invalid job data: missing entityId or source');
            }
            const { executeRefillSuggestedPrompts } = await import('@/lib/queue/refillSuggestedPrompts');
            await executeRefillSuggestedPrompts({ entityId, count, source });
        }
    },
    {
        connection,
        concurrency: 25, // Process up to 25 jobs concurrently (rate limiter handles API throttling)
        stalledInterval: 120_000, // 2 minutes — LLM calls can take 30-90s, default 30s causes false stalls
        lockDuration: 300_000,    // 5 minutes — extend lock so long LLM calls don't lose their job
    }
);

 worker.on('completed', async (job) => {
    console.log(`[Worker] Job ${job.id} completed!`);

    if (job.name === 'analyze-prompt') {
        const { promptId } = job.data;
        if (promptId) {
            // Trigger Revalidation
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const secret = process.env.INTERNAL_API_SECRET;
            
            if (secret) {
                try {
                    console.log(`[Worker] Triggering revalidation for prompt ${promptId} at ${appUrl}`);
                    const res = await fetch(`${appUrl}/api/internal/revalidate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tags: [`prompt-${promptId}`, 'metrics'],
                            secret: secret,
                            promptId: promptId
                        })
                    });
                    if (!res.ok) {
                        console.error(`[Worker] Revalidation failed: ${res.status} ${res.statusText}`);
                    }
                } catch (err) {
                    console.error(`[Worker] Error triggering revalidation:`, err);
                }
            } else {
                 console.warn('[Worker] INTERNAL_API_SECRET not set, skipping revalidation.');
            }
        }
    }
});

worker.on('failed', async (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);

    if (job?.name === 'analyze-prompt' && job?.data?.resultIds) {
        try {
            await prisma.analysisResult.updateMany({
                where: { id: { in: job.data.resultIds } },
                data: {
                    status: 'failed',
                    errorMessage: err.message
                }
            });
        } catch (dbErr) {
            console.error(`[Worker] Failed to update DB status for job ${job.id}:`, dbErr);
        }
    }
});

export default worker;
