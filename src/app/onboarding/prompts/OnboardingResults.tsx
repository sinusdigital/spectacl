"use client";

import { useState, useEffect } from 'react';
import { Box, Flex, Text, Heading, Grid, Button, Card } from "@radix-ui/themes";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { StatCard } from "@/components/Shared/StatCard";
import { ProgressIndicator, PositionIndicator } from "@/components/Shared/MetricTriplet";
import RadixTable from "@/components/Shared/RadixTable";
import CompanyLogo from "@/components/CompanyLogo";
import CompetitorQuadrantChart from "@/components/Charts/CompetitorQuadrantChart";

interface AnalysisResult {
    id: string;
    status: string;
    llmModel: string;
    mentioned: boolean;
    position: number | null;
    mentions: Array<{
        id: string;
        competitorId: string | null;
        position: number | null;
    }>;
}

interface PromptData {
    id: string;
    text: string;
    analysisResults: AnalysisResult[];
}

interface CompetitorRow {
    id: string;
    name: string;
    primaryUrl: string | null;
    logoUrl: string | null;
}

interface EntityRow {
    id: string;
    name: string;
    primaryUrl: string | null;
    logoUrl: string | null;
}

interface ParticipantMetric {
    id: string;
    name: string;
    website: string | null;
    logoUrl: string | null;
    isEntity: boolean;
    mentionCount: number;
    totalCount: number;
    visibility: number;
    position: number | null;
    shareOfVoice: number;
}

interface OnboardingResultsProps {
    prompt: PromptData | null;
    entityId: string;
}

function TooltipBody({ title, description, example }: { title: string; description: string; example: string }) {
    return (
        <Box className="space-y-3 leading-relaxed">
            <p><Text weight="bold" color="gray">{title}</Text></p>
            <Box className="space-y-1">
                <Text weight="bold" size="2" color="gray">How it works:</Text>
                <Text size="2" as="p">{description}</Text>
            </Box>
            <Box className="space-y-1 p-2 rounded" style={{ background: 'var(--gray-a2)', border: '1px solid var(--gray-a4)' }}>
                <Text weight="bold" size="2" color="gray">Example:</Text>
                <Text as="p" size="2">{example}</Text>
            </Box>
        </Box>
    );
}

