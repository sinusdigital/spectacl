"use client";

import { Card, Flex, Text } from '@radix-ui/themes';
import CompanyLogo from '@/components/CompanyLogo';

export interface ChartTooltipProps {
    active?: boolean;
    payload?: {
        name: string;
        value: number;
        color?: string;
        [key: string]: unknown;
    }[];
    label?: string;
    days: number;
    entities: {
        name: string;
        website?: string;
        logoUrl?: string;
    }[];
    valuePrefix?: string;
    valueSuffix?: string;
    valueFormatter?: (value: number) => string;
}

export const formatDateLabel = (iso: string, days: number): string => {
    if (!iso) return "";
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return "";
    
    if (days <= 7) {
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function ChartTooltip({ 
    active, 
    payload, 
    label, 
    days, 
    entities,
    valuePrefix = '',
    valueSuffix = '',
    valueFormatter
}: ChartTooltipProps) {
    if (active && payload && payload.length) {
        return (
            <Card size="1" variant="surface">
                <Flex direction="column" gap="2">
                    <Text size="1" color="gray" weight="medium">
                        {label ? formatDateLabel(label, days) : ""}
                    </Text>
                    <Flex direction="column" gap="2">
                        {payload.map((entry, index) => {
                            const entity = entities.find(e => e.name === entry.name);
                            const val = typeof entry.value === 'number' ? entry.value : 0;
                            const formattedValue = valueFormatter 
                                ? valueFormatter(val) 
                                : `${valuePrefix}${val}${valueSuffix}`;
                            
                            return (
                                <Flex key={index} align="center" justify="between" gap="4">
                                    <Flex align="center" gap="2">
                                        <CompanyLogo 
                                            domain={entity?.website} 
                                            name={entry.name}
                                            logoUrl={entity?.logoUrl}
                                            size={16}
                                        />
                                        <Text size="1" weight="medium" color="gray">
                                            {entry.name}
                                        </Text>
                                    </Flex>
                                    <Text size="1" weight="bold" className="tabular-nums">
                                        {formattedValue}
                                    </Text>
                                </Flex>
                            );
                        })}
                    </Flex>
                </Flex>
            </Card>
        );
    }
    return null;
}
