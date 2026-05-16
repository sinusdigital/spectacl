"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePromptDetails } from "@/hooks/usePromptDetails";
import { useSession } from "@/lib/auth-client";

import AnalysisResultGridCard from "@/components/Prompts/AnalysisResultGridCard";
import AnalysisResultsTable from "@/components/Prompts/AnalysisResultsTable";
import RadixTable from "@/components/Shared/RadixTable";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import AnalysisDetailModal from "@/components/Prompts/AnalysisDetailModal";
import EditPromptModal from "@/components/Prompts/EditPromptModal";
import SourcesTable from "@/components/Overview/SourcesTable";
import DetectedBrandsTable from "@/components/Prompts/DetectedBrandsTable";
import RadixSegmentedControl from "@/components/Shared/RadixSegmentedControl";
import { AnalysisResult } from "@/types/prompts";
import { useOverviewMetrics } from '@/hooks/useOverviewMetrics';
import OverviewCharts from '@/components/Overview/OverviewCharts';
import FilterBar, { TimeRangeType } from '@/components/Shared/FilterBar';
import PageContainer, { HEADER_Z_TOP, HEADER_Z_BRIEF } from "@/components/Shared/PageContainer";
import PageBrief from "@/components/Shared/PageBrief";
import SectionCard from "@/components/Shared/SectionCard";
import { Button, Flex, IconButton, Separator, Switch, Text } from "@radix-ui/themes";
import { ChevronLeftIcon, Pencil2Icon, PlayIcon } from "@radix-ui/react-icons";
import { useToast } from "@/components/Shared/RadixToast";

