/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from "react";
import { TimeRangeType } from '@/components/Shared/FilterBar';

export interface CompetitorMetric {
  id: string;
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  visibility: number;
  visibilityChange: number | null;
  totalCount?: number;
  mentionCount?: number;
  shareOfVoice: number;
  shareOfVoiceChange: number | null;
  position: number | null;
  positionChange: number | null;
  linkPercentage: number;
  icon: string;
  color?: string | null;
}

interface UseOverviewMetricsProps {
    entityId: string;
    viewAsId: string;
    timeRange: TimeRangeType;
    tagFilter?: string[];
    modelFilter?: string[];
    intentFilter?: string[];
    includePaused?: boolean;
    promptId?: string;
    /** Bump this to force a data refresh (e.g. after polling discovers new results) */
    refreshKey?: number;
}

// ── Utilities (module-level, no per-render allocation) ──

function formatDateKey(d: string | Date): string {
    return new Date(d).toISOString().split('T')[0];
}

const OTHER_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function calcAvg(items: any[], key: string): number {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item[key] || 0), 0) / items.length;
}

function calcAvgPos(items: any[]): number | null {
    const valid = items.filter(i => i.position != null && i.position > 0);
    if (valid.length === 0) return null;
    return valid.reduce((sum, item) => sum + item.position, 0) / valid.length;
}

// ── Hook ──

