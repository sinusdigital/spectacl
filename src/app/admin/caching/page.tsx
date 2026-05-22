"use client";

import { Container, Box, Flex, Grid, Heading, Text, Card, Code } from "@radix-ui/themes";
import PageHeader from "@/components/Shared/PageHeader";
import { LightningBoltIcon, TimerIcon, CubeIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import { cachingDocsMarkdown } from "./content";

export default function CachingDocsPage() {
    return (
        <Container size="4" p="6">
            <Flex direction="column" gap="6" pb="9">
                <PageHeader
                    title="Caching Strategy"
                />

                <Grid columns={{ initial: "1", md: "2" }} gap="6">
                    {/* Tier 1: Entity Metrics */}
                    <Card size="2">
                        <Flex direction="column" gap="4">
                            <Flex align="center" gap="3">
                                <Box 
                                    p="2" 
                                    style={{ 
                                        backgroundColor: 'var(--blue-3)', 
                                        color: 'var(--blue-11)',
                                        borderRadius: 'var(--radius-3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <CubeIcon width="24" height="24" />
                                </Box>
                                <Heading size="4">Tier 1: Entity Metrics</Heading>
                            </Flex>
                            
                            <Text size="2" color="gray">
                                Historical data for entities and competitors stored in the <Code size="1">MetricSnapshot</Code> table.
                            </Text>
                            
                            <Flex direction="column" gap="4">
                                <Box 
                                    p="4" 
                                    style={{ 
                                        backgroundColor: 'var(--gray-2)', 
                                        borderRadius: 'var(--radius-3)',
                                        border: '1px solid var(--gray-4)'
                                    }}
                                >
                                    <Heading size="2" mb="2">Storage</Heading>
                                    <Flex direction="column" gap="1" asChild>
                                        <ul style={{ listStyleType: 'disc', paddingLeft: 'min(var(--space-4), 1.25rem)' }}>
                                            <li><Text size="1" color="gray"><strong>Table:</strong> <Code size="1">MetricSnapshot</Code></Text></li>
                                            <li><Text size="1" color="gray"><strong>Granularity:</strong> Per Entity/Competitor</Text></li>
                                            <li><Text size="1" color="gray"><strong>History:</strong> Preserved over time</Text></li>
                                        </ul>
                                    </Flex>
                                </Box>

                                <Box 
                                    p="4" 
                                    style={{ 
                                        backgroundColor: 'var(--gray-2)', 
                                        borderRadius: 'var(--radius-3)',
                                        border: '1px solid var(--gray-4)'
                                    }}
                                >
                                    <Heading size="2" mb="2">Update Trigger</Heading>
                                    <Text size="1" color="gray" mb="2" as="p">
                                        Updates occur via <Code size="1">updateEntityMetrics()</Code> in <Code size="1">src/lib/metrics.ts</Code>.
                                    </Text>
                                    <Flex direction="column" gap="1" asChild>
                                        <ul style={{ listStyleType: 'disc', paddingLeft: 'min(var(--space-4), 1.25rem)' }}>
                                            <li><Text size="1" color="gray">After every analysis run</Text></li>
                                            <li><Text size="1" color="gray">On manual &quot;Refresh Metrics&quot; triggers</Text></li>
                                        </ul>
                                    </Flex>
                                </Box>
                            </Flex>
                        </Flex>
                    </Card>

                    {/* Tier 2: Prompt Metrics */}
                    <Card size="2">
                        <Flex direction="column" gap="4">
                            <Flex align="center" gap="3">
                                <Box 
                                    p="2" 
                                    style={{ 
                                        backgroundColor: 'var(--orange-3)', 
                                        color: 'var(--orange-11)',
                                        borderRadius: 'var(--radius-3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <TimerIcon width="24" height="24" />
                                </Box>
                                <Heading size="4">Tier 2: Prompt Metrics</Heading>
                            </Flex>
                            
                            <Text size="2" color="gray">
                                Instant snapshots of the latest performance for individual prompts, stored directly on the Prompt record.
                            </Text>

                            <Flex direction="column" gap="4">
                                <Box 
                                    p="4" 
                                    style={{ 
                                        backgroundColor: 'var(--gray-2)', 
                                        borderRadius: 'var(--radius-3)',
                                        border: '1px solid var(--gray-4)'
                                    }}
                                >
                                    <Heading size="2" mb="2">Storage</Heading>
                                    <Flex direction="column" gap="1" asChild>
                                        <ul style={{ listStyleType: 'disc', paddingLeft: 'min(var(--space-4), 1.25rem)' }}>
                                            <li><Text size="1" color="gray"><strong>Table:</strong> <Code size="1">Prompt</Code></Text></li>
                                            <li><Text size="1" color="gray"><strong>Columns:</strong> <Code size="1">lastMentionRate</Code>, <Code size="1">lastAvgPosition</Code>, <Code size="1">lastShareOfVoice</Code></Text></li>
                                            <li><Text size="1" color="gray"><strong>History:</strong> Only latest value (snapshot)</Text></li>
                                        </ul>
                                    </Flex>
                                </Box>

                                <Box 
                                    p="4" 
                                    style={{ 
                                        backgroundColor: 'var(--gray-2)', 
                                        borderRadius: 'var(--radius-3)',
                                        border: '1px solid var(--gray-4)'
                                    }}
                                >
                                    <Heading size="2" mb="2">Update Trigger</Heading>
                                    <Text size="1" color="gray" mb="2" as="p">
                                        Updates via <Code size="1">updatePromptMetrics()</Code> in <Code size="1">src/lib/metrics.ts</Code>.
                                    </Text>
                                    <Flex direction="column" gap="1" asChild>
                                        <ul style={{ listStyleType: 'disc', paddingLeft: 'min(var(--space-4), 1.25rem)' }}>
                                            <li><Text size="1" color="gray">Immediately after analysis completes</Text></li>
                                            <li><Text size="1" color="gray">Calculated from the latest Check Run</Text></li>
                                        </ul>
                                    </Flex>
                                </Box>
                            </Flex>
                        </Flex>
                    </Card>
                </Grid>

                {/* Architecture Diagram */}
                <Card size="3">
                    <Heading size="5" mb="6">Data Flow Architecture</Heading>
                    
                    <Grid columns={{ initial: "1", md: "3" }} gap="8" align="center">
                        {/* Source */}
                        <Box 
                            p="4" 
                            style={{ 
                                backgroundColor: 'var(--gray-2)', 
                                borderRadius: 'var(--radius-3)',
                                border: '1px solid var(--gray-4)',
                                textAlign: 'center'
                            }}
                        >
                            <Text size="1" color="gray" weight="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} mb="2" as="div">Source</Text>
                            <Card size="1" mb="2">
                                <Text size="2" weight="bold">Analysis Job</Text>
                            </Card>
                            <Text size="1" color="gray">Worker Process</Text>
                        </Box>

                        {/* Processing */}
                        <Box 
                            p="4" 
                            style={{ 
                                backgroundColor: 'var(--blue-2)', 
                                borderRadius: 'var(--radius-3)',
                                border: '1px solid var(--blue-4)',
                                textAlign: 'center'
                            }}
                        >
                            <Text size="1" color="blue" weight="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} mb="2" as="div">Processing</Text>
                            <Flex direction="column" gap="2" align="center">
                                <Card size="1" style={{ width: '100%', backgroundColor: 'var(--color-background)' }}>
                                    <Text size="1" color="blue" weight="bold">saveAnalysisResult()</Text>
                                </Card>
                                <LightningBoltIcon width="20" height="20" color="var(--blue-8)" />
                                <Card size="1" style={{ width: '100%', backgroundColor: 'var(--color-background)' }}>
                                    <Text size="1" color="blue" weight="bold">updateEntityMetrics()</Text>
                                </Card>
                                <LightningBoltIcon width="20" height="20" color="var(--blue-8)" />
                                <Card size="1" style={{ width: '100%', backgroundColor: 'var(--color-background)' }}>
                                    <Text size="1" color="blue" weight="bold">updatePromptMetrics()</Text>
                                </Card>
                            </Flex>
                        </Box>

                        {/* Storage */}
                        <Box 
                            p="4" 
                            style={{ 
                                backgroundColor: 'var(--green-2)', 
                                borderRadius: 'var(--radius-3)',
                                border: '1px solid var(--green-4)',
                                textAlign: 'center'
                            }}
                        >
                            <Text size="1" color="green" weight="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} mb="2" as="div">Storage</Text>
                            <Flex direction="column" gap="2">
                                <Card size="1" style={{ backgroundColor: 'var(--color-background)' }}>
                                    <Text size="2" color="green" weight="bold">MetricSnapshot Table</Text>
                                </Card>
                                <Card size="1" style={{ backgroundColor: 'var(--color-background)' }}>
                                    <Text size="2" color="green" weight="bold">Prompt Table (Columns)</Text>
                                </Card>
                            </Flex>
                        </Box>
                    </Grid>
                </Card>

                {/* Detailed Documentation Content */}
                <Card size="3">
                    <Box className="prose prose-sm max-w-none dark:prose-invert" p="4">
                        <ReactMarkdown>{cachingDocsMarkdown}</ReactMarkdown>
                    </Box>
                </Card>

            </Flex>
        </Container>
    );
}
