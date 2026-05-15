"use client";

import React, { useState, useEffect } from 'react';
import RadixSegmentedControl from '@/components/Shared/RadixSegmentedControl';
import RadixMultiSelect from '@/components/Shared/RadixMultiSelect';
import RadixSelect from '@/components/Shared/RadixSelect';
import Button from '@/components/Shared/Button';
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Flex, Text, Separator, Switch } from "@radix-ui/themes";
import CompanyLogo from '@/components/CompanyLogo';

export type PromptFilterType = 'tracked' | 'paused' | 'suggested';
export type TimeRangeType = 'last' | '7d' | '30d' | '90d';

interface ModelResponse {
    id: string;
    name: string;
    isEnabled: boolean;
    hasApiKey: boolean;
}

interface FilterBarProps {
    promptFilter?: PromptFilterType;
    setPromptFilter?: (filter: PromptFilterType) => void;
    counts?: {
        active: number;
        paused: number;
        suggested: number;
    };
    timeRange: TimeRangeType;
    setTimeRange: (range: TimeRangeType) => void;
    timeRangeOptions?: { value: TimeRangeType; label: string }[];
    onAddClick?: () => void;
    entityId: string;
    tagFilter: string[];
    setTagFilter: (tags: string[]) => void;
    intentFilter: string[];
    setIntentFilter: (intents: string[]) => void;
    modelFilter?: string[];
    setModelFilter?: (models: string[]) => void;
    viewAsId?: string;
    setViewAsId?: (id: string) => void;
    availableEntities?: { id: string; name: string; isPrimary?: boolean; logoUrl?: string; website?: string; color?: string }[];
    viewType?: 'domains' | 'urls';
    setViewType?: (type: 'domains' | 'urls') => void;
    hideTags?: boolean;
    hideIntents?: boolean;
    refreshKey?: string | number;
    includePaused?: boolean;
    onIncludePausedChange?: (include: boolean) => void;
}