export default function OnboardingResults({ prompt, entityId }: OnboardingResultsProps) {
    const [entity, setEntity] = useState<EntityRow | null>(null);
    const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [entityRes, competitorsRes] = await Promise.all([
                    fetch(`/api/entities/${entityId}`),
                    fetch(`/api/entities/${entityId}/competitors`)
                ]);
                const [entityData, competitorsData] = await Promise.all([
                    entityRes.json(),
                    competitorsRes.json()
                ]);
                setEntity(entityData);
                setCompetitors(Array.isArray(competitorsData) ? competitorsData : []);
            } catch {
                // Non-fatal — show what we can
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [entityId]);

    const navigate = () => {
        window.location.href = `/${entityId}`;
    };

    const emptyState = (message: string) => (
        <Flex direction="column" align="center" justify="center" py="9" gap="4">
            <Text size="3" color="gray" align="center">{message}</Text>
            <Button size="3" variant="solid" onClick={navigate}>
                Start tracking AI answers <ArrowRightIcon />
            </Button>
        </Flex>
    );

    if (loading) return <Box p="8" className="text-center"><Text color="gray">Loading results...</Text></Box>;

    if (!prompt) {
        return emptyState("Analysis results are taking longer than expected. Underwhelming we know. You can start exploring Spectacl while we fetch the data.");
    }

    const successfulResults = prompt.analysisResults.filter(r => r.status === 'success');

    if (successfulResults.length === 0) {
        return emptyState("Analysis results are taking longer than expected. Underwhelming we know. You can start exploring Spectacl while we fetch the data.");
    }

    const total = successfulResults.length;

    // Build metrics per participant
    // Entity presence: result.mentioned = true
    // Competitor presence: result.mentions[].competitorId matches
    const competitorMentionCounts: Record<string, number> = {};
    const competitorPositions: Record<string, number[]> = {};

    let entityMentionCount = 0;
    const entityPositions: number[] = [];
    let totalMarketMentions = 0;

    for (const result of successfulResults) {
        if (result.mentioned) {
            entityMentionCount++;
            if (result.position && result.position > 0) entityPositions.push(result.position);
            totalMarketMentions++; // entity counts as one mention in the market
        }

        for (const mention of result.mentions) {
            if (!mention.competitorId) continue;
            competitorMentionCounts[mention.competitorId] = (competitorMentionCounts[mention.competitorId] ?? 0) + 1;
            if (mention.position && mention.position > 0) {
                competitorPositions[mention.competitorId] = competitorPositions[mention.competitorId] ?? [];
                competitorPositions[mention.competitorId].push(mention.position);
            }
            totalMarketMentions++;
        }
    }

    const avgOf = (nums: number[]): number | null =>
        nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

    const entityMetric: ParticipantMetric = {
        id: entityId,
        name: entity?.name ?? 'Your Brand',
        website: entity?.primaryUrl ?? null,
        logoUrl: entity?.logoUrl ?? null,
        isEntity: true,
        mentionCount: entityMentionCount,
        totalCount: total,
        visibility: total > 0 ? (entityMentionCount / total) * 100 : 0,
        position: avgOf(entityPositions),
        shareOfVoice: totalMarketMentions > 0 ? (entityMentionCount / totalMarketMentions) * 100 : 0,
    };

    const competitorMetrics: ParticipantMetric[] = competitors.map(comp => {
        const count = competitorMentionCounts[comp.id] ?? 0;
        return {
            id: comp.id,
            name: comp.name,
            website: comp.primaryUrl,
            logoUrl: comp.logoUrl,
            isEntity: false,
            mentionCount: count,
            totalCount: total,
            visibility: total > 0 ? (count / total) * 100 : 0,
            position: avgOf(competitorPositions[comp.id] ?? []),
            shareOfVoice: totalMarketMentions > 0 ? (count / totalMarketMentions) * 100 : 0,
        };
    });

    const allMetrics = [entityMetric, ...competitorMetrics].sort((a, b) => b.visibility - a.visibility);

    // Quadrant chart expects visibility + position, both numeric
    const quadrantData = allMetrics
        .filter(m => m.position !== null)
        .map(m => ({
            id: m.id,
            name: m.name,
            visibility: m.visibility,
            shareOfVoice: m.shareOfVoice,
            position: m.position as number,
            logoUrl: m.logoUrl,
        }));

    return (
        <Box>
            <Flex direction="column" align="center" gap="1" mb="6">
                <Heading size="6">First Analysis Complete!</Heading>
                <Text size="3" color="gray">Here is how AI models currently perceive your brand.</Text>
            </Flex>

            {/* Stat Cards */}
            <Grid columns={{ initial: '1', sm: '3' }} gap="4" mb="6">
                <StatCard
                    title="Mention Rate"
                    isActive={false}
                    value={`${entityMetric.visibility.toFixed(0)}%`}
                    valueTitle={`${entityMetric.mentionCount}/${total}`}
                    tooltipContent={
                        <TooltipBody
                            title="Mention Rate"
                            description="It calculates (Number of Prompts containing the entity / Total Number of Prompts) * 100."
                            example="If your entity appears in 5 out of 10 prompts, this will show 50%."
                        />
                    }
                />
                <StatCard
                    title="Average Position"
                    isActive={false}
                    value={entityMetric.position ? entityMetric.position.toFixed(1) : "—"}
                    tooltipContent={
                        <TooltipBody
                            title="Average Position"
                            description="It calculates the average rank of your entity across all prompts where it appears."
                            example="If your entity appears #1 in one prompt and #3 in another, the average position is 2.0."
                        />
                    }
                />
                <StatCard
                    title="Share of Voice"
                    isActive={false}
                    value={`${entityMetric.shareOfVoice.toFixed(1)}%`}
                    tooltipContent={
                        <TooltipBody
                            title="Share of Voice"
                            description="It calculates (Mentions of Your Brand / Total Mentions of All Brands) * 100."
                            example="If your brand is mentioned 20 times and the total market mentions are 100, your SoV is 20%."
                        />
                    }
                />
            </Grid>

            {/* Main Content: Table + Chart */}
            <Grid columns={{ initial: '1', md: '2' }} gap="4">
                <Card size="2">
                    <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 'var(--space-3)' }}>
                        Competitor Breakdown
                    </Text>
                    <RadixTable.Root variant="ghost" size="1">
                        <RadixTable.Header>
                            <RadixTable.Row>
                                <RadixTable.Head>Brand</RadixTable.Head>
                                <RadixTable.Head>Mention Rate</RadixTable.Head>
                                <RadixTable.Head>Avg. Pos</RadixTable.Head>
                            </RadixTable.Row>
                        </RadixTable.Header>
                        <RadixTable.Body>
                            {allMetrics.map(m => (
                                <RadixTable.Row key={m.id}>
                                    <RadixTable.Cell>
                                        <Flex align="center" gap="2">
                                            <CompanyLogo
                                                domain={m.website}
                                                name={m.name}
                                                size={16}
                                                logoUrl={m.logoUrl}
                                                className="rounded-full"
                                            />
                                            <Text size="2" weight={m.isEntity ? "bold" : "regular"}>
                                                {m.name}{m.isEntity ? ' (You)' : ''}
                                            </Text>
                                        </Flex>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Flex align="center" gap="2">
                                            <ProgressIndicator value={m.visibility} className="w-3 h-3" />
                                            <Text size="2" color="gray">{m.visibility.toFixed(0)}%</Text>
                                        </Flex>
                                    </RadixTable.Cell>
                                    <RadixTable.Cell>
                                        <Flex align="center" gap="2">
                                            <PositionIndicator value={m.position} />
                                            <Text size="2" color="gray">{m.position ? m.position.toFixed(1) : "—"}</Text>
                                        </Flex>
                                    </RadixTable.Cell>
                                </RadixTable.Row>
                            ))}
                        </RadixTable.Body>
                    </RadixTable.Root>
                </Card>

                <Card size="2">
                    <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 'var(--space-3)' }}>
                        Market Positioning
                    </Text>
                    <Box height="300px">
                        <CompetitorQuadrantChart data={quadrantData} />
                    </Box>
                </Card>
            </Grid>


            <Flex justify="center" mt="6">
                <Button size="3" variant="solid" onClick={navigate}>
                    Start tracking AI answers
                    <ArrowRightIcon />
                </Button>
            </Flex>
        </Box>
    );
}
