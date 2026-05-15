"use client";

import { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Box, Flex, Card, Text } from '@radix-ui/themes';
import { cn } from "@/lib/utils";
import CompanyLogo from '../CompanyLogo';

interface CompetitorMetric {
    id: string;
    name: string;
    visibility: number;
    shareOfVoice: number;
    position: number | null;
    logoUrl?: string | null;
    website?: string | null;
}

interface CompetitorQuadrantChartProps {
    data: CompetitorMetric[];
    hoveredCompetitorName?: string | null;
    p?: React.ComponentProps<typeof Box>["p"];
}

const COLORS = ['#FF7C43', '#00A1E0', '#6366F1', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: CompetitorMetric }[] }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Card size="1" style={{ width: 180 }} variant="surface">
                <Flex direction="column" gap="1">
                    <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {data.name}
                    </Text>
                    <Flex justify="between" align="center">
                        <Text size="1" color="gray">Mention Rate</Text>
                        <Text size="1" weight="bold">{data.visibility}%</Text>
                    </Flex>
                    <Flex justify="between" align="center">
                        <Text size="1" color="gray">Position</Text>
                        <Text size="1" weight="bold">{data.position !== null ? data.position.toFixed(1) : 'N/A'}</Text>
                    </Flex>
                </Flex>
            </Card>
        );
    }
    return null;
};

interface CustomScatterShapeProps {
    cx: number;
    cy: number;
    payload: CompetitorMetric;
    hoveredName?: string | null;
}

const CustomScatterShape = (props: CustomScatterShapeProps) => {
    const { cx, cy, payload, hoveredName } = props;
    const { logoUrl, name, website } = payload;
    
    const isSomethingHovered = !!hoveredName;
    const isHighlighted = hoveredName === name;
    
    const size = isHighlighted ? 42 : 32;
    const opacity = (isSomethingHovered && !isHighlighted) ? 0.6 : 1;
    
    const radius = size / 2;
    const transitionStyle = { transition: 'all 0.2s ease-in-out' };

    return (
        <g filter="url(#soft-shadow)" opacity={opacity} style={transitionStyle}>
            <foreignObject
                x={cx - radius}
                y={cy - radius}
                width={size}
                height={size}
                style={{ overflow: 'visible' }}
            >
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: isHighlighted ? '0' : '2px',
                    transition: 'all 0.2s ease-in-out',
                    overflow: 'hidden',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-panel-solid)'
                }}>
                    <CompanyLogo
                        name={name}
                        logoUrl={logoUrl}
                        domain={website ?? undefined}
                        size={size}
                        className={cn(
                            "ring-offset-1 transition-all duration-200 rounded-full",
                            isHighlighted ? "ring-2 ring-[var(--jade-9)] scale-110" : "ring-1 ring-[var(--gray-a5)]"
                        )}
                    />
                </div>
            </foreignObject>
        </g>
    );
};

interface BackgroundLabelProps {
    cx?: number;
    cy?: number;
    payload?: {
        name: string;
        color: string;
    };
}

export default function CompetitorQuadrantChart({ data, hoveredCompetitorName }: CompetitorQuadrantChartProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted) {
        return (
            <Flex direction="column" className="h-full">
                <div className="mb-4">
                    <h3 className="text-sm font-medium text-[var(--gray-11)]">Market Positioning</h3>
                    <p className="text-sm text-[var(--gray-9)] mt-1">Loading Chart...</p>
                </div>
                <div className="flex-1 min-h-[300px] bg-[var(--gray-a2)] rounded animate-pulse" />
            </Flex>
        );
    }

    // Only plot competitors that have both visibility > 0 AND a real position
    const plottableData = data.filter(c => c.visibility > 0 && c.position != null && c.position > 0);

    const maxRank = data.length || 10;
    const midRank = (maxRank + 1) / 2;

    const hoveredItem = plottableData.find(c => c.name === hoveredCompetitorName);

    const quadrantLabels = [
        { visibility: 75, position: 1 + (midRank - 1) / 2, name: 'Leaders', color: 'var(--green-9)' },
        { visibility: 75, position: midRank + (maxRank - midRank) / 2, name: 'Runners-up', color: 'var(--amber-9)' },
        { visibility: 25, position: 1 + (midRank - 1) / 2, name: 'Hidden Gems', color: 'var(--indigo-9)' },
        { visibility: 25, position: midRank + (maxRank - midRank) / 2, name: 'At Risk', color: 'var(--red-9)' },
    ];

    if (plottableData.length === 0) {
        return (
            <Flex direction="column" align="center" justify="center" className="h-full min-h-[300px]">
                <Text size="2" color="gray">Not enough data to plot the quadrant yet.</Text>
                <Text size="1" color="gray" mt="1">Competitors need both mention rate and position data.</Text>
            </Flex>
        );
    }

    return (
        <Flex direction="column" className="h-full">
            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                        margin={{ top: 30, right: 40, bottom: 20, left: 20 }}
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.08" />
                            </filter>
                        </defs>

                        <Scatter
                            name="Background Labels"
                            data={quadrantLabels}
                            isAnimationActive={false}
                            shape={(props: unknown) => {
                                const { cx, cy, payload } = props as BackgroundLabelProps;
                                if (!payload) return <g />;
                                return (
                                    <text
                                        x={cx}
                                        y={cy}
                                        fill={payload.color}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="text-sm font-bold opacity-40 select-none pointer-events-none"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {payload.name}
                                    </text>
                                );
                            }}
                        />

                        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a3)" />
                        <XAxis
                            type="number"
                            dataKey="visibility"
                            name="Mention Rate"
                            domain={[0, 100]}
                            label={{ value: 'Mention Rate (%)', position: 'bottom', offset: 0, fontSize: 12, fill: 'var(--gray-9)' }}
                            stroke="var(--gray-a5)"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="position"
                            name="Average Position"
                            domain={[1, maxRank]}
                            reversed={true}
                            interval={0}
                            ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
                            label={{ value: 'Position', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--gray-9)', offset: 10 }}
                            stroke="var(--gray-a5)"
                            fontSize={12}
                            tickLine={false}
                        />

                        <ReferenceLine x={50} stroke="var(--gray-a5)" strokeDasharray="3 3" />
                        <ReferenceLine y={midRank} stroke="var(--gray-a5)" strokeDasharray="3 3" />

                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} wrapperStyle={{ border: 'none', background: 'none', boxShadow: 'none', zIndex: 50 }} />

                        <Scatter
                            name="Competitors"
                            data={plottableData}
                            fill="#8884d8"
                            isAnimationActive={false}
                            shape={(props: unknown) => <CustomScatterShape {...(props as CustomScatterShapeProps)} hoveredName={hoveredCompetitorName} />}
                        >
                            {plottableData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Scatter>

                        {hoveredItem && (
                            <Scatter
                                name="Active Competitor"
                                data={[hoveredItem]}
                                isAnimationActive={false}
                                shape={(props: unknown) => <CustomScatterShape {...(props as CustomScatterShapeProps)} hoveredName={hoveredCompetitorName} />}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </Flex>
    );
}