export default function PromptDetailPage() {
    const params = useParams();
    const entityId = params.entityId as string;
    const promptId = params.promptId as string;

    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
    const [showFailed, setShowFailed] = useState(false);

    const {
        prompt,
        loading,
        entityName,
        entityLogo,
        entityWebsite,
        deleteResult,
        handleIntentChange,
        handleTagChange,
        page,
        totalResults,
        goToPage,
    } = usePromptDetails(entityId, promptId, showFailed);
    const [resultToDelete, setResultToDelete] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data: session } = useSession();
    const isAppAdmin = (session?.user as { role?: string })?.role === 'ADMIN';
    const { success, error: toastError } = useToast();
    const [isRunning, setIsRunning] = useState(false);

    const handleRunNow = async () => {
        setIsRunning(true);
        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggerAnalysis: true }),
            });
            if (!res.ok) throw new Error();
            success("Analysis queued", "Prompt will run shortly across all enabled models.");
        } catch {
            toastError("Run failed", "Could not enqueue the prompt. Try again.");
        } finally {
            setIsRunning(false);
        }
    };

    const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Overview Metrics State
    const [timeRange, setTimeRange] = useState<TimeRangeType>('30d');
    const [modelFilter, setModelFilter] = useState<string[]>([]);
    const [metricsRefreshKey, setMetricsRefreshKey] = useState(0);

    // Bump metricsRefreshKey when completed results increase.
    // Watching .length misses the common case where pending results transition to
    // completed (array length unchanged). Watching completed count catches it.
    const prevCompletedCountRef = useRef<number>(-1);
    useEffect(() => {
        if (!prompt?.analysisResults) return;
        const completedCount = prompt.analysisResults.filter(
            r => !['pending', 'running', 'queued'].includes((r.status || '').toLowerCase())
        ).length;
        if (prevCompletedCountRef.current !== -1 && completedCount > prevCompletedCountRef.current) {
            setMetricsRefreshKey(k => k + 1);
        }
        prevCompletedCountRef.current = completedCount;
    }, [prompt?.analysisResults]);

    const {
        loading: metricsLoading,
        competitorMetrics,
        visibilityChartData,
        sovChartData,
        visibilityEntities,
        activeMetric,
        setActiveMetric,
        mentionTrend,
        positionTrend,
        periodAvgPosition,
        sovTrend
    } = useOverviewMetrics({
        entityId,
        viewAsId: entityId,
        timeRange,
        modelFilter,
        promptId,
        refreshKey: metricsRefreshKey,
    });

    const handleDeleteClick = (id: string) => {
        setResultToDelete(id);
    };

    const handleConfirmDelete = async () => {
        if (!resultToDelete) return;
        setIsDeleting(true);
        try {
            await deleteResult(resultToDelete);
            setResultToDelete(null);
        } catch {
            alert("Failed to delete result");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-[var(--gray-9)]">Loading...</div>;
    if (!prompt) return <div className="p-8 text-center text-[var(--gray-9)]">Prompt not found</div>;

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" gap="4" width="100%">
                            <Link href={`/${entityId}/prompts`}>
                                <IconButton variant="surface" color="gray" radius="medium" size="2" aria-label="Back to prompts" className="cursor-pointer shadow-sm">
                                    <ChevronLeftIcon />
                                </IconButton>
                            </Link>
                            <Separator orientation="vertical" style={{ height: '32px' }} />
                            <div className="flex-1">
                                <FilterBar
                                    timeRange={timeRange}
                                    setTimeRange={setTimeRange}
                                    entityId={entityId}
                                    tagFilter={[]}
                                    setTagFilter={() => {}}
                                    intentFilter={[]}
                                    setIntentFilter={() => {}}
                                    modelFilter={modelFilter}
                                    setModelFilter={setModelFilter}
                                    hideIntents={true}
                                    hideTags={true}
                                />
                            </div>
                            {isAppAdmin && (
                                <Button
                                    size="2"
                                    variant="soft"
                                    color="grass"
                                    loading={isRunning}
                                    onClick={handleRunNow}
                                >
                                    <PlayIcon />
                                    Run now
                                </Button>
                            )}
                        </Flex>
                    ),
                    sticky: true,
                    className: "",
                    zIndex: HEADER_Z_TOP,
                },
                {
                    content: (
                        <PageBrief
                            unstyled
                            label="Prompt"
                            description={prompt.text}
                            metrics={[
                                { label: "Region", value: prompt.language || '—' },
                                { label: "Intent", value: prompt.intent },
                                {
                                    label: "Tags",
                                    value: prompt.tags && prompt.tags.length > 0
                                        ? prompt.tags.map((tag: { name: string }) => tag.name).join(', ')
                                        : '—',
                                },
                            ]}
                            actions={
                                <Button
                                    size="2"
                                    variant="soft"
                                    color="gray"
                                    onClick={() => setIsEditOpen(true)}
                                >
                                    <Pencil2Icon />
                                    Edit
                                </Button>
                            }
                        />
                    ),
                    sticky: true,
                    className: "!bg-[var(--gray-2)]",
                    zIndex: HEADER_Z_BRIEF,
                }
            ]}
        >
            <Flex direction="column" gap="6" p="4">
                {/* Main KPIs & Charts */}
                <OverviewCharts
                    loading={metricsLoading}
                    timeRange={timeRange}
                    entityId={entityId}
                    viewAsId={entityId}
                    competitorMetrics={competitorMetrics}
                    visibilityChartData={visibilityChartData}
                    sovChartData={sovChartData}
                    visibilityEntities={visibilityEntities}
                    activeMetric={activeMetric}
                    setActiveMetric={setActiveMetric}
                    mentionTrend={mentionTrend}
                    positionTrend={positionTrend}
                    sovTrend={sovTrend}
                    periodAvgPosition={periodAvgPosition}
                />

                {/* Sources — SourcesTable renders its own SplitCard when showChart is set. */}
                {prompt.analysisResults && prompt.analysisResults.length > 0 && (
                    <SourcesTable
                        prompts={[prompt]}
                        showChart
                        pageSize={10}
                        entityId={entityId}
                        sectionTitle="Sources"
                        sectionDescription="Every domain and URL cited by AI."
                    />
                )}

                {/* Detected brands — owns its own SplitCard. We pass
                    `hasPendingRuns` so the panel stays visible (in a
                    "scanning" state) on freshly-run prompts where no
                    analysis result has completed yet, and `refreshKey`
                    so it auto-refetches as more runs land. */}
                <DetectedBrandsTable
                    promptId={promptId}
                    entityId={entityId}
                    timeRange={timeRange}
                    modelFilter={modelFilter}
                    hasPendingRuns={(prompt.analysisResults ?? []).some(
                        r => ['pending', 'running', 'queued'].includes((r.status || '').toLowerCase())
                    )}
                    refreshKey={metricsRefreshKey}
                />

                {/* Recent answers — single-pane SectionCard. */}
                <SectionCard>
                    <SectionCard.Header
                        title="Recent answers"
                        description="Every answer for this prompt."
                        actions={
                            <>
                                {isAppAdmin && (
                                    <Flex align="center" gap="2">
                                        <Switch
                                            size="1"
                                            checked={showFailed}
                                            onCheckedChange={setShowFailed}
                                        />
                                        <Text size="1" color="gray">Show failed</Text>
                                    </Flex>
                                )}
                                <RadixSegmentedControl
                                    value={viewMode}
                                    onValueChange={(val) => setViewMode(val as 'cards' | 'table')}
                                    items={[
                                        { value: 'table', label: 'Table' },
                                        { value: 'cards', label: 'Cards' }
                                    ]}
                                />
                            </>
                        }
                    />

                    {(() => {
                        const results = prompt.analysisResults ?? [];
                        if (viewMode === 'cards') {
                            return results.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.map((result) => (
                                        <AnalysisResultGridCard
                                            key={result.id}
                                            result={result}
                                            entityName={entityName}
                                            entityLogo={entityLogo}
                                            entityWebsite={entityWebsite}
                                            handleDeleteResult={handleDeleteClick}
                                            onClick={() => setSelectedResult(result)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Flex
                                    align="center"
                                    justify="center"
                                    py="7"
                                    style={{
                                        background: 'var(--gray-2)',
                                        borderRadius: 'var(--radius-3)',
                                        border: '1px dashed var(--gray-a6)',
                                    }}
                                >
                                    <Text size="2" color="gray">
                                        No analysis results yet. Run the prompt manually or wait for the scheduled run.
                                    </Text>
                                </Flex>
                            );
                        }
                        return (
                            <AnalysisResultsTable
                                results={results}
                                entityName={entityName}
                                entityLogo={entityLogo}
                                entityWebsite={entityWebsite}
                                onDelete={handleDeleteClick}
                            />
                        );
                    })()}

                    {totalResults > 10 && (
                        <RadixTable.Pagination
                            currentPage={page}
                            total={totalResults}
                            pageSize={10}
                            onPageChange={goToPage}
                            label="results"
                        />
                    )}
                </SectionCard>

                <DeleteConfirmationModal
                    isOpen={!!resultToDelete}
                    onClose={() => setResultToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Result"
                    message="Are you sure you want to delete this analysis result? This action cannot be undone."
                    isDeleting={isDeleting}
                />

                {selectedResult && (
                    <AnalysisDetailModal
                        isOpen={!!selectedResult}
                        onClose={() => setSelectedResult(null)}
                        result={selectedResult}
                        entityName={entityName}
                        onDelete={handleDeleteClick}
                    />
                )}
            </Flex>

            <EditPromptModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                entityId={entityId}
                intent={prompt.intent ?? 'Informational'}
                tags={(prompt.tags ?? []).map((t: { name: string }) => t.name)}
                onIntentChange={handleIntentChange}
                onTagChange={handleTagChange}
            />
        </PageContainer>
    );
}
