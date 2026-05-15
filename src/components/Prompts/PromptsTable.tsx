"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Prompt } from '@/types/prompts';
import { INTENT_COLORS } from '@/components/Prompts/IntentBadge';
import InlineTypeSelect, { InlineTypeOption } from '@/components/Shared/InlineTypeSelect';
import { Badge } from '@radix-ui/themes';
import RadixTable from '@/components/Shared/RadixTable';
import RadixDropdownMenu from '@/components/Shared/RadixDropdownMenu';
import RadixContextMenu from '@/components/Shared/RadixContextMenu';
import EntityBadge from '@/components/Shared/EntityBadge';
import SourceBadge from '@/components/Shared/SourceBadge';
import { DotsHorizontalIcon, TrashIcon, EyeOpenIcon, PlayIcon, PauseIcon, MixerHorizontalIcon, BookmarkIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { MentionMetric, PositionMetric, ShareOfVoiceMetric } from '@/components/Shared/MetricTriplet';
import Skeleton from '@/components/Shared/Skeleton';
import TagAssignmentModal from './TagAssignmentModal';

interface PromptsTableProps {
    prompts: Prompt[];
    loading: boolean;
    entityId: string;
    onStatusChange: (id: string, status: 'Running' | 'Paused') => void;
    onIntentChange: (id: string, intent: string) => void;
    onTagsChange: (id: string, tags: string[]) => Promise<void>;
    onDelete: (id: string) => void;
    onAdd?: (text: string) => Promise<void>;
    onDiscover?: () => void;
    hideAddRow?: boolean;
    hiddenColumns?: string[];
    timeRange?: 'last' | '7d' | '30d' | '90d';
    variant?: 'card' | 'table';
}



const TopCompetitorCell = ({ prompt }: { prompt: Prompt }) => {
    const topCompetitor = useMemo(() => {
        if (!prompt.analysisResults || prompt.analysisResults.length === 0) return null;
        
        const latestRun = prompt.analysisResults.find(r => 
            (r.status === 'completed' || r.status === null || r.status === undefined) && 
            r.mentions && r.mentions.length > 0
        ) || prompt.analysisResults.find(r => r.mentions && r.mentions.length > 0);

        if (!latestRun || !latestRun.mentions || latestRun.mentions.length === 0) return null;

        const competitors = latestRun.mentions.filter(m => !m.isPrimaryEntity);
        if (competitors.length === 0) return null;

        competitors.sort((a, b) => {
            const posA = a.position ?? 1000;
            const posB = b.position ?? 1000;
            return posA - posB;
        });

        return competitors[0];
    }, [prompt.analysisResults]);

    if (!topCompetitor) {
        return <span className="text-sm text-gray-400">—</span>;
    }

    return (
        <EntityBadge 
            name={topCompetitor.competitor?.name || topCompetitor.detectedName}
            logoUrl={topCompetitor.competitor?.logoUrl}
            className="max-w-[180px]"
        />
    );
};

const TopSourceCell = ({ prompt }: { prompt: Prompt }) => {
    const topDomain = useMemo(() => {
        if (!prompt.analysisResults || prompt.analysisResults.length === 0) return null;

        const domainCount = new Map<string, { domain: string; url: string; count: number }>();

        for (const result of prompt.analysisResults) {
            if (!result.links) continue;
            for (const link of result.links) {
                const domain = link.domain || link.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                if (!domain) continue;
                const existing = domainCount.get(domain);
                if (existing) {
                    existing.count++;
                } else {
                    domainCount.set(domain, { domain, url: link.url, count: 1 });
                }
            }
        }

        if (domainCount.size === 0) return null;
        return [...domainCount.values()].sort((a, b) => b.count - a.count)[0];
    }, [prompt.analysisResults]);

    if (!topDomain) {
        return <span className="text-sm text-gray-400">—</span>;
    }

    const displayDomain = topDomain.domain.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

    return (
        <SourceBadge 
            url={topDomain.url}
            logoUrl={`/api/card/logo/${displayDomain}`}
            className="max-w-[180px]"
        />
    );
};

import InlineAddRow from '@/components/Shared/InlineAddRow';

export default function PromptsTable({
    prompts,
    loading,
    entityId,
    onStatusChange,
    onIntentChange,
    onTagsChange,
    onDelete,
    onAdd,
    onDiscover,
    hideAddRow,
    hiddenColumns = [],
    timeRange = 'last',
    variant = 'card'
}: PromptsTableProps) {
    const [tagAssignmentPrompt, setTagAssignmentPrompt] = useState<Prompt | null>(null);
    const INTENT_OPTIONS = Object.keys(INTENT_COLORS).filter(k => k !== 'default');

    const INTENT_COLOR_MAP: Record<string, string> = {
        'Transactional': 'var(--green-9)',
        'Commercial':    'var(--purple-9)',
        'Navigational':  'var(--orange-9)',
        'Informational': 'var(--blue-9)',
    };

    const INTENT_TYPE_OPTIONS: InlineTypeOption[] = INTENT_OPTIONS.map(name => ({
        id: name,
        name,
        color: INTENT_COLOR_MAP[name] ?? null,
    }));
    
    interface PromptColumn {
        key: string;
        header: string;
        headerClassName?: string;
        headerJustify?: "start" | "center" | "end";
        cell: (prompt: Prompt) => React.ReactNode;
        cellClassName?: string;
        width?: string;
    }
    
    const columns: PromptColumn[] = [
        {
            key: 'index',
            header: '#',
            width: '30px',
            cell: (prompt: Prompt) => (
                <div className="text-[var(--gray-9)]">
                    {prompts.indexOf(prompt) + 1}
                </div>
            )
        },
        {
            key: 'prompt',
            header: 'Prompt',
            headerClassName: 'min-w-[360px]',
            cellClassName: 'min-w-[360px]',
            cell: (prompt: Prompt) => (
                <Link
                    href={`/${entityId}/prompts/${prompt.id}`}
                    className="text-[var(--gray-12)] font-medium line-clamp-2"
                    title={prompt.text}
                >
                    {prompt.text}
                </Link>
            )
        },
        {
            key: 'intent',
            header: 'Intent',
            headerClassName: 'text-left w-[150px] min-w-[150px]',
            cellClassName: 'w-[150px] min-w-[150px]',
            cell: (prompt: Prompt) => (
                <InlineTypeSelect
                    value={prompt.intent}
                    onChange={val => { if (val) onIntentChange(prompt.id, val); }}
                    types={INTENT_TYPE_OPTIONS}
                    nullable={false}
                />
            )
        },
        {
            key: 'tags',
            header: 'Tags',
            headerClassName: 'text-left w-[140px] min-w-[140px]',
            cellClassName: 'w-[140px] min-w-[140px]',
            cell: (prompt: Prompt) => (
                <div className="flex flex-wrap gap-1">
                    {prompt.tags && prompt.tags.length > 0 ? (
                        prompt.tags.map(tag => (
                            <Badge 
                                key={tag.id} 
                                variant="soft"
                                color="gray"
                                radius="full"
                            >
                                {tag.name}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-sm text-gray-400">—</span>
                    )}
                </div>
            )
        },
        {
            key: 'language',
            header: 'Region',
            headerClassName: 'text-left w-[140px] min-w-[140px]',
            cellClassName: 'w-[140px] min-w-[140px]',
            cell: (prompt: Prompt) => (
                prompt.language ? (
                    <Badge variant="soft" color="gray" radius="full">
                        {prompt.language}
                    </Badge>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                )
            )
        },
        {
            key: 'mention',
            header: 'Mention Rate',
            headerClassName: 'text-left border-l border-[var(--gray-5)] pl-6 w-[120px] min-w-[120px]',
            headerJustify: 'start',
            cellClassName: 'border-l border-[var(--gray-5)] pl-6 w-[120px] min-w-[120px]',
            cell: (prompt: Prompt) => {
                const isLast = timeRange === 'last';
                const suffix = isLast ? '' : timeRange;
                const mentionRateKey = (isLast ? 'lastMentionRate' : `mentionRate${suffix}`) as keyof Prompt;
                const mentionRate = prompt[mentionRateKey] as number | null | undefined;
                const isAnalysing = prompt.analysisResults?.some(r => r.status === 'running' || r.status === 'pending');

                return (
                    <div className="flex justify-start">
                        <MentionMetric 
                            value={mentionRate} 
                            isAnalyzing={isAnalysing} 
                            showIndicator={true} 
                            flex={false}
                            label="Mention"
                            showLabel={false}
                        />
                    </div>
                );
            }
        },
        {
            key: 'position',
            header: 'Position',
            headerClassName: 'text-left w-[120px] min-w-[120px]',
            headerJustify: 'start',
            cellClassName: 'w-[120px] min-w-[120px]',
            cell: (prompt: Prompt) => {
                const isLast = timeRange === 'last';
                const suffix = isLast ? '' : timeRange;
                const avgPositionKey = (isLast ? 'lastAvgPosition' : `avgPosition${suffix}`) as keyof Prompt;
                const avgPosition = prompt[avgPositionKey] as number | null | undefined;
                const isAnalysing = prompt.analysisResults?.some(r => r.status === 'running' || r.status === 'pending');

                return (
                    <div className="flex justify-start">
                        <PositionMetric 
                            value={avgPosition} 
                            isAnalyzing={isAnalysing} 
                            showIndicator={true} 
                            flex={false}
                            label="Position"
                            showLabel={false}
                        />
                    </div>
                );
            }
        },
        {
            key: 'sov',
            header: 'Share of Voice',
            headerClassName: 'text-left w-[120px] min-w-[120px]',
            headerJustify: 'start',
            cellClassName: 'w-[120px] min-w-[120px]',
            cell: (prompt: Prompt) => {
                const isLast = timeRange === 'last';
                const suffix = isLast ? '' : timeRange;
                const shareOfVoiceKey = (isLast ? 'lastShareOfVoice' : `shareOfVoice${suffix}`) as keyof Prompt;
                const shareOfVoice = prompt[shareOfVoiceKey] as number | null | undefined;
                const isAnalysing = prompt.analysisResults?.some(r => r.status === 'running' || r.status === 'pending');

                return (
                    <div className="flex justify-start">
                        <ShareOfVoiceMetric 
                            value={shareOfVoice} 
                            isAnalyzing={isAnalysing} 
                            showIndicator={true} 
                            flex={false}
                            label="SoV"
                            showLabel={false}
                        />
                    </div>
                );
            }
        },
        {
            key: 'top_competitor',
            header: 'Top Competitor',
            headerClassName: 'border-l border-[var(--gray-5)] pl-6 min-w-[180px] max-w-[240px]',
            cellClassName: 'border-l border-[var(--gray-5)] pl-6 min-w-[180px] max-w-[240px]',
            cell: (prompt: Prompt) => <TopCompetitorCell prompt={prompt} />
        },
        {
            key: 'top_source',
            header: 'Top Source',
            headerClassName: 'min-w-[180px] max-w-[240px]',
            cellClassName: 'min-w-[180px] max-w-[240px]',
            cell: (prompt: Prompt) => <TopSourceCell prompt={prompt} />
        },
        {
            key: 'actions',
            header: '',
            cell: (prompt: Prompt) => {
                return (
                    <div className="flex items-center justify-end gap-2">
                        <RadixDropdownMenu.Root>
                            <RadixDropdownMenu.Trigger>
                                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors outline-none focus:outline-none">
                                    <DotsHorizontalIcon className="w-4 h-4" />
                                </button>
                            </RadixDropdownMenu.Trigger>
                            <RadixDropdownMenu.Content align="end">
                                <RadixDropdownMenu.Item onSelect={() => window.location.href = `/${entityId}/prompts/${prompt.id}`}>
                                    <EyeOpenIcon className="mr-2 w-4 h-4 text-gray-400" /> View Details
                                </RadixDropdownMenu.Item>
                                <RadixDropdownMenu.Item onSelect={() => onStatusChange(prompt.id, prompt.status === 'Paused' ? 'Running' : 'Paused')}>
                                    {prompt.status === 'Paused'
                                        ? <><PlayIcon className="mr-2 w-4 h-4 text-gray-400" /> Activate</>
                                        : <><PauseIcon className="mr-2 w-4 h-4 text-gray-400" /> Deactivate</>
                                    }
                                </RadixDropdownMenu.Item>
                                <RadixDropdownMenu.Separator />
                                <RadixDropdownMenu.Sub>
                                    <RadixDropdownMenu.SubTrigger><MixerHorizontalIcon className="mr-2 w-4 h-4 text-gray-400" />Assign Intent</RadixDropdownMenu.SubTrigger>
                                    <RadixDropdownMenu.SubContent>
                                        {INTENT_OPTIONS.map(intent => (
                                            <RadixDropdownMenu.Item
                                                key={intent}
                                                onSelect={() => onIntentChange(prompt.id, intent)}
                                                className={prompt.intent === intent ? 'font-semibold' : ''}
                                            >
                                                {intent}
                                            </RadixDropdownMenu.Item>
                                        ))}
                                    </RadixDropdownMenu.SubContent>
                                </RadixDropdownMenu.Sub>
                                <RadixDropdownMenu.Item onSelect={() => setTagAssignmentPrompt(prompt)}>
                                    <BookmarkIcon className="mr-2 w-4 h-4 text-gray-400" /> Assign Tags
                                </RadixDropdownMenu.Item>
                                <RadixDropdownMenu.Separator />
                                <RadixDropdownMenu.Item 
                                    onSelect={() => onDelete(prompt.id)}
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                >
                                    <TrashIcon className="mr-2 w-4 h-4" /> Delete Prompt
                                </RadixDropdownMenu.Item>
                            </RadixDropdownMenu.Content>
                        </RadixDropdownMenu.Root>
                    </div>
                );
            }
        }
    ];

    const visibleColumns = hiddenColumns.length > 0
        ? columns.filter(col => !hiddenColumns.includes(col.key))
        : columns;

    if (loading) {
        // Render the real table shell (headers, column widths, borders) so when
        // data lands there's no layout jump. Body cells are skeleton shimmer
        // sized loosely to the column's expected content weight.
        const skeletonWidthFor = (key: string): string => {
            switch (key) {
                case 'index': return 'w-4';
                case 'prompt': return 'w-3/4';
                case 'intent': return 'w-20';
                case 'tags': return 'w-16';
                case 'language': return 'w-14';
                case 'mention':
                case 'position':
                case 'sov': return 'w-10';
                case 'top_competitor':
                case 'top_source': return 'w-28';
                case 'actions': return 'w-4';
                default: return 'w-16';
            }
        };
        return (
            <RadixTable.Root variant={variant === 'table' ? 'ghost' : 'surface'}>
                <RadixTable.Header>
                    <RadixTable.Row>
                        {visibleColumns.map(col => (
                            <RadixTable.Head
                                key={col.key}
                                className={col.headerClassName}
                                justify={col.headerJustify}
                                width={col.width}
                            >
                                {col.header}
                            </RadixTable.Head>
                        ))}
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                        <RadixTable.Row key={`skeleton-row-${rowIndex}`}>
                            {visibleColumns.map(col => (
                                <RadixTable.Cell
                                    key={`skeleton-${rowIndex}-${col.key}`}
                                    className={col.cellClassName}
                                    width={col.width}
                                >
                                    <Skeleton className={`h-4 ${skeletonWidthFor(col.key)}`} />
                                </RadixTable.Cell>
                            ))}
                        </RadixTable.Row>
                    ))}
                </RadixTable.Body>
            </RadixTable.Root>
        );
    }

    return (
        <>
            <RadixTable.Root variant={variant === 'table' ? 'ghost' : 'surface'}>
                <RadixTable.Header>
                    <RadixTable.Row>
                        {visibleColumns.map(col => (
                            <RadixTable.Head
                                key={col.key}
                                className={col.headerClassName}
                                justify={col.headerJustify}
                                width={col.width}
                            >
                                {col.header}
                            </RadixTable.Head>
                        ))}
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {prompts.length === 0 && (!onAdd || hideAddRow) && (
                        <RadixTable.Row>
                            <RadixTable.Cell colSpan={visibleColumns.length} className="">
                                <div className="text-center py-8">
                                    <p className="text-gray-500">
                                        {hideAddRow ? "No inactive prompts found." : "No prompts yet. Add one to get started."}
                                    </p>
                                </div>
                            </RadixTable.Cell>
                        </RadixTable.Row>
                    )}
                    {prompts.map((prompt, index) => (
                        <RadixContextMenu.Root key={prompt.id}>
                            <RadixContextMenu.Trigger>
                                <RadixTable.Row>
                                    {visibleColumns.map(col => (
                                        <RadixTable.Cell key={`${prompt.id}-${col.key}`} className={col.cellClassName} width={col.width}>
                                            {col.key === 'index' ? (
                                                <div className="text-[var(--gray-9)]">
                                                    {index + 1}
                                                </div>
                                            ) : col.cell(prompt)}
                                        </RadixTable.Cell>
                                    ))}
                                </RadixTable.Row>
                            </RadixContextMenu.Trigger>
                            <RadixContextMenu.Content>
                                <RadixContextMenu.Item onSelect={() => window.location.href = `/${entityId}/prompts/${prompt.id}`}>
                                    <EyeOpenIcon className="mr-2 w-4 h-4 text-gray-400" /> View Details
                                </RadixContextMenu.Item>
                                <RadixContextMenu.Item onSelect={() => onStatusChange(prompt.id, prompt.status === 'Paused' ? 'Running' : 'Paused')}>
                                    {prompt.status === 'Paused'
                                        ? <><PlayIcon className="mr-2 w-4 h-4 text-gray-400" /> Activate</>
                                        : <><PauseIcon className="mr-2 w-4 h-4 text-gray-400" /> Deactivate</>
                                    }
                                </RadixContextMenu.Item>
                                <RadixContextMenu.Separator />
                                <RadixContextMenu.Sub>
                                    <RadixContextMenu.SubTrigger><MixerHorizontalIcon className="mr-2 w-4 h-4 text-gray-400" />Assign Intent</RadixContextMenu.SubTrigger>
                                    <RadixContextMenu.SubContent>
                                        {INTENT_OPTIONS.map(intent => (
                                            <RadixContextMenu.Item
                                                key={intent}
                                                onSelect={() => onIntentChange(prompt.id, intent)}
                                                className={prompt.intent === intent ? 'font-semibold' : ''}
                                            >
                                                {intent}
                                            </RadixContextMenu.Item>
                                        ))}
                                    </RadixContextMenu.SubContent>
                                </RadixContextMenu.Sub>
                                <RadixContextMenu.Item onSelect={() => setTagAssignmentPrompt(prompt)}>
                                    <BookmarkIcon className="mr-2 w-4 h-4 text-gray-400" /> Assign Tags
                                </RadixContextMenu.Item>
                                <RadixContextMenu.Separator />
                                <RadixContextMenu.Item
                                    onSelect={() => onDelete(prompt.id)}
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                >
                                    <TrashIcon className="mr-2 w-4 h-4" /> Delete Prompt
                                </RadixContextMenu.Item>
                            </RadixContextMenu.Content>
                        </RadixContextMenu.Root>
                    ))}
                    {onAdd && !hideAddRow && (
                        <InlineAddRow 
                            key="inline-add-row"
                            onAdd={onAdd} 
                            colCount={visibleColumns.length}
                            label="Add a prompt"
                            placeholder="Type a prompt and press Enter…"
                            autoWidth={true}
                        />
                    )}
                    {onDiscover && (
                        <RadixTable.Row
                            className="group cursor-pointer hover:bg-[var(--gray-2)] transition-colors"
                            onClick={onDiscover}
                        >
                            <RadixTable.Cell 
                                width="30px" 
                                className="px-4 py-4"
                                style={{ verticalAlign: 'middle' }}
                            >
                                <div className="flex justify-center">
                                    <MagnifyingGlassIcon 
                                        className="w-3.5 h-3.5 text-[var(--gray-9)] group-hover:text-[var(--gray-11)] transition-colors" 
                                    />
                                </div>
                            </RadixTable.Cell>
                            
                            <RadixTable.Cell colSpan={visibleColumns.length - 1} className="px-4 py-4">
                                <span className="text-sm text-[var(--gray-9)] group-hover:text-[var(--gray-11)] transition-colors">
                                    Discover more prompts
                                </span>
                            </RadixTable.Cell>
                        </RadixTable.Row>
                    )}
                </RadixTable.Body>
            </RadixTable.Root>

            <TagAssignmentModal
                isOpen={!!tagAssignmentPrompt}
                onClose={() => setTagAssignmentPrompt(null)}
                entityId={entityId}
                promptId={tagAssignmentPrompt?.id || ''}
                promptText={tagAssignmentPrompt?.text || ''}
                initialTags={tagAssignmentPrompt?.tags || []}
                onSave={onTagsChange}
            />
        </>
    );
}
