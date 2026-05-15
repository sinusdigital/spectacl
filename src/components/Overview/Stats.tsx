import React from 'react';
import { Text, Box } from '@radix-ui/themes';
import { cn } from '@/lib/utils';
import { StatCard } from "@/components/Shared/StatCard";

interface StatsProps {
    mentionPercentage: number;
    totalMentions: number;
    totalAnalysisResults: number;
    avgPosition?: number;
    avgShareOfVoice?: number;
    activeMetric: 'visibility' | 'position' | 'shareOfVoice';
    onMetricSelect: (metric: 'visibility' | 'position' | 'shareOfVoice') => void;
    mentionTrend?: { value?: number; label: string; text?: string; color?: string };
    positionTrend?: { text: string; color: string; label?: string; arrow?: string };
    sovTrend?: { text: string; color: string; label?: string; arrow?: string };
}

const Stats = ({
    mentionPercentage,
    totalMentions,
    totalAnalysisResults,
    avgPosition,
    avgShareOfVoice,
    activeMetric,
    onMetricSelect,
    mentionTrend,
    positionTrend,
    sovTrend
}: StatsProps) => {
    // Format position: if > 50 or undefined, showing something else? 
    // But commonly position is 1 to N.
    // If avgPosition is > 99 or 0, it usually means "Not Ranked".
    const displayPosition = (avgPosition && avgPosition < 99 && avgPosition > 0)
        ? avgPosition.toFixed(1)
        : "-";

    // Format sentiment: assuming 0-100 scale
    // Format Share of Voice
    const displayShareOfVoice = avgShareOfVoice !== undefined
        ? avgShareOfVoice.toFixed(1) + '%'
        : '-';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard
                title="Mention Rate"
                isActive={activeMetric === 'visibility'}
                onClick={() => onMetricSelect('visibility')}
                value={`${mentionPercentage}%`}
                valueTitle={`${totalMentions}/${totalAnalysisResults}`}
                tooltipDirection="right"
                tooltipContent={
                    <Box className="space-y-3 leading-relaxed">
                        <p><Text weight="bold" color="gray">Mention Rate</Text></p>
                        <Box className="space-y-1">
                            <Text weight="bold" size="2" color="gray">How it works:</Text>
                            <Text size="2" as="p">It calculates (Number of Prompts containing the entity / Total Number of Prompts) * 100.</Text>
                        </Box>
                        <Box className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                            <Text weight="bold" size="2" color="gray">Example:</Text>
                            <Text as="p" size="2">If your entity appears in the answer text of 5 out of 10 prompts, this will show 50%.</Text>
                        </Box>
                    </Box>
                }
                icon={
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                }
                trendNode={mentionTrend && (
                    <p className={`text-sm mt-1 ${mentionTrend.color || (mentionTrend.value && mentionTrend.value >= 0 ? 'text-green-600' : 'text-red-600')}`}>
                        {mentionTrend.text ? (
                            <>
                                {mentionTrend.text} <Text size="1" color="gray" className="ml-1">{mentionTrend.label}</Text>
                            </>
                        ) : (
                            <>
                                <Text size="1">{(mentionTrend.value || 0) >= 0 ? '▲' : '▼'}</Text> {Math.abs(mentionTrend.value || 0).toFixed(1)}% <Text size="1" color="gray" className="opacity-75 ml-1">{mentionTrend.label}</Text>
                            </>
                        )}
                    </p>
                )}
            />

            <StatCard
                title="Average Position"
                isActive={activeMetric === 'position'}
                onClick={() => onMetricSelect('position')}
                value={displayPosition}
                tooltipDirection="right"
                tooltipContent={
                    <Box className="space-y-3 leading-relaxed">
                        <p><Text weight="bold" color="gray">Average Position</Text></p>
                        <Box className="space-y-1">
                            <Text weight="bold" size="2" color="gray">How it works:</Text>
                            <Text size="2" as="p">It calculates the average rank of your entity across all prompts where it appears.</Text>
                        </Box>
                        <Box className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                            <Text weight="bold" size="2" color="gray">Example:</Text>
                            <Text as="p" size="2">If your entity appears #1 in one prompt and #3 in another, the average position is 2.0.</Text>
                        </Box>
                    </Box>
                }
                icon={
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                }
                trendNode={positionTrend && (
                    <Text as="p" size="1" className={cn("mt-1 block", positionTrend.color)}>
                        {positionTrend.arrow && <Text size="1" className="mr-1">{positionTrend.arrow}</Text>}
                        <Text className="mr-1">{positionTrend.text}</Text>
                        {positionTrend.label && (
                            <Text color="gray">{positionTrend.label}</Text>
                        )}
                    </Text>
                )}
            />

            <StatCard
                title="Share of Voice"
                isActive={activeMetric === 'shareOfVoice'}
                onClick={() => onMetricSelect('shareOfVoice')}
                value={displayShareOfVoice}
                tooltipDirection="left"
                tooltipContent={
                    <Box className="space-y-3 leading-relaxed">
                        <p><Text weight="bold" color="gray">Share of Voice</Text></p>
                        <Box className="space-y-1">
                            <Text weight="bold" size="2" color="gray">How it works:</Text>
                            <Text size="2" as="p">It calculates (Mentions of Your Brand / Total Mentions of All Brands) * 100.</Text>
                        </Box>
                        <Box className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                            <Text weight="bold" size="2" color="gray">Example:</Text>
                            <Text as="p" size="2">If your brand is mentioned 20 times and the total market mentions are 100, your SoV is 20%.</Text>
                        </Box>
                    </Box>
                }
                icon={
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                }
                trendNode={sovTrend && (
                    <Text as="p" size="1" className={cn("mt-1 block", sovTrend.color)}>
                        {sovTrend.arrow && <Text size="1" className="mr-1">{sovTrend.arrow}</Text>}
                        <Text className="mr-1">{sovTrend.text}</Text>
                        {sovTrend.label && (
                            <Text color="gray">{sovTrend.label}</Text>
                        )}
                    </Text>
                )}
            />
        </div>
    );
};

export default Stats;
