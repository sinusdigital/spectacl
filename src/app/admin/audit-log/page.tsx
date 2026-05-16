"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Container,
    Flex,
    Heading,
    Text,
    Table,
    Badge,
    Select,
    Code,
} from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import Button from "@/components/Shared/Button";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    detail: Record<string, unknown> | null;
    createdAt: string;
    user: { id: string; name: string; email: string };
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, "red" | "blue" | "green" | "amber" | "gray"> = {
    "space.delete": "red",
    "space.lock": "red",
    "space.unlock": "green",
    "space.credits.reset": "amber",
    "space.update": "blue",
    "user.role.update": "amber",
    "user.space_role.update": "amber",
    "model.create": "green",
    "model.update": "blue",
    "domain.update": "blue",
    "domain_type.create": "green",
    "domain_type.update": "blue",
    "domain_type.delete": "red",
    "language.create": "green",
    "language.update": "blue",
    "language.delete": "red",
    "settings.update": "amber",
    "plan_limits.update": "amber",
    "waitlist.update": "blue",
};

function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDetail(detail: Record<string, unknown> | null): string {
    if (!detail) return "";
    const entries = Object.entries(detail).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return "";
    return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(", ");
}

const ALL_ACTIONS = [
    "space.lock", "space.unlock", "space.delete", "space.update", "space.credits.reset",
    "user.role.update", "user.space_role.update",
    "model.create", "model.update",
    "domain.update", "domain_type.create", "domain_type.update", "domain_type.delete",
    "language.create", "language.update", "language.delete",
    "settings.update", "plan_limits.update",
    "waitlist.update",
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async (p: number, action: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p) });
            if (action) params.set("action", action);
            const res = await fetch(`/api/admin/audit-log?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            setLogs(data.logs);
            setPagination(data.pagination);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs(page, actionFilter);
    }, [page, actionFilter, fetchLogs]);

    const handleFilterChange = (value: string) => {
        setActionFilter(value === "all" ? "" : value);
        setPage(1);
    };

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="6">
                {/* Header */}
                <Flex direction="column" gap="2">
                    <Heading size="6">Audit Log</Heading>
                    <Text size="3" color="gray">
                        Record of all admin actions. {pagination ? `${pagination.total} entries total.` : ""}
                    </Text>
                </Flex>

                {/* Filter */}
                <Flex align="center" gap="3">
                    <Text size="2" color="gray">Filter by action:</Text>
                    <Select.Root value={actionFilter || "all"} onValueChange={handleFilterChange}>
                        <Select.Trigger variant="soft" style={{ minWidth: 200 }} />
                        <Select.Content>
                            <Select.Item value="all">All actions</Select.Item>
                            <Select.Separator />
                            {ALL_ACTIONS.map(a => (
                                <Select.Item key={a} value={a}>{a}</Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </Flex>

                {/* Table */}
                <Table.Root variant="surface" size="1">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell style={{ width: 100 }}>Time</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 140 }}>Admin</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 160 }}>Action</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 100 }}>Target</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Detail</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && logs.length === 0 ? (
                            <Table.Row>
                                <Table.Cell colSpan={5}>
                                    <Text size="2" color="gray">Loading...</Text>
                                </Table.Cell>
                            </Table.Row>
                        ) : logs.length === 0 ? (
                            <Table.Row>
                                <Table.Cell colSpan={5}>
                                    <Text size="2" color="gray">No audit entries yet.</Text>
                                </Table.Cell>
                            </Table.Row>
                        ) : (
                            logs.map(log => (
                                <Table.Row key={log.id}>
                                    <Table.Cell>
                                        <Text size="1" color="gray">{formatTime(log.createdAt)}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="1" weight="medium">{log.user.name}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            color={ACTION_COLORS[log.action] ?? "gray"}
                                            variant="soft"
                                            size="1"
                                        >
                                            {log.action}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Flex direction="column" gap="0">
                                            <Text size="1">{log.targetType}</Text>
                                            {log.targetId && (
                                                <Code size="1" color="gray" style={{ fontSize: 10 }}>
                                                    {log.targetId.length > 12 ? `${log.targetId.slice(0, 12)}...` : log.targetId}
                                                </Code>
                                            )}
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="1" color="gray" style={{ wordBreak: "break-word" }}>
                                            {formatDetail(log.detail)}
                                        </Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))
                        )}
                    </Table.Body>
                </Table.Root>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <Flex align="center" justify="between">
                        <Text size="1" color="gray">
                            Page {pagination.page} of {pagination.totalPages}
                        </Text>
                        <Flex gap="2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeftIcon /> Prev
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next <ChevronRightIcon />
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </Container>
    );
}
