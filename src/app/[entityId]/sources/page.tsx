"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/components/Shared/PageContainer";
import Header from "@/components/Shared/Header";
import PageBrief from "@/components/Shared/PageBrief";
import FilterBar, { TimeRangeType } from "@/components/Shared/FilterBar";
import { Flex, Separator, Box, Grid, Text } from "@radix-ui/themes";
import SourcesTable from "@/components/Overview/SourcesTable";
import SourcesBarChart from "@/components/Charts/SourcesBarChart";
import { Prompt, useSourceMetrics } from "@/hooks/useSourceMetrics";

export default function SourcesPage() {
    const params = useParams();
    const entityId = params.entityId as string;

    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRangeType>('30d');
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [intentFilter, setIntentFilter] = useState<string[]>([]);
    const [modelFilter, setModelFilter] = useState<string[]>([]);
    const [viewType, setViewType] = useState<'domains' | 'urls'>('domains');
    const [loading, setLoading] = useState(true);

    const fetchPrompts = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (tagFilter.length > 0) queryParams.append('tags', tagFilter.join(','));
            if (intentFilter.length > 0) queryParams.append('intents', intentFilter.join(','));
            if (modelFilter.length > 0) queryParams.append('models', modelFilter.join(','));

            const queryString = queryParams.toString();
            const res = await fetch(`/api/entities/${entityId}/prompts${queryString ? `?${queryString}` : ''}`);
            const data = await res.json();
            setAllPrompts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching prompts:", error);
        } finally {
            setLoading(false);
        }
    }, [entityId, tagFilter, intentFilter, modelFilter]);

    useEffect(() => {
        if (entityId) fetchPrompts();
    }, [entityId, fetchPrompts]);

    const prompts = useMemo(() => {
        if (timeRange === '90d' || timeRange === 'last') return allPrompts;
        const days = timeRange === '7d' ? 7 : 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return allPrompts.filter((p) => {
            if (!p.analysisResults || p.analysisResults.length === 0) return false;
            return p.analysisResults.some(r => r.createdAt && new Date(r.createdAt) >= cutoff);
        });
    }, [allPrompts, timeRange]);

    // Page-level metrics for the dual charts
    const { topSources, topUrls, domainTypes, totalUniqueDomains } = useSourceMetrics(prompts, 0, entityId);

    const ownedTypeIds = useMemo(
        () => new Set(domainTypes.filter(t => t.isOwned).map(t => t.id)),
        [domainTypes]
    );

    const earnedTypeIds = useMemo(
        () => new Set(domainTypes.filter(t => t.isEarned).map(t => t.id)),
        [domainTypes]
    );

    const ownedSources = useMemo(
        () => topSources.filter(s => s.typeId != null && ownedTypeIds.has(s.typeId)),
        [topSources, ownedTypeIds]
    );

    const earnedSources = useMemo(
        () => topSources.filter(s => s.typeId != null && earnedTypeIds.has(s.typeId)),
        [topSources, earnedTypeIds]
    );

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" width="100%" gap="4">
                            <Header.Content>
                                <Header.Title as="h1" size="4" weight="bold">Sources</Header.Title>
                            </Header.Content>
                            <Separator orientation="vertical" size="2" />
                            <Box style={{ flex: 1 }}>
                                <FilterBar
                                    viewType={viewType}
                                    setViewType={setViewType}
                                    timeRange={timeRange}
                                    setTimeRange={setTimeRange}
                                    entityId={entityId}
                                    tagFilter={tagFilter}
                                    setTagFilter={setTagFilter}
                                    intentFilter={intentFilter}
                                    setIntentFilter={setIntentFilter}
                                    modelFilter={modelFilter}
                                    setModelFilter={setModelFilter}
                                />
                            </Box>
                        </Flex>
                    ),
                    sticky: true,
                    className: "",
                    zIndex: 20,
                }
            ]}
        >
            {viewType === 'domains' && (
                <>
                <PageBrief
                    description="Which domains AI models cite when answering your tracked prompts, and where you can build presence to influence those answers."
                    metrics={[
                        { label: "Domains", value: totalUniqueDomains },
                        { label: "Owned", value: ownedSources.length },
                        { label: "Earned", value: earnedSources.length },
                    ]}
                />
                <Grid columns="3" gap="0" style={{ borderBottom: '1px solid var(--gray-4)' }}>
                    <Box p="4">
                        <SourcesBarChart
                            data={topSources}
                            limit={10}
                            title="Top Sources"
                            subtitle="Share of total mentions across analyzed prompts"
                        />
                    </Box>
                    <Box p="4" style={{ borderLeft: '1px solid var(--gray-4)' }}>
                        <SourcesBarChart
                            data={ownedSources}
                            limit={10}
                            title="Owned Platforms"
                            subtitle="Your own domains cited by AI models"
                        />
                    </Box>
                    <Box p="4" style={{ borderLeft: '1px solid var(--gray-4)' }}>
                        <SourcesBarChart
                            data={earnedSources}
                            limit={10}
                            title="Earned Platforms"
                            subtitle="Platforms where you can build an audience to influence AI answers"
                        />
                    </Box>
                </Grid>
                </>
            )}
            <Flex
                align="center"
                justify="between"
                gap="6"
                style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--gray-a4)',
                    background: 'var(--gray-2)',
                    flexShrink: 0,
                }}
            >
                <Text size="2" color="gray" style={{ maxWidth: 560 }}>
                    {viewType === 'domains'
                        ? 'All domains cited by AI models across your tracked prompts, ranked by frequency. Use type labels to classify owned vs. earned sources.'
                        : 'Individual URLs cited in AI responses. See exactly which pages are being referenced for each domain.'}
                </Text>
                <Flex align="center" gap="4" style={{ flexShrink: 0 }}>
                    <Separator orientation="vertical" size="1" />
                    <Flex direction="column" align="end" gap="0">
                        <Text size="1" color="gray">{viewType === 'domains' ? 'Total Domains' : 'Total URLs'}</Text>
                        <Text size="3" weight="bold">{viewType === 'domains' ? totalUniqueDomains : topUrls.length}</Text>
                    </Flex>
                </Flex>
            </Flex>
            <SourcesTable
                prompts={prompts}
                limit={0}
                viewType={viewType}
                loading={loading}
                showBarChart={false}
                entityId={entityId}
            />
        </PageContainer>
    );
}
