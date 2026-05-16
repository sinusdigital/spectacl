"use client";

import { useEffect, useState } from "react";
import {
    Container, Box, Flex, Grid, Heading, Text, Card, Badge,
    Table, Callout, Spinner, Button, ScrollArea, Separator,
} from "@radix-ui/themes";
import {
    ExclamationTriangleIcon,
    UpdateIcon,
    CheckCircledIcon,
    InfoCircledIcon,
} from "@radix-ui/react-icons";
import PlanBadge from "@/components/Shared/PlanBadge";
import { EnvStatusWidget } from "@/components/Admin/EnvStatusWidget";

// ── Types ────────────────────────────────────────────────────────────────────

interface SpaceRow {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    mollieCustomerId: string | null;
    mollieSubscriptionId: string | null;
    molliePaymentId: string | null;
    currentPeriodEnd: string | null;
    _count: { SpaceMember: number };
}

// ── Production Checklist ─────────────────────────────────────────────────────

const MOLLIE_DASHBOARD = [
    { item: "Register live webhook URL", sub: "https://app.spectacl.org/api/webhooks/mollie" },
    { item: "Enable payment methods (iDEAL, Card, etc.)", sub: "Mollie dashboard > Payment methods" },
    { item: "Complete business verification", sub: "Required before live_ key activates" },
];

// ── Test Scenarios ───────────────────────────────────────────────────────────

