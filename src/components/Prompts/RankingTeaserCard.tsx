"use client";

import React from 'react';
import Link from 'next/link';
import { Text, Badge, Flex, Box } from "@radix-ui/themes";
import { BarChartIcon, EyeOpenIcon, ArchiveIcon, TrashIcon, ResetIcon } from "@radix-ui/react-icons";
import BaseCard from "@/components/Shared/BaseCard";
import CompanyLogo from "@/components/CompanyLogo";
import RadixContextMenu from "@/components/Shared/RadixContextMenu";

import { RankingReport } from '@/types/ranking';

interface RankingTeaserCardProps {
    report: RankingReport;
    entityId: string;
    variant?: 'active' | 'inactive';
    onArchive?: () => void;
    onActivate?: () => void;
    onDelete?: () => void;
}

export default function RankingTeaserCard({ report, entityId, variant = 'active', onArchive, onActivate, onDelete }: RankingTeaserCardProps) {
    const {
        id,
        primaryBuyerRole,
        industry,
        prompt,
        entity,
        competitors,
    } = report;

    const isInactive = variant === 'inactive';

    // Derive status from latest result
    const latestResult = prompt?.analysisResults?.[0];
    const isRunning = latestResult?.status === 'running' || latestResult?.status === 'pending';
    const isFailed = latestResult?.status === 'failed';
    const hasResults = !!latestResult && !isRunning && !isFailed;

    // Calculate latest average position
    let avgPosition: string | null = null;

    if (hasResults && latestResult.mentions) {
        const entityMentions = latestResult.mentions.filter((m) =>
            m.isPrimaryEntity || m.detectedName === entity?.name
        );
        if (entityMentions.length > 0) {
            const positions = entityMentions
                .map((m) => m.position)
                .filter((p): p is number => p !== null && p !== undefined);
            if (positions.length > 0) {
                const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
                avgPosition = avg.toFixed(1);
            }
        }
    }

    const totalCompetitors = competitors?.length || 0;
    const displayTitle = report.name || `${primaryBuyerRole || 'Analysis'} in ${industry || 'Market'}`;

    const cardContent = (
        <BaseCard variant={variant} onClick={() => {}} className="hover:border-[var(--accent-6)]">
            <BaseCard.Header
                title={displayTitle}
                inactive={isInactive}
                logo={
                    entity ? (
                        <CompanyLogo
                            name={entity.name}
                            domain={entity.website || undefined}
                            logoUrl={entity.logoUrl}
                            size={40}
                            radius="medium"
                        />
                    ) : (
                        <Flex
                            align="center"
                            justify="center"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-3)',
                                background: 'var(--accent-a3)',
                                color: 'var(--accent-9)',
                            }}
                        >
                            <BarChartIcon width="20" height="20" />
                        </Flex>
                    )
                }
                subtitle={
                    <Flex align="center" gap="2" mt="1">
                        {isRunning && (
                            <Badge size="1" color="blue" variant="soft" className="animate-pulse">
                                Analyzing...
                            </Badge>
                        )}
                        {isFailed && (
                            <Badge size="1" color="red" variant="soft">
                                Failed
                            </Badge>
                        )}
                        {!isRunning && !isFailed && (
                            <Text size="1" color="gray">
                                {totalCompetitors} competitor{totalCompetitors !== 1 ? 's' : ''}
                            </Text>
                        )}
                    </Flex>
                }
            />

            <BaseCard.Body>
                <Flex align="baseline" gap="2" mt="auto">
                    <Text size="6" weight="bold" highContrast>
                        {avgPosition ?? '—'}
                    </Text>
                    <Text size="2" color="gray">
                        avg. rank
                    </Text>
                </Flex>
            </BaseCard.Body>

            {isInactive && (
                <Box pt="3" mt="3" style={{ borderTop: '1px solid var(--gray-a4)' }}>
                    <Flex gap="3">
                        <Text
                            size="2"
                            color="gray"
                            className="cursor-pointer hover:underline"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(); }}
                        >
                            Delete
                        </Text>
                        <Text
                            size="2"
                            highContrast
                            weight="medium"
                            className="cursor-pointer hover:underline"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onActivate?.(); }}
                        >
                            Activate
                        </Text>
                    </Flex>
                </Box>
            )}
        </BaseCard>
    );

    return (
        <RadixContextMenu.Root>
            <RadixContextMenu.Trigger>
                <Link href={`/${entityId}/ranking/${id}`}>
                    {cardContent}
                </Link>
            </RadixContextMenu.Trigger>
            <RadixContextMenu.Content>
                <RadixContextMenu.Item onSelect={() => { window.location.href = `/${entityId}/ranking/${id}`; }}>
                    <EyeOpenIcon className="mr-2 w-4 h-4 text-gray-400" /> View Details
                </RadixContextMenu.Item>
                <RadixContextMenu.Separator />
                {onArchive && (
                    <RadixContextMenu.Item onSelect={onArchive}>
                        <ArchiveIcon className="mr-2 w-4 h-4 text-gray-400" /> Archive Ranking
                    </RadixContextMenu.Item>
                )}
                {onActivate && (
                    <RadixContextMenu.Item onSelect={onActivate}>
                        <ResetIcon className="mr-2 w-4 h-4 text-gray-400" /> Activate Ranking
                    </RadixContextMenu.Item>
                )}
                {onDelete && (
                    <>
                        <RadixContextMenu.Separator />
                        <RadixContextMenu.Item
                            onSelect={onDelete}
                            color="red"
                        >
                            <TrashIcon className="mr-2 w-4 h-4" /> Delete Ranking
                        </RadixContextMenu.Item>
                    </>
                )}
            </RadixContextMenu.Content>
        </RadixContextMenu.Root>
    );
}
