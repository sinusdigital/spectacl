// Basic entry point to ensure env vars are loaded if needed (Next.js loads them usually, but for ts-node we might need dotenv if not in Next context)
// For now, we assume running with `dotenv` or similar if needed, but Next.js usually handles .env.local if we use their scripts.
// Since we are using ts-node, we might need to load dotenv manually.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import '@/lib/queue/analysisWorker';
import { analysisQueue } from '@/lib/queue/analysisQueue';

import '@/lib/queue/creditResetWorker';
import { creditResetQueue } from '@/lib/queue/creditResetQueue';

import '@/lib/queue/snapshotWorker';
import { snapshotQueue } from '@/lib/queue/snapshotQueue';

console.log('Worker process started');

(async () => {
    try {
        // Register the repeatable scheduler job
        // 0 0,6,12,18 * * * -> At minute 0 past hour 0, 6, 12, and 18.
        console.log('[Worker] Registering repeatable scheduler job...');
        await analysisQueue.add('scheduler-tick', {}, {
            repeat: {
                pattern: '0 0,6,12,18 * * *',
            },
            jobId: 'global-scheduler-tick' // Ensures singleton nature
        });
        console.log('[Worker] Scheduler job registered.');

        console.log('[Worker] Registering credit reset scheduler job...');
        await creditResetQueue.add('reset-credits-scan', {}, {
            repeat: {
                pattern: '0 0 * * *', // Every day at midnight
            },
            jobId: 'global-reset-credits-scan'
        });
        console.log('[Worker] Credit reset scheduler job registered.');

        // Monthly citation snapshot — runs at 02:00 on the 1st of every month
        // Snapshots the previous month's AnalysisLink data into GlobalCitationSnapshot
        console.log('[Worker] Registering monthly citation snapshot job...');
        await snapshotQueue.add('monthly-citation-snapshot', {}, {
            repeat: {
                pattern: '0 2 1 * *', // 2am on 1st of each month
            },
            jobId: 'global-monthly-citation-snapshot',
        });
        console.log('[Worker] Monthly citation snapshot job registered.');
    } catch (err) {
        console.error('[Worker] Failed to register scheduler job:', err);
    }
})();

// Graceful shutdown: close rate limiter Redis connections
import { shutdownLimiters } from '@/lib/queue/rateLimiter';

process.on('SIGTERM', async () => {
    console.log('SIGTERM received — shutting down rate limiters...');
    await shutdownLimiters();
    process.exit(0);
});
