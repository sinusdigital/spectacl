"use client";

import { CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Box, Flex, Grid, Text, Badge, Separator } from "@radix-ui/themes";
import BaseCard from "@/components/Shared/BaseCard";
import CompanyLogo from "@/components/CompanyLogo";
import Header from "@/components/Shared/Header";
import { StructuredRankingResponse } from "@/types/ranking";

interface MarketInsightsProps {
    structuredData: StructuredRankingResponse;
    competitors?: { id: string; name: string; website?: string | null; logoUrl?: string | null }[] | null;
    mainEntity?: { id: string; name: string; website?: string | null; logoUrl?: string | null } | null;
    hideHeader?: boolean;
}

export default function MarketInsights({ structuredData, competitors, mainEntity, hideHeader }: MarketInsightsProps) {
    if (!structuredData?.market_ranking?.entities?.length) return null;

    const allEntities = [
        ...(mainEntity ? [mainEntity] : []),
        ...(competitors || [])
    ];

    return (
        <Flex direction="column" gap="4">
            {!hideHeader && (
                <Header.Root mb="0">
                    <Header.Title size="4" weight="bold">Market Insights</Header.Title>
                </Header.Root>
            )}

            <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="4">
                {structuredData.market_ranking.entities.map((rankedEntity, idx) => {
                    const match = allEntities.find(c =>
                        c.name.toLowerCase().includes(rankedEntity.name.toLowerCase()) ||
                        rankedEntity.name.toLowerCase().includes(c.name.toLowerCase())
                    );
                    const isMainEntity = mainEntity && (
                        mainEntity.name.toLowerCase().includes(rankedEntity.name.toLowerCase()) ||
                        rankedEntity.name.toLowerCase().includes(mainEntity.name.toLowerCase())
                    );

                    return (
                        <BaseCard key={idx} variant={isMainEntity ? "active" : "active"}>
                            <BaseCard.Header
                                title={rankedEntity.name}
                                subtitle={
                                    <Flex align="center" gap="2" mt="1">
                                        {rankedEntity.market_share && (
                                            <Text size="1" color="gray">
                                                Est. Share: {rankedEntity.market_share}
                                            </Text>
                                        )}
                                    </Flex>
                                }
                                logo={
                                    <CompanyLogo
                                        name={rankedEntity.name}
                                        domain={match?.website}
                                        logoUrl={match?.logoUrl}
                                        size={40}
                                    />
                                }
                                headerExtra={
                                    <Badge
                                        size="1"
                                        color={rankedEntity.rank === 1 ? "green" : rankedEntity.rank === 2 ? "blue" : "gray"}
                                        variant="surface"
                                    >
                                        #{rankedEntity.rank}
                                    </Badge>
                                }
                            />

                            <BaseCard.Body className="gap-3">
                                {/* Market Position */}
                                {rankedEntity.market_position && (
                                    <Box>
                                        <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider" mb="1" as="div">
                                            Position
                                        </Text>
                                        <Text size="1" color="gray" as="div" className="leading-relaxed line-clamp-3">
                                            {rankedEntity.market_position}
                                        </Text>
                                    </Box>
                                )}

                                {/* Strengths */}
                                {rankedEntity.strengths && rankedEntity.strengths.length > 0 && (
                                    <Box>
                                        <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider" mb="1" as="div">
                                            Strengths
                                        </Text>
                                        <Flex direction="column" gap="1" asChild>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {rankedEntity.strengths.slice(0, 3).map((s, i) => (
                                                    <Flex gap="2" align="start" asChild key={i}>
                                                        <li>
                                                            <CheckIcon style={{ width: 14, height: 14, color: 'var(--green-9)', marginTop: 2, flexShrink: 0 }} />
                                                            <Text size="1" color="gray" className="leading-relaxed">{s}</Text>
                                                        </li>
                                                    </Flex>
                                                ))}
                                            </ul>
                                        </Flex>
                                    </Box>
                                )}

                                {/* Weaknesses */}
                                {rankedEntity.weaknesses && rankedEntity.weaknesses.length > 0 && (
                                    <Box pt="5">
                                        <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider" mb="1" as="div">
                                            Weaknesses
                                        </Text>
                                        <Flex direction="column" gap="1" asChild>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {rankedEntity.weaknesses.slice(0, 2).map((w, i) => (
                                                    <Flex gap="2" align="start" asChild key={i}>
                                                        <li>
                                                            <ExclamationTriangleIcon style={{ width: 14, height: 14, color: 'var(--amber-9)', marginTop: 2, flexShrink: 0 }} />
                                                            <Text size="1" color="gray" className="leading-relaxed">{w}</Text>
                                                        </li>
                                                    </Flex>
                                                ))}
                                            </ul>
                                        </Flex>
                                    </Box>
                                )}
                            </BaseCard.Body>

                            {/* Buyer Relevance footer */}
                            {rankedEntity.relevance_for_buyer && (
                                <Box mt="auto" pt="3">
                                    <Separator size="4" mb="3" />
                                    <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider" mb="1" as="div">
                                        Buyer Relevance
                                    </Text>
                                    <Text size="1" color="gray" className="leading-relaxed" style={{ fontStyle: 'italic' }} as="div">
                                        &ldquo;{rankedEntity.relevance_for_buyer}&rdquo;
                                    </Text>
                                </Box>
                            )}
                        </BaseCard>
                    );
                })}
            </Grid>
        </Flex>
    );
}
