"use client";

import { useState, useMemo } from "react";
import { Text, Flex, Box, Grid, Card } from "@radix-ui/themes";
import PositionChart from "@/components/Charts/PositionChart";
import RadixTable from "@/components/Shared/RadixTable";
import CompanyLogo from "@/components/CompanyLogo";
import { TimeRangeType } from "@/components/Shared/FilterBar";

const PRIMARY_COLOR = '#3B82F6';
const OTHER_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

import { AnalysisResult, Prompt } from "@/types/prompts";
import { Competitor } from "@/types/competitors";
import { parseRankingResponse } from "@/lib/rankingUtils";
import { StructuredRankingResponse } from "@/types/ranking";

interface RankingReportProps {
    report: {
        id: string;
        name?: string | null;
        updatedAt: string | Date;
        primaryBuyerRole?: string | null;
        industry?: string | null;
        companySize?: string | null;
        decisionContext?: string | null;
        prompt?: (Prompt & {
            analysisResults: AnalysisResult[]
        }) | null;
        entity?: { name: string; website?: string | null; logoUrl?: string | null; primaryColor?: string | null } | null;
        competitors?: (Competitor & { color?: string | null; primaryColor?: string | null })[] | null;
    };
    timeRange?: TimeRangeType;
}

function CompetitorLogoCell({ name, logoUrl, website, chartColor }: {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    chartColor?: string;
}) {
    return (
        <Flex align="center" gap="2" style={{ minWidth: 0, overflow: 'hidden' }}>
            <CompanyLogo
                name={name}
                logoUrl={logoUrl}
                domain={website}
                size={20}
                radius="full"
                className="flex-shrink-0"
            />
            <Text size="2" weight="medium" color="gray" highContrast truncate>
                {name}
            </Text>
        </Flex>
    );
}

