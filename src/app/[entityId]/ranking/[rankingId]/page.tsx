"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RankingReportView from "@/components/Prompts/RankingReport";
import RankingReportSkeleton from "@/components/Prompts/RankingReportSkeleton";
import Header from "@/components/Shared/Header";
import PageContainer from "@/components/Shared/PageContainer";
import PageBrief from "@/components/Shared/PageBrief";
import ActionDialog from "@/components/Shared/ActionDialog";
import RadixSegmentedControl from "@/components/Shared/RadixSegmentedControl";
import { Flex, Separator, Box, Heading, Spinner, Text, IconButton, Tooltip, Button } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon, LockClosedIcon, PlayIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useSession } from "@/lib/auth-client";
import { RankingReport } from "@/types/ranking";
import RankingSourcesTable from "@/components/Prompts/RankingSourcesTable";
import MarketInsights from "@/components/Prompts/MarketInsights";
import AnalysisResultsTable from "@/components/Prompts/AnalysisResultsTable";
import { parseRankingResponse } from "@/lib/rankingUtils";
import { useToast } from "@/components/Shared/RadixToast";
import { TimeRangeType } from "@/components/Shared/FilterBar";

export default function RankingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const entityId = params.entityId as string;
    const rankingId = params.rankingId as string;

    const [report, setReport] = useState<RankingReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRangeType>('30d');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDeleteResultId, setPendingDeleteResultId] = useState<string | null>(null);
    const [isDeletingResult, setIsDeletingResult] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);
    const toast = useToast();
    const { data: session } = useSession();
    const isAppAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

    const fetchRanking = useCallback(async () => {
        try {
            const res = await fetch(`/api/rankings/${rankingId}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else {
                console.error("Failed to fetch ranking details");
            }
        } catch (error) {
            console.error("Error fetching ranking:", error);
        } finally {
            setIsLoading(false);
        }
    }, [rankingId]);

    useEffect(() => {
        if (rankingId) {
            fetchRanking();
        }
    }, [rankingId, fetchRanking]);

    const isProcessing = report?.prompt?.analysisResults?.some((r) => r.status === 'running' || r.status === 'pending');

    // Poll while results are processing (pending/running)
    useEffect(() => {
        if (!isProcessing) return;
        const interval = setInterval(() => {
            fetchRanking();
        }, 4000);
        return () => clearInterval(interval);
    }, [isProcessing, fetchRanking]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/rankings/${rankingId}`, { method: 'DELETE' });
            if (res.ok) {
                router.push(`/${entityId}/ranking`);
            } else {
                toast.error("Failed to delete ranking.");
            }
        } catch (error) {
            console.error("Error deleting ranking:", error);
            toast.error("Error deleting ranking.");
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleDeleteResult = async () => {
        if (!pendingDeleteResultId) return;
        setIsDeletingResult(true);
        try {
            const res = await fetch(`/api/analysis/${pendingDeleteResultId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchRanking();
            } else {
                toast.error("Failed to delete result.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete result.");
        } finally {
            setIsDeletingResult(false);
            setPendingDeleteResultId(null);
        }
    };

    const handleRunNow = async () => {
        if (isRunning || isProcessing || !report?.prompt?.id) return;
        setIsRunning(true);
        try {
            const res = await fetch(`/api/prompts/${report.prompt.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggerAnalysis: true })
            });
            if (!res.ok) throw new Error("Failed to trigger run");
            fetchRanking();
        } catch (e) {
            console.error(e);
        } finally {
            setIsRunning(false);
        }
    };

    const completedResults = useMemo(() => {
        return (report?.prompt?.analysisResults || [])
            .filter((r) => r.response && r.status !== 'running' && r.status !== 'pending' && r.status !== 'failed')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [report?.prompt?.analysisResults]);

    const selectedResult = completedResults[selectedResultIndex] || null;

    const structuredData = useMemo(() => {
        if (!selectedResult?.response) return null;
        return parseRankingResponse(selectedResult.response);
    }, [selectedResult]);

    if (isLoading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: 400 }}>
                <Spinner size="3" />
            </Flex>
        );
    }

    if (!report) {
        return (
            <Flex direction="column" align="center" gap="4" py="9">
                <Heading size="4">Ranking not found</Heading>
                <Button variant="soft" color="gray" onClick={() => router.push(`/${entityId}/ranking`)}>
                    Back to Overview
                </Button>
            </Flex>
        );
    }

    const contextLabel = [report.primaryBuyerRole, report.companySize, report.industry].filter(Boolean).join(' in ');
    const fullReportTitle = report.name
        || [contextLabel, report.decisionContext].filter(Boolean).join(' — ')
        || 'Ranking Report';

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" gap="3" width="100%">
                            <Link href={`/${entityId}/ranking`}>
                                <IconButton
                                    variant="surface"
                                    color="gray"
                                    radius="medium"
                                    size="2"
                                    aria-label="Back to rankings"
                                >
                                    <ChevronLeftIcon />
                                </IconButton>
                            </Link>
                            <Separator orientation="vertical" style={{ height: 24 }} />
                            <Flex align="center" justify="end" gap="3" style={{ flex: 1 }}>
                                <RadixSegmentedControl
                                    value={timeRange}
                                    onValueChange={(val) => setTimeRange(val as TimeRangeType)}
                                    items={[
                                        { value: '7d', label: '7 Days' },
                                        { value: '30d', label: '30 Days' },
                                        { value: '90d', label: '90 Days' },
                                    ]}
                                />
                                {isAppAdmin && (
                                    <Button
                                        size="2"
                                        variant="soft"
                                        color="grass"
                                        loading={isRunning || !!isProcessing}
                                        onClick={handleRunNow}
                                    >
                                        <PlayIcon />
                                        Run now
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    color="red"
                                    size="2"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    Delete Report
                                </Button>
                            </Flex>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 25
                }
            ]}
        >
            <PageBrief
                label="Report"
                description={fullReportTitle}
                metrics={[
                    { label: "Competitors", value: report.competitors?.length || 0 },
                    { label: "Results", value: report.prompt?.analysisResults?.length || 0 },
                ]}
            />

            <Flex direction="column" gap="6" p="4">
                {isProcessing && completedResults.length === 0 ? (
                    <RankingReportSkeleton
                        entityName={report.entity?.name}
                        entityLogoUrl={report.entity?.logoUrl}
                        entityWebsite={report.entity?.website}
                        competitors={report.competitors}
                        progressStep={report.prompt?.analysisResults?.find(r => r.status === 'running')?.progressStep}
                    />
                ) : (
                    <RankingReportView
                        report={report}
                        timeRange={timeRange}
                    />
                )}

                {completedResults.length > 0 && (
                    <Flex direction="column" gap="6">
                        {/* Response navigator */}
                        <Flex align="center" justify="between">
                            <Header.Root mb="0">
                                <Header.Title size="4" weight="bold">Market Insights</Header.Title>
                            </Header.Root>
                            <Flex align="center" gap="2">
                                <IconButton
                                    variant="soft"
                                    color="gray"
                                    size="1"
                                    disabled={selectedResultIndex >= completedResults.length - 1}
                                    onClick={() => setSelectedResultIndex(i => i + 1)}
                                    aria-label="Previous response"
                                >
                                    <ChevronLeftIcon />
                                </IconButton>
                                <Text size="1" color="gray" className="tabular-nums" style={{ minWidth: 120, textAlign: 'center' }}>
                                    {selectedResult ? new Date(selectedResult.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </Text>
                                <IconButton
                                    variant="soft"
                                    color="gray"
                                    size="1"
                                    disabled={selectedResultIndex <= 0}
                                    onClick={() => setSelectedResultIndex(i => i - 1)}
                                    aria-label="Next response"
                                >
                                    <ChevronRightIcon />
                                </IconButton>
                            </Flex>
                        </Flex>

                        {structuredData && (
                            <MarketInsights
                                structuredData={structuredData}
                                competitors={report.competitors}
                                mainEntity={report.entity}
                                hideHeader
                            />
                        )}

                        {structuredData?.sources && structuredData.sources.length > 0 && (
                            <Flex direction="column" gap="4">
                                <Header.Root mb="0">
                                    <Header.Title size="4" weight="bold">Sources</Header.Title>
                                </Header.Root>
                                <RankingSourcesTable sources={structuredData.sources} />
                            </Flex>
                        )}
                    </Flex>
                )}

                {isAppAdmin && report?.prompt?.analysisResults && (
                    <Flex direction="column" gap="4">
                        <Flex
                            asChild
                            align="center"
                            gap="2"
                            pt="4"
                            width="100%"
                            style={{ cursor: 'pointer', textAlign: 'left' }}
                        >
                            <button onClick={() => setShowDetails(!showDetails)}>
                                <Tooltip content="Only visible to app admins">
                                    <LockClosedIcon style={{ width: 16, height: 16, color: 'var(--gray-9)' }} />
                                </Tooltip>
                                <Heading size="4" weight="bold" color="gray" highContrast>Response Analysis Details</Heading>
                                <ChevronDownIcon
                                    style={{
                                        width: 20,
                                        height: 20,
                                        color: 'var(--gray-9)',
                                        transform: showDetails ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 200ms',
                                    }}
                                />
                            </button>
                        </Flex>

                        {showDetails && (
                            <Flex direction="column" gap="4" className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <Box p="4" style={{ background: 'var(--gray-2)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-4)' }}>
                                    <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider" mb="2" as="div">Master Prompt</Text>
                                    <Text as="p" size="2" color="gray" className="font-mono whitespace-pre-wrap" style={{ background: 'var(--gray-1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-2)', border: '1px solid var(--gray-4)' }}>
                                        {report.prompt?.text || '—'}
                                    </Text>
                                </Box>
                                <AnalysisResultsTable
                                    results={[...report.prompt.analysisResults].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                                    entityName={report.entity?.name || 'Entity'}
                                    onDelete={(id) => setPendingDeleteResultId(id)}
                                    loading={isLoading}
                                />
                            </Flex>
                        )}
                    </Flex>
                )}
            </Flex>

            <ActionDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Ranking Report"
                message="Are you sure you want to delete this ranking report? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeleting}
                loadingText="Deleting..."
            />

            <ActionDialog
                isOpen={!!pendingDeleteResultId}
                onClose={() => setPendingDeleteResultId(null)}
                onConfirm={handleDeleteResult}
                title="Delete Result"
                message="Are you sure you want to delete this analysis result?"
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeletingResult}
                loadingText="Deleting..."
            />
        </PageContainer>
    );
}
