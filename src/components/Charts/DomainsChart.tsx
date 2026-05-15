"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';

interface DomainData {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number | boolean | undefined;
}

interface DomainsChartProps {
    data: DomainData[];
    totalDomains?: number;
    p?: React.ComponentProps<typeof Box>["p"];
    /** Skip the internal "Domains by type" heading — for layouts where the
     *  parent renders a unified section header alongside other columns. */
    headerless?: boolean;
}

export default function DomainsChart({ data, totalDomains, p, headerless = false }: DomainsChartProps) {
    const sorted = [...data].sort((a, b) => b.value - a.value);

    return (
        <Flex
            direction="column"
            p={p}
            flexGrow="1"
            style={{ minHeight: 0 }}
        >
            {!headerless && (
                <Flex direction="column" align="center" gap="1" mb="3">
                    <Heading size="3" weight="bold" color="gray" highContrast>Domains by type</Heading>
                    {totalDomains !== undefined && (
                        <Text size="1" color="gray">
                            <Text weight="bold" highContrast>{totalDomains}</Text>
                            {' '}domains total
                        </Text>
                    )}
                </Flex>
            )}
            {/* Chart wrapper fills remaining vertical space in its parent flex
                column. `min-height: 220` keeps bars readable when the parent
                is short; `flex: 1` lets it grow to use available space.       */}
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
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'var(--gray-9)' }}
                                height={20}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'var(--gray-11)' }}
                                width={120}
                                interval={0}
                            />
                            <Bar
                                dataKey="value"
                                radius={[0, 4, 4, 0]}
                                isAnimationActive={false}
                                maxBarSize={28}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    style={{ fontSize: 11, fill: 'var(--gray-11)', fontWeight: 500 }}
                                />
                                {sorted.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <Flex align="center" justify="center" height="100%">
                        <Text size="2" color="gray">No source types data</Text>
                    </Flex>
                )}
            </Box>
        </Flex>
    );
}
