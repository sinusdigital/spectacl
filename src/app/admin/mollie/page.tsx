"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/Shared/PageHeader";
import {
    CheckCircledIcon,
    CircleIcon,
    CrossCircledIcon,
    DotFilledIcon,
    ExclamationTriangleIcon,
    UpdateIcon,
} from "@radix-ui/react-icons";
import { Container, Box, Flex, Grid, Heading, Text, Card, Badge, Table, Callout, Spinner, Button, ScrollArea, Separator } from "@radix-ui/themes";

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemStatus = "done" | "in-progress" | "todo";

interface StatusItem {
    title: string;
    status: ItemStatus;
    detail: string;
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ItemStatus }) {
    if (status === "done") return <CheckCircledIcon width="14" height="14" color="var(--green-9)" />;
    if (status === "in-progress") return <DotFilledIcon width="16" height="16" color="var(--blue-9)" />;
    return <CircleIcon width="14" height="14" color="var(--gray-7)" />;
}

function StatusBadge({ status }: { status: ItemStatus }) {
    if (status === "done") return <Badge color="green" variant="soft" size="1">Done</Badge>;
    if (status === "in-progress") return <Badge color="blue" variant="soft" size="1">In Progress</Badge>;
    return <Badge color="gray" variant="soft" size="1">Todo</Badge>;
}

// ── Issue card ────────────────────────────────────────────────────────────────

type Severity = "high" | "medium" | "low";

interface Issue {
    id: number;
    severity: Severity;
    title: string;
    detail: string;
    status: ItemStatus;
    file?: string;
}

function SeverityBadge({ severity }: { severity: Severity }) {
    const color = severity === "high" ? "orange" : severity === "medium" ? "yellow" : "gray";
    return <Badge color={color} variant="soft" size="1">{severity.toUpperCase()}</Badge>;
}

// ── Spaces monitor ────────────────────────────────────────────────────────────

interface SpaceRow {
    id: string;
    name: string;
    slug: string;
    plan: string;
    llmProvider: "MANAGED" | "BYOK";
    subscriptionStatus: string;
    mollieCustomerId: string | null;
    mollieSubscriptionId: string | null;
    molliePaymentId: string | null;
    currentPeriodEnd: string | null;
    createdAt: string;
    _count: { SpaceMember: number };
}

function getStatusBadgeColor(status: string) {
    switch (status) {
        case "ACTIVE":     return "green";
        case "TRIALING":   return "blue";
        case "PAST_DUE":   return "orange";
        case "CANCELED":   return "red";
        default:           return "gray";
    }
}

