import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const now = () => new Date();

function currentPeriodKey(): string {
    const d = now();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(yyyyMM: string): string {
    const [year, month] = yyyyMM.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function prevPeriodKey(yyyyMM: string): string {
    const [year, month] = yyyyMM.split('-').map(Number);
    const d = new Date(year, month - 2, 1); // month-2: 1-indexed month → 0-indexed, then -1 for previous
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Distinct periods stored in snapshots, sorted ascending, always including current month. */
async function getAvailableMonths(): Promise<string[]> {
    const rows = await prisma.globalCitationSnapshot.findMany({
        distinct: ['period'],
        select: { period: true },
        orderBy: { period: 'asc' },
    });
    const periods = rows.map(r => r.period);
    const current = currentPeriodKey();
    if (!periods.includes(current)) periods.push(current);
    return periods;
}

/** Returns a domain→prevPercentage map from the snapshot of the period before `period`. */
async function getPrevSnapshotMap(period: string, llmModel: string): Promise<Map<string, number>> {
    const prev = prevPeriodKey(period);
    const rows = await prisma.globalCitationSnapshot.findMany({
        where: { period: prev, llmModel },
        select: { domain: true, percentage: true },
    });
    return new Map(rows.map(r => [r.domain, r.percentage]));
}

/** Merge prevPercentage into a data array using a lookup map. */
function mergePrev(
    data: { domain: string; count: number; percentage: number }[],
    prevMap: Map<string, number>
) {
    return data.map(d => ({
        ...d,
        prevPercentage: prevMap.get(d.domain) ?? null,
    }));
}

/** Serve data from GlobalCitationSnapshot for a past period. */
async function getSnapshotData(period: string, model: string) {
    const where = model === 'all_models' || model === 'all'
        ? { period, llmModel: 'all' }
        : { period, llmModel: model };

    const rows = await prisma.globalCitationSnapshot.findMany({
        where,
        orderBy: { percentage: 'desc' },
        take: 15,
    });

    if (model === 'all_models') {
        const modelRows = await prisma.globalCitationSnapshot.findMany({
            where: { period, llmModel: { not: 'all' } },
            orderBy: [{ llmModel: 'asc' }, { percentage: 'desc' }],
        });

        const modelMap = new Map<string, typeof modelRows>();
        for (const row of modelRows) {
            if (!modelMap.has(row.llmModel)) modelMap.set(row.llmModel, []);
            modelMap.get(row.llmModel)!.push(row);
        }

        const aggregatePrevMap = await getPrevSnapshotMap(period, 'all');
        const aggregateTotal = rows.reduce((s, r) => s + r.count, 0) || 1;
        const aggregate = {
            model: 'all',
            totalCitations: aggregateTotal,
            data: mergePrev(
                rows.map(r => ({ domain: r.domain, count: r.count, percentage: r.percentage })),
                aggregatePrevMap
            ),
        };

        const perModel = await Promise.all(
            Array.from(modelMap.entries()).map(async ([m, items]) => {
                const prevMap = await getPrevSnapshotMap(period, m);
                const total = items.reduce((s, r) => s + r.count, 0) || 1;
                return {
                    model: m,
                    totalCitations: total,
                    data: mergePrev(
                        items.slice(0, 15).map(r => ({ domain: r.domain, count: r.count, percentage: r.percentage })),
                        prevMap
                    ),
                };
            })
        );

        return { models: [aggregate, ...perModel] };
    }

    const total = rows.reduce((s, r) => s + r.count, 0) || 1;
    const prevMap = await getPrevSnapshotMap(period, model === 'all_models' ? 'all' : model);
    return {
        data: mergePrev(
            rows.map(r => ({ domain: r.domain, count: r.count, percentage: r.percentage })),
            prevMap
        ),
        totalCitations: total,
        selectedModel: model,
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const model = searchParams.get('model') || 'all';
        const period = searchParams.get('period');
        const current = currentPeriodKey();
        const isCurrentPeriod = !period || period === current;

        const availableMonths = await getAvailableMonths();

        // --- Serve from snapshot for past periods ---
        if (!isCurrentPeriod && period) {
            const snapshotData = await getSnapshotData(period, model);
            return NextResponse.json({
                ...snapshotData,
                availableMonths,
                period: periodLabel(period),
                prevPeriodLabel: periodLabel(prevPeriodKey(period)),
                source: "Spectacl Privacy-Preserving Network Insights",
            });
        }

        // --- Live data for current period ---

        const allowlistedDomains = await prisma.domain.findMany({
            where: { isAllowlisted: true },
            select: { domain: true },
            orderBy: { domain: 'asc' },
        });
        const PUBLIC_PLATFORMS = allowlistedDomains.map(d => d.domain);

        let result: Record<string, unknown> = {};

        if (model === 'all_models') {
            const enabledModels = await prisma.globalModel.findMany({
                where: { isEnabled: true, isArchived: false },
                select: { modelId: true },
                orderBy: { order: 'asc' },
            });
            const availableModels = enabledModels.map(m => m.modelId);

            const modelData = await Promise.all(availableModels.map(async (m) => {
                const stats = await prisma.analysisLink.groupBy({
                    by: ['domain'],
                    where: {
                        analysisResult: { llmModel: m },
                        domain: { in: PUBLIC_PLATFORMS },
                    },
                    _count: { domain: true },
                    orderBy: { _count: { domain: 'desc' } },
                    take: 15,
                });
                const totalModelCitations = await prisma.analysisLink.count({
                    where: { analysisResult: { llmModel: m } }
                }) || 1;
                const prevMap = await getPrevSnapshotMap(current, m);
                return {
                    model: m,
                    totalCitations: totalModelCitations,
                    data: mergePrev(
                        stats.map(s => ({
                            domain: s.domain,
                            count: s._count.domain,
                            percentage: (s._count.domain / totalModelCitations * 100),
                        })),
                        prevMap
                    ),
                };
            }));

            const aggregateStats = await prisma.domainCitation.groupBy({
                by: ['domain'],
                where: { domain: { in: PUBLIC_PLATFORMS } },
                _sum: { count: true },
                orderBy: { _sum: { count: 'desc' } },
                take: 15,
            });
            const totalAggResult = await prisma.domainCitation.aggregate({ _sum: { count: true } });
            const totalAggregate = totalAggResult._sum.count || 1;
            const aggregatePrevMap = await getPrevSnapshotMap(current, 'all');
            const aggregateData = {
                model: 'all',
                totalCitations: totalAggregate,
                data: mergePrev(
                    aggregateStats.map(s => ({
                        domain: s.domain,
                        count: s._sum.count || 0,
                        percentage: ((s._sum.count || 0) / totalAggregate * 100),
                    })),
                    aggregatePrevMap
                ),
            };

            result = {
                models: [aggregateData, ...modelData],
                availableModels,
                availableMonths,
                period: periodLabel(current),
                prevPeriodLabel: periodLabel(prevPeriodKey(current)),
                source: "Spectacl Privacy-Preserving Network Insights",
            };
        } else if (model === 'all') {
            const stats = await prisma.domainCitation.groupBy({
                by: ['domain'],
                where: { domain: { in: PUBLIC_PLATFORMS } },
                _sum: { count: true },
                _max: { lastSeen: true },
                orderBy: { _sum: { count: 'desc' } },
                take: 20,
            });
            const totalResult = await prisma.domainCitation.aggregate({ _sum: { count: true } });
            const totalCitations = totalResult._sum.count || 1;
            const prevMap = await getPrevSnapshotMap(current, 'all');
            result = {
                data: mergePrev(
                    stats.map(s => ({
                        domain: s.domain,
                        count: s._sum.count || 0,
                        percentage: ((s._sum.count || 0) / totalCitations * 100),
                        lastSeen: s._max.lastSeen,
                    })),
                    prevMap
                ),
                totalCitations,
                availableModels: (await prisma.globalModel.findMany({ where: { isEnabled: true, isArchived: false }, select: { modelId: true }, orderBy: { order: 'asc' } })).map(m => m.modelId),
                availableMonths,
                selectedModel: 'all',
                period: periodLabel(current),
                prevPeriodLabel: periodLabel(prevPeriodKey(current)),
                source: "Spectacl Privacy-Preserving Network Insights",
            };
        } else {
            const stats = await prisma.analysisLink.groupBy({
                by: ['domain'],
                where: {
                    analysisResult: { llmModel: model },
                    domain: { in: PUBLIC_PLATFORMS },
                },
                _count: { domain: true },
                orderBy: { _count: { domain: 'desc' } },
                take: 20,
            });
            const totalCitations = await prisma.analysisLink.count({
                where: { analysisResult: { llmModel: model } }
            }) || 1;
            const prevMap = await getPrevSnapshotMap(current, model);
            result = {
                data: mergePrev(
                    stats.map(s => ({
                        domain: s.domain,
                        count: s._count.domain,
                        percentage: (s._count.domain / totalCitations * 100),
                    })),
                    prevMap
                ),
                totalCitations,
                availableModels: (await prisma.globalModel.findMany({ where: { isEnabled: true, isArchived: false }, select: { modelId: true }, orderBy: { order: 'asc' } })).map(m => m.modelId),
                availableMonths,
                selectedModel: model,
                period: periodLabel(current),
                prevPeriodLabel: periodLabel(prevPeriodKey(current)),
                source: "Spectacl Privacy-Preserving Network Insights",
            };
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("[API/Insights/Global] Error:", error);
        return NextResponse.json({ error: "Failed to fetch global insights" }, { status: 500 });
    }
}
