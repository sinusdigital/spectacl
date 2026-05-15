"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts';
import { Box, Card, Flex, Text } from '@radix-ui/themes';

export interface BrandsBarChartDatum {
    normalizedKey: string;
    canonicalName: string;
    mentionCount: number;
    coveragePct: number;
    avgPosition: number | null;
    brandColor: string | null;
    status: string;
}

interface BrandsBarChartProps {
    data: BrandsBarChartDatum[];
    topN?: number;
    totalBrands?: number;
    /** Skip the internal `{totalBrands} brands` mini-header when the parent
     *  renders its own section header (e.g. inside a `SplitCard.Pane`). */
    headerless?: boolean;
}

const FALLBACK_COLOR = 'var(--gray-7)';

export default function BrandsBarChart({ data, topN = 9, totalBrands, headerless = false }: BrandsBarChartProps) {
    // Stabilize the chart data reference across parent re-renders (e.g. the prompt
    // detail page polls every 3s while a prompt is running — without memoization
    // Recharts re-runs its entrance animation each tick and the labels appear to blink).
    // Key on a content-derived signature, not the array reference.
    const dataSignature = data.map(d => `${d.normalizedKey}:${d.coveragePct}:${d.mentionCount}`).join('|');
    const { sorted, rest } = useMemo(() => {
        const sortedAll = [...data].sort((a, b) => b.coveragePct - a.coveragePct);
        const top = sortedAll.slice(0, topN);
        const restArr = sortedAll.slice(topN);
        const otherAvgCoverage = restArr.length > 0
            ? Math.round(restArr.reduce((sum, r) => sum + r.coveragePct, 0) / restArr.length)
            : 0;
        const otherMentions = restArr.reduce((sum, r) => sum + r.mentionCount, 0);

        const sortedFinal: BrandsBarChartDatum[] = restArr.length > 0
            ? [
                ...top,
                {
                    normalizedKey: "__other__",
                    canonicalName: "Other",
                    mentionCount: otherMentions,
                    coveragePct: otherAvgCoverage,
                    avgPosition: null,
                    brandColor: null,
                    status: "other",
                },
            ]
            : top;

        return { sorted: sortedFinal, rest: restArr };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataSignature, topN]);

    return (
        <Flex direction="column" flexGrow="1" style={{ minHeight: 0 }}>
            {!headerless && totalBrands !== undefined && (
                <Flex justify="center" mb="2">
                    <Text size="1" color="gray">
                        <Text weight="bold" size="4" color="gray" highContrast>{totalBrands}</Text>
                        {' '}brands
                    </Text>
                </Flex>
            )}
            {/* Chart fills remaining vertical space so it matches the table
                pane's height when used inside a `SplitCard`. `min-height: 220`
                keeps bars readable when the parent is short.                */}
            <Box flexGrow="1" style={{ minHeight: 220, width: '100%' }}>
                {sorted.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sorted}
                            layout="vertical"
                            margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
                            barCategoryGap="25%"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a3)" horizontal={false} vertical />
                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `${val}%`}
                                tick={{ fontSize: 10, fill: 'var(--gray-9)' }}
                                height={20}
                            />
                            <YAxis
                                type="category"
                                dataKey="canonicalName"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'var(--gray-11)' }}
                                width={120}
                                interval={0}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--gray-3)', opacity: 0.4 }}
                                wrapperStyle={{ border: 'none', background: 'none', boxShadow: 'none', zIndex: 50 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload as BrandsBarChartDatum;
                                        const isOther = d.status === "other";
                                        return (
                                            <Card size="1" variant="surface">
                                                <Flex direction="column" gap="2">
                                                    <Text size="1" weight="bold">{d.canonicalName}</Text>
                                                    {isOther ? (
                                                        <>
                                                            <Flex justify="between" gap="4">
                                                                <Text size="1" color="gray">Avg mention rate</Text>
                                                                <Text size="1" weight="bold">{d.coveragePct}%</Text>
                                                            </Flex>
                                                            <Flex justify="between" gap="4">
                                                                <Text size="1" color="gray">Brands</Text>
                                                                <Text size="1" weight="bold">{rest.length}</Text>
                                                            </Flex>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Flex justify="between" gap="4">
                                                                <Text size="1" color="gray">Mention rate</Text>
                                                                <Text size="1" weight="bold">{d.coveragePct}%</Text>
                                                            </Flex>
                                                            {d.avgPosition != null && (
                                                                <Flex justify="between" gap="4">
                                                                    <Text size="1" color="gray">Avg position</Text>
                                                                    <Text size="1" weight="bold">#{d.avgPosition.toFixed(1)}</Text>
                                                                </Flex>
                                                            )}
                                                        </>
                                                    )}
                                                </Flex>
                                            </Card>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="coveragePct"
                                radius={[0, 4, 4, 0]}
                                isAnimationActive={false}
                                maxBarSize={28}
                            >
                                <LabelList
                                    dataKey="coveragePct"
                                    position="right"
                                    formatter={(value: React.ReactNode) => `${value}%`}
                                    style={{ fontSize: 11, fill: 'var(--gray-11)', fontWeight: 500 }}
                                />
                                {sorted.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.brandColor ?? FALLBACK_COLOR} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <Flex align="center" justify="center" height="100%">
                        <Text size="2" color="gray">No brand data yet</Text>
                    </Flex>
                )}
            </Box>
        </Flex>
    );
}
