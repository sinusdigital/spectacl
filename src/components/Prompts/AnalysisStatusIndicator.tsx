import React from 'react';
import type { AnalysisStatus } from '@/types/prompts';

interface AnalysisStatusIndicatorProps {
    status?: AnalysisStatus | string | null;
    size?: 'xs' | 'sm';
    className?: string;
}

/** Normalize legacy/variant status strings to canonical AnalysisStatus */
function normalizeStatus(raw?: string | null): AnalysisStatus | null {
    if (!raw) return null;
    const s = raw.toLowerCase();
    if (s === 'pending' || s === 'queued') return 'pending';
    if (s === 'running') return 'running';
    if (s === 'completed') return 'completed';
    if (s === 'failed' || s === 'error' || s === 'failure') return 'failed';
    return null;
}

export default function AnalysisStatusIndicator({ status, size = 'sm', className = '' }: AnalysisStatusIndicatorProps) {
    const normalized = normalizeStatus(status as string);
    
    const text = normalized === 'pending' ? 'Queued...'
        : normalized === 'failed' ? 'Failed'
        : 'Running...';

    const colorClass = normalized === 'failed' ? 'bg-red-500' : 'bg-blue-500';
    const textColorClass = normalized === 'failed' ? 'text-red-600' : 'text-blue-600';
    const animationClass = normalized === 'failed' ? '' : 'animate-pulse';

    // Size classes
    const dotSize = size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2';
    const textSize = size === 'xs' ? 'text-xs' : 'text-sm';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className={`inline-block ${dotSize} rounded-full ${colorClass} ${animationClass}`}></span>
            <span className={`${textSize} ${textColorClass} font-medium italic`}>
                {text}
            </span>
        </div>
    );
}
