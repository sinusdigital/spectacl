"use client";

import { useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Box, Flex, Text, Card, Heading } from "@radix-ui/themes";
import SourceBadge from "@/components/Shared/SourceBadge";
import ModelLogo from "@/components/Shared/ModelLogo";
import { DEFAULT_MODELS } from "@/types/models";

interface CitationData {
    domain: string;
    count: number;
    percentage: number;
    prevPercentage: number | null;
}

interface GlobalCitationsChartProps {
    data: CitationData[];
    totalCitations: number;
    period: string;
    prevPeriodLabel?: string;
    modelName?: string;
}

interface CitationPayload {
    value: string;
}

const CustomYAxisLabel = ({ x, y, payload }: { x: number, y: number, payload: CitationPayload }) => {
    return (
        <foreignObject x={x - 130} y={y - 12} width={130} height={24}>
            <Flex align="center" gap="2" justify="end" style={{ width: '100%', height: '100%' }}>
                <SourceBadge
                    url={`https://${payload.value}`}
                    logoUrl={`/api/card/logo/${payload.value}`}
                    clickable={false}
                    className="max-w-full"
                />
            </Flex>
        </foreignObject>
    );
};

export default function GlobalCitationsChart({
    data,
    totalCitations,
    period,
    prevPeriodLabel,
    modelName,
}: GlobalCitationsChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const modelInfo = useMemo(() => {
        if (!modelName || modelName === 'all') return null;
        return DEFAULT_MODELS.find(m => m.id === modelName) || { name: modelName, provider: 'unknown' };
    }, [modelName]);

    const chartData = useMemo(() =>
        [...data].sort((a, b) => b.percentage - a.percentage).slice(0, 15),
    [data]);

    const hasPrevData = chartData.some(d => d.prevPercentage !== null);

    // Row height: taller when prev bars are shown to fit two bars comfortably
    const rowHeight = hasPrevData ? 52 : 40;
    const chartHeight = Math.max(200, chartData.length * rowHeight + 40);

    return (
        <Card size="2" variant="surface" style={{ height: '100%' }}>
            <Box p="4">
                <Flex direction="column" gap="1" mb="4">
                    <Flex align="center" gap="2" mb="1">
                        {modelInfo && (
                            <ModelLogo
                                provider={modelInfo.provider}
                                name={modelInfo.name}
                                size="sm"
                            />
                        )}
                        <Heading size="4" weight="bold" color="gray" highContrast>
                            {modelName && modelName !== 'all'
                                ? `Top Cited Platform Domains for ${modelInfo?.name || modelName}`
                                : "Top Cited Platform Domains"
                            }
                        </Heading>
                    </Flex>
                    <Text size="1" color="gray" style={{ opacity: 0.8 }}>
                        Based on {totalCitations.toLocaleString()} citations analyzed in {period}
                    </Text>
                    {/* Legend */}
                    {hasPrevData && prevPeriodLabel && (
                        <Flex align="center" gap="3" mt="1">
                            <Flex align="center" gap="1">
                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--grass-9)' }} />
                                <Text size="1" color="gray">{period}</Text>
                            </Flex>
                            <Flex align="center" gap="1">
                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--gray-5)' }} />
                                <Text size="1" color="gray">{prevPeriodLabel}</Text>
                            </Flex>
                        </Flex>
                    )}
                </Flex>

                <Box style={{ height: chartHeight, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            barSize={8}
                            barGap={2}
                            onMouseMove={(state) => {
                                setActiveIndex(
                                    state.activeTooltipIndex !== undefined
                                        ? Number(state.activeTooltipIndex)
                                        : null
                                );
                            }}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--gray-4)" />
                            <XAxis
                                type="number"
                                domain={[0, 'auto']}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `${val}%`}
                                tick={{ fontSize: 10, fill: 'var(--gray-9)' }}
                                height={20}
                            />
                            <YAxis
                                dataKey="domain"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={<CustomYAxisLabel x={0} y={0} payload={{ value: "" }} />}
                                width={140}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--gray-3)', opacity: 0.4 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload as CitationData;
                                        const delta = d.prevPercentage !== null
                                            ? d.percentage - d.prevPercentage
                                            : null;
                                        return (
                                            <Card size="1" style={{ width: 210, padding: 'var(--space-3)' }} variant="surface" className="shadow-lg backdrop-blur-md bg-[var(--gray-a1)]">
                                                <Flex align="center" gap="2" mb="3">
                                                    <SourceBadge
                                                        url={`https://${d.domain}`}
                                                        logoUrl={`/api/card/logo/${d.domain}`}
                                                        clickable={false}
                                                    />
                                                </Flex>
                                                <Flex direction="column" gap="2">
                                                    <Flex justify="between" align="center">
                                                        <Text size="1" color="gray">{period}</Text>
                                                        <Flex align="center" gap="1">
                                                            <Text size="1" weight="bold" color="grass">{d.percentage.toFixed(1)}%</Text>
                                                            {delta !== null && (
                                                                <Text size="1" weight="bold" style={{
                                                                    color: delta > 0 ? 'var(--grass-9)' : delta < 0 ? 'var(--red-9)' : 'var(--gray-9)'
                                                                }}>
                                                                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                                                                </Text>
                                                            )}
                                                        </Flex>
                                                    </Flex>
                                                    {d.prevPercentage !== null && prevPeriodLabel && (
                                                        <Flex justify="between">
                                                            <Text size="1" color="gray">{prevPeriodLabel}</Text>
                                                            <Text size="1" color="gray">{d.prevPercentage.toFixed(1)}%</Text>
                                                        </Flex>
                                                    )}
                                                </Flex>
                                            </Card>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            {/* Current period bar */}
                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} animationDuration={300} name={period}>
                                {chartData.map((_, index) => (
                                    <Cell
                                        key={`cell-curr-${index}`}
                                        fill={index < 3 ? 'var(--grass-9)' : 'var(--gray-7)'}
                                        style={{
                                            opacity: activeIndex === null || activeIndex === index ? 1 : 0.3,
                                            transition: 'opacity 0.2s ease',
                                        }}
                                    />
                                ))}
                            </Bar>

                            {/* Previous period bar */}
                            {hasPrevData && (
                                <Bar dataKey="prevPercentage" radius={[0, 4, 4, 0]} animationDuration={300} name={prevPeriodLabel}>
                                    {chartData.map((_, index) => (
                                        <Cell
                                            key={`cell-prev-${index}`}
                                            fill={'var(--gray-5)'}
                                            style={{
                                                opacity: activeIndex === null || activeIndex === index ? 1 : 0.3,
                                                transition: 'opacity 0.2s ease',
                                            }}
                                        />
                                    ))}
                                </Bar>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </Card>
    );
}
