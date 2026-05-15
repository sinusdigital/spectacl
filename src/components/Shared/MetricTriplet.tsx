import React from 'react';
import { Flex, Text, Box } from '@radix-ui/themes';
import { cn } from "@/lib/utils";
import SectionLabel from '@/components/Shared/SectionLabel';

// Shared indicator wrapper using Radix Box
const IndicatorDot = ({ color }: { color: string }) => (
    <Box
        className={`rounded-full ${color}`}
        style={{ width: '0.5rem', height: '0.5rem' }}
    />
);

// --- Sub-components (extracted from PromptsTable) ---

export const ProgressIndicator = ({ 
    value, 
    totalCompetitors,
    className = "w-3 h-3" 
}: { 
    value: number | null | undefined,
    totalCompetitors?: number,
    className?: string
}) => {
    if (value === null || value === undefined) {
        return (
            <svg className={cn("block shrink-0", className)} viewBox="0 0 24 24">
                <circle className="text-[var(--gray-4)]" strokeWidth="4" stroke="currentColor" fill="transparent" r="10" cx="12" cy="12" />
            </svg>
        );
    }
    
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = Math.max(0, circumference - (value / 100) * circumference);
    
    // Use Radix-like utility classes or standard Tailwind
    let colors = { bg: 'text-red-100', fg: 'text-red-500' };
    
    if (totalCompetitors && totalCompetitors > 0) {
        const base = 100 / totalCompetitors;
        if (value >= base * 1.5) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-emerald-500' };
        else if (value >= base) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-green-500' };
        else if (value >= base * 0.5) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-amber-500' };
        else if (value >= base * 0.2) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-orange-100' };
    } else {
        if (value >= 80) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-emerald-500' };
        else if (value >= 50) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-green-500' };
        else if (value >= 25) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-amber-500' };
        else if (value >= 10) colors = { bg: 'text-[var(--gray-4)]', fg: 'text-orange-500' };
    }
    
    return (
        <svg className={cn("-rotate-90 block shrink-0", className)} viewBox="0 0 24 24">
            <circle 
                className={colors.bg} 
                strokeWidth="4" 
                stroke="currentColor" 
                fill="transparent" 
                r="10" 
                cx="12" 
                cy="12" 
            />
            <circle 
                className={colors.fg} 
                strokeWidth="4" 
                strokeDasharray={circumference} 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round" 
                stroke="currentColor" 
                fill="transparent" 
                r="10" 
                cx="12" 
                cy="12" 
            />
        </svg>
    );
};

export const PositionIndicator = ({ value }: { value: number | null | undefined }) => {
    if (value === null || value === undefined) {
        return (
            <Flex align="center" justify="center" className="shrink-0" style={{ width: '0.75rem', height: '0.75rem' }}>
                <IndicatorDot color="bg-[var(--gray-4)]" />
            </Flex>
        );
    }

    let dotColor = "bg-emerald-500";
    if (value > 10) dotColor = "bg-red-500";
    else if (value > 3) dotColor = "bg-amber-500";

    return (
        <Flex align="center" justify="center" className="shrink-0" style={{ width: '0.75rem', height: '0.75rem' }}>
            <IndicatorDot color={dotColor} />
        </Flex>
    );
};

const MentionIndicator = ({ value }: { value: boolean | null | undefined }) => {
    if (value === null || value === undefined) {
        return (
            <Flex align="center" justify="center" className="shrink-0" style={{ width: '0.75rem', height: '0.75rem' }}>
                <IndicatorDot color="bg-[var(--gray-4)]" />
            </Flex>
        );
    }

    const dotColor = value ? "bg-emerald-500" : "bg-red-500";

    return (
        <Flex align="center" justify="center" className="shrink-0" style={{ width: '0.75rem', height: '0.75rem' }}>
            <IndicatorDot color={dotColor} />
        </Flex>
    );
};

const Spinner = () => (
    <svg
        className="w-3 h-3 text-[var(--gray-8)] animate-spin shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
);

// --- Atomized Metric Components ---

export function MetricTrend({ 
    value, 
    isInverse = false, 
    size = '1' 
}: { 
    value: number | null | undefined, 
    isInverse?: boolean, 
    size?: "1" | "2" | "3" 
}) {
    if (value === null || value === undefined || value === 0) return null;
    
    const isPositive = isInverse ? value < 0 : value > 0;
    const color = isPositive ? 'green' : 'red';
    const arrow = isInverse 
        ? (value < 0 ? '↑' : '↓') 
        : (value > 0 ? '↑' : '↓');
    
    return (
        <Text size={size} weight="medium" color={color} className="whitespace-nowrap">
            {arrow} {Math.abs(value).toFixed(1)}
        </Text>
    );
}

const formatValue = (val: number, showDecimals: boolean = true) => {
    if (!showDecimals) return Math.round(val).toString();
    return val.toFixed(1);
};

export interface MetricItemProps {
    label: string;
    displayValue: React.ReactNode;
    indicator?: React.ReactNode;
    trend?: React.ReactNode;
    isAnalyzing?: boolean;
    size?: 'sm' | 'md' | 'lg';
    flex?: boolean;
    showLabel?: boolean;
    labelVariant?: 'card' | 'modal';
    className?: string;
}