export function useOverviewMetrics({
    entityId,
    viewAsId,
    timeRange,
    tagFilter = [],
    modelFilter = [],
    intentFilter = [],
    includePaused = false,
    promptId,
    refreshKey = 0,
}: UseOverviewMetricsProps) {
    const [competitorMetrics, setCompetitorMetrics] = useState<CompetitorMetric[]>([]);
    const [historyData, setHistoryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<'visibility' | 'position' | 'shareOfVoice'>('visibility');

    // Stable serialised filter keys so we don't call JSON.stringify inside the dep array
    const tagKey = tagFilter.join(',');
    const modelKey = modelFilter.join(',');
    const intentKey = intentFilter.join(',');

    // Keep a ref for the latest filters so fetchData always reads current values
    const filtersRef = useRef({ tagFilter, modelFilter, intentFilter, includePaused, timeRange, promptId });
    filtersRef.current = { tagFilter, modelFilter, intentFilter, includePaused, timeRange, promptId };

    // ── Effect: Fetch raw data ──
    useEffect(() => {
        if (!entityId) return;

        let cancelled = false;
        setLoading(true);

        const run = async () => {
            try {
                const { tagFilter: tags, modelFilter: models, intentFilter: intents, includePaused: paused, timeRange: tr, promptId: pid } = filtersRef.current;
                const apiTimeframe = tr === '7d' ? 'weekly' : tr === '90d' ? 'extended' : 'standard';

                const buildQueryParams = (includeTimeframe: boolean) => {
                    const params: string[] = [];
                    if (includeTimeframe) params.push(`timeframe=${apiTimeframe}`);
                    if (tags.length > 0) params.push(`tags=${encodeURIComponent(tags.join(','))}`);
                    if (models.length > 0) params.push(`models=${encodeURIComponent(models.join(','))}`);
                    if (intents.length > 0) params.push(`intents=${encodeURIComponent(intents.join(','))}`);
                    params.push(`includePaused=${paused}`);
                    return `?${params.join('&')}`;
                };

                const metricsUrl = pid
                    ? `/api/prompts/${pid}/metrics${buildQueryParams(true)}`
                    : `/api/entities/${entityId}/metrics${buildQueryParams(true)}`;
                const historyUrl = pid
                    ? `/api/prompts/${pid}/metrics/history${buildQueryParams(false)}`
                    : `/api/entities/${entityId}/metrics/history${buildQueryParams(false)}`;

                const [entityData, compData, metricsData, historyResponseData] = await Promise.all([
                    fetch(`/api/entities/${entityId}`).then(r => r.json()),
                    fetch(`/api/entities/${entityId}/competitors`).then(r => r.json()),
                    fetch(metricsUrl).then(r => r.json()),
                    fetch(historyUrl).then(r => r.json()),
                ]);

                if (cancelled) return;

                // Build CompetitorMetric[]
                const mapToMetric = (base: any, snapshot: any): CompetitorMetric => ({
                    id: base.id,
                    name: base.name,
                    website: base.website,
                    logoUrl: base.logoUrl,
                    visibility: snapshot?.visibility ? Number(snapshot.visibility.toFixed(1)) : 0,
                    visibilityChange: snapshot?.visibilityChange !== undefined ? snapshot.visibilityChange : null,
                    totalCount: snapshot?.totalCount || 0,
                    mentionCount: snapshot?.mentionCount || 0,
                    shareOfVoice: snapshot?.shareOfVoice ? Number(snapshot.shareOfVoice.toFixed(1)) : 0,
                    shareOfVoiceChange: snapshot?.shareOfVoiceChange !== undefined ? snapshot.shareOfVoiceChange : null,
                    position: snapshot?.position != null ? Number(snapshot.position.toFixed(1)) : null,
                    positionChange: snapshot?.positionChange !== undefined ? snapshot.positionChange : null,
                    linkPercentage: snapshot?.linkPercentage ? Number(snapshot.linkPercentage.toFixed(0)) : 0,
                    icon: base.name.charAt(0).toUpperCase(),
                    color: base.primaryColor,
                });

                const metrics: CompetitorMetric[] = [];
                if (entityData && !entityData.error) {
                    metrics.push(mapToMetric(entityData, metricsData.entity));
                }
                if (Array.isArray(compData)) {
                    compData.forEach((comp: any) => {
                        const snapshot = metricsData.competitors?.find((m: any) => m.competitorId === comp.id);
                        metrics.push(mapToMetric(comp, snapshot));
                    });
                }

                setHistoryData(historyResponseData);
                setCompetitorMetrics(metrics);
            } catch (error) {
                console.error("Error fetching overview metrics data:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, [entityId, promptId, timeRange, tagKey, modelKey, intentKey, includePaused, refreshKey]);

    // ── Derived data: computed synchronously via useMemo (no extra render) ──
    const derived = useMemo(() => {
        const empty = {
            visibilityChartData: [] as any[],
            sovChartData: [] as any[],
            visibilityEntities: [] as { name: string; color: string; strokeWidth?: number; opacity?: number }[],
            mentionTrend: undefined as { value?: number; label: string; text?: string; color?: string } | undefined,
            positionTrend: undefined as { text: string; color: string; label?: string; arrow?: string } | undefined,
            periodAvgPosition: null as number | null,
            sovTrend: undefined as { text: string; color: string; label?: string; arrow?: string } | undefined,
        };

        if (!historyData || competitorMetrics.length === 0) return empty;

        const currentEntityData = competitorMetrics.find(c => c.id === viewAsId) || competitorMetrics.find(c => c.id === entityId);
        if (!currentEntityData) return empty;

        const entityHistory: any[] = historyData.entity || [];
        const competitorHistory: any[] = historyData.competitors || [];

        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const now = new Date();
        const currentStart = new Date(); currentStart.setUTCHours(0, 0, 0, 0); currentStart.setUTCDate(currentStart.getUTCDate() - days);
        const prevStart = new Date(); prevStart.setUTCHours(0, 0, 0, 0); prevStart.setUTCDate(prevStart.getUTCDate() - days * 2);

        // Resolve primary history based on viewAsId
        let primaryHistory = entityHistory;
        if (viewAsId !== entityId) {
            const entry = competitorHistory.find((c: any) => c.competitorId === viewAsId || c.id === viewAsId);
            primaryHistory = entry?.history ?? [];
        }

        // ── Mention trend ──
        const currentPeriod = primaryHistory.filter((h: any) => new Date(h.date) >= currentStart);
        const prevPeriod = primaryHistory.filter((h: any) => new Date(h.date) >= prevStart && new Date(h.date) < currentStart);

        let mentionTrend: typeof empty.mentionTrend;
        if (currentPeriod.length > 0 || prevPeriod.length > 0) {
            if (prevPeriod.length > 0) {
                const trendDiff = calcAvg(currentPeriod, 'visibility') - calcAvg(prevPeriod, 'visibility');
                mentionTrend = { value: trendDiff, label: `in previous ${days} days` };
            } else {
                mentionTrend = { label: `in last ${days} days`, text: "No previous data", color: "text-[var(--gray-9)]" };
            }
        }

        // ── Position trend ──
        const currAvgPosCalc = calcAvgPos(currentPeriod);
        const prevAvgPos = calcAvgPos(prevPeriod);
        const currAvgPos = currAvgPosCalc ?? (currentEntityData.position ?? null);

        let positionTrend: typeof empty.positionTrend;
        if (currAvgPos !== null) {
            if (prevAvgPos !== null) {
                const improved = currAvgPos < prevAvgPos;
                positionTrend = {
                    arrow: improved ? '▲' : '▼',
                    text: prevAvgPos.toFixed(1),
                    color: improved ? 'text-[var(--green-11)]' : (currAvgPos > prevAvgPos ? 'text-[var(--red-11)]' : 'text-[var(--gray-11)]'),
                    label: `in previous ${days} days`
                };
            } else {
                positionTrend = { text: "No previous data", color: "text-[var(--gray-9)]", label: `in last ${days} days` };
            }
        }

        // ── Build visibility chart data map ──
        const primaryName = currentEntityData.name;
        const realEntityName = competitorMetrics.find(c => c.id === entityId)?.name || 'Your Brand';
        const dataMap = new Map<string, any>();

        primaryHistory.forEach((point: any) => {
            const key = formatDateKey(point.date);
            dataMap.set(key, {
                date: key,
                [primaryName]: Number(point.visibility.toFixed(1)),
                [`${primaryName}_position`]: point.position != null ? Number(point.position.toFixed(1)) : null
            });
        });

        if (viewAsId !== entityId) {
            entityHistory.forEach((point: any) => {
                const key = formatDateKey(point.date);
                if (!dataMap.has(key)) dataMap.set(key, { date: key });
                const e = dataMap.get(key);
                e[realEntityName] = Number(point.visibility.toFixed(1));
                e[`${realEntityName}_position`] = point.position != null ? Number(point.position.toFixed(1)) : null;
            });
        }

        competitorHistory.forEach((comp: any) => {
            if (comp.competitorId === viewAsId) return; // skip the viewed-as competitor (already primary)
            comp.history.forEach((point: any) => {
                const key = formatDateKey(point.date);
                if (!dataMap.has(key)) dataMap.set(key, { date: key });
                const e = dataMap.get(key);
                e[comp.name] = Number(point.visibility.toFixed(1));
                e[`${comp.name}_position`] = point.position != null ? Number(point.position.toFixed(1)) : null;
            });
        });

        // ── Build SOV chart data (O(n) with pre-built lookup maps) ──
        // Pre-index entity history and each competitor's history by date key
        const entityByDate = new Map<string, any>();
        entityHistory.forEach((h: any) => entityByDate.set(formatDateKey(h.date), h));

        const compByDate = new Map<string, Map<string, any>>();
        competitorHistory.forEach((c: any) => {
            const m = new Map<string, any>();
            c.history.forEach((h: any) => m.set(formatDateKey(h.date), h));
            compByDate.set(c.name, m);
        });

        const allDates = new Set<string>();
        entityHistory.forEach((h: any) => allDates.add(formatDateKey(h.date)));
        competitorHistory.forEach((c: any) => c.history.forEach((h: any) => allDates.add(formatDateKey(h.date))));

        const sovMap = new Map<string, any>();
        allDates.forEach(dateKey => {
            let totalMarketMentions = 0;
            const entityDay = entityByDate.get(dateKey);
            const entityMentions = entityDay?.mentioned ?? 0;
            totalMarketMentions += entityMentions;

            const compMentions: Record<string, number> = {};
            compByDate.forEach((dateMap, compName) => {
                const h = dateMap.get(dateKey);
                const mentions = h?.mentioned ?? 0;
                compMentions[compName] = mentions;
                totalMarketMentions += mentions;
            });

            const entry: any = { date: dateKey };
            if (totalMarketMentions > 0) {
                entry[realEntityName] = (entityMentions / totalMarketMentions) * 100;
                Object.entries(compMentions).forEach(([name, count]) => {
                    entry[name] = (count / totalMarketMentions) * 100;
                });
            } else {
                entry[realEntityName] = null;
                Object.keys(compMentions).forEach(name => entry[name] = null);
            }
            sovMap.set(dateKey, entry);
        });

        // ── Fill date range for continuous X-axis ──
        // Hook owns ALL date-range logic. Charts receive pre-trimmed data.
        //
        // Rules:
        //   • Strict N days: x-axis bounded to [today-days … today]
        //   • Trim to inception-1 when data is younger than the range
        //     (avoids long empty left edge)
        //   • Never extend beyond the selected range
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const rangeStart = new Date(today);
        rangeStart.setUTCDate(rangeStart.getUTCDate() - days);

        // Find primary entity's inception (first date with real data)
        let inceptionStart: Date | null = null;
        for (const [key, val] of dataMap.entries()) {
            if (val[primaryName] !== undefined && val[primaryName] !== null) {
                inceptionStart = new Date(key + 'T00:00:00Z');
                break;
            }
        }

        // effectiveStart: rangeStart, or inception-1 if data is younger
        let effectiveStart = new Date(rangeStart);
        if (inceptionStart && inceptionStart > rangeStart) {
            const inceptionMinus1 = new Date(inceptionStart);
            inceptionMinus1.setUTCDate(inceptionMinus1.getUTCDate() - 1);
            // Clamp: never go earlier than rangeStart
            effectiveStart = inceptionMinus1 > rangeStart ? inceptionMinus1 : rangeStart;
        }

        const chartData: any[] = [];
        const sovChartDataFiltered: any[] = [];

        // Visibility/position chart data
        for (let d = new Date(effectiveStart); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            chartData.push({ ...dataMap.get(key), date: key });
        }

        // SOV chart: forward-fill gaps so stacked areas don't collapse
        let lastKnownSov: any = null;
        for (let d = new Date(effectiveStart); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            const entry = sovMap.get(key);
            const hasData = entry && Object.values(entry).some(v => typeof v === 'number');
            if (hasData) {
                lastKnownSov = entry;
                sovChartDataFiltered.push({ ...entry, date: key });
            } else if (lastKnownSov) {
                sovChartDataFiltered.push({ ...lastKnownSov, date: key });
            } else {
                sovChartDataFiltered.push({ date: key });
            }
        }

        // ── SOV trend (both periods computed from same source) ──
        const calcSovPeriodAvg = (start: Date, end: Date): number | null => {
            const periodDates = Array.from(sovMap.values()).filter(item => {
                const d = new Date(item.date);
                return d >= start && d < end;
            });
            if (periodDates.length === 0) return null;
            return periodDates.reduce((acc, curr) => acc + (curr[realEntityName] ?? 0), 0) / periodDates.length;
        };

        const prevAvgSov = calcSovPeriodAvg(prevStart, currentStart);
        const currAvgSov = calcSovPeriodAvg(currentStart, now) ?? (currentEntityData.shareOfVoice ?? null);

        let sovTrend: typeof empty.sovTrend;
        if (currAvgSov !== null) {
            if (prevAvgSov !== null) {
                const improved = currAvgSov > prevAvgSov;
                sovTrend = {
                    arrow: improved ? '▲' : '▼',
                    text: `${prevAvgSov.toFixed(1)}%`,
                    color: improved ? 'text-[var(--green-11)]' : (currAvgSov < prevAvgSov ? 'text-[var(--red-11)]' : 'text-[var(--gray-11)]'),
                    label: `in previous ${days} days`
                };
            } else {
                sovTrend = { text: "No previous data", color: "text-[var(--gray-9)]", label: `in last ${days} days` };
            }
        }

        // ── Build entity list for chart lines ──
        const visibilityEntities = [{ name: primaryName, color: currentEntityData.color || '#3B82F6', strokeWidth: 4, opacity: 1 }];
        let colorIndex = 0;
        competitorMetrics.forEach(metric => {
            if (metric.id !== viewAsId) {
                visibilityEntities.push({
                    name: metric.name,
                    color: metric.color || OTHER_COLORS[colorIndex++ % OTHER_COLORS.length],
                    strokeWidth: 2,
                    opacity: 0.4
                });
            }
        });

        return {
            visibilityChartData: chartData,
            sovChartData: sovChartDataFiltered,
            visibilityEntities,
            mentionTrend,
            positionTrend,
            periodAvgPosition: currAvgPos,
            sovTrend,
        };
    }, [historyData, competitorMetrics, viewAsId, entityId, timeRange]);

    return {
        loading,
        competitorMetrics,
        visibilityChartData: derived.visibilityChartData,
        sovChartData: derived.sovChartData,
        visibilityEntities: derived.visibilityEntities,
        activeMetric,
        setActiveMetric,
        mentionTrend: derived.mentionTrend,
        positionTrend: derived.positionTrend,
        periodAvgPosition: derived.periodAvgPosition,
        sovTrend: derived.sovTrend,
    };
}
