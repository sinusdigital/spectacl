"use client";

import { Container, Box, Flex, Grid, Heading, Text, Card, Badge, Code } from "@radix-ui/themes";
import PageHeader from "@/components/Shared/PageHeader";
import { LapTimerIcon, ExclamationTriangleIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import { performanceMarkdown } from "./content";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: "orange" | "green" | "gray" }) {
    const bg = { orange: "var(--orange-3)", green: "var(--green-3)", gray: "var(--gray-3)" };
    const fg = { orange: "var(--orange-11)", green: "var(--green-11)", gray: "var(--gray-11)" };

    return (
        <Card size="2">
            <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                </Text>
                <Heading size="6" style={{ color: fg[color] }}>{value}</Heading>
                <Text size="1" color="gray">{sub}</Text>
            </Flex>
        </Card>
    );
}

const optimizations = [
    {
        file: "metrics/dynamic.ts",
        fn: "getDynamicMetrics()",
        current: 13,
        optimized: 3,
        priority: "HIGH" as const,
        status: "shelved" as const,
        note: "12 Prisma queries → 2 raw SQL + 1 Prisma. Requires raw SQL.",
    },
    {
        file: "metrics/snapshots.ts",
        fn: "calculateAndSaveSnapshot()",
        current: "4-5 per call",
        optimized: "1 transaction",
        priority: "MEDIUM" as const,
        status: "done" as const,
        note: "Already uses $transaction batching. Entity + competitor snapshots parallelized via Promise.all.",
    },
    {
        file: "scheduler-job.ts",
        fn: "processDuePrompts()",
        current: "N (in loop)",
        optimized: 1,
        priority: "MEDIUM" as const,
        status: "done" as const,
        note: "Fixed: batch-fetch all unique spaces upfront into Map, eliminating per-prompt space queries.",
    },
    {
        file: "metrics/promptMetrics.ts",
        fn: "updatePromptMetrics()",
        current: 5,
        optimized: "2-3",
        priority: "MEDIUM" as const,
        status: "shelved" as const,
        note: "Transaction batching for sequential queries.",
    },
    {
        file: "sourceStats.ts",
        fn: "backfillSourceStats()",
        current: "N+1",
        optimized: 1,
        priority: "MEDIUM" as const,
        status: "shelved" as const,
        note: "Single query + in-memory grouping instead of loop.",
    },
];

const priorityColor = { HIGH: "orange", MEDIUM: "blue", LOW: "gray" } as const;
const statusBadge = {
    shelved: <Badge color="gray" size="1">Shelved</Badge>,
    planned: <Badge color="orange" size="1">Planned</Badge>,
    done: <Badge color="green" size="1">Done</Badge>,
};

export default function PerformancePage() {
    return (
        <Container size="4" p="6">
            <Flex direction="column" gap="6" pb="9">
                <PageHeader
                    title="Performance"
                    description="Database query optimization opportunities and scaling notes."
                />

                {/* Key Stats */}
                <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                    <StatCard
                        label="getDynamicMetrics"
                        value="13 queries"
                        sub="Could be 3 with raw SQL"
                        color="orange"
                    />
                    <StatCard
                        label="Snapshot writes / entity"
                        value="Batched"
                        sub="Uses $transaction + Promise.all"
                        color="green"
                    />
                    <StatCard
                        label="Existing raw SQL"
                        value="history.ts"
                        sub="GROUP BY DATE() — Prisma can't do this"
                        color="green"
                    />
                </Grid>

                {/* Callout */}
                <Card size="2" style={{ backgroundColor: "var(--orange-2)", border: "1px solid var(--orange-4)" }}>
                    <Flex align="start" gap="3">
                        <Box style={{ color: "var(--orange-11)", flexShrink: 0, marginTop: 2 }}>
                            <ExclamationTriangleIcon width="20" height="20" />
                        </Box>
                        <Box>
                            <Text size="2" weight="bold" color="orange" as="div" mb="1">
                                When to act on these optimizations
                            </Text>
                            <Text size="2" color="gray">
                                Dashboard latency exceeds 500ms consistently, worker snapshot writes back up the BullMQ queue,
                                or user count approaches 500+ with active dashboard usage. Until then, the current Prisma-based
                                approach is clean, type-safe, and fast enough.
                            </Text>
                        </Box>
                    </Flex>
                </Card>

                {/* Optimization Table */}
                <Card size="3">
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
                                <LapTimerIcon width="24" height="24" />
                            </Box>
                            <Heading size="4">Optimization Opportunities</Heading>
                        </Flex>
                        <Box style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["File", "Function", "Current", "Optimized", "Priority", "Status", "Notes"].map(h => (
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
                                    {optimizations.map((opt, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Code size="1">{opt.file}</Code>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Code size="1">{opt.fn}</Code>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2" weight="bold">{String(opt.current)}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2" color="green" weight="bold">{String(opt.optimized)}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Badge color={priorityColor[opt.priority]} size="1">{opt.priority}</Badge>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                {statusBadge[opt.status]}
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="1" color="gray">{opt.note}</Text>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </Flex>
                </Card>

                {/* Full Documentation */}
                <Card size="3">
                    <Box className="prose prose-sm max-w-none dark:prose-invert" p="4">
                        <ReactMarkdown>{performanceMarkdown}</ReactMarkdown>
                    </Box>
                </Card>
            </Flex>
        </Container>
    );
}