function getPlanBadgeColor(plan: string) {
    switch (plan) {
        case "STARTER":    return "blue";
        case "PRO":        return "iris";
        case "BUSINESS":   return "teal";
        case "ENTERPRISE": return "gray";
        case "FOUNDER":    return "amber";
        default:           return "gray";
    }
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CORE_FEATURES: StatusItem[] = [
    { title: "SDK & Environment",                status: "done", detail: "@mollie/api-client installed, env vars, src/lib/mollie.ts" },
    { title: "Database Schema",                  status: "done", detail: "mollieCustomerId, mollieSubscriptionId, molliePaymentId, lastProcessedWebhookId, currentPeriodEnd on Space" },
    { title: "Checkout Flow",                    status: "done", detail: "POST /api/mollie/checkout creates first payment, POST /api/mollie/confirm-payment verifies on redirect" },
    { title: "Webhook Handler",                  status: "done", detail: "POST /api/webhooks/mollie handles payments + subscription cancellation with Mollie API verification" },
    { title: "Subscription Creation",            status: "done", detail: "Auto-creates Mollie recurring subscription after first payment succeeds" },
    { title: "Recurring Payment + Period Extend", status: "done", detail: "Webhook extends currentPeriodEnd and resets credits on each billing cycle" },
    { title: "Cancellation Flow",               status: "done", detail: "Multi-step survey modal, Mollie subscription cancel, email, CancellationBanner" },
    { title: "Resubscription Flow",             status: "done", detail: "UpgradeRequiredModal mode=resubscribe, clears canceledAt on first payment" },
    { title: "Credit System",                   status: "done", detail: "Dynamic calculation (prompts x 31 x models), deduction per LLM call, exhaustion guard, billing-aligned reset" },
    { title: "Admin Pricing Config",            status: "done", detail: "/admin/pricing with DB overrides via systemSetting, stripped to safe fields on save" },
    { title: "Frontend Upgrade Modal",          status: "done", detail: "UpgradeRequiredModal with remote plan data, PRO recommended badge logic" },
    { title: "Plan Limits Auth",                status: "done", detail: "PUT /api/admin/plan-limits requires admin role (GET is public — prices are non-sensitive)" },
    { title: "Webhook Security",                status: "done", detail: "Payment path verifies via Mollie API fetch-back. Cancellation path now verifies subscription status. Returns 500 on transient errors for Mollie retries." },
    { title: "Idempotency",                     status: "done", detail: "lastProcessedWebhookId prevents double-processing. confirm-payment no longer sets it — webhook always runs full flow." },
    { title: "Enterprise Guard",                status: "done", detail: "ENTERPRISE removed from VALID_PLANS in checkout + confirm-payment (contact-us only)" },
    { title: "Subscription Failure Handling",    status: "done", detail: "Failed subscription creation sets INCOMPLETE (not ACTIVE), surfacing in admin for manual recovery" },
    { title: "Credit Exhaustion Guard",          status: "done", detail: "LLM calls skipped when credits <= 0 (checked before each call with fresh DB read)" },
];

const OPEN_ISSUES: Issue[] = [
    // HIGH
    {
        id: 7,
        severity: "high",
        title: "Failed payment sets PAST_DUE with grace period",
        detail: "Fixed: failed Mollie payments now map to PAST_DUE (not CANCELED). Mollie retries failed payments — if a retry succeeds, the next webhook sets ACTIVE. Only expired/canceled payments set CANCELED.",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 8,
        severity: "high",
        title: "Atomic idempotency prevents duplicate subscription creation",
        detail: "Fixed: idempotency check now uses atomic updateMany with WHERE clause (compare-and-set). Only one concurrent webhook can claim processing — prevents double billing from duplicate deliveries.",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 9,
        severity: "high",
        title: "Safe month addition prevents billing period drift",
        detail: "Fixed: addOneMonth() helper clamps to last day of target month (Jan 31 + 1mo = Feb 28, not Mar 3). Applied in webhook (3 places) and confirm-payment.",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 10,
        severity: "high",
        title: "Fake downgrade offer removed from cancellation flow",
        detail: "Fixed: the save_offer step was removed entirely. The non-functional 'Downgrade to Starter' button that showed a misleading toast is gone. Flow now goes survey -> confirm directly. currentPlan prop preserved for future downgrade implementation.",
        status: "done",
        file: "src/components/Shared/CancellationSurveyModal.tsx",
    },
    {
        id: 11,
        severity: "high",
        title: "Entity-Space cascade delete prevents orphaning",
        detail: "Fixed: Entity.spaceId now has @relation with onDelete: Cascade. Migration cleans up orphaned entities first. Deleting a Space now properly cascades to all its Entities.",
        status: "done",
        file: "prisma/schema.prisma",
    },
    {
        id: 12,
        severity: "high",
        title: "Dead monthlyCreditLimit field removed from PLAN_LIMITS",
        detail: "Fixed: removed monthlyCreditLimit from all 5 plan configs. Fixed backfill-credits.ts to use calculateMonthlyCreditsFromDb(). Fixed UsageSettings.tsx and UpgradeRequiredModal.tsx references.",
        status: "done",
    },
    {
        id: 13,
        severity: "high",
        title: "Global webhook catch returns 500 for Mollie retries",
        detail: "Fixed: global catch now returns 500 so Mollie retries transient errors. Individual validation failures (missing metadata, missing space) still return 200 — these are permanent errors that shouldn't be retried.",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 14,
        severity: "high",
        title: "Webhook updateData typed as Prisma.SpaceUpdateInput",
        detail: "Fixed: updateData is now typed as Prisma.SpaceUpdateInput for compile-time safety on the most critical DB write in the billing system.",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 15,
        severity: "high",
        title: "Admin plan-limits save stripped to safe fields only",
        detail: "Fixed: PUT now strips to safe editable fields only (maxMembers, maxEntities, maxActivePrompts, dataRetentionDays, priceManaged, priceByok). Features and prices arrays are no longer frozen in DB overrides.",
        status: "done",
        file: "src/app/api/admin/plan-limits/route.ts",
    },
    // MEDIUM — fixed
    {
        id: 16,
        severity: "medium",
        title: "Recurring payment now uses metadata plan for credit calculation",
        detail: "Fixed: recurring payment credit calculation uses `plan` from payment metadata (consistent with updateData.plan) instead of stale `space.plan` from DB.",
        status: "done",
        file: "src/app/api/webhooks/mollie/route.ts",
    },
    {
        id: 18,
        severity: "medium",
        title: "returnPath validated to prevent open redirect",
        detail: "Fixed: returnPath is validated — must start with /, no double slashes, no backslashes, safe characters only. Falls back to /spaces if invalid.",
        status: "done",
        file: "src/app/api/mollie/checkout/route.ts",
    },
    {
        id: 20,
        severity: "medium",
        title: "BYOK no longer gives unlimited credits",
        detail: "Fixed: Space creation always uses MANAGED provider and calculates credits normally. BYOK branch removed. BYOK validation removed from input.",
        status: "done",
        file: "src/app/api/spaces/route.ts",
    },
    {
        id: 24,
        severity: "medium",
        title: "Admin credit override now resets llmCreditsUsed and creditResetDate",
        detail: "Fixed: admin credit override also resets llmCreditsUsed to 0 and creditResetDate to now, preventing stale counters and unexpected worker resets.",
        status: "done",
        file: "src/app/api/admin/spaces/[id]/credits/route.ts",
    },
    {
        id: 25,
        severity: "medium",
        title: "Cancellation email now includes billing period end date",
        detail: "Fixed: CancellationEmail accepts periodEndDate prop. Cancel API passes currentPeriodEnd. Email shows 'until 5 May 2026' instead of vague 'end of billing period'.",
        status: "done",
        file: "src/emails/cancellation-email.tsx",
    },
    {
        id: 26,
        severity: "medium",
        title: "backfill-credits.ts updated to use dynamic formula",
        detail: "Fixed: Script now uses calculateMonthlyCreditsFromDb() with dynamic model count. Also resets llmCreditsUsed to 0.",
        status: "done",
        file: "src/scripts/backfill-credits.ts",
    },
    // MEDIUM — deferred (need architectural work or new features)
    {
        id: 17,
        severity: "medium",
        title: "Model count changes mid-cycle cause credit limit drift",
        detail: "Fixed: Admin pricing page has 'Allow negative credits' toggle. When enabled, spaces continue past zero credits instead of being blocked. Drift auto-corrects at next credit reset. Monitor negative balances manually for misuse.",
        status: "done",
    },
    {
        id: 19,
        severity: "medium",
        title: "Price field dual-keying: priceManaged vs prices.MANAGED",
        detail: "Two representations exist — flat priceManaged (admin DB override) and nested prices.MANAGED (code default). Merge precedence works correctly but is fragile. Needs a broader pricing model refactor.",
        status: "todo",
    },
    {
        id: 21,
        severity: "medium",
        title: "No failed payment notification email, no trial expiry email",
        detail: "Users receive no notification when a payment fails (PAST_DUE status) or when their trial expires. Needs new email templates + webhook/cron triggers.",
        status: "todo",
    },
    {
        id: 22,
        severity: "medium",
        title: "90-day dormant space deletion promised but not implemented",
        detail: "Cancellation email and modal promise 'data available for 90 days then permanently deleted' but no automated purge worker exists. Low urgency — no production cancellations yet.",
        status: "todo",
    },
    {
        id: 23,
        severity: "medium",
        title: "Trial expiry is lazy — DB stays TRIALING until scheduler hits a prompt",
        detail: "No proactive cron to scan for expired trials. Space stays TRIALING in DB until the scheduler encounters it. Needs a periodic sweep job.",
        status: "todo",
    },
];

// ── Production checklist ──────────────────────────────────────────────────────

const ENV_VARS = [
    { key: "MOLLIE_API_KEY",         note: "Switch test_... to live_... (Mollie dashboard > API keys)", critical: true },
    { key: "NEXT_PUBLIC_APP_URL",    note: "Production domain e.g. https://app.spectacl.org", critical: true },
    { key: "MOLLIE_WEBHOOK_URL",     note: "Optional — auto-derived from APP_URL if not set", critical: false },
];

const MOLLIE_DASHBOARD = [
    { item: "Register live webhook URL", sub: "https://app.spectacl.org/api/webhooks/mollie", critical: true },
    { item: "Enable payment methods (iDEAL, Card, etc.)", sub: "Mollie dashboard > Payment methods", critical: true },
    { item: "Complete business verification for live payments", sub: "Required before live_ key activates", critical: true },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MollieAdminPage() {
    const [spaces, setSpaces] = useState<SpaceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSpaces = async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const res = await fetch("/api/admin/mollie/spaces");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setSpaces(data.spaces ?? []);
            setError(null);
        } catch {
            setError("Could not load space data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchSpaces(); }, []);

    const paidSpaces  = spaces.filter(s => s.molliePaymentId);
    const issuesRemaining = OPEN_ISSUES.filter(i => i.status !== "done");
    const issuesByHigh = issuesRemaining.filter(i => i.severity === "high");
    const issuesByMed  = issuesRemaining.filter(i => i.severity === "medium");

    return (
        <Container size="4" p="6">
            <Box mb="8">
                <PageHeader
                    title="Mollie Integration"
                    description="Payment system status, known issues, and production checklist."
                />
            </Box>

            <Flex direction="column" gap="8">
                {/* ── Summary ── */}
                <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Core Features</Text>
                            <Flex align="baseline" gap="2">
                                <Text size="6" weight="bold" color="green">{CORE_FEATURES.filter(f => f.status === "done").length}</Text>
                                <Text size="2" color="gray">/ {CORE_FEATURES.length} implemented</Text>
                            </Flex>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Open Issues</Text>
                            <Flex align="baseline" gap="2">
                                <Text size="6" weight="bold" color={issuesByHigh.length > 0 ? "orange" : "green"}>
                                    {issuesRemaining.length}
                                </Text>
                                <Text size="2" color="gray">
                                    ({issuesByHigh.length} high, {issuesByMed.length} medium)
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Paid Spaces</Text>
                            <Flex align="baseline" gap="2">
                                <Text size="6" weight="bold">{paidSpaces.length}</Text>
                                <Text size="2" color="gray">with Mollie payment</Text>
                            </Flex>
                        </Flex>
                    </Card>
                </Grid>

                {/* ── Implementation Status ── */}
                <Box>
                    <Heading size="4" mb="4">Implementation Status</Heading>
                    <Card size="1">
                        <Flex direction="column" gap="1" p="1">
                            {CORE_FEATURES.map(f => (
                                <Flex key={f.title} align="start" gap="3" py="1">
                                    <Box mt="1" flexShrink="0">
                                        <StatusIcon status={f.status} />
                                    </Box>
                                    <Flex direction="column" gap="0" style={{ flex: 1 }}>
                                        <Flex align="center" gap="2">
                                            <Text size="2" weight="medium">{f.title}</Text>
                                            <StatusBadge status={f.status} />
                                        </Flex>
                                        <Text size="1" color="gray">{f.detail}</Text>
                                    </Flex>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                </Box>

                {/* ── Known Issues ── */}
                <Box>
                    <Flex align="center" gap="2" mb="4">
                        <Heading size="4">Known Issues</Heading>
                        <Badge color="orange" variant="soft" size="1">
                            {issuesRemaining.length} open
                        </Badge>
                    </Flex>

                    <Flex direction="column" gap="3">
                        {OPEN_ISSUES.map(issue => (
                            <Card
                                key={issue.id}
                                size="1"
                                style={{
                                    borderLeft: `3px solid var(--${
                                        issue.status === "done" ? "green" :
                                        issue.severity === "high" ? "orange" :
                                        issue.severity === "medium" ? "yellow" : "gray"
                                    }-8)`,
                                    opacity: issue.status === "done" ? 0.6 : 1,
                                }}
                            >
                                <Flex align="start" gap="3" p="2">
                                    <Box mt="1" flexShrink="0">
                                        {issue.status === "done"
                                            ? <CheckCircledIcon width="14" height="14" color="var(--green-9)" />
                                            : <CrossCircledIcon width="14" height="14" color={`var(--${issue.severity === "high" ? "orange" : "yellow"}-9)`} />
                                        }
                                    </Box>
                                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                        <Flex align="center" gap="2" wrap="wrap">
                                            <Text size="2" weight="bold">#{issue.id}</Text>
                                            <SeverityBadge severity={issue.severity} />
                                            <StatusBadge status={issue.status} />
                                            <Text size="2" weight="medium">{issue.title}</Text>
                                        </Flex>
                                        <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>{issue.detail}</Text>
                                        {issue.file && (
                                            <Text size="1" style={{ fontFamily: "var(--font-mono)", color: "var(--gray-8)" }}>
                                                {issue.file}
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                </Box>

                <Separator size="4" />

                {/* ── Live Spaces Monitor ── */}
                <Box>
                    <Flex align="center" justify="between" mb="4">
                        <Box>
                            <Heading size="4">Live Spaces</Heading>
                            <Text size="2" color="gray">{paidSpaces.length} with Mollie payment</Text>
                        </Box>
                        <Button
                            variant="soft"
                            color="gray"
                            size="1"
                            onClick={() => fetchSpaces(true)}
                            disabled={refreshing}
                        >
                            <Flex align="center" gap="1.5">
                                <UpdateIcon className={refreshing ? "animate-spin" : ""} />
                                Refresh
                            </Flex>
                        </Button>
                    </Flex>

                    {loading ? (
                        <Card size="3">
                            <Flex justify="center" align="center" py="8" gap="3">
                                <Spinner size="3" />
                                <Text size="2" color="gray">Loading spaces...</Text>
                            </Flex>
                        </Card>
                    ) : error ? (
                        <Callout.Root color="red">
                            <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                            <Callout.Text>{error}</Callout.Text>
                        </Callout.Root>
                    ) : (
                        <Card size="1">
                            <ScrollArea scrollbars="horizontal">
                                <Table.Root variant="surface">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeaderCell>Space</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Subscription ID</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Payment ID</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell align="right">Period End</Table.ColumnHeaderCell>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {spaces.length === 0 ? (
                                            <Table.Row>
                                                <Table.Cell colSpan={6}>
                                                    <Flex justify="center" py="8">
                                                        <Text size="2" color="gray">No spaces found.</Text>
                                                    </Flex>
                                                </Table.Cell>
                                            </Table.Row>
                                        ) : spaces.map(space => (
                                            <Table.Row key={space.id}>
                                                <Table.RowHeaderCell>
                                                    <Flex direction="column">
                                                        <Text size="2" weight="bold">{space.name}</Text>
                                                        <Text size="1" color="gray">
                                                            {space._count.SpaceMember} member{space._count.SpaceMember !== 1 ? "s" : ""}
                                                        </Text>
                                                    </Flex>
                                                </Table.RowHeaderCell>
                                                <Table.Cell>
                                                    <Badge color={getPlanBadgeColor(space.plan)} variant="soft" size="1">
                                                        {space.plan}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge color={getStatusBadgeColor(space.subscriptionStatus)} variant="soft" size="1">
                                                        {space.subscriptionStatus}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {space.mollieSubscriptionId ? (
                                                        <Text size="1" style={{
                                                            fontFamily: "var(--font-mono)",
                                                            backgroundColor: "var(--gray-3)",
                                                            padding: "2px 4px",
                                                            borderRadius: "4px",
                                                        }}>
                                                            {space.mollieSubscriptionId}
                                                        </Text>
                                                    ) : (
                                                        <Text size="1" color="gray">--</Text>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {space.molliePaymentId ? (
                                                        <Text size="1" style={{
                                                            fontFamily: "var(--font-mono)",
                                                            backgroundColor: "var(--gray-3)",
                                                            padding: "2px 4px",
                                                            borderRadius: "4px",
                                                        }}>
                                                            {space.molliePaymentId}
                                                        </Text>
                                                    ) : (
                                                        <Text size="1" color="gray">--</Text>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell align="right">
                                                    <Text size="1" color="gray">
                                                        {space.currentPeriodEnd
                                                            ? new Date(space.currentPeriodEnd).toLocaleDateString("en-GB")
                                                            : "--"}
                                                    </Text>
                                                </Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </ScrollArea>
                        </Card>
                    )}
                </Box>

                <Separator size="4" />

                {/* ── Production Checklist ── */}
                <Box>
                    <Heading size="4" mb="4">Production Checklist</Heading>
                    <Grid columns={{ initial: "1", md: "2" }} gap="4">
                        <Card size="2">
                            <Heading size="3" mb="3" color="gray">Environment Variables</Heading>
                            <Flex direction="column" gap="2">
                                {ENV_VARS.map(v => (
                                    <Flex key={v.key} align="center" gap="3">
                                        <Box
                                            width="8px" height="8px"
                                            flexShrink="0"
                                            style={{
                                                borderRadius: "50%",
                                                backgroundColor: v.critical ? "var(--red-9)" : "var(--gray-7)",
                                            }}
                                        />
                                        <Text size="1" weight="bold" style={{
                                            fontFamily: "var(--font-mono)",
                                            backgroundColor: "var(--gray-3)",
                                            padding: "2px 4px",
                                            borderRadius: "4px",
                                        }}>
                                            {v.key}
                                        </Text>
                                        <Text size="1" color="gray">{v.note}</Text>
                                    </Flex>
                                ))}
                            </Flex>
                        </Card>

                        <Card size="2">
                            <Heading size="3" mb="3" color="gray">Mollie Dashboard</Heading>
                            <Flex direction="column" gap="3">
                                {MOLLIE_DASHBOARD.map(v => (
                                    <Flex key={v.item} align="start" gap="3">
                                        <Box
                                            mt="1" width="8px" height="8px"
                                            flexShrink="0"
                                            style={{
                                                borderRadius: "50%",
                                                backgroundColor: v.critical ? "var(--red-9)" : "var(--gray-7)",
                                            }}
                                        />
                                        <Flex direction="column">
                                            <Text size="2" weight="medium">{v.item}</Text>
                                            <Text size="1" color="gray">{v.sub}</Text>
                                        </Flex>
                                    </Flex>
                                ))}
                            </Flex>
                        </Card>

                        <Card size="2" style={{ borderLeft: "4px solid var(--green-9)" }}>
                            <Heading size="3" mb="3" color="green">Database</Heading>
                            <Flex direction="column" gap="2">
                                <Flex align="start" gap="3">
                                    <CheckCircledIcon color="var(--green-9)" style={{ marginTop: "2px", flexShrink: 0 }} />
                                    <Text size="1" color="gray">All Mollie fields migrated and deployed. prisma migrate deploy runs on build.</Text>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card size="2" style={{ borderLeft: "4px solid var(--green-9)" }}>
                            <Heading size="3" mb="3" color="green">Security</Heading>
                            <Flex direction="column" gap="2">
                                <Flex align="start" gap="3">
                                    <CheckCircledIcon color="var(--green-9)" style={{ marginTop: "2px", flexShrink: 0 }} />
                                    <Text size="1" color="gray">Webhook verifies via Mollie API fetch-back. Plan limits PUT requires admin auth. Enterprise excluded from checkout.</Text>
                                </Flex>
                            </Flex>
                        </Card>
                    </Grid>

                    <Flex align="center" gap="4" mt="4">
                        <Flex align="center" gap="2">
                            <Box width="8px" height="8px" style={{ borderRadius: "50%", backgroundColor: "var(--red-9)" }} />
                            <Text size="1" color="gray">Critical</Text>
                        </Flex>
                        <Flex align="center" gap="2">
                            <Box width="8px" height="8px" style={{ borderRadius: "50%", backgroundColor: "var(--gray-7)" }} />
                            <Text size="1" color="gray">Nice-to-have</Text>
                        </Flex>
                    </Flex>
                </Box>
            </Flex>
        </Container>
    );
}
