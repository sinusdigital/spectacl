"use client";

import React from 'react';
import { Badge, Text, Flex, Box } from "@radix-ui/themes";
import RadixTable from "@/components/Shared/RadixTable";
import SourceBadge from "@/components/Shared/SourceBadge";
import { StructuredRankingSource } from "@/types/ranking";

const TYPE_COLORS: Record<string, "blue" | "amber" | "green" | "pink" | "indigo" | "crimson" | "gray"> = {
    'Editorial': 'blue',
    'Forum': 'amber',
    'Documentation': 'green',
    'Social': 'pink',
    'Product': 'indigo',
    'Review': 'crimson',
    'Other': 'gray'
};

interface RankingSourcesTableProps {
    sources: StructuredRankingSource[];
    loading?: boolean;
}

export default function RankingSourcesTable({
    sources,
    loading = false
}: RankingSourcesTableProps) {
    if (loading) {
        return (
            <Flex align="center" justify="center" py="8">
                <Text size="2" color="gray">Loading sources...</Text>
            </Flex>
        );
    }

    if (!sources || sources.length === 0) {
        return (
            <Flex align="center" justify="center" py="8" className="bg-[var(--gray-2)] rounded-xl border border-dashed border-[var(--gray-a4)]">
                <Text size="2" color="gray">No cited sources found in this ranking.</Text>
            </Flex>
        );
    }

    return (
        <Box style={{ overflowX: 'visible', width: '100%' }}>
            <RadixTable.Root variant="ghost">
                <RadixTable.Header>
                    <RadixTable.Row>
                        <RadixTable.Head variant="modal" width="40px">#</RadixTable.Head>
                        <RadixTable.Head variant="modal">Title</RadixTable.Head>
                        <RadixTable.Head variant="modal">Source</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="120px">Type</RadixTable.Head>
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {sources.map((source, index) => (
                        <RadixTable.Row key={`${source.url}-${index}`}>
                            <RadixTable.Cell>
                                <Text size="2" color="gray" weight="medium">{index + 1}</Text>
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Text size="2" weight="medium" color="gray" highContrast>
                                    {source.title || 'Untitled Source'}
                                </Text>
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <SourceBadge
                                    url={source.url}
                                    clickable={true}
                                    className="max-w-[400px]"
                                />
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Badge
                                    color={TYPE_COLORS[source.type || 'Other'] || 'gray'}
                                    radius="full"
                                    size="1"
                                    variant="soft"
                                >
                                    {source.type || 'Other'}
                                </Badge>
                            </RadixTable.Cell>
                        </RadixTable.Row>
                    ))}
                </RadixTable.Body>
            </RadixTable.Root>
        </Box>
    );
}
