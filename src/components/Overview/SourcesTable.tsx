"use client";

import React from 'react';
import CompanyLogo from "@/components/CompanyLogo";
import TableSkeleton from "@/components/Shared/TableSkeleton";
import RadixTable from "@/components/Shared/RadixTable";
import DomainsChart from "@/components/Charts/DomainsChart";
import SourcesBarChart from "@/components/Charts/SourcesBarChart";
import { Box, Flex, Badge, Heading, Text, HoverCard, Link } from "@radix-ui/themes";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import DomainUrlsView from "./DomainUrlsView";
import DetailDrawer from "@/components/Shared/DetailDrawer";
import InlineTypeSelect from "@/components/Shared/InlineTypeSelect";
import { useSourceMetrics, Prompt, TIER_RADIX_COLOR, tierForType, UrlMetric } from "@/hooks/useSourceMetrics";
import SplitCard from "@/components/Shared/SplitCard";

interface SourcesTableProps {
    prompts: Prompt[];
    viewType?: 'domains' | 'urls';
    loading?: boolean;
    limit?: number;
    showChart?: boolean;
    showBarChart?: boolean;
    pageSize?: number;
    entityId?: string;
    /** When set with `showChart`, renders a unified header row above table+chart
     *  using this title/description on the table side and "Domains by type" on
     *  the chart side. Lets the consumer drop its own outer Header. */
    sectionTitle?: React.ReactNode;
    sectionDescription?: React.ReactNode;
}

