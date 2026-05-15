"use client";

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ChartTooltip from './ChartTooltip';
import { processChartData, formatDateLabel, type ChartEntity } from '@/lib/chartDataProcessing';

interface DataPoint {
    date: string;
    [key: string]: number | string;
}

interface PositionChartProps {
    data: DataPoint[];
    entities: ChartEntity[];
    avgPosition?: number | null;
    days?: number;
    hoveredEntityName?: string | null;
}

export default function PositionChart({ data, entities, days = 30, hoveredEntityName }: PositionChartProps) {
    const { processedData, inceptionDate, yDomain, tickInterval } = useMemo(
        () => processChartData({
            data,
            entities,
            days,
            dataKeyFn: name => `${name}_position`,
            fillValue: 'baseline',
            perEntityInception: true,
        }),
        [data, entities, days]
    );

    return (
        <div className="w-full flex-1 min-h-0">
            {processedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={processedData}
                            margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a3)" />
                        <XAxis
                            dataKey="date"
                            stroke="var(--gray-a5)"
                            fontSize={12}
                            tickLine={false}
                            interval={tickInterval}
                            padding={{ right: 24 }}
                            tickFormatter={(value: string) => formatDateLabel(value, days)}
                        />
                            <YAxis
                                stroke="var(--gray-a5)"
                                fontSize={12}
                                tickLine={false}
                                reversed={true}
                                domain={yDomain}
                                allowDecimals={false}
                                ticks={Array.from({ length: yDomain[1] }, (_, i) => i + 1)}
                                width={46}
                            />
                            <Tooltip
                                content={<ChartTooltip days={days} entities={entities} valuePrefix="#" />}
                                cursor={{ stroke: 'var(--gray-a4)', strokeWidth: 1 }}
                                wrapperStyle={{ border: 'none', background: 'none', boxShadow: 'none', zIndex: 50 }}
                            />
                            {inceptionDate && (
                                <ReferenceLine
                                    x={inceptionDate}
                                    stroke="var(--gray-a6)"
                                    strokeDasharray="4 3"
                                    strokeWidth={1.5}
                                />
                            )}

                            {entities.map((entity) => {
                                let strokeWidth = entity.strokeWidth || 2;
                                let opacity = entity.opacity || 1;

                                if (hoveredEntityName) {
                                    if (hoveredEntityName === entity.name) {
                                        strokeWidth = 4;
                                        opacity = 1;
                                    } else {
                                        strokeWidth = 2;
                                        opacity = 0.4;
                                    }
                                }

                                return (
                                    <Line
                                        key={entity.name}
                                        type="monotone"
                                        dataKey={`${entity.name}_position`}
                                        name={entity.name}
                                        stroke={entity.color}
                                        strokeWidth={strokeWidth}
                                        strokeOpacity={opacity}
                                        dot={false}
                                        connectNulls={true}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={300}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-[var(--gray-9)]">
                        No data available
                    </div>
                )}
        </div>
    );
}
