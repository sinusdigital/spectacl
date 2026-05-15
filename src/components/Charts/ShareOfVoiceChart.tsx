import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ChartTooltip from './ChartTooltip';
import { processChartData, formatDateLabel, type ChartEntity } from '@/lib/chartDataProcessing';

interface DataPoint {
    date: string;
    [key: string]: number | string;
}

interface ShareOfVoiceChartProps {
    data: DataPoint[];
    entities: ChartEntity[];
    days?: number;
    hoveredEntityName?: string | null;
}

export default function ShareOfVoiceChart({ data, entities, days = 30, hoveredEntityName }: ShareOfVoiceChartProps) {
    const { processedData, inceptionDate, tickInterval } = useMemo(
        () => processChartData({
            data,
            entities,
            days,
            dataKeyFn: name => name,
            fillValue: 0,
            perEntityInception: false,
        }),
        [data, entities, days]
    );

    return (
        <div className="w-full flex-1 min-h-0">
            {processedData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={processedData}
                        margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a3)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="var(--gray-a5)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={tickInterval}
                            padding={{ right: 24 }}
                            tickFormatter={(value: string) => formatDateLabel(value, days)}
                        />
                        <YAxis
                            stroke="var(--gray-a5)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 100]}
                            ticks={[0, 20, 40, 60, 80, 100]}
                            width={46}
                        />
                        <Tooltip
                            content={
                                <ChartTooltip
                                    days={days}
                                    entities={entities}
                                    valueFormatter={(val: number) => `${val.toFixed(1)}%`}
                                />
                            }
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
                            const isHovered = hoveredEntityName ? entity.name === hoveredEntityName : true;
                            const opacity = hoveredEntityName
                                ? (isHovered ? 0.7 : 0.1)
                                : 0.6;

                            return (
                                <Area
                                    key={entity.name}
                                    type="monotone"
                                    dataKey={entity.name}
                                    stackId="1"
                                    stroke={entity.color}
                                    fill={entity.color}
                                    fillOpacity={opacity}
                                    animationDuration={300}
                                    strokeOpacity={opacity}
                                    connectNulls={true}
                                />
                            );
                        })}
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-[var(--gray-9)]">
                    No data available
                </div>
            )}
        </div>
    );
}
