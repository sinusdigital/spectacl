"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Box, Flex, Text } from '@radix-ui/themes';

interface PromptIntentChartProps {
    data: { name: string; value: number }[];
    totalPrompts?: number;
    p?: React.ComponentProps<typeof Box>["p"];
}

const ALL_INTENTS = ['Informational', 'Transactional', 'Commercial', 'Navigational'] as const;

const INTENT_COLORS: Record<string, string> = {
    'Informational': '#3b82f6',
    'Transactional': '#10b981',
    'Commercial': '#8b5cf6',
    'Navigational': '#f97316',
};

export default function PromptIntentChart({ data, totalPrompts, p }: PromptIntentChartProps) {
    const dataMap = new Map(data.map(d => [d.name, d.value]));
    const complete = ALL_INTENTS.map(name => ({
        name,
        value: dataMap.get(name) ?? 0,
    }));

    return (
        <Box p={p}>
            {totalPrompts !== undefined && (
                <Flex justify="center" mb="2">
                    <Text size="1" color="gray">
                        <Text weight="bold" size="4" color="gray" highContrast>{totalPrompts}</Text>
                        {' '}prompts
                    </Text>
                </Flex>
            )}
            <div className="w-full" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={complete}
                        margin={{ top: 20, right: 4, bottom: 4, left: 4 }}
                        barCategoryGap="25%"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a3)" horizontal vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: 'var(--gray-9)', width: 80, textAnchor: 'middle' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            height={40}
                        />
                        <YAxis hide />
                        <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            animationDuration={300}
                            maxBarSize={32}
                        >
                            <LabelList
                                dataKey="value"
                                position="top"
                                style={{ fontSize: 11, fill: 'var(--gray-11)', fontWeight: 500 }}
                            />
                            {complete.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={INTENT_COLORS[entry.name]}
                                    fillOpacity={entry.value === 0 ? 0.15 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Box>
    );
}
