"use client";

import { Container, Box, Flex, Grid, Heading, Text, Card, Code, Badge } from "@radix-ui/themes";
import PageHeader from "@/components/Shared/PageHeader";
import { LightningBoltIcon, TimerIcon, RocketIcon, CheckCircledIcon, GearIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import { workerArchitectureMarkdown } from "./content";

function PhaseCard({
    phase,
    title,
    status,
    when,
    description,
    icon,
    color,
}: {
    phase: number;
    title: string;
    status: "implemented" | "planned" | "future";
    when: string;
    description: string;
    icon: React.ReactNode;
    color: "green" | "orange" | "gray";
}) {
    const statusBadge = {
        implemented: <Badge color="green" size="1">Implemented</Badge>,
        planned: <Badge color="orange" size="1">Planned</Badge>,
        future: <Badge color="gray" size="1">Future</Badge>,
    };

    const bgColor = {
        green: "var(--green-3)",
        orange: "var(--orange-3)",
        gray: "var(--gray-3)",
    };

    const iconColor = {
        green: "var(--green-11)",
        orange: "var(--orange-11)",
        gray: "var(--gray-11)",
    };

    return (
        <Card size="2">
            <Flex direction="column" gap="3">
                <Flex align="center" justify="between">
                    <Flex align="center" gap="3">
                        <Box
                            p="2"
                            style={{
                                backgroundColor: bgColor[color],
                                color: iconColor[color],
                                borderRadius: "var(--radius-3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {icon}
                        </Box>
                        <Box>
                            <Text size="1" color="gray" weight="bold">Phase {phase}</Text>
                            <Heading size="3">{title}</Heading>
                        </Box>
                    </Flex>
                    {statusBadge[status]}
                </Flex>
                <Text size="2" color="gray">{description}</Text>
                <Text size="1" color="gray">
                    <strong>When:</strong> {when}
                </Text>
            </Flex>
        </Card>
    );
}

function RateLimitTable() {
    const providers = [
        { name: "OpenAI", maxConcurrent: 10, minTime: "150ms", rpm: "~400" },
        { name: "Anthropic", maxConcurrent: 5, minTime: "300ms", rpm: "~200" },
        { name: "Google", maxConcurrent: 8, minTime: "200ms", rpm: "~300" },
        { name: "Mistral", maxConcurrent: 5, minTime: "300ms", rpm: "~200" },
    ];

    return (
        <Card size="2">
            <Flex direction="column" gap="4">
                <Flex align="center" gap="3">
                    <Box
                        p="2"
                        style={{
                            backgroundColor: "var(--blue-3)",
                            color: "var(--blue-11)",
                            borderRadius: "var(--radius-3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <TimerIcon width="24" height="24" />
                    </Box>
                    <Heading size="4">Current Rate Limits</Heading>
                </Flex>
                <Text size="2" color="gray">
                    Per-provider rate limiting via Bottleneck with Redis-backed distributed state.
                    Limits are shared across all worker processes.
                </Text>
                <Box style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                {["Provider", "Max Concurrent", "Min Interval", "Effective RPM"].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            textAlign: "left",
                                            padding: "var(--space-2) var(--space-3)",
                                            borderBottom: "1px solid var(--gray-5)",
                                            fontSize: "var(--font-size-1)",
                                            color: "var(--gray-11)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map((p) => (
                                <tr key={p.name}>
                                    <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                        <Text size="2" weight="bold">{p.name}</Text>
                                    </td>
                                    <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                        <Code size="1">{p.maxConcurrent}</Code>
                                    </td>
                                    <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                        <Code size="1">{p.minTime}</Code>
                                    </td>
                                    <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                        <Badge color="blue" size="1">{p.rpm}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Flex>
        </Card>
    );
}

export default function WorkerArchitecturePage() {
    return (
        <Container size="4" p="6">
            <Flex direction="column" gap="6" pb="9">
                <PageHeader
                    title="Worker Architecture"
                    description="Background job processing, rate limiting, and scaling roadmap."
                />

                {/* Phase Overview */}
                <Grid columns={{ initial: "1", md: "3" }} gap="4">
                    <PhaseCard
                        phase={1}
                        title="Provider Rate Limiting"
                        status="implemented"
                        when="Before 50 users"
                        description="Per-provider Bottleneck rate limiters with Redis-backed distributed state. Worker concurrency increased to 25."
                        icon={<LightningBoltIcon width="24" height="24" />}
                        color="green"
                    />
                    <PhaseCard
                        phase={2}
                        title="Snapshot Deduplication"
                        status="planned"
                        when="Before 200 users"
                        description="Redis counter pattern — recalculate MetricSnapshot only when the last job for an entity completes. 40× reduction in DB queries."
                        icon={<GearIcon width="24" height="24" />}
                        color="orange"
                    />
                    <PhaseCard
                        phase={3}
                        title="Staggered Scheduling"
                        status="future"
                        when="Before 500 users"
                        description="Paginated scheduler, spread job enqueue over scheduling window, support for multiple worker processes."
                        icon={<RocketIcon width="24" height="24" />}
                        color="gray"
                    />
                </Grid>

                {/* Current Rate Limits */}
                <RateLimitTable />

                {/* Data Flow */}
                <Card size="3">
                    <Heading size="5" mb="6">Job Processing Flow</Heading>
                    <Grid columns={{ initial: "1", md: "4" }} gap="4" align="center">
                        <Box p="4" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-3)", border: "1px solid var(--gray-4)", textAlign: "center" }}>
                            <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }} mb="2" as="div">Schedule</Text>
                            <Card size="1" mb="2"><Text size="2" weight="bold">Scheduler Tick</Text></Card>
                            <Text size="1" color="gray">Every 6 hours</Text>
                        </Box>

                        <Box p="4" style={{ backgroundColor: "var(--blue-2)", borderRadius: "var(--radius-3)", border: "1px solid var(--blue-4)", textAlign: "center" }}>
                            <Text size="1" color="blue" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }} mb="2" as="div">Queue</Text>
                            <Card size="1" mb="2" style={{ backgroundColor: "var(--color-background)" }}><Text size="2" color="blue" weight="bold">BullMQ</Text></Card>
                            <Text size="1" color="gray">25 concurrent</Text>
                        </Box>

                        <Box p="4" style={{ backgroundColor: "var(--orange-2)", borderRadius: "var(--radius-3)", border: "1px solid var(--orange-4)", textAlign: "center" }}>
                            <Text size="1" color="orange" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }} mb="2" as="div">Rate Limit</Text>
                            <Card size="1" mb="2" style={{ backgroundColor: "var(--color-background)" }}><Text size="2" color="orange" weight="bold">Bottleneck</Text></Card>
                            <Text size="1" color="gray">Per-provider RPM</Text>
                        </Box>

                        <Box p="4" style={{ backgroundColor: "var(--green-2)", borderRadius: "var(--radius-3)", border: "1px solid var(--green-4)", textAlign: "center" }}>
                            <Text size="1" color="green" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }} mb="2" as="div">Output</Text>
                            <Flex direction="column" gap="2">
                                <Card size="1" style={{ backgroundColor: "var(--color-background)" }}><Text size="1" color="green" weight="bold">AnalysisResult</Text></Card>
                                <Card size="1" style={{ backgroundColor: "var(--color-background)" }}><Text size="1" color="green" weight="bold">MetricSnapshot</Text></Card>
                            </Flex>
                        </Box>
                    </Grid>
                </Card>

                {/* Full Documentation */}
                <Card size="3">
                    <Box className="prose prose-sm max-w-none dark:prose-invert" p="4">
                        <ReactMarkdown>{workerArchitectureMarkdown}</ReactMarkdown>
                    </Box>
                </Card>
            </Flex>
        </Container>
    );
}
