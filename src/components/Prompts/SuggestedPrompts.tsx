"use client";

import React from 'react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { SuggestedPrompt } from '@/types/prompts';
import Button from '@/components/Shared/Button';
import RadixTable from '@/components/Shared/RadixTable';
import TableSkeleton from '@/components/Shared/TableSkeleton';

interface SuggestedPromptsProps {
    suggestions: SuggestedPrompt[];
    onAccept: (suggestion: SuggestedPrompt) => void;
    onReject: (id: string) => void;
    onDiscover: () => void;
    loading?: boolean;
}

const COLUMN_COUNT = 3; // #, Prompt, Actions

export default function SuggestedPrompts({
    suggestions,
    onAccept,
    onReject,
    onDiscover,
    loading = false,
}: SuggestedPromptsProps) {
    if (loading) {
        return <TableSkeleton columnCount={COLUMN_COUNT} rowCount={6} variant="ghost" />;
    }

    return (
        <RadixTable.Root variant="ghost">
            <RadixTable.Header>
                <RadixTable.Row>
                    <RadixTable.Head width="30px">#</RadixTable.Head>
                    <RadixTable.Head>Prompt</RadixTable.Head>
                    <RadixTable.Head className="w-[1px] whitespace-nowrap" />
                </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
                {suggestions.length === 0 && (
                    <RadixTable.Row>
                        <RadixTable.Cell colSpan={COLUMN_COUNT}>
                            <div className="py-6 text-center text-[var(--gray-9)] text-sm">
                                No suggestions yet.{' '}
                                <button
                                    onClick={onDiscover}
                                    className="text-[var(--accent-11)] hover:underline font-medium"
                                >
                                    Run discovery
                                </button>{' '}
                                to generate ideas.
                            </div>
                        </RadixTable.Cell>
                    </RadixTable.Row>
                )}

                {suggestions.map((suggestion, index) => (
                        <RadixTable.Row key={suggestion.id}>
                            {/* Index */}
                            <RadixTable.Cell className="text-[var(--gray-9)] tabular-nums align-middle">
                                {index + 1}
                            </RadixTable.Cell>

                            {/* Prompt */}
                            <RadixTable.Cell className="align-middle">
                                <span className="text-sm font-medium text-[var(--gray-12)] leading-snug max-w-[600px] block">
                                    {suggestion.text}
                                </span>
                            </RadixTable.Cell>

                            {/* Actions */}
                            <RadixTable.Cell className="align-middle">
                                <div className="flex items-center gap-2 justify-end">
                                    <Button
                                        variant="tertiary"
                                        size="sm"
                                        onClick={() => onReject(suggestion.id)}
                                    >
                                        Dismiss
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onAccept(suggestion)}
                                    >
                                        Track Prompt
                                    </Button>
                                </div>
                            </RadixTable.Cell>
                        </RadixTable.Row>
                ))}

                {/* Discover prompts row */}
                <RadixTable.Row
                    className="group cursor-pointer"
                    onClick={onDiscover}
                >
                    <RadixTable.Cell colSpan={COLUMN_COUNT}>
                        <div className="flex items-center gap-2 text-[var(--gray-9)] group-hover:text-[var(--gray-11)] transition-colors">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-sm">Discover more prompts</span>
                        </div>
                    </RadixTable.Cell>
                </RadixTable.Row>
            </RadixTable.Body>
        </RadixTable.Root>
    );
}
