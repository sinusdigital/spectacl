"use client";

import { Flex, Text, Table } from "@radix-ui/themes";
import { MentionMetric, PositionMetric, ShareOfVoiceMetric, MetricTrend } from "./Shared/MetricTriplet";
import CompanyLogo from "./CompanyLogo";

interface Competitor {
    id: string;
    name: string;
    website?: string | null;
    logoUrl?: string | null;
    visibility: number;
    visibilityChange: number | null;
    shareOfVoice: number;
    shareOfVoiceChange: number | null;
    position: number | null;
    positionChange: number | null;
    linkPercentage?: number;
    icon: string;
}

interface CompetitorTableProps {
    competitors: Competitor[];
    onHover?: (name: string | null) => void;
    hoveredCompetitor?: string | null;
}

export default function CompetitorTable({ competitors, onHover, hoveredCompetitor }: CompetitorTableProps) {
    return (
        <Table.Root variant="ghost" size="2">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell width="30px">#</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Competitors</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Mention</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Position</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Share of Voice</Table.ColumnHeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {competitors.map((competitor, index) => (
                    <Table.Row
                        key={competitor.id}
                        className={`transition-colors cursor-pointer ${hoveredCompetitor === competitor.name ? 'bg-[var(--gray-a3)]' : 'hover:bg-[var(--gray-a2)]'}`}
                        onMouseEnter={() => onHover?.(competitor.name)}
                        onMouseLeave={() => onHover?.(null)}
                    >
                        <Table.Cell>
                            <Text size="1" color="gray">{index + 1}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Flex align="center" gap="3" style={{ minWidth: 0 }}>
                                <CompanyLogo
                                    domain={competitor.website}
                                    name={competitor.name}
                                    logoUrl={competitor.logoUrl}
                                    size={24}
                                />
                                <Text size="2" weight="medium" truncate style={{ maxWidth: 180 }} title={competitor.name}>{competitor.name}</Text>
                            </Flex>
                        </Table.Cell>
                        <Table.Cell>
                            <MentionMetric
                                value={competitor.visibility}
                                trend={<MetricTrend value={competitor.visibilityChange} />}
                                showLabel={false}
                                showDecimals={false}
                                flex={false}
                            />
                        </Table.Cell>
                        <Table.Cell>
                            <PositionMetric
                                value={competitor.position}
                                trend={<MetricTrend value={competitor.positionChange} isInverse />}
                                showLabel={false}
                                flex={false}
                            />
                        </Table.Cell>
                        <Table.Cell>
                            <ShareOfVoiceMetric
                                value={competitor.shareOfVoice}
                                totalCompetitors={competitors.length}
                                trend={<MetricTrend value={competitor.shareOfVoiceChange} />}
                                showLabel={false}
                                showDecimals={false}
                                flex={false}
                            />
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
}