export default function SourcesTable({
    prompts,
    viewType = 'domains',
    loading = false,
    limit = 0,
    showChart = false,
    showBarChart = false,
    pageSize = 20,
    entityId,
    sectionTitle,
    sectionDescription,
}: SourcesTableProps) {
    const { topSources, topUrls, handleTypeChange, sourceStats, domainTypes, domainTypeData, totalUniqueDomains } = useSourceMetrics(prompts, limit, entityId);
    // `selectedDomain` controls the right-side `<DetailDrawer>` that lists
    // every URL cited under the chosen domain. Replaces the old inline-row
    // expansion which broke the table's column rhythm and forced the chart
    // pane to grow alongside the expanded content.
    const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);

    // Reset page when view type changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [viewType]);

    // Slice data for pagination
    const paginatedSources = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return topSources.slice(start, start + pageSize);
    }, [topSources, currentPage, pageSize]);

    const paginatedUrls = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return topUrls.slice(start, start + pageSize);
    }, [topUrls, currentPage, pageSize]);

    const getDomainUrls = (domain: string) => {
        // Find all URLs belonging to this domain from the full dataset
        return Object.entries(sourceStats.urlCounts)
            .filter(([url]) => sourceStats.urlToDomain[url] === domain)
            .map(([url, count]) => {
                const metadata = topUrls.find(u => u.url === url);
                return {
                    url,
                    count,
                    domain: domain,
                    type: metadata?.type || topSources.find(s => s.domain === domain)?.type || 'Editorial',
                    logoUrl: metadata?.logoUrl || topSources.find(s => s.domain === domain)?.logoUrl
                } as UrlMetric;
            })
            .sort((a, b) => b.count - a.count);
    };

    if (loading) {
        return (
            <div className="w-full">
                <TableSkeleton
                    columnCount={viewType === 'domains' ? 6 : 4}
                    rowCount={limit || 5}
                    variant="ghost"
                />
            </div>
        );
    }

    const table = (
        <div className="overflow-x-visible w-full">
            <RadixTable.Root variant="ghost">
                <RadixTable.Header>
                    <RadixTable.Row>
                        <RadixTable.Head variant="modal" width="30px">#</RadixTable.Head>
                        <RadixTable.Head variant="modal">
                            {viewType === 'domains' ? 'Domain' : 'URL'}
                        </RadixTable.Head>
                        <RadixTable.Head variant="modal" width="120px">Type</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="120px" className="border-l border-[var(--gray-a4)] pl-4">
                            <Flex align="center" gap="1">
                                {viewType === 'domains' ? 'Used' : 'Total Mentions'}
                                {viewType === 'domains' && (
                                    <HoverCard.Root>
                                        <HoverCard.Trigger>
                                            <QuestionMarkCircledIcon className="w-4 h-4 text-[var(--gray-9)] hover:text-[var(--gray-11)] cursor-help transition-colors mt-[1px]" />
                                        </HoverCard.Trigger>
                                        <HoverCard.Content maxWidth="280px">
                                            <Box className="leading-relaxed">
                                                <Flex direction="column" gap="3">
                                                    <p><Text weight="bold" color="gray">Share of Sources</Text></p>
                                                    <Flex direction="column" gap="1">
                                                        <Text weight="bold" size="2" color="gray">How it works:</Text>
                                                        <Text size="2" as="p">It calculates (Total links to this domain) / (Total links found across all prompts)</Text>
                                                    </Flex>
                                                    <Box className="bg-[var(--gray-2)] p-2 rounded border border-[var(--gray-a4)]">
                                                        <Flex direction="column" gap="1">
                                                            <Text weight="bold" size="2" color="gray">Example:</Text>
                                                            <Text size="2" as="p">If there are 100 total links found in all your prompts combined, and 45 of them point to docs.example.com, this column will show 45%. It tells you how dominant a specific source is compared to all other sources.</Text>
                                                        </Flex>
                                                    </Box>
                                                </Flex>
                                            </Box>
                                        </HoverCard.Content>
                                    </HoverCard.Root>
                                )}
                            </Flex>
                        </RadixTable.Head>
                        {viewType === 'domains' && (
                            <RadixTable.Head variant="modal" width="120px">
                                <Flex align="center" gap="1">
                                    Presence
                                    <HoverCard.Root>
                                        <HoverCard.Trigger>
                                            <QuestionMarkCircledIcon className="w-4 h-4 text-[var(--gray-9)] hover:text-[var(--gray-11)] cursor-help transition-colors mt-[1px]" />
                                        </HoverCard.Trigger>
                                        <HoverCard.Content maxWidth="280px">
                                            <Box className="leading-relaxed">
                                                <Flex direction="column" gap="3">
                                                    <p><Text weight="bold" color="gray">Presence Rate</Text></p>
                                                    <Flex direction="column" gap="1">
                                                        <Text weight="bold" size="2" color="gray">How it works:</Text>
                                                        <Text size="2" as="p">It calculates (Number of Prompts containing the domain / Total Number of Prompts with Analysis Results) * 100.</Text>
                                                    </Flex>
                                                    <Box className="bg-[var(--gray-2)] p-2 rounded border border-[var(--gray-a4)]">
                                                        <Flex direction="column" gap="1">
                                                            <Text weight="bold" size="2" color="gray">Example:</Text>
                                                            <Text size="2" as="p">If a domain appears in 2 out of 5 analyzed prompts, this column will show 40%.</Text>
                                                        </Flex>
                                                    </Box>
                                                </Flex>
                                            </Box>
                                        </HoverCard.Content>
                                    </HoverCard.Root>
                                </Flex>
                            </RadixTable.Head>
                        )}
                        {viewType === 'domains' && (
                            <RadixTable.Head variant="modal" width="120px">
                                <Flex align="center" gap="1">
                                    Unique URLs
                                    <HoverCard.Root>
                                        <HoverCard.Trigger>
                                            <QuestionMarkCircledIcon className="w-4 h-4 text-[var(--gray-9)] hover:text-[var(--gray-11)] cursor-help transition-colors mt-[1px]" />
                                        </HoverCard.Trigger>
                                        <HoverCard.Content maxWidth="280px">
                                            <Box className="leading-relaxed">
                                                <Flex direction="column" gap="3">
                                                    <p><Text weight="bold" color="gray">Unique URLs</Text></p>
                                                    <Flex direction="column" gap="1">
                                                        <Text weight="bold" size="2" color="gray">How it works:</Text>
                                                        <Text size="2" as="p">Counts the number of distinct URLs (paths) cited under this domain across all runs.</Text>
                                                    </Flex>
                                                    <Box className="bg-[var(--gray-2)] p-2 rounded border border-[var(--gray-a4)]">
                                                        <Flex direction="column" gap="1">
                                                            <Text weight="bold" size="2" color="gray">Example:</Text>
                                                            <Text size="2" as="p">If LLMs reference fespa.com/learning, fespa.com/podcasts, and fespa.com (the homepage), this shows 3 — high values mean LLMs surface many different pages on the domain.</Text>
                                                        </Flex>
                                                    </Box>
                                                </Flex>
                                            </Box>
                                        </HoverCard.Content>
                                    </HoverCard.Root>
                                </Flex>
                            </RadixTable.Head>
                        )}
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {viewType === 'domains' ? (
                        paginatedSources.length === 0 ? (
                            <RadixTable.Row>
                                <RadixTable.Cell colSpan={6} className="py-8 text-center text-[var(--gray-11)] text-sm">
                                    No sources found in analysis data yet. Hint: Tell AI that it should include sources in its analysis.
                                </RadixTable.Cell>
                            </RadixTable.Row>
                        ) : (
                            paginatedSources.map((source, index) => {
                                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                                return (
                                    <RadixTable.Row
                                        key={source.domain}
                                        align="center"
                                        className="cursor-pointer hover:bg-[var(--gray-2)] transition-colors"
                                        onClick={() => setSelectedDomain(source.domain)}
                                    >
                                        <RadixTable.Cell className="text-sm text-[var(--gray-11)]">{globalIndex}</RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Flex align="center" gap="3">
                                                <CompanyLogo
                                                    domain={source.domain}
                                                    name={source.domain}
                                                    size={24}
                                                    className="rounded"
                                                />
                                                <Text size="2" weight="medium" truncate style={{ maxWidth: '200px' }} title={source.domain}>{source.domain}</Text>
                                            </Flex>
                                        </RadixTable.Cell>
                                        {/* InlineTypeSelect stops propagation internally, so its
                                            clicks won't bubble up to open the drawer.            */}
                                        <RadixTable.Cell>
                                            <InlineTypeSelect
                                                value={source.typeId}
                                                onChange={val => handleTypeChange(source.domain, val)}
                                                types={domainTypes}
                                            />
                                        </RadixTable.Cell>
                                        <RadixTable.Cell className="text-sm text-[var(--gray-12)] border-l border-[var(--gray-a4)] pl-4">{source.percentage}%</RadixTable.Cell>
                                        <RadixTable.Cell className="text-sm text-[var(--gray-12)]">{source.presence}%</RadixTable.Cell>
                                        <RadixTable.Cell className="text-sm text-[var(--gray-12)] tabular-nums">{source.uniqueUrls}</RadixTable.Cell>
                                    </RadixTable.Row>
                                );
                            })
                        )
                    ) : (
                        paginatedUrls.length === 0 ? (
                            <RadixTable.Row>
                                <RadixTable.Cell colSpan={4} className="py-8 text-center text-[var(--gray-11)] text-sm">
                                    No URLs found in analysis data yet.
                                </RadixTable.Cell>
                            </RadixTable.Row>
                        ) : (
                            paginatedUrls.map((urlMetric, index) => {
                                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                                return (
                                    <RadixTable.Row key={urlMetric.url} align="center">
                                        <RadixTable.Cell className="text-sm text-[var(--gray-11)]">{globalIndex}</RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Flex align="center" gap="3">
                                                <CompanyLogo
                                                    domain={urlMetric.domain}
                                                    name={urlMetric.domain}
                                                    size={24}
                                                    className="rounded"
                                                />
                                                <Link
                                                    href={urlMetric.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    size="2"
                                                    color="gray"
                                                    highContrast
                                                    truncate
                                                    title={urlMetric.url}
                                                    style={{ maxWidth: '400px' }}
                                                >
                                                    {urlMetric.url}
                                                </Link>
                                            </Flex>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Badge
                                                color={TIER_RADIX_COLOR[tierForType(urlMetric.type, domainTypes)]}
                                                radius="full"
                                            >
                                                {urlMetric.type}
                                            </Badge>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell className="text-sm text-[var(--gray-12)] border-l border-[var(--gray-a4)] pl-4">{urlMetric.count}</RadixTable.Cell>
                                    </RadixTable.Row>
                                );
                            })
                        )
                    )}
                </RadixTable.Body>
            </RadixTable.Root>
            <RadixTable.Pagination
                currentPage={currentPage}
                total={viewType === 'domains' ? topSources.length : topUrls.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                label={viewType === 'domains' ? 'domains' : 'URLs'}
            />
        </div>
    );

    // Drawer is shared across all render branches — only renders DOM when open,
    // so safe to mount once at the root.
    const selectedSource = selectedDomain
        ? topSources.find(s => s.domain === selectedDomain) ?? null
        : null;
    const drawer = (
        <DetailDrawer
            open={!!selectedDomain}
            onOpenChange={(open) => { if (!open) setSelectedDomain(null); }}
            title={
                <Flex align="center" gap="3">
                    {selectedDomain && (
                        <CompanyLogo
                            domain={selectedDomain}
                            name={selectedDomain}
                            size={32}
                            className="rounded"
                        />
                    )}
                    <Flex direction="column" gap="2" style={{ minWidth: 0 }}>
                        <Heading as="h2" size="4" weight="bold" truncate>
                            {selectedDomain ?? ""}
                        </Heading>
                        {selectedSource && (
                            <Flex align="center" gap="2" wrap="wrap">
                                <Badge
                                    color={TIER_RADIX_COLOR[tierForType(selectedSource.type, domainTypes)]}
                                    radius="full"
                                    size="1"
                                    variant="soft"
                                >
                                    {selectedSource.type}
                                </Badge>
                                <Text size="1" color="gray">
                                    {selectedSource.percentage}% used · {selectedSource.presence}% presence
                                </Text>
                            </Flex>
                        )}
                    </Flex>
                </Flex>
            }
            a11yDescription="URLs cited under this domain"
        >
            {selectedDomain && (
                <DomainUrlsView urls={getDomainUrls(selectedDomain)} />
            )}
        </DetailDrawer>
    );

    if (!showChart && !showBarChart) {
        return <>{table}{drawer}</>;
    }

    if (showBarChart) {
        return (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--gray-a4)]">
                    <div>{table}</div>
                    <div className="flex flex-col justify-start p-4">
                        <SourcesBarChart data={topSources} />
                    </div>
                </div>
                {drawer}
            </>
        );
    }

    return (
        <>
            <SplitCard ratio={[2, 1]}>
                <SplitCard.Pane>
                    {sectionTitle && (
                        <SplitCard.Header
                            title={sectionTitle}
                            description={sectionDescription}
                        />
                    )}
                    {table}
                </SplitCard.Pane>
                <SplitCard.Pane>
                    <SplitCard.Header
                        title="Domains by type"
                        description={`${totalUniqueDomains} domains total`}
                    />
                    <DomainsChart data={domainTypeData} headerless />
                </SplitCard.Pane>
            </SplitCard>
            {drawer}
        </>
    );
}
