
import { Flex, Grid, Box, Text } from '@radix-ui/themes';
import { AnalysisResult } from "@/types/prompts";
import BaseCard from '@/components/Shared/BaseCard';
import ModelLogo from "@/components/Shared/ModelLogo";
import AnalysisStatusIndicator from "./AnalysisStatusIndicator";
import { AnalysisKeyMetrics, AnalysisEntitiesList, AnalysisLinksList } from "./AnalysisMetrics";
import SectionLabel from '@/components/Shared/SectionLabel';
import { cn } from '@/lib/utils';

interface AnalysisResultGridCardProps {
    result: AnalysisResult;
    entityName: string;
    entityLogo?: string | null;
    entityWebsite?: string | null;
    handleDeleteResult: (id: string) => void;
    onClick?: () => void;
}

export default function AnalysisResultGridCard({
    result,
    entityName,
    entityLogo,
    entityWebsite,
    handleDeleteResult,
    onClick
}: AnalysisResultGridCardProps) {
    const isError = result.status === 'failed' || !!result.errorMessage;
    const isRunning = result.status === 'running' || result.status === 'pending';

    if (isRunning) {
        return (
            <Box className="border border-[var(--gray-a4)] rounded-xl p-6 relative overflow-hidden h-full" style={{ background: 'var(--color-surface)' }}>
                <Box className="absolute inset-0 bg-[var(--gray-a2)]" />

                {/* Header Skeleton */}
                <Flex align="start" justify="between" mb="4" className="relative z-10">
                    <Flex align="center" gap="3">
                        <Box className="w-10 h-10 bg-[var(--gray-a4)] rounded-lg animate-pulse" />
                        <Box className="space-y-2">
                            <Box className="h-4 w-24 bg-[var(--gray-a4)] rounded animate-pulse" />
                            <Flex align="center" gap="2">
                                <AnalysisStatusIndicator status={result.status} size="xs" />
                                {result.progressStep && (
                                    <Text size="1" className="text-[var(--blue-11)] font-medium animate-pulse">
                                        • {result.progressStep}
                                    </Text>
                                )}
                            </Flex>
                        </Box>
                    </Flex>
                </Flex>

                {/* Content Skeleton */}
                <Box mb="6" className="relative z-10 flex-1 space-y-2">
                    <Box className="h-3 w-full bg-[var(--gray-a4)] rounded animate-pulse" />
                    <Box className="h-3 w-5/6 bg-[var(--gray-a4)] rounded animate-pulse delay-75" />
                    <Box className="h-3 w-4/6 bg-[var(--gray-a4)] rounded animate-pulse delay-100" />
                </Box>

                {/* Footer Skeleton */}
                <Grid columns="3" gap="2" pt="4" className="mt-auto relative z-10 border-t border-[var(--gray-a4)]">
                    <Box className="h-8 bg-[var(--gray-a4)] rounded animate-pulse" />
                    <Box className="h-8 bg-[var(--gray-a4)] rounded animate-pulse" />
                    <Box className="h-8 bg-[var(--gray-a4)] rounded animate-pulse" />
                </Grid>
            </Box>
        );
    }

    const formattedDate = new Date(result.createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <BaseCard
            onClick={onClick}
            className={`h-full flex flex-col ${isError ? 'border-[var(--red-a5)] bg-[var(--red-a2)]' : ''}`}
        >
            <BaseCard.Header
                title={result.llmModel}
                titleClassName={isError ? 'text-[var(--red-12)]' : ''}
                subtitle={
                    <div className="flex items-center gap-2 text-xs text-[var(--gray-11)]">
                        <span>{formattedDate}</span>
                    </div>
                }
                logo={
                    <ModelLogo
                        provider={result.llmProvider || result.llmModel.split(' ')[0].toLowerCase()}
                        name={result.llmModel}
                        size="md"
                        className={isError ? 'grayscale opacity-50' : ''}
                    />
                }
                headerExtra={
                    <div className="flex items-center gap-2">
                        {(isRunning || isError) && (
                            <AnalysisStatusIndicator status={result.status} size="xs" />
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteResult(result.id);
                            }}
                            className="p-1.5 text-[var(--gray-9)] hover:text-[var(--red-9)] hover:bg-[var(--red-a3)] rounded-md transition-colors"
                            title="Delete Result"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                }
            />

            <BaseCard.Body>
                {/* Teaser Content */}
                <Box mb="6">
                    <Text
                        as="p"
                        size="2"
                        className={cn("line-clamp-4", isError ? 'text-[var(--red-11)]' : 'text-[var(--gray-11)]')}
                    >
                        {result.errorMessage ? (
                            <span className="italic">{result.errorMessage}</span>
                        ) : (
                            result.response
                        )}
                    </Text>
                </Box>

                {/* Footer Metrics & Data */}
                <Box pt="4" mt="auto" className="space-y-4 border-t border-[var(--gray-a4)]">
                    {/* Row 1: Key Metrics */}
                    <AnalysisKeyMetrics result={result} variant="row" />

                    {/* Row 2: Entities */}
                    <Box>
                        <SectionLabel>Entities</SectionLabel>
                        <AnalysisEntitiesList
                            mentions={result.mentions}
                            entityName={entityName}
                            entityLogo={entityLogo}
                            entityWebsite={entityWebsite}
                            variant="tags"
                            layout="single-row"
                        />
                    </Box>

                    {/* Row 3: Sources */}
                    <Box>
                        <SectionLabel>Sources</SectionLabel>
                        <AnalysisLinksList 
                            links={result.links ?? []} 
                            entityName={entityName} 
                            variant="compact" 
                            clickable={false} 
                            layout="single-row"
                        />
                    </Box>
                </Box>
            </BaseCard.Body>
        </BaseCard>
    );
}