export function MetricItem({
    label,
    displayValue,
    indicator,
    trend,
    isAnalyzing = false,
    size = 'md',
    flex = true,
    showLabel = true,
    labelVariant = 'card',
    className
}: MetricItemProps) {
    const valueSize = size === 'lg' ? '4' : '2';
    return (
        <Box className={cn(flex ? "flex-1" : "", className)}>
            {showLabel && (
                <SectionLabel variant={labelVariant} className="text-left">
                    {label}
                </SectionLabel>
            )}
            <Flex align="center" gap="2" justify="start">
                {isAnalyzing ? (
                    <Spinner />
                ) : (
                    indicator
                )}
                <Flex align="center" gap="2" className="min-w-0">
                    <Text as="div" size={valueSize} className="whitespace-nowrap text-[var(--gray-12)] font-medium">
                        {displayValue}
                    </Text>
                    {trend}
                </Flex>
            </Flex>
        </Box>
    );
}

export interface SpecificMetricProps {
    value?: number | null;
    totalCompetitors?: number;
    trend?: React.ReactNode;
    isAnalyzing?: boolean;
    showIndicator?: boolean;
    showDecimals?: boolean;
    size?: 'sm' | 'md' | 'lg';
    flex?: boolean;
    label?: string;
    showLabel?: boolean;
    labelVariant?: 'card' | 'modal';
    className?: string;
}

export function MentionMetric({ value, mentioned, trend, isAnalyzing, showIndicator = true, showDecimals = false, size, flex, label = 'MENTION RATE', showLabel = true, labelVariant = 'card', className }: SpecificMetricProps & { mentioned?: boolean | null }) {
    let displayValue: React.ReactNode = '—';
    if (mentioned !== undefined && mentioned !== null) {
        displayValue = mentioned ? 'Yes' : 'No';
    } else if (value != null) {
        displayValue = `${formatValue(value, showDecimals)}%`;
    }

    const indicator = showIndicator ? (
        (mentioned !== undefined && mentioned !== null) ? <MentionIndicator value={mentioned} /> : <ProgressIndicator value={value} />
    ) : undefined;

    return <MetricItem label={label} displayValue={displayValue} indicator={indicator} trend={trend} isAnalyzing={isAnalyzing} size={size} flex={flex} showLabel={showLabel} labelVariant={labelVariant} className={className} />;
}

export function PositionMetric({ value, trend, isAnalyzing, showIndicator = true, showDecimals = true, size, flex, label = 'AVG POS', showLabel = true, labelVariant = 'card', className }: SpecificMetricProps) {
    const displayValue = value != null ? formatValue(value, showDecimals) : '—';
    const indicator = showIndicator ? <PositionIndicator value={value} /> : undefined;
    return <MetricItem label={label} displayValue={displayValue} indicator={indicator} trend={trend} isAnalyzing={isAnalyzing} size={size} flex={flex} showLabel={showLabel} labelVariant={labelVariant} className={className} />;
}

export function ShareOfVoiceMetric({ value, totalCompetitors, trend, isAnalyzing, showIndicator = true, showDecimals = false, size, flex, label = 'SOV', showLabel = true, labelVariant = 'card', className }: SpecificMetricProps) {
    const displayValue = value != null ? `${formatValue(value, showDecimals)}%` : '—';
    const indicator = showIndicator ? <ProgressIndicator value={value} totalCompetitors={totalCompetitors} /> : undefined;
    return <MetricItem label={label} displayValue={displayValue} indicator={indicator} trend={trend} isAnalyzing={isAnalyzing} size={size} flex={flex} showLabel={showLabel} labelVariant={labelVariant} className={className} />;
}

// --- Main Triplet Container ---

export interface MetricTripletProps {
    mentionRate?: number | null;
    mentioned?: boolean | null;
    avgPosition?: number | null;
    shareOfVoice?: number | null;
    totalCompetitors?: number;
    isAnalyzing?: boolean;
    showIndicators?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    gap?: string;
    showBorder?: boolean;
    variant?: 'default' | 'compact';
    labels?: {
        mention?: string;
        position?: string;
        sov?: string;
    };
    labelVariant?: 'card' | 'modal';
}

export default function MetricTriplet({
    mentionRate,
    mentioned,
    avgPosition,
    shareOfVoice,
    totalCompetitors,
    isAnalyzing = false,
    showIndicators = true,
    size = 'md',
    className,
    gap,
    showBorder = false,
    variant = 'default',
    labels = {
        mention: 'MENTION',
        position: 'POSITION',
        sov: 'SHARE OF VOICE'
    },
    labelVariant = 'card'
}: MetricTripletProps) {
    const isCompact = variant === 'compact';
    const defaultGap = gap || (isCompact ? "2" : "3");

    return (
        <Flex 
            gap={defaultGap} 
            justify="start"
            className={cn(
                "w-full",
                showBorder && "border-t border-[var(--gray-4)] pt-4 mt-auto",
                className
            )}
        >
            <MentionMetric value={mentionRate} mentioned={mentioned} isAnalyzing={isAnalyzing} showIndicator={showIndicators} size={size} label={labels.mention} labelVariant={labelVariant} />
            <PositionMetric value={avgPosition} isAnalyzing={isAnalyzing} showIndicator={showIndicators} size={size} label={labels.position} labelVariant={labelVariant} />
            <ShareOfVoiceMetric value={shareOfVoice} totalCompetitors={totalCompetitors} isAnalyzing={isAnalyzing} showIndicator={showIndicators} size={size} label={labels.sov} labelVariant={labelVariant} />
        </Flex>
    );
}

// Sub-components exported for flexibility if needed
MetricTriplet.ProgressIndicator = ProgressIndicator;
MetricTriplet.PositionIndicator = PositionIndicator;
MetricTriplet.MentionIndicator = MentionIndicator;
MetricTriplet.Spinner = Spinner;