export default function FilterBar({
    promptFilter,
    setPromptFilter,
    counts,
    timeRange,
    setTimeRange,
    timeRangeOptions = [
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '30 Days' },
        { value: '90d', label: '90 Days' },
    ],
    onAddClick,
    entityId,
    tagFilter,
    setTagFilter,
    intentFilter,
    setIntentFilter,
    modelFilter,
    setModelFilter,
    viewAsId,
    setViewAsId,
    availableEntities,
    viewType,
    setViewType,
    hideTags,
    hideIntents,
    refreshKey,
    includePaused,
    onIncludePausedChange
}: FilterBarProps) {
    const [availableTags, setAvailableTags] = useState<{ id: string, name: string, color?: string }[]>([]);
    const [availableIntents, setAvailableIntents] = useState<{ id: string, name: string }[]>([]);
    const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (entityId) {
            fetch(`/api/entities/${entityId}/tags`)
                .then(res => res.json())
                .then(setAvailableTags)
                .catch(console.error);

            fetch(`/api/entities/${entityId}/intents`)
                .then(res => res.json())
                .then(setAvailableIntents)
                .catch(console.error);
            
            if (setModelFilter) {
                fetch(`/api/entities/${entityId}/models`)
                    .then(res => res.json())
                    .then(models => {
                        setAvailableModels(models.filter((m: ModelResponse) => m.isEnabled && m.hasApiKey));
                    })
                    .catch(console.error);
            }
        }
    }, [entityId, setModelFilter, refreshKey]);

    return (
        <Flex align="center" justify="between" width="100%" gap="4">
            <Flex align="center" gap="4">
                {/* Left: Domains/URLs Switcher */}
                {viewType && setViewType && (
                    <Flex align="center" gap="4">
                        <RadixSegmentedControl
                            value={viewType}
                            onValueChange={(value) => setViewType(value as 'domains' | 'urls')}
                            items={[
                                { value: 'domains', label: 'Domains' },
                                { value: 'urls', label: 'URLs' }
                            ]}
                        />
                        <Separator orientation="vertical" size="2" />
                    </Flex>
                )}

                {/* Source / View Context */}
                {availableEntities && availableEntities.length > 0 && viewAsId && setViewAsId && (
                    <Flex align="center" gap="4">
                        <Flex align="center" gap="2">
                            <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider pl-1 shrink-0">View as</Text>
                            <RadixSelect.Root value={viewAsId} onValueChange={setViewAsId}>
                                <RadixSelect.Trigger 
                                    variant="surface"
                                    className="h-[32px] min-w-[140px]"
                                >
                                    {(() => {
                                        const selectedEntity = availableEntities.find(e => e.id === viewAsId);
                                        if (!selectedEntity) return <Text size="1">Select Entity</Text>;
                                        return (
                                            <Flex align="center" gap="2">
                                                <CompanyLogo
                                                    name={selectedEntity.name}
                                                    logoUrl={selectedEntity.logoUrl}
                                                    domain={selectedEntity.website}
                                                    size={18}
                                                    radius="full"
                                                    className="shrink-0"
                                                />
                                                <Text size="1" weight="medium" className="truncate text-left flex-1">{selectedEntity.name}</Text>
                                            </Flex>
                                        );
                                    })()}
                                </RadixSelect.Trigger>
                                <RadixSelect.Content>
                                    <RadixSelect.Group>
                                        {availableEntities.map(entity => (
                                            <RadixSelect.Item key={entity.id} value={entity.id} className="cursor-pointer">
                                                <Flex align="center" gap="3" width="100%">
                                                    <CompanyLogo
                                                        name={entity.name}
                                                        logoUrl={entity.logoUrl}
                                                        domain={entity.website}
                                                        size={18}
                                                        radius="full"
                                                        className="shrink-0"
                                                    />
                                                    <Text className="truncate">{entity.name}</Text>
                                                </Flex>
                                            </RadixSelect.Item>
                                        ))}
                                    </RadixSelect.Group>
                                </RadixSelect.Content>
                            </RadixSelect.Root>
                        </Flex>
                        <Separator orientation="vertical" size="2" />
                    </Flex>
                )}

                {/* Primary Filters */}
                <Flex align="center" gap="4">
                    {promptFilter && setPromptFilter && counts && (
                        <Flex align="center" gap="4">
                            <RadixSegmentedControl
                                value={promptFilter}
                                onValueChange={(val) => setPromptFilter(val as PromptFilterType)}
                                items={[
                                    { value: 'tracked', label: `${counts.active} Active` },
                                    { value: 'paused', label: `${counts.paused} Inactive` },
                                    { value: 'suggested', label: `${counts.suggested} Suggested` }
                                ]}
                            />
                            <Separator orientation="vertical" size="2" />
                        </Flex>
                    )}
                    
                    {promptFilter !== 'suggested' && (
                        <Flex align="center" gap="4">
                            {!hideTags && (
                                <RadixMultiSelect
                                    value={tagFilter}
                                    onValueChange={setTagFilter}
                                    options={availableTags.map(tag => ({ value: tag.name, label: tag.name }))}
                                    placeholder="All Tags"
                                    icon={
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    }
                                    className="min-w-[140px]"
                                />
                            )}
                            {!hideIntents && (
                                <RadixMultiSelect
                                    value={intentFilter}
                                    onValueChange={setIntentFilter}
                                    options={availableIntents.map(intent => ({ value: intent.name, label: intent.name }))}
                                    placeholder="All Intents"
                                    icon={<MagnifyingGlassIcon className="w-3.5 h-3.5" />}
                                    className="min-w-[140px]"
                                />
                            )}
                            {modelFilter && setModelFilter && (
                                <RadixMultiSelect
                                    value={modelFilter}
                                    onValueChange={setModelFilter}
                                    options={availableModels.map(model => ({ value: model.id, label: model.name }))}
                                    placeholder="All Models"
                                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>}
                                    className="min-w-[140px]"
                                />
                            )}
                            {includePaused !== undefined && onIncludePausedChange && (
                                <Flex align="center" gap="3" ml="1">
                                    {/* <Text size="2" color="gray">|</Text> */}
                                    <Flex align="center" gap="2">
                                        <Switch size="1" checked={includePaused} onCheckedChange={onIncludePausedChange} />
                                        <Text size="2" color="gray">Include inactive prompts</Text>
                                    </Flex>
                                </Flex>
                            )}
                        </Flex>
                    )}
                </Flex>
            </Flex>

            {/* Right: Secondary Actions (Pinned to end) */}
            <Flex align="center" gap="4">
                {promptFilter !== 'suggested' && (
                    <RadixSegmentedControl
                        value={timeRange}
                        onValueChange={(val) => setTimeRange(val as TimeRangeType)}
                        items={timeRangeOptions}
                    />
                )}
                {onAddClick && (
                    <Button onClick={onAddClick} size="sm">
                        Add Prompt
                    </Button>
                )}
            </Flex>
        </Flex>
    );
}
