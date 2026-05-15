"use client";

import React from 'react';
import AnalysisDetailModal from './AnalysisDetailModal';
import ModelLogo from "@/components/Shared/ModelLogo";
import CompanyLogo from "@/components/CompanyLogo";
import AnalysisStatusIndicator from './AnalysisStatusIndicator';
import PillList from '@/components/Shared/PillList';
import RadixTable from '@/components/Shared/RadixTable';
import RadixDropdownMenu from '@/components/Shared/RadixDropdownMenu';
import RadixContextMenu from '@/components/Shared/RadixContextMenu';
import { AnalysisResult } from "@/types/prompts";
import { calculateSov } from "@/lib/metrics/mention-utils";
import { MentionMetric, PositionMetric, ShareOfVoiceMetric } from '@/components/Shared/MetricTriplet';
import { DotsHorizontalIcon, TrashIcon, EyeOpenIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Text, Flex, HoverCard, IconButton, Box } from '@radix-ui/themes';

interface AnalysisResultsTableProps {
    results: AnalysisResult[];
    entityName: string;
    entityLogo?: string | null;
    entityWebsite?: string | null;
    onDelete: (id: string) => void;
    loading?: boolean;
}

const AnalysisResultsTable = ({ results, entityName, entityLogo, entityWebsite, onDelete, loading }: AnalysisResultsTableProps) => {
    const [selectedResult, setSelectedResult] = React.useState<AnalysisResult | null>(null);

    return (
        <>
            <RadixTable.Root variant="ghost">
                <RadixTable.Header>
                    <RadixTable.Row>
                        <RadixTable.Head variant="modal" width="30px">#</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="60px">Model</RadixTable.Head>
                        <RadixTable.Head variant="modal">LLM Answer</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="100px" className="border-l border-[var(--gray-a4)] pl-4">Mention</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="100px">Position</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="120px">SOV</RadixTable.Head>
                        <RadixTable.Head variant="modal" className="border-l border-[var(--gray-a4)] pl-4">Competitors</RadixTable.Head>
                        <RadixTable.Head variant="modal">Sources</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="180px">Received at</RadixTable.Head>
                        <RadixTable.Head variant="modal" className="text-right" width="50px"></RadixTable.Head>
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {loading && !results.some(r => r.status === 'running' || r.status === 'pending') && (
                        <RadixTable.Row>
                            <RadixTable.Cell>
                                <Text color="gray" className="animate-pulse">—</Text>
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Flex align="center" justify="center" className="animate-pulse opacity-50">
                                    <Box width="32px" height="32px" style={{ background: 'var(--gray-4)', borderRadius: '50%' }} />
                                </Flex>
                            </RadixTable.Cell>
                            <RadixTable.Cell className="max-w-xs xl:max-w-md">
                                <Box style={{ height: 16, width: 192, background: 'var(--gray-4)', borderRadius: 'var(--radius-1)' }} className="animate-pulse" />
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Box style={{ height: 16, width: 48, background: 'var(--gray-4)', borderRadius: 'var(--radius-1)' }} className="animate-pulse" />
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Box style={{ height: 16, width: 32, background: 'var(--gray-4)', borderRadius: 'var(--radius-1)' }} className="animate-pulse" />
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Box style={{ height: 16, width: 32, background: 'var(--gray-4)', borderRadius: 'var(--radius-1)' }} className="animate-pulse" />
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Box style={{ height: 20, width: 64, background: 'var(--gray-4)', borderRadius: 'var(--radius-1)' }} className="animate-pulse" />
                            </RadixTable.Cell>
                            <RadixTable.Cell>
                                <Text size="2" color="gray" style={{ fontStyle: 'italic' }} className="animate-pulse">
                                    Requesting analysis...
                                </Text>
                            </RadixTable.Cell>
                            <RadixTable.Cell className="text-right"></RadixTable.Cell>
                        </RadixTable.Row>
                    )}
                    {results.map((result, index) => {
                        const isRunning = result.status === 'running' || result.status === 'pending';

                        if (isRunning) {
                            return (
                                <RadixTable.Row key={result.id}>
                                    <RadixTable.Cell>
                                        <Text size="1" color="gray">{index + 1}</Text>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Flex align="center" justify="center">
                                            <ModelLogo
                                                provider={result.llmProvider || result.llmModel.split(' ')[0].toLowerCase()}
                                                name={result.llmModel}
                                                size="sm"
                                                className="rounded animate-pulse opacity-70"
                                            />
                                        </Flex>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell className="max-w-xs xl:max-w-md">
                                        <AnalysisStatusIndicator status={result.status} size="sm" />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <MentionMetric isAnalyzing={true} showLabel={false} flex={false} />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <PositionMetric isAnalyzing={true} showLabel={false} flex={false} />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <ShareOfVoiceMetric isAnalyzing={true} showLabel={false} flex={false} />
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <div className="h-5 w-16 bg-[var(--gray-4)] rounded animate-pulse"></div>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell></RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Text size="2" color="gray" style={{ fontStyle: 'italic' }}>
                                            {result.status === 'pending' ? 'Waiting...' : 'Processing...'}
                                        </Text>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell className="text-right"></RadixTable.Cell>
                                </RadixTable.Row>
                            );
                        }

                        const isFailed = result.status === 'failed';

                        if (isFailed) {
                            return (
                                <RadixContextMenu.Root key={result.id}>
                                <RadixContextMenu.Trigger>
                                <RadixTable.Row style={{ background: 'var(--red-a2)' }}>
                                    <RadixTable.Cell><Text size="1" color="gray">{index + 1}</Text></RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Flex align="center" justify="center">
                                            <ModelLogo
                                                provider={result.llmProvider || result.llmModel.split(' ')[0].toLowerCase()}
                                                name={result.llmModel}
                                                size="sm"
                                                className="rounded"
                                            />
                                        </Flex>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell colSpan={5} style={{ verticalAlign: 'middle' }}>
                                        <Flex align="center" gap="2">
                                            <ExclamationTriangleIcon style={{ color: 'var(--red-9)', flexShrink: 0 }} />
                                            <Text size="1" color="red" truncate>
                                                {result.errorMessage || 'Analysis failed'}
                                            </Text>
                                        </Flex>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(result.createdAt).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell className="text-right">
                                        <Flex align="center" justify="end">
                                            <RadixDropdownMenu.Root>
                                                <RadixDropdownMenu.Trigger>
                                                    <IconButton
                                                        variant="ghost"
                                                        color="gray"
                                                        size="1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <DotsHorizontalIcon />
                                                    </IconButton>
                                                </RadixDropdownMenu.Trigger>
                                                <RadixDropdownMenu.Content align="end">
                                                    <RadixDropdownMenu.Item
                                                        onSelect={() => onDelete(result.id)}
                                                        color="red"
                                                    >
                                                        <TrashIcon className="mr-2 w-4 h-4" /> Delete Result
                                                    </RadixDropdownMenu.Item>
                                                </RadixDropdownMenu.Content>
                                            </RadixDropdownMenu.Root>
                                        </Flex>
                                    </RadixTable.Cell>
                                </RadixTable.Row>
                                </RadixContextMenu.Trigger>
                                <RadixContextMenu.Content>
                                    <RadixContextMenu.Item onSelect={() => onDelete(result.id)} color="red">
                                        <TrashIcon className="mr-2 w-4 h-4" /> Delete Result
                                    </RadixContextMenu.Item>
                                </RadixContextMenu.Content>
                                </RadixContextMenu.Root>
                            );
                        }

                        // Competitors column: only show TRACKED competitors (those with an explicit competitor record).
                        // Suggested/untracked brand mentions live in the Detected Brands panel and must not pollute this column.
                        const competitors = (result.mentions || [])
                            .filter(m => m.competitor)
                            .reduce((acc, m) => {
                                const name = m.competitor!.name;
                                if (!acc.some(c => c.name === name)) {
                                    acc.push({
                                        name,
                                        logoUrl: m.competitor?.logoUrl,
                                        isPrimary: m.isPrimaryEntity,
                                        website: m.competitor?.website
                                    });
                                }
                                return acc;
                            }, [] as { name: string, logoUrl?: string | null, isPrimary: boolean, website?: string | null }[]);

                        const sov = calculateSov(result.mentions || []);

                        return (
                            <RadixContextMenu.Root key={result.id}>
                            <RadixContextMenu.Trigger>
                            <RadixTable.Row
                                align="center"
                                className="hover:bg-[var(--gray-2)] transition-colors cursor-pointer group"
                                onClick={() => setSelectedResult(result)}
                            >
                                <RadixTable.Cell><Text size="1" color="gray">{index + 1}</Text></RadixTable.Cell>
                                <RadixTable.Cell>
                                    <Flex align="center" justify="center">
                                        <ModelLogo
                                            provider={result.llmProvider || result.llmModel.split(' ')[0].toLowerCase()}
                                            name={result.llmModel}
                                            size="sm"
                                            className="rounded"
                                        />
                                    </Flex>
                                </RadixTable.Cell>
                                <RadixTable.Cell className="max-w-xs xl:max-w-md">
                                    <Text size="2" color="gray" className="line-clamp-2">
                                        {result.response}
                                    </Text>
                                </RadixTable.Cell>
                                <RadixTable.Cell className="border-l border-[var(--gray-a4)] pl-4">
                                    <MentionMetric 
                                        mentioned={result.mentioned} 
                                        showIndicator={true} 
                                        flex={false}
                                        showLabel={false}
                                    />
                                </RadixTable.Cell>
                                <RadixTable.Cell>
                                    <PositionMetric 
                                        value={result.position} 
                                        showIndicator={true} 
                                        flex={false}
                                        showLabel={false}
                                    />
                                </RadixTable.Cell>
                                <RadixTable.Cell>
                                    <ShareOfVoiceMetric 
                                        value={sov} 
                                        showIndicator={true} 
                                        flex={false}
                                        showLabel={false}
                                    />
                                </RadixTable.Cell>
                                <RadixTable.Cell className="border-l border-[var(--gray-a4)] pl-4">
                                    <Flex gap="1">
                                        {competitors.map((comp, i) => (
                                            <HoverCard.Root key={i}>
                                                <HoverCard.Trigger>
                                                    <CompanyLogo
                                                        domain={comp.website || undefined}
                                                        name={comp.name}
                                                        size={24}
                                                        logoUrl={comp.logoUrl}
                                                        className="cursor-help"
                                                        radius="large"
                                                    />
                                                </HoverCard.Trigger>
                                                <HoverCard.Content side="top" maxWidth="200px">
                                                    <Text size="1">{comp.name}</Text>
                                                </HoverCard.Content>
                                            </HoverCard.Root>
                                        ))}
                                    </Flex>
                                </RadixTable.Cell>
                                <RadixTable.Cell>
                                    <Flex gap="1">
                                        {(result.links ?? []).filter((link, i, arr) => arr.findIndex(l => l.domain === link.domain) === i).slice(0, 4).map((link, i) => (
                                            <HoverCard.Root key={i}>
                                                <HoverCard.Trigger>
                                                    <CompanyLogo
                                                        domain={link.domain}
                                                        name={link.domain}
                                                        size={24}
                                                        logoUrl={`/api/card/logo/${link.domain}`}
                                                        className="cursor-help"
                                                    />
                                                </HoverCard.Trigger>
                                                <HoverCard.Content side="top" maxWidth="200px">
                                                    <Text size="1">{link.domain}</Text>
                                                </HoverCard.Content>
                                            </HoverCard.Root>
                                        ))}
                                    </Flex>
                                </RadixTable.Cell>
                                <RadixTable.Cell>
                                    <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
                                        {new Date(result.createdAt).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                </RadixTable.Cell>
                                <RadixTable.Cell className="text-right">
                                    <Flex align="center" justify="end">
                                        <RadixDropdownMenu.Root>
                                            <RadixDropdownMenu.Trigger>
                                                <IconButton
                                                    variant="ghost"
                                                    color="gray"
                                                    size="1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <DotsHorizontalIcon />
                                                </IconButton>
                                            </RadixDropdownMenu.Trigger>
                                            <RadixDropdownMenu.Content align="end">
                                                <RadixDropdownMenu.Item onSelect={() => setSelectedResult(result)}>
                                                    <EyeOpenIcon className="mr-2 w-4 h-4" /> View Details
                                                </RadixDropdownMenu.Item>
                                                <RadixDropdownMenu.Separator />
                                                <RadixDropdownMenu.Item
                                                    onSelect={() => onDelete(result.id)}
                                                    color="red"
                                                >
                                                    <TrashIcon className="mr-2 w-4 h-4" /> Delete Result
                                                </RadixDropdownMenu.Item>
                                            </RadixDropdownMenu.Content>
                                        </RadixDropdownMenu.Root>
                                    </Flex>
                                </RadixTable.Cell>
                            </RadixTable.Row>
                            </RadixContextMenu.Trigger>
                            <RadixContextMenu.Content>
                                <RadixContextMenu.Item onSelect={() => setSelectedResult(result)}>
                                    <EyeOpenIcon className="mr-2 w-4 h-4" /> View Details
                                </RadixContextMenu.Item>
                                <RadixContextMenu.Separator />
                                <RadixContextMenu.Item onSelect={() => onDelete(result.id)} color="red">
                                    <TrashIcon className="mr-2 w-4 h-4" /> Delete Result
                                </RadixContextMenu.Item>
                            </RadixContextMenu.Content>
                            </RadixContextMenu.Root>
                        );
                    })}
                </RadixTable.Body>
            </RadixTable.Root>

            {selectedResult && (
                <AnalysisDetailModal
                    isOpen={!!selectedResult}
                    onClose={() => setSelectedResult(null)}
                    result={selectedResult}
                    entityName={entityName}
                    entityLogo={entityLogo}
                    entityWebsite={entityWebsite}
                />
            )}
        </>
    );
};

export default AnalysisResultsTable;
