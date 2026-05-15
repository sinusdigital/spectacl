"use client";

import React from 'react';
import CompanyLogo from "@/components/CompanyLogo";
import DomainsChart from "@/components/Charts/DomainsChart";
import RadixTable from "@/components/Shared/RadixTable";
import SplitCard from "@/components/Shared/SplitCard";
import { Box, Flex, Text, HoverCard } from "@radix-ui/themes";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import InlineTypeSelect from "@/components/Shared/InlineTypeSelect";
import { useSourceMetrics, Prompt } from "@/hooks/useSourceMetrics";

interface TopSourcesOverviewProps {
    prompts: Prompt[];
    limit?: number;
    viewType?: 'domains' | 'urls';
    p?: React.ComponentProps<typeof Box>["p"];
    entityId?: string;
    sectionTitle?: React.ReactNode;
    sectionDescription?: React.ReactNode;
}

export default function TopSourcesOverview({
    prompts,
    limit = 5,
    viewType = 'domains',
    p,
    entityId,
    sectionTitle,
    sectionDescription,
}: TopSourcesOverviewProps) {
    const {
        topSources,
        domainTypeData,
        totalUniqueDomains,
        handleTypeChange,
        domainTypes,
    } = useSourceMetrics(prompts, limit, entityId);

    return (
        <SplitCard ratio={[2, 1]}>
          <SplitCard.Pane>
            {sectionTitle && (
              <SplitCard.Header
                title={sectionTitle}
                description={sectionDescription}
              />
            )}
            <Box p={p}>
                <div className="overflow-x-visible">
                    <RadixTable.Root variant="ghost">
                        <RadixTable.Header>
                            <RadixTable.Row>
                                <RadixTable.Head variant="modal" width="30px">#</RadixTable.Head>
                                <RadixTable.Head variant="modal">
                                    {viewType === 'domains' ? 'Domain' : 'URL'}
                                </RadixTable.Head>
                                <RadixTable.Head variant="modal" width="1px">Type</RadixTable.Head>
                                <RadixTable.Head variant="modal" width="80px" className="pl-4" style={{ borderLeft: '1px solid var(--gray-a4)' }}>
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
                                                        <Box className="bg-[var(--gray-a2)] p-2 rounded border border-[var(--gray-a5)]">
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
                                    <RadixTable.Head variant="modal" width="80px">
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
                                                            <Box className="bg-[var(--gray-a2)] p-2 rounded border border-[var(--gray-a5)]">
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
                            </RadixTable.Row>
                        </RadixTable.Header>
                        <RadixTable.Body>
                            {topSources.length === 0 ? (
                                <RadixTable.Row>
                                    <RadixTable.Cell colSpan={5} className="py-8 text-center">
                                        <Text size="2" color="gray">No sources found in analysis data yet.</Text>
                                    </RadixTable.Cell>
                                </RadixTable.Row>
                            ) : (
                                topSources.map((source, index) => (
                                    <RadixTable.Row key={source.domain}>
                                        <RadixTable.Cell><Text size="1" color="gray">{index + 1}</Text></RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Flex align="center" gap="3">
                                                <CompanyLogo
                                                    domain={source.domain}
                                                    name={source.domain}
                                                    size={24}
                                                    className="rounded"
                                                    logoUrl={source.logoUrl}
                                                />
                                                <Text size="2" weight="medium" truncate title={source.domain}>{source.domain}</Text>
                                            </Flex>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <InlineTypeSelect
                                                value={source.typeId}
                                                onChange={val => handleTypeChange(source.domain, val)}
                                                types={domainTypes}
                                            />
                                        </RadixTable.Cell>
                                        <RadixTable.Cell className="pl-4" style={{ borderLeft: '1px solid var(--gray-a4)' }}>{source.percentage}%</RadixTable.Cell>
                                        <RadixTable.Cell>{source.presence}%</RadixTable.Cell>
                                    </RadixTable.Row>
                                ))
                            )}
                        </RadixTable.Body>
                    </RadixTable.Root>
                </div>
            </Box>
          </SplitCard.Pane>
          <SplitCard.Pane>
            <SplitCard.Header
              title="Domains by type"
              description={`${totalUniqueDomains} domains total`}
            />
            <Flex direction="column" justify="center" flexGrow="1">
                <DomainsChart data={domainTypeData} headerless p={p} />
            </Flex>
          </SplitCard.Pane>
        </SplitCard>
    );
}
