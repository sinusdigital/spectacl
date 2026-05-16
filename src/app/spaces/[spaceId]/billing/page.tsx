"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    Flex,
    Box,
    Grid,
    Container,
    Heading,
    Text,
    Button,
    Card,
    Badge,
    Spinner,
    Callout,
    Link,
} from "@radix-ui/themes";
import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";

import PageContainer from "@/components/Shared/PageContainer";
import Header from "@/components/Shared/Header";
import PlanBadge from "@/components/Shared/PlanBadge";
import { isSelfHosted } from "@/lib/mode";
import RadixProgress from "@/components/Shared/RadixProgress";
import { PLAN_LIMITS, PlanKey, isUnlimited } from "@/lib/billing/plans";
import CancellationSurveyModal from "@/components/Shared/CancellationSurveyModal";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";
import BillingSettings from "@/components/Settings/BillingSettings";

export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpaceData {
    id: string;
    name: string;
    slug: string;
    plan: PlanKey;
    llmProvider: string;
    memberCount: number;
    subscriptionStatus: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    canceledAt?: string;
    usage?: {
        memberCount: number;
        entityCount: number;
        promptCount: number;
        totalAnalysisRuns: number;
    };
    mollieCustomerId?: string;
    userRole?: "OWNER" | "ADMIN" | "MEMBER";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsageCard({
    label,
    current,
    limit,
    unit = ""
}: {
    label: string,
    current: number,
    limit: number,
    unit?: string
}) {
    const isInf = isUnlimited(limit);
    const percentage = isInf ? 0 : Math.min(Math.round((current / limit) * 100), 100);
    const displayLimit = isInf ? "Unlimited" : limit;

    return (
        <Card variant="surface">
            <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                    <Text size="1" weight="medium" color="gray">
                        {label}
                    </Text>
                    <Text size="1" color="gray">
                        {percentage}%
                    </Text>
                </Flex>
                <Text size="4" weight="bold">
                    {current} <Text size="2" weight="regular" color="gray">/ {displayLimit} {unit}</Text>
                </Text>
                {!isInf && <RadixProgress.Root value={percentage} />}
            </Flex>
        </Card>
    );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

export default function BillingPage() {
    // Self-hosted mode: billing page not applicable
    if (isSelfHosted()) {
        return (
            <Flex align="center" justify="center" style={{ height: "60vh" }}>
                <Text color="gray" size="3">Billing is not available in self-hosted mode.</Text>
            </Flex>
        );
    }

    return (
        <Suspense fallback={
            <Flex align="center" justify="center" style={{ height: "60vh" }}>
                <Spinner size="3" />
            </Flex>
        }>
            <BillingPageContent />
        </Suspense>
    );
}

function BillingPageContent() {
    const params = useParams();
    const spaceId = params.spaceId as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<SpaceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [supportEmail, setSupportEmail] = useState("hello@spectacl.org");

    async function loadData() {
        try {
            const [spaceRes, memberRes, settingsRes] = await Promise.all([
                fetch(`/api/spaces/${spaceId}`),
                fetch(`/api/spaces/${spaceId}/members/me`),
                fetch("/api/settings/public?keys=support_email"),
            ]);
            if (!spaceRes.ok) throw new Error("Failed to fetch space details");
            const json = await spaceRes.json();
            const memberJson = memberRes.ok ? await memberRes.json() : null;
            setData({ ...json, userRole: memberJson?.role ?? undefined });
            if (settingsRes.ok) {
                const s = await settingsRes.json();
                if (s.support_email) setSupportEmail(s.support_email);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const payment = searchParams.get("payment");

        if (payment === "pending") {
            // PaymentReturnHandler in AppShell handles confirm-payment.
            // Defer loadData() until it resolves to avoid a CANCELED flash.
            const onResolved = () => loadData();
            window.addEventListener('payment-resolved', onResolved);
            return () => window.removeEventListener('payment-resolved', onResolved);
        } else {
            loadData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaceId]);

    if (loading) {
        return (
            <PageContainer>
                <Flex align="center" justify="center" style={{ height: "60vh" }}>
                    <Spinner size="3" />
                </Flex>
            </PageContainer>
        );
    }

    if (error || !data) {
        return (
            <PageContainer>
                <Container size="3" p="6">
                    <Flex direction="column" align="center" gap="4" py="9">
                        <Cross2Icon width="40" height="40" style={{ color: "var(--red-9)" }} />
                        <Heading size="5">Ops! Something went wrong</Heading>
                        <Text color="gray">{error || "Could not load billing data"}</Text>
                        <Button variant="soft" onClick={() => window.location.reload()}>Retry</Button>
                    </Flex>
                </Container>
            </PageContainer>
        );
    }

    const currentPlanLimits = PLAN_LIMITS[data.plan as PlanKey] || PLAN_LIMITS.STARTER;
    const isTrial = data.subscriptionStatus === "TRIALING";
    const isCanceled = data.subscriptionStatus === "CANCELED";
    const isIncomplete = data.subscriptionStatus === "INCOMPLETE";

    const STATUS_LABELS: Record<string, string> = {
        ACTIVE: 'Active',
        TRIALING: 'Trial',
        INCOMPLETE: 'No subscription',
        CANCELED: 'Canceled',
        PAST_DUE: 'Past due',
    };
    const STATUS_COLORS: Record<string, 'lime' | 'orange' | 'red' | 'gray'> = {
        ACTIVE: 'lime',
        TRIALING: 'lime',
        INCOMPLETE: 'orange',
        CANCELED: 'orange',
        PAST_DUE: 'red',
    };

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex justify="between" align="center" width="100%">
                            <Header.Content>
                                <Header.Title as="h1" size="4" weight="bold">Billing</Header.Title>
                            </Header.Content>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 20
                }
            ]}
        >
            <Container size="3" p="6">
                <Flex direction="column" gap="6">

                    <Card size="3">
                                <Flex direction="column" gap="4">
                                    <Flex justify="between" align="center">
                                        <Flex align="center" gap="2">
                                            <Heading size="4" weight="bold">Current Plan</Heading>
                                            <PlanBadge plan={data.plan} size="2" />
                                        </Flex>
                                        <Badge
                                            color={STATUS_COLORS[data.subscriptionStatus] ?? 'gray'}
                                            variant="soft"
                                        >
                                            {STATUS_LABELS[data.subscriptionStatus] ?? data.subscriptionStatus}
                                        </Badge>
                                    </Flex>

                                    {isTrial && data.trialEndsAt && (
                                        <Box p="3" style={{ background: 'var(--accent-2)', borderRadius: 'var(--radius-3)' }}>
                                            <Flex align="center" gap="2">
                                                <InfoCircledIcon style={{ color: "var(--accent-9)" }} />
                                                <Text size="2" color="lime" weight="medium">
                                                    Trial ends on {new Date(data.trialEndsAt).toLocaleDateString()}
                                                </Text>
                                            </Flex>
                                        </Box>
                                    )}

                                    {data.subscriptionStatus === 'ACTIVE' && data.currentPeriodEnd && (
                                        <Box p="3" style={{ background: 'var(--gray-2)', borderRadius: 'var(--radius-3)' }}>
                                            <Flex align="center" gap="2">
                                                <InfoCircledIcon style={{ color: "var(--gray-9)" }} />
                                                <Text size="2" color="gray">
                                                    Next billing date:{" "}
                                                    <Text size="2" color="gray" weight="medium">
                                                        {new Date(data.currentPeriodEnd).toLocaleDateString()}
                                                    </Text>
                                                </Text>
                                            </Flex>
                                        </Box>
                                    )}

                                    <Grid columns={{ initial: "1", sm: "3" }} gap="3">
                                        <UsageCard
                                            label="Active Prompts"
                                            current={data.usage?.promptCount || 0}
                                            limit={currentPlanLimits.maxActivePrompts}
                                            unit="prompts"
                                        />
                                        <UsageCard
                                            label="Active Entities"
                                            current={data.usage?.entityCount || 0}
                                            limit={currentPlanLimits.maxEntities}
                                            unit="entities"
                                        />
                                        <UsageCard
                                            label="Team Members"
                                            current={data.usage?.memberCount || data.memberCount || 0}
                                            limit={currentPlanLimits.maxMembers}
                                            unit="users"
                                        />
                                    </Grid>

                                    <Flex gap="3" mt="2" wrap="wrap" align="center">
                                        {!isCanceled && (
                                            <Button variant="solid" color="lime" highContrast onClick={() => setIsUpgradeOpen(true)}>
                                                Upgrade Plan
                                            </Button>
                                        )}
                                        {!isCanceled && ['OWNER', 'ADMIN'].includes(data.userRole ?? '') && (
                                            <CancellationSurveyModal
                                                spaceName={data.name}
                                                spaceId={spaceId}
                                                userRole={(data.userRole ?? 'MEMBER') as 'OWNER' | 'ADMIN'}
                                                currentPlan={data.plan}
                                                onCanceled={() => {
                                                    setLoading(true);
                                                    loadData();
                                                }}
                                                trigger={
                                                    <Button variant="ghost" color="red" ml="auto">
                                                        Cancel subscription
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </Flex>

                                    {isIncomplete && (
                                        <Callout.Root color="orange" variant="soft" size="1">
                                            <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                                            <Callout.Text>
                                                {data.trialEndsAt
                                                    ? <>Your trial has ended. Choose a plan to continue running analyses.</>
                                                    : <>This space requires an active subscription. Prompts won&apos;t run until you subscribe.</>
                                                }{" "}
                                                <Link onClick={() => setIsUpgradeOpen(true)} style={{ cursor: "pointer" }}>
                                                    Choose a plan
                                                </Link>
                                            </Callout.Text>
                                        </Callout.Root>
                                    )}

                                    {isCanceled && (
                                        <Callout.Root color="orange" variant="soft" size="1">
                                            <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                                            <Callout.Text>
                                                Subscription cancelled. Access until{" "}
                                                {new Date(data.currentPeriodEnd ?? data.canceledAt ?? '').toLocaleDateString()}.{" "}
                                                <Link onClick={() => setIsUpgradeOpen(true)} style={{ cursor: "pointer" }}>
                                                    Resubscribe
                                                </Link>
                                            </Callout.Text>
                                        </Callout.Root>
                                    )}
                                </Flex>
                    </Card>
                    {/* Billing Address & Invoices */}
                    <BillingSettings spaceId={spaceId} />

                    {/* Need Help */}
                    <Card style={{ background: 'var(--gray-2)' }}>
                            <Flex justify="between" align="center" gap="4" wrap="wrap">
                                <Flex direction="column" gap="1">
                                    <Text size="2" weight="medium">Need help with billing?</Text>
                                    <Text size="2" color="gray">
                                        Questions about your invoice or need a custom enterprise plan?
                                    </Text>
                                </Flex>
                                <Button variant="solid" color="gray" highContrast asChild>
                                    <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Billing question — Space ${spaceId}`)}`} target="_blank" rel="noopener noreferrer">Contact Support</a>
                                </Button>
                            </Flex>
                    </Card>
                </Flex>
            </Container>
            <UpgradeRequiredModal
                isOpen={isUpgradeOpen}
                onClose={() => setIsUpgradeOpen(false)}
                limit={null}
                spaceId={spaceId}
                currentPlan={data.plan}
                llmProvider={data.llmProvider as "MANAGED" | "BYOK"}
                mode={isCanceled ? 'resubscribe' : isIncomplete ? 'upgrade' : 'upgrade'}
            />
        </PageContainer>
    );
}
