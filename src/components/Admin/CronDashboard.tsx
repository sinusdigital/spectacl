"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Card, Flex, Grid, Heading, Text, Badge, Code } from "@radix-ui/themes";
import {
  TimerIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ReloadIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";

interface CronStats {
  summary: {
    totalRuns: number;
    completedRuns: number;
    incompleteRuns: number;
    avgDurationMs: number | null;
    totalPromptsProcessed: number;
    lastRunAt: string | null;
    lastRunDurationMs: number | null;
    timeSinceLastRunMs: number | null;
  };
  prompts: {
    active: number;
    due: number;
  };
  subscriptions: Record<string, number>;
  runs: {
    id: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    promptsProcessed: number;
    status: string;
  }[];
  timestamp: string;
}

function formatMs(ms: number | null): string {
  if (ms === null) return "\u2014";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleTimeString();
}

function formatTimeAgo(ms: number | null): string {
  if (ms === null) return "\u2014";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

function StatCard({
  label,
  value,
  color,
  icon,
  subtitle,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "orange" | "red" | "gray" | "iris";
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card size="2">
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2">
          <Box style={{ color: `var(--${color}-11)` }}>{icon}</Box>
          <Text
            size="1"
            color="gray"
            weight="bold"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {label}
          </Text>
        </Flex>
        <Heading size="6" style={{ color: `var(--${color}-11)` }}>
          {value}
        </Heading>
        {subtitle && (
          <Text size="1" color="gray">
            {subtitle}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

const TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--space-2) var(--space-3)",
  borderBottom: "1px solid var(--gray-5)",
  fontSize: "var(--font-size-1)",
  color: "var(--gray-11)",
  fontWeight: 600,
};

const TD_STYLE: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  borderBottom: "1px solid var(--gray-4)",
};

export default function CronDashboard() {
  const [stats, setStats] = useState<CronStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cron-stats");
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
    const interval = setInterval(fetchStats, 10_000); // Poll every 10s (cron is slower than workers)
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <Card size="2">
        <Flex align="center" justify="center" p="6">
          <Text color="gray">Loading cron stats...</Text>
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

  const { summary, prompts, subscriptions, runs } = stats;

  // Determine health: warn if last run was > 15 minutes ago
  const isHealthy =
    summary.timeSinceLastRunMs !== null && summary.timeSinceLastRunMs < 15 * 60 * 1000;
  const isStale =
    summary.timeSinceLastRunMs !== null && summary.timeSinceLastRunMs > 30 * 60 * 1000;

  return (
    <Flex direction="column" gap="6">
      {/* Header with status */}
      <Flex align="center" justify="between">
        <Heading size="4">Cron Overview</Heading>
        <Flex align="center" gap="2">
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: error
                ? "var(--red-9)"
                : isStale
                  ? "var(--orange-9)"
                  : "var(--green-9)",
            }}
          />
          <Text size="1" color="gray">
            {error
              ? "Connection error"
              : `Last run ${formatTimeAgo(summary.timeSinceLastRunMs)}`}
          </Text>
        </Flex>
      </Flex>

      {/* Stat Cards */}
      <Grid columns={{ initial: "2", md: "5" }} gap="4">
        <StatCard
          label="Last Run"
          value={formatTimeAgo(summary.timeSinceLastRunMs)}
          color={isStale ? "red" : isHealthy ? "green" : "orange"}
          icon={<TimerIcon width="16" height="16" />}
          subtitle={summary.lastRunAt ? formatTime(summary.lastRunAt) : undefined}
        />
        <StatCard
          label="Completed"
          value={summary.completedRuns}
          color="green"
          icon={<CheckCircledIcon width="16" height="16" />}
          subtitle={`of ${summary.totalRuns} runs`}
        />
        <StatCard
          label="Incomplete"
          value={summary.incompleteRuns}
          color={summary.incompleteRuns > 0 ? "red" : "gray"}
          icon={<CrossCircledIcon width="16" height="16" />}
        />
        <StatCard
          label="Avg Duration"
          value={formatMs(summary.avgDurationMs)}
          color="gray"
          icon={<ReloadIcon width="16" height="16" />}
          subtitle="per cron tick"
        />
        <StatCard
          label="Prompts Due"
          value={prompts.due}
          color={prompts.due > 0 ? "orange" : "blue"}
          icon={<LightningBoltIcon width="16" height="16" />}
          subtitle={`of ${prompts.active} active`}
        />
      </Grid>

      {/* Scheduler context */}
      <Grid columns={{ initial: "1", md: "2" }} gap="4">
        <Card size="2">
          <Flex direction="column" gap="2">
            <Text
              size="1"
              color="gray"
              weight="bold"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Cron Jobs (per tick)
            </Text>
            <Flex direction="column" gap="1" mt="1">
              <Flex align="center" justify="between">
                <Text size="2">1. Trial expiry sweep</Text>
                <Badge size="1" color="gray" variant="soft">
                  processExpiredTrials()
                </Badge>
              </Flex>
              <Flex align="center" justify="between">
                <Text size="2">2. Subscription sync</Text>
                <Badge size="1" color="gray" variant="soft">
                  syncSubscriptions()
                </Badge>
              </Flex>
              <Flex align="center" justify="between">
                <Text size="2">3. Prompt scheduler</Text>
                <Badge size="1" color="gray" variant="soft">
                  processDuePrompts()
                </Badge>
              </Flex>
            </Flex>
          </Flex>
        </Card>
        <Card size="2">
          <Flex direction="column" gap="2">
            <Text
              size="1"
              color="gray"
              weight="bold"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Space Subscriptions
            </Text>
            <Flex gap="2" mt="1" wrap="wrap">
              {Object.entries(subscriptions).map(([status, count]) => (
                <Badge
                  key={status}
                  size="1"
                  variant="soft"
                  color={
                    status === "ACTIVE"
                      ? "green"
                      : status === "TRIALING"
                        ? "blue"
                        : status === "PAST_DUE"
                          ? "orange"
                          : status === "CANCELED"
                            ? "red"
                            : "gray"
                  }
                >
                  {status}: {count}
                </Badge>
              ))}
              {Object.keys(subscriptions).length === 0 && (
                <Text size="2" color="gray">
                  No spaces
                </Text>
              )}
            </Flex>
          </Flex>
        </Card>
      </Grid>

      {/* Recent Runs Table */}
      <Card size="2">
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Heading size="3">Recent Runs</Heading>
            <Badge color="gray" size="1">
              Last {runs.length}
            </Badge>
          </Flex>
          {runs.length > 0 ? (
            <Box style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Run ID", "Started", "Duration", "Prompts", "Status"].map(
                      (h) => (
                        <th key={h} style={TH_STYLE}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={TD_STYLE}>
                        <Code size="1">{run.id.slice(0, 8)}...</Code>
                      </td>
                      <td style={TD_STYLE}>
                        <Text size="1" color="gray">
                          {new Date(run.startedAt).toLocaleString()}
                        </Text>
                      </td>
                      <td style={TD_STYLE}>
                        <Text size="2">{formatMs(run.durationMs)}</Text>
                      </td>
                      <td style={TD_STYLE}>
                        <Text size="2">{run.promptsProcessed}</Text>
                      </td>
                      <td style={TD_STYLE}>
                        <Badge
                          size="1"
                          variant="soft"
                          color={run.status === "completed" ? "green" : "orange"}
                        >
                          {run.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : (
            <Text size="2" color="gray">
              No cron runs recorded yet.
            </Text>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
