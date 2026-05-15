"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Card, Flex, Grid, Heading, Text, Badge, Code, Separator, Button, Callout, Table, AlertDialog } from "@radix-ui/themes";
import { LightningBoltIcon, TimerIcon, CheckCircledIcon, CrossCircledIcon, ReloadIcon, PauseIcon, PlayIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface QueueStats {
    counts: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        prioritized: number;
    };
    isPaused: boolean;
    avgProcessingMs: number | null;
    avgWaitMs: number | null;
    active: {
        id: string;
        name: string;
        priority: number | null;
        data: { promptId: string | null; resultCount: number | null };
        startedAt: string | null;
        elapsed: number | null;
    }[];
    completed: {
        id: string;
        name: string;
        priority: number | null;
        processingTime: number | null;
        waitTime: number | null;
        completedAt: string | null;
    }[];
    failed: {
        id: string;
        name: string;
        failedReason: string;
        failedAt: string | null;
    }[];
    timestamp: string;
}

function formatMs(ms: number | null): string {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}m`;
}

function formatTime(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString();
}

function priorityLabel(p: number | null): React.ReactNode {
    if (p === null) return <Badge color="gray" size="1">default</Badge>;
    if (p <= 1) return <Badge color="green" size="1">fast lane</Badge>;
    if (p <= 5) return <Badge color="orange" size="1">medium</Badge>;
    return <Badge color="gray" size="1">batch</Badge>;
}

function StatCard({
    label,
    value,
    color,
    icon,
}: {
    label: string;
    value: string | number;
    color: "blue" | "green" | "orange" | "red" | "gray";
    icon: React.ReactNode;
}) {
    return (
        <Card size="2">
            <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                    <Box style={{ color: `var(--${color}-11)` }}>{icon}</Box>
                    <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {label}
                    </Text>
                </Flex>
                <Heading size="6" style={{ color: `var(--${color}-11)` }}>
                    {value}
                </Heading>
            </Flex>
        </Card>
    );
}

export default function QueueDashboard() {
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toggling, setToggling] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/queue-stats");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStats(data);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchStats]);

    const handleTogglePause = async () => {
        if (!stats) return;
        setToggling(true);
        try {
            const res = await fetch("/api/admin/queue-stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: stats.isPaused ? "resume" : "pause" }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await fetchStats();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setToggling(false);
        }
    };

    if (loading && !stats) {
        return (
            <Card size="2">
                <Flex align="center" justify="center" p="6">
                    <Text color="gray">Loading queue stats...</Text>
                </Flex>
            </Card>
        );
    }

    if (error && !stats) {
        return (
            <Card size="2">
                <Flex align="center" justify="center" p="6">
                    <Text color="red">Failed to load: {error}</Text>
                </Flex>
            </Card>
        );
    }

    if (!stats) return null;

    const totalQueued = stats.counts.waiting + stats.counts.delayed + stats.counts.prioritized;

    return (
        <Flex direction="column" gap="6">
            {/* Header with auto-refresh indicator + pause/resume */}
            <Flex align="center" justify="between">
                <Heading size="4">Queue Overview</Heading>
                <Flex align="center" gap="3">
                    {stats.isPaused ? (
                        <Button
                            size="1"
                            variant="solid"
                            color="green"
                            onClick={handleTogglePause}
                            loading={toggling}
                        >
                            <PlayIcon width="14" height="14" /> Resume Queue
                        </Button>
                    ) : (
                        <AlertDialog.Root>
                            <AlertDialog.Trigger>
                                <Button size="1" variant="soft" color="orange">
                                    <PauseIcon width="14" height="14" /> Pause Queue
                                </Button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Content maxWidth="450px">
                                <AlertDialog.Title>Pause Queue</AlertDialog.Title>
                                <AlertDialog.Description size="2">
                                    This will stop all job processing. Active jobs will finish, but no new jobs will be picked up until you resume. Scheduled prompts will pile up in the queue.
                                </AlertDialog.Description>
                                <Flex gap="3" mt="4" justify="end">
                                    <AlertDialog.Cancel>
                                        <Button variant="soft" color="gray">Cancel</Button>
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action>
                                        <Button color="orange" variant="solid" onClick={handleTogglePause} loading={toggling}>
                                            Pause Queue
                                        </Button>
                                    </AlertDialog.Action>
                                </Flex>
                            </AlertDialog.Content>
                        </AlertDialog.Root>
                    )}
                    <Flex align="center" gap="2">
                        <Box
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: error ? "var(--red-9)" : stats.isPaused ? "var(--orange-9)" : "var(--green-9)",
                            }}
                        />
                        <Text size="1" color="gray">
                            {error
                                ? "Connection error"
                                : stats.isPaused
                                    ? "Paused"
                                    : `Live — updated ${formatTime(stats.timestamp)}`}
                        </Text>
                    </Flex>
                </Flex>
            </Flex>

            {/* Pause warning banner */}
            {stats.isPaused && (
                <Callout.Root color="orange" variant="surface" size="2">
                    <Callout.Icon>
                        <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">Queue is paused.</Text>{" "}
                        No new jobs will be processed. Active jobs will finish, but queued jobs will wait until resumed.
                    </Callout.Text>
                </Callout.Root>
            )}

            {/* Stats Cards */}
            <Grid columns={{ initial: "2", md: "5" }} gap="4">
                <StatCard
                    label="Queued"
                    value={totalQueued}
                    color="blue"
                    icon={<TimerIcon width="16" height="16" />}
                />
                <StatCard
                    label="Active"
                    value={stats.counts.active}
                    color="orange"
                    icon={<LightningBoltIcon width="16" height="16" />}
                />
                <StatCard
                    label="Completed"
                    value={stats.counts.completed}
                    color="green"
                    icon={<CheckCircledIcon width="16" height="16" />}
                />
                <StatCard
                    label="Failed"
                    value={stats.counts.failed}
                    color="red"
                    icon={<CrossCircledIcon width="16" height="16" />}
                />
                <StatCard
                    label="Avg Time"
                    value={formatMs(stats.avgProcessingMs)}
                    color="gray"
                    icon={<ReloadIcon width="16" height="16" />}
                />
            </Grid>

            {/* Timing Stats */}
            <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <Card size="2">
                    <Flex direction="column" gap="2">
                        <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Avg Wait Time (Queue → Start)
                        </Text>
                        <Heading size="5">{formatMs(stats.avgWaitMs)}</Heading>
                        <Text size="1" color="gray">
                            Analysis jobs only — excludes scheduler ticks
                        </Text>
                    </Flex>
                </Card>
                <Card size="2">
                    <Flex direction="column" gap="2">
                        <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Avg Processing Time (Start → Done)
                        </Text>
                        <Heading size="5">{formatMs(stats.avgProcessingMs)}</Heading>
                        <Text size="1" color="gray">
                            Time from worker pickup to job completion (LLM calls + parsing)
                        </Text>
                    </Flex>
                </Card>
            </Grid>

            {/* Hardcoded Configuration Reference */}
            <Card size="2">
                <Flex direction="column" gap="3">
                    <Heading size="3">Configuration</Heading>
                    <Text size="1" color="gray">Hardcoded values — require a deploy to change.</Text>

                    <Grid columns={{ initial: "1", md: "2" }} gap="4" mt="1">
                        {/* Worker settings */}
                        <Flex direction="column" gap="2">
                            <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Worker
                            </Text>
                            <Table.Root size="1" variant="surface">
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Concurrency</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">25</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Job timeout</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">5 min</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Stall check interval</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">2 min</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Lock duration</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">5 min</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Retry attempts</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">3</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Retry backoff</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">exponential 1s</Code></Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table.Root>
                        </Flex>

                        {/* Rate limits */}
                        <Flex direction="column" gap="2">
                            <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Rate Limits (per provider)
                            </Text>
                            <Table.Root size="1" variant="surface">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell align="right">Concurrent</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell align="right">RPM</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">OpenAI</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">10</Code></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">400</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Anthropic</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">5</Code></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">200</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Google</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">8</Code></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">300</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2">Mistral</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">5</Code></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">200</Code></Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell><Text size="2" color="gray">Default</Text></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">3</Code></Table.Cell>
                                        <Table.Cell align="right"><Code size="1">120</Code></Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table.Root>
                        </Flex>
                    </Grid>
                </Flex>
            </Card>

            {/* Active Jobs */}
            {stats.active.length > 0 && (
                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Flex align="center" gap="2">
                            <Heading size="3">Active Jobs</Heading>
                            <Badge color="orange" size="1">{stats.active.length}</Badge>
                        </Flex>
                        <Box style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["Job ID", "Type", "Priority", "Prompt", "Models", "Elapsed"].map((h) => (
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
                                    {stats.active.map((job) => (
                                        <tr key={job.id}>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Code size="1">{job.id}</Code>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2">{job.name}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                {priorityLabel(job.priority)}
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Code size="1">{job.data.promptId ? job.data.promptId.slice(0, 8) + "..." : "—"}</Code>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2">{job.data.resultCount ?? "—"}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2" color={job.elapsed && job.elapsed > 60_000 ? "red" : "gray"}>
                                                    {formatMs(job.elapsed)}
                                                </Text>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </Flex>
                </Card>
            )}

            {/* Recent Completed */}
            {stats.completed.length > 0 && (
                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Heading size="3">Recent Completed</Heading>
                        <Box style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["Job ID", "Type", "Priority", "Wait", "Processing", "Completed"].map((h) => (
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
                                    {stats.completed.map((job) => (
                                        <tr key={job.id}>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Code size="1">{job.id}</Code>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2">{job.name}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                {priorityLabel(job.priority)}
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2" color="gray">{formatMs(job.waitTime)}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2">{formatMs(job.processingTime)}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="1" color="gray">{formatTime(job.completedAt)}</Text>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </Flex>
                </Card>
            )}

            {/* Recent Failed */}
            {stats.failed.length > 0 && (
                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Flex align="center" gap="2">
                            <Heading size="3">Recent Failures</Heading>
                            <Badge color="red" size="1">{stats.failed.length}</Badge>
                        </Flex>
                        <Box style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["Job ID", "Type", "Reason", "Failed At"].map((h) => (
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
                                    {stats.failed.map((job) => (
                                        <tr key={job.id}>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Code size="1">{job.id}</Code>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2">{job.name}</Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="2" color="red" style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                                                    {job.failedReason}
                                                </Text>
                                            </td>
                                            <td style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--gray-4)" }}>
                                                <Text size="1" color="gray">{formatTime(job.failedAt)}</Text>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </Flex>
                </Card>
            )}

            {/* Priority Legend */}
            <Card size="1">
                <Flex align="center" gap="4" wrap="wrap">
                    <Text size="1" color="gray" weight="bold">Priority Lanes:</Text>
                    <Flex align="center" gap="1">
                        <Badge color="green" size="1">fast lane</Badge>
                        <Text size="1" color="gray">P1 — user-initiated (new prompts, manual triggers)</Text>
                    </Flex>
                    <Separator orientation="vertical" />
                    <Flex align="center" gap="1">
                        <Badge color="orange" size="1">medium</Badge>
                        <Text size="1" color="gray">P5 — rescans</Text>
                    </Flex>
                    <Separator orientation="vertical" />
                    <Flex align="center" gap="1">
                        <Badge color="gray" size="1">batch</Badge>
                        <Text size="1" color="gray">P10 — scheduled analysis</Text>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    );
}
