"use client";

import { useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { Flex, Text, Card, Heading, Box } from '@radix-ui/themes';
import SourceBadge from '@/components/Shared/SourceBadge';
import { SourceMetric } from '@/hooks/useSourceMetrics';

interface SourcesBarChartProps {
    data: SourceMetric[];
    limit?: number;
    title?: string;
    subtitle?: string;
}

const CustomYAxisLabel = ({
    x, y, payload, chartData,
}: {
    x: number;
    y: number;
    payload: { value: string };
    chartData: SourceMetric[];
}) => {
    const entry = chartData.find(d => d.domain === payload.value);
    return (
        <foreignObject x={x - 130} y={y - 12} width={130} height={24}>
            <Flex align="center" gap="2" justify="end" style={{ width: '100%', height: '100%' }}>
                <SourceBadge
                    url={`https://${payload.value}`}
                    logoUrl={entry?.logoUrl}
                    clickable={false}
                    className="max-w-full"
                />
            </Flex>
        </foreignObject>
    );
};

export default function SourcesBarChart({ data, limit = 15, title = "Top Sources", subtitle = "Share of total mentions across analyzed prompts" }: SourcesBarChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const chartData = useMemo(() =>
        [...data].sort((a, b) => b.percentage - a.percentage).slice(0, limit),
    [data, limit]);

    const chartHeight = Math.max(200, limit * 30 + 40);

    return (
        <Flex direction="column" gap="1" style={{ width: '100%' }}>
            <Heading size="3" weight="bold" color="gray" highContrast>{title}</Heading>
            <Text size="1" color="gray" mb="4">{subtitle}</Text>
            {chartData.length === 0 ? (
                <Flex direction="column" gap="3" py="4" style={{ minHeight: 200 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Flex key={i} align="center" gap="3">
                            <Box style={{ width: 100, height: 12, borderRadius: 4, background: 'var(--gray-4)' }} />
                            <Box style={{ width: `${60 - i * 10}%`, height: 10, borderRadius: 4, background: 'var(--gray-3)' }} />
                        </Flex>
                    ))}
                    <Text size="1" color="gray" align="center" mt="2">No data yet</Text>
                </Flex>
            ) : (
            <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                    barSize={10}
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
                        tick={(props) => <CustomYAxisLabel {...props} chartData={chartData} />}
                        width={140}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--gray-3)', opacity: 0.4 }}
                        wrapperStyle={{ border: 'none', background: 'none', boxShadow: 'none', zIndex: 50 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload as SourceMetric;
                                return (
                                    <Card size="1" variant="surface">
                                        <Flex direction="column" gap="2">
                                            <Text size="1" weight="bold">{d.domain}</Text>
                                            <Flex justify="between" gap="4">
                                                <Text size="1" color="gray">Used</Text>
                                                <Text size="1" weight="bold" color="grass">{d.percentage}%</Text>
                                            </Flex>
                                            <Flex justify="between" gap="4">
                                                <Text size="1" color="gray">Presence</Text>
                                                <Text size="1" weight="bold">{d.presence}%</Text>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} animationDuration={300}>
                        {chartData.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index < 3 ? 'var(--grass-9)' : 'var(--gray-7)'}
                                style={{
                                    opacity: activeIndex === null || activeIndex === index ? 1 : 0.3,
                                    transition: 'opacity 0.2s ease',
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
            )}
        </Flex>
    );
}