export default function RankingReport({ report, timeRange = '30d' }: RankingReportProps) {
    const [hoveredCompetitor, setHoveredCompetitor] = useState<string | null>(null);

    const latestResult = report.prompt?.analysisResults?.length
        ? [...report.prompt.analysisResults].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;

    const structuredData = useMemo<StructuredRankingResponse | null>(() => {
        return latestResult ? parseRankingResponse(latestResult.response) : null;
    }, [latestResult]);

    // Filter results by time range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 1;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantResults = report.prompt?.analysisResults?.filter((r) => new Date(r.createdAt) >= cutoffDate) || [];

    // Lookups
    const competitorIdToName = new Map<string, string>();
    if (report.competitors) {
        report.competitors.forEach((c) => competitorIdToName.set(c.id, c.name));
    }
    const entityName = report.entity?.name;
    const primaryName = entityName || 'Your Brand';

    // ── Aggregate results into daily buckets using ISO date keys ──
    const dataMap = new Map<string, Record<string, number | null>>();
    const dailyAggregates = new Map<string, Record<string, { sumPresence: number, sumSoV: number, sumPosition: number, count: number, countRanked: number }>>();

    relevantResults.forEach((res) => {
        const dateKey = new Date(res.createdAt).toISOString().split('T')[0];

        const mentions = res.mentions || [];
        const totalMentions = mentions.length;

        const mentionedNames = new Set<string>();
        const mentionCounts: Record<string, number> = {};
        const bestPositions: Record<string, number> = {};

        mentions.forEach((m) => {
            let name: string | null = null;
            if (m.isPrimaryEntity) name = entityName || null;
            else if (m.competitorId && competitorIdToName.has(m.competitorId)) name = competitorIdToName.get(m.competitorId) || null;
            else {
                if (entityName === m.detectedName) name = entityName || null;
                else if (Array.from(competitorIdToName.values()).includes(m.detectedName)) name = m.detectedName;
            }

            if (name) {
                mentionedNames.add(name);
                mentionCounts[name] = (mentionCounts[name] || 0) + 1;
                if (m.position !== null && m.position !== undefined) {
                    if (bestPositions[name] === undefined || m.position < bestPositions[name]) {
                        bestPositions[name] = m.position;
                    }
                }
            }
        });

        if (!dailyAggregates.has(dateKey)) dailyAggregates.set(dateKey, {});
        const dayStats = dailyAggregates.get(dateKey)!;
        const allTracked = [report.entity, ...(report.competitors || [])].filter(Boolean);

        allTracked.forEach((entity) => {
            if (!entity) return;
            const name = entity.name;
            const isMentioned = mentionedNames.has(name);
            const presence = isMentioned ? 100 : 0;
            const sov = totalMentions > 0 ? ((mentionCounts[name] || 0) / totalMentions) * 100 : 0;
            const position = bestPositions[name];

            if (!dayStats[name]) dayStats[name] = { sumPresence: 0, sumSoV: 0, sumPosition: 0, count: 0, countRanked: 0 };
            dayStats[name].sumPresence += presence;
            dayStats[name].sumSoV += sov;
            dayStats[name].count += 1;
            if (isMentioned && position !== undefined) {
                dayStats[name].sumPosition += position;
                dayStats[name].countRanked += 1;
            }
        });
    });

    // Flatten aggregates into dataMap
    for (const [dateKey, stats] of dailyAggregates.entries()) {
        const point: Record<string, number | null> = {};
        Object.keys(stats).forEach(name => {
            const { sumPresence, sumSoV, sumPosition, count, countRanked } = stats[name];
            point[name] = count > 0 ? parseFloat((sumPresence / count).toFixed(1)) : 0;
            point[`${name}_sov`] = count > 0 ? parseFloat((sumSoV / count).toFixed(1)) : 0;
            point[`${name}_position`] = countRanked > 0 ? parseFloat((sumPosition / countRanked).toFixed(1)) : null;
        });
        dataMap.set(dateKey, point);
    }

    // ── Fill date range for continuous X-axis (matches OverviewCharts logic) ──
    // Rules:
    //   • x-axis bounded to [today-days … today]
    //   • Trim to inception-1 when data is younger than the range
    //     (avoids long empty left edge)
    //   • Never extend beyond the selected range
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const rangeStart = new Date(today);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - days);

    // Find primary entity's inception (first date with real data)
    let inceptionStart: Date | null = null;
    const sortedKeys = Array.from(dataMap.keys()).sort();
    for (const key of sortedKeys) {
        const val = dataMap.get(key);
        if (val && val[primaryName] !== undefined && val[primaryName] !== null) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartData: any[] = [];
    for (let d = new Date(effectiveStart); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        chartData.push({ ...dataMap.get(key), date: key });
    }

    let colorIndex = 0;
    const chartEntities = [
        { name: report.entity?.name || 'Your Brand', color: PRIMARY_COLOR, strokeWidth: 4, opacity: 1, website: report.entity?.website ?? undefined, logoUrl: report.entity?.logoUrl ?? undefined },
        ...(report.competitors || []).map((c) => ({
            name: c.name,
            color: c.primaryColor || c.color || OTHER_COLORS[colorIndex++ % OTHER_COLORS.length],
            strokeWidth: 2,
            opacity: 0.4,
            website: c.website ?? undefined,
            logoUrl: c.logoUrl ?? undefined
        }))
    ];

    const tableData = [report.entity, ...(report.competitors || [])]
        .filter((comp): comp is { id: string; name: string; logoUrl?: string | null; website?: string | null } => comp !== null && comp !== undefined)
        .map((comp) => {
            let totalPresence = 0;
            let totalSoV = 0;
            let totalPosition = 0;
            let count = 0;
            let countRanked = 0;

            chartData.forEach((d) => {
                const name = comp.name;
                const presence = d[name];
                if (presence !== undefined && typeof presence === 'number') {
                    totalPresence += presence;
                    totalSoV += (d[`${name}_sov`] as number) || 0;
                    count++;
                    const pos = d[`${name}_position`];
                    if (pos !== null && pos !== undefined && typeof pos === 'number') {
                        totalPosition += pos;
                        countRanked++;
                    }
                }
            });

            const structuredEntity = structuredData?.market_ranking?.entities?.find(e => {
                if (!e.name || !comp.name) return false;
                return e.name.toLowerCase().includes(comp.name.toLowerCase()) ||
                       comp.name.toLowerCase().includes(e.name.toLowerCase());
            });

            return {
                ...comp,
                visibility: count > 0 ? parseFloat((totalPresence / count).toFixed(1)) : 0,
                shareOfVoice: count > 0 ? parseFloat((totalSoV / count).toFixed(1)) : 0,
                averagePosition: countRanked > 0 ? parseFloat((totalPosition / countRanked).toFixed(1)) : "-",
                marketShare: structuredEntity?.market_share || "-"
            };
        })
        .sort((a, b) => {
            const aPos = typeof a.averagePosition === 'number' ? a.averagePosition : Infinity;
            const bPos = typeof b.averagePosition === 'number' ? b.averagePosition : Infinity;
            if (aPos !== bPos) return aPos - bPos;
            return b.visibility - a.visibility;
        });

    return (
        <Card variant="surface" size="3" className="overflow-hidden !p-0">
            {/* Chart + Table grid */}
            <Grid columns={{ initial: '1', lg: '3fr 2fr' }} gap="0">
                {/* Chart panel */}
                <Flex
                    direction="column"
                    p="5"
                    gap="4"
                    style={{ borderRight: '1px solid var(--gray-4)' }}
                >
                    <Flex direction="column" style={{ height: 300 }}>
                        <PositionChart
                            data={chartData}
                            entities={chartEntities}
                            days={days}
                            hoveredEntityName={hoveredCompetitor}
                        />
                    </Flex>
                </Flex>

                {/* Table panel */}
                <Box p="5">
                    <RadixTable.Root variant="ghost" size="1">
                        <RadixTable.Header>
                            <RadixTable.Row>
                                <RadixTable.Head>Competitors</RadixTable.Head>
                                <RadixTable.Head>Position</RadixTable.Head>
                            </RadixTable.Row>
                        </RadixTable.Header>
                        <RadixTable.Body>
                            {tableData.map((comp, index) => (
                                <RadixTable.Row
                                    key={comp.id}
                                    onMouseEnter={() => setHoveredCompetitor(comp.name)}
                                    onMouseLeave={() => setHoveredCompetitor(null)}
                                    className="cursor-pointer group hover:bg-[var(--gray-2)]"
                                >
                                    <RadixTable.Cell>
                                        <CompetitorLogoCell
                                            name={comp.name}
                                            logoUrl={comp.logoUrl}
                                            website={comp.website}
                                            chartColor={chartEntities.find(e => e.name === comp.name)?.color}
                                        />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Text size="2" weight="medium" color="gray" className="tabular-nums">{comp.averagePosition !== "-" ? Number(comp.averagePosition).toFixed(1) : "—"}</Text>
                                    </RadixTable.Cell>
                                </RadixTable.Row>
                            ))}
                        </RadixTable.Body>
                    </RadixTable.Root>
                </Box>
            </Grid>
        </Card>
    );
}
