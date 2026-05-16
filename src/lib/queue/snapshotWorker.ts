import { Worker, Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import connection from './connection';

console.log('[Worker] Starting Snapshot Worker...');

export interface SnapshotJobData {
    /** YYYY-MM of the month to snapshot. Defaults to previous month if omitted. */
    period?: string;
}

/**
 * Returns { start, end } UTC date range for the given YYYY-MM period.
 */
function periodDateRange(yyyyMM: string): { start: Date; end: Date } {
    const [year, month] = yyyyMM.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1)); // exclusive upper bound
    return { start, end };
}

/**
 * Returns the YYYY-MM string for the previous calendar month.
 */
function previousMonthPeriod(): string {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function takeCitationSnapshot(period: string) {
    console.log(`[SnapshotWorker] Taking citation snapshot for period: ${period}`);

    const { start, end } = periodDateRange(period);

    // Fetch allowlisted domains (same filter as the insights API)
    const allowlistedDomains = await prisma.domain.findMany({
        where: { isAllowlisted: true },
        select: { domain: true },
    });
    const PUBLIC_PLATFORMS = allowlistedDomains.map(d => d.domain);

    if (PUBLIC_PLATFORMS.length === 0) {
        console.warn('[SnapshotWorker] No allowlisted domains found — skipping snapshot.');
        return;
    }

    // --- Per-model snapshots ---
    const modelsResult = await prisma.analysisResult.groupBy({
        by: ['llmModel'],
        where: {
            createdAt: { gte: start, lt: end },
        },
    });
    const models = modelsResult.map(m => m.llmModel).filter(Boolean);

    for (const model of models) {
        const stats = await prisma.analysisLink.groupBy({
            by: ['domain'],
            where: {
                domain: { in: PUBLIC_PLATFORMS },
                analysisResult: {
                    llmModel: model,
                    createdAt: { gte: start, lt: end },
                },
            },
            _count: { domain: true },
            orderBy: { _count: { domain: 'desc' } },
        });

        const totalForModel = stats.reduce((sum, s) => sum + s._count.domain, 0) || 1;

        const upserts = stats.map(s =>
            prisma.globalCitationSnapshot.upsert({
                where: { period_llmModel_domain: { period, llmModel: model, domain: s.domain } },
                create: {
                    period,
                    llmModel: model,
                    domain: s.domain,
                    count: s._count.domain,
                    percentage: (s._count.domain / totalForModel) * 100,
                },
                update: {
                    count: s._count.domain,
                    percentage: (s._count.domain / totalForModel) * 100,
                },
            })
        );

        await prisma.$transaction(upserts);
        console.log(`[SnapshotWorker] Wrote ${upserts.length} rows for model "${model}"`);
    }

    // --- Aggregate "all" snapshot ---
    const aggregateStats = await prisma.analysisLink.groupBy({
        by: ['domain'],
        where: {
            domain: { in: PUBLIC_PLATFORMS },
            analysisResult: {
                createdAt: { gte: start, lt: end },
            },
        },
        _count: { domain: true },
        orderBy: { _count: { domain: 'desc' } },
    });

    const totalAggregate = aggregateStats.reduce((sum, s) => sum + s._count.domain, 0) || 1;

    const aggregateUpserts = aggregateStats.map(s =>
        prisma.globalCitationSnapshot.upsert({
            where: { period_llmModel_domain: { period, llmModel: 'all', domain: s.domain } },
            create: {
                period,
                llmModel: 'all',
                domain: s.domain,
                count: s._count.domain,
                percentage: (s._count.domain / totalAggregate) * 100,
            },
            update: {
                count: s._count.domain,
                percentage: (s._count.domain / totalAggregate) * 100,
            },
        })
    );

    await prisma.$transaction(aggregateUpserts);
    console.log(`[SnapshotWorker] Wrote ${aggregateUpserts.length} aggregate rows for period "${period}"`);
    console.log(`[SnapshotWorker] Snapshot complete for ${period}.`);
}

const worker = new Worker(
    'snapshot-queue',
    async (job: Job<SnapshotJobData>) => {
        console.log(`[SnapshotWorker] Processing job ${job.id}: ${job.name}`);

        if (job.name === 'monthly-citation-snapshot') {
            const period = job.data?.period ?? previousMonthPeriod();
            await takeCitationSnapshot(period);
        }
    },
    {
        connection,
        concurrency: 1, // Snapshots are heavy — one at a time
    }
);

worker.on('completed', (job) => {
    console.log(`[SnapshotWorker] Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
    console.error(`[SnapshotWorker] Job ${job?.id} failed: ${err.message}`);
});

export default worker;