const TEST_SCENARIOS = [
    { category: "Happy Path", cases: [
        "New user: STARTER checkout → webhook → subscription created → credits reset",
        "Trial → PRO upgrade → old subscription canceled → new subscription created",
        "Canceled → resubscribe → clears cancellation data → new subscription",
    ]},
    { category: "Webhook Verification", cases: [
        "First payment: subscription created, credits reset, invoice generated",
        "Recurring payment: period extended, credits reset, invoice generated",
        "Failed payment: status → PAST_DUE (not CANCELED), Mollie retries",
        "Duplicate webhook: skipped via lastProcessedWebhookId",
    ]},
    { category: "Error & Security", cases: [
        "Member (not admin) tries checkout → 403",
        "FOUNDER plan checkout attempt → rejected",
        "Mollie API down during checkout → 500 with safe error message",
        "Webhook POST body never trusted — always verified via Mollie API",
    ]},
    { category: "Cancellation", cases: [
        "Owner cancels → Mollie subscription canceled → email sent → access until period end",
        "Admin cancels → same flow as owner",
        "Member tries to cancel → blocked",
    ]},
    { category: "Billing & VAT", cases: [
        "NL customer: charged €99 × 1.21 = €119.79 (21% BTW)",
        "EU with valid VAT ID: charged €99 (0% reverse charge)",
        "Non-EU customer: charged €99 (0% exempt)",
        "Invoice created with seller + buyer snapshots after payment",
        "Billing profile required before checkout → BILLING_PROFILE_REQUIRED error",
    ]},
    { category: "Payment Return Flow", cases: [
        "After Mollie redirect: 'Setting up' modal with progress bar",
        "Polls for mollieSubscriptionId every 2s",
        "Success modal shown only after webhook confirms",
        "30s timeout → 'Continue anyway' fallback",
    ]},
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(status: string): "green" | "lime" | "orange" | "red" | "gray" {
    switch (status) {
        case "ACTIVE": return "green";
        case "TRIALING": return "lime";
        case "PAST_DUE": return "orange";
        case "CANCELED": return "red";
        default: return "gray";
    }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsAdminPage() {
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

    const activeSpaces = spaces.filter(s => s.subscriptionStatus === "ACTIVE");
    const trialSpaces = spaces.filter(s => s.subscriptionStatus === "TRIALING");
    const pastDueSpaces = spaces.filter(s => s.subscriptionStatus === "PAST_DUE");

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">

                <Flex direction="column" gap="2">
                    <Heading size="6">Payments</Heading>
                    <Text size="3" color="gray">
                        Live billing monitor, production checklist, and test scenarios. Issues tracked in Notion.
                    </Text>
                </Flex>

                {/* Summary Cards */}
                <Grid columns={{ initial: "2", sm: "4" }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Active</Text>
                            <Text size="5" weight="bold" color="green">{activeSpaces.length}</Text>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Trial</Text>
                            <Text size="5" weight="bold" color="lime">{trialSpaces.length}</Text>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Past Due</Text>
                            <Text size="5" weight="bold" color={pastDueSpaces.length > 0 ? "orange" : "gray"}>
                                {pastDueSpaces.length}
                            </Text>
                        </Flex>
                    </Card>
                    <Card size="2">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="medium">Total Spaces</Text>
                            <Text size="5" weight="bold">{spaces.length}</Text>
                        </Flex>
                    </Card>
                </Grid>

                {/* Live Spaces Monitor */}
                <Flex direction="column" gap="4">
                    <Flex align="center" justify="between">
                        <Heading size="4">Live Spaces</Heading>
                        <Button
                            variant="soft" color="gray" size="1"
                            onClick={() => fetchSpaces(true)}
                            disabled={refreshing}
                        >
                            <Flex align="center" gap="1">
                                <UpdateIcon className={refreshing ? "animate-spin" : ""} />
                                Refresh
                            </Flex>
                        </Button>
                    </Flex>

                    {loading ? (
                        <Card>
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
                        <ScrollArea scrollbars="horizontal">
                            <Table.Root variant="surface">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeaderCell>Space</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Subscription ID</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Payment ID</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell justify="end">Period End</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {spaces.length === 0 ? (
                                        <Table.Row>
                                            <Table.Cell colSpan={6}>
                                                <Flex justify="center" py="6">
                                                    <Text size="2" color="gray">No spaces found.</Text>
                                                </Flex>
                                            </Table.Cell>
                                        </Table.Row>
                                    ) : spaces.map(space => (
                                        <Table.Row key={space.id}>
                                            <Table.RowHeaderCell>
                                                <Flex direction="column">
                                                    <Text size="2" weight="medium">{space.name}</Text>
                                                    <Text size="1" color="gray">
                                                        {space._count.SpaceMember} member{space._count.SpaceMember !== 1 ? "s" : ""}
                                                    </Text>
                                                </Flex>
                                            </Table.RowHeaderCell>
                                            <Table.Cell>
                                                <PlanBadge plan={space.plan} size="1" />
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={getStatusColor(space.subscriptionStatus)} variant="soft" size="1">
                                                    {space.subscriptionStatus}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono)" }}>
                                                    {space.mollieSubscriptionId ?? "—"}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono)" }}>
                                                    {space.molliePaymentId ?? "—"}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell justify="end">
                                                <Text size="1" color="gray">
                                                    {space.currentPeriodEnd
                                                        ? new Date(space.currentPeriodEnd).toLocaleDateString()
                                                        : "—"}
                                                </Text>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </ScrollArea>
                    )}
                </Flex>

                <Separator size="4" />

                {/* Production Checklist */}
                <Flex direction="column" gap="4">
                    <Heading size="4">Production Checklist</Heading>

                    <EnvStatusWidget groups="payments" description="Required environment variables for Mollie payments and billing." />

                    <Box>
                        <Text size="2" weight="medium" mb="2">Mollie Dashboard</Text>
                        <Flex direction="column" gap="2">
                            {MOLLIE_DASHBOARD.map(d => (
                                <Card key={d.item} variant="surface">
                                    <Flex align="center" gap="2" p="1">
                                        <CheckCircledIcon width="14" height="14" color="var(--gray-7)" />
                                        <Flex direction="column">
                                            <Text size="2" weight="medium">{d.item}</Text>
                                            <Text size="1" color="gray">{d.sub}</Text>
                                        </Flex>
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>
                    </Box>
                </Flex>

                <Separator size="4" />

                {/* Test Scenarios */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Test Scenarios</Heading>
                        <Text size="2" color="gray">Manual test cases for payment flow verification.</Text>
                    </Flex>
                    {TEST_SCENARIOS.map(group => (
                        <Box key={group.category}>
                            <Text size="1" weight="bold" color="gray" mb="2" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {group.category}
                            </Text>
                            <Card variant="surface">
                                <Flex direction="column" gap="1" p="1">
                                    {group.cases.map((c, i) => (
                                        <Flex key={i} align="start" gap="2" py="1">
                                            <CheckCircledIcon width="13" height="13" color="var(--gray-6)" style={{ marginTop: 3, flexShrink: 0 }} />
                                            <Text size="2" color="gray">{c}</Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Card>
                        </Box>
                    ))}
                </Flex>

                <Separator size="4" />

                {/* Key Files */}
                <Flex direction="column" gap="4">
                    <Heading size="4">Key Files</Heading>
                    <Callout.Root color="blue" size="1">
                        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                        <Callout.Text>
                            Full payment documentation, architecture diagrams, and open issues are tracked in Notion under Spectacl &gt; Technical Documentation &gt; Payments.
                        </Callout.Text>
                    </Callout.Root>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>File</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Purpose</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {[
                                ["src/app/api/mollie/checkout/route.ts", "First payment creation + tax calculation"],
                                ["src/app/api/mollie/confirm-payment/route.ts", "Client-side payment verification"],
                                ["src/app/api/webhooks/mollie/route.ts", "Payment + subscription webhooks"],
                                ["src/components/PaymentReturnHandler.tsx", "Payment return flow (3-phase with webhook polling)"],
                                ["src/components/Shared/PaymentSuccessModal.tsx", "Post-payment success modal"],
                                ["src/components/Shared/UpgradeRequiredModal.tsx", "Plan selection + billing form + checkout"],
                                ["src/components/Shared/CancellationSurveyModal.tsx", "Multi-step cancellation flow"],
                                ["src/lib/billing/invoices.ts", "Invoice creation orchestrator"],
                                ["src/lib/billing/tax.ts", "VAT calculation (3 scenarios)"],
                                ["src/lib/subscription-sync.ts", "Cron-based Mollie subscription reconciliation"],
                            ].map(([file, purpose]) => (
                                <Table.Row key={file}>
                                    <Table.Cell>
                                        <Text size="1" style={{ fontFamily: "var(--font-mono)" }}>{file}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">{purpose}</Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

            </Flex>
        </Container>
    );
}
