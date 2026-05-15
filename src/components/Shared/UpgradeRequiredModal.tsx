"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Box, Text, Grid, Card, Badge, Heading, Tooltip, Separator } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import { usePathname } from "next/navigation";
import Modal from "./Modal";
import Button from "./Button";
import PlanBadge from "./PlanBadge";
import { useToast } from "@/components/Shared/RadixToast";
import { PROVIDER_LOGOS } from "@/assets/model-logos";
import { PLAN_LIMITS, getFeaturesList, type PlanKey } from "@/lib/billing/plans";
import { SpacePlan } from "@prisma/client";
import BillingDetailsModal from "@/components/Billing/BillingDetailsModal";

// ─── Constants ────────────────────────────────────────────────────────────────

// Use local type for plans to handle cases where Prisma client is out of sync
type ExtendedSpacePlan = SpacePlan | "STARTER";

const ENTERPRISE_EMAIL = "info@spectacl.org";

const UPGRADE_PLAN_KEYS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"] as const satisfies readonly ExtendedSpacePlan[];

const PLAN_RANK = {
    FOUNDER:    5,
    ENTERPRISE: 4,
    BUSINESS:   3,
    PRO:        2,
    STARTER:    1,
    FREE:       0,
} as const satisfies Record<ExtendedSpacePlan, number>;

// ─── Types ────────────────────────────────────────────────────────────────────

type LLMTrack = "MANAGED" | "BYOK";

type UpgradePlanKey = (typeof UPGRADE_PLAN_KEYS)[number];

// Radix UI color scale names — only those available in @radix-ui/themes
type RadixScaleColor =
    | "gray" | "gold" | "bronze" | "brown"
    | "yellow" | "amber" | "orange" | "tomato" | "red" | "ruby" | "crimson"
    | "pink" | "plum" | "purple" | "violet" | "iris" | "indigo" | "blue"
    | "cyan" | "teal" | "jade" | "green" | "grass" | "lime" | "mint" | "sky";

interface PlanPrices {
    MANAGED: string;
    BYOK:    string;
}

interface CheckoutState {
    plan:    PlanKey | null;
    loading: boolean;
    error:   string | null;
    url:     string | null;
}

interface PlanData {
    key:      UpgradePlanKey;
    prices:   PlanPrices;
    features: string[];
}

interface DerivedPlanData extends PlanData {
    isCurrent:     boolean;
    isNextTier:    boolean;
    isEnterprise:  boolean;
    isRecommended: boolean;
}

// Remote shape returned by /api/admin/plan-limits
interface RemotePlanLimits {
    priceManaged?: number;
    priceByok?:    number;
    [key: string]: unknown;
}

interface PlanUIConfig {
    color: RadixScaleColor;
}

interface UpgradeRequiredModalProps {
    isOpen:       boolean;
    onClose:      () => void;
    resourceName?: string;
    limit:        number | null;
    spaceId?:     string;
    llmProvider?: LLMTrack;
    currentPlan?: ExtendedSpacePlan;
    mode?:        'upgrade' | 'resubscribe' | 'activate';
}

// ─── Plan UI config ───────────────────────────────────────────────────────────
// Color-only. No border or background values — those are derived from the
// Radix color scale at render time via CSS variables.

const PLAN_UI_CONFIG = {
    STARTER:    { color: "blue"  },
    PRO:        { color: "iris"  },
    BUSINESS:   { color: "teal"  },
    ENTERPRISE: { color: "gray"  },
} as const satisfies Record<UpgradePlanKey, PlanUIConfig>;

// ─── Card style helper ────────────────────────────────────────────────────────
// Radix Card borders are rendered via box-shadow using --card-border-color.
// Never set borderColor or borderWidth directly on a Card.

function getCardVars(
    color: RadixScaleColor,
    isCurrent: boolean
): React.CSSProperties {
    return {
        "--card-border-color": `var(--${color}-${isCurrent ? "8" : "6"})`,
        "--card-border-width": isCurrent ? "2px" : "1px",
        backgroundColor:       `var(--${color}-2)`,
        position:              "relative",
        overflow:              "visible",
        opacity:               isCurrent ? 0.75 : 1,
    } as React.CSSProperties;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function getPlanLimitsFallback(key: UpgradePlanKey) {
    // PLAN_LIMITS is typed externally — access via index and narrow safely
    const entry = (PLAN_LIMITS as Record<string, { prices?: { MANAGED: number; BYOK: number }; features?: string[] } | undefined>)[key];
    return {
        prices:   entry?.prices   ?? { MANAGED: 0, BYOK: 0 },
        features: entry?.features ?? [],
    };
}

function buildPlanPrices(key: UpgradePlanKey, remote?: RemotePlanLimits): PlanPrices {
    if (key === "ENTERPRISE") return { MANAGED: "Custom", BYOK: "Custom" };
    const { prices } = getPlanLimitsFallback(key);
    return {
        MANAGED: `€${remote?.priceManaged ?? prices.MANAGED}`,
        BYOK:    `€${remote?.priceByok    ?? prices.BYOK}`,
    };
}

function buildInitialPlans(): PlanData[] {
    return UPGRADE_PLAN_KEYS.map(key => ({
        key,
        prices:   buildPlanPrices(key),
        features: [...getPlanLimitsFallback(key).features],
    }));
}

function applyRemotePlans(
    base:   PlanData[],
    remote: Record<string, RemotePlanLimits>
): PlanData[] {
    return base.map(plan => {
        const remotePlan = remote[plan.key];
        if (!remotePlan) return plan;
        
        // Merge with statically configured limits for type compatibility
        const baseLimits = PLAN_LIMITS[plan.key as PlanKey];
        const mergedLimits = {
            ...baseLimits,
            maxActivePrompts:   remotePlan.maxActivePrompts   ?? baseLimits.maxActivePrompts,
            maxMembers:         remotePlan.maxMembers         ?? baseLimits.maxMembers,
            maxEntities:        remotePlan.maxEntities        ?? baseLimits.maxEntities,
        } as typeof baseLimits;

        return {
            ...plan,
            prices:   buildPlanPrices(plan.key, remotePlan),
            features: getFeaturesList(plan.key as PlanKey, mergedLimits),
        };
    });
}

function derivePlans(plans: PlanData[], currentPlan?: ExtendedSpacePlan): DerivedPlanData[] {
    const currentRank = currentPlan ? PLAN_RANK[currentPlan] : 0;

    const nextTierKey = UPGRADE_PLAN_KEYS
        .filter(key => PLAN_RANK[key] > currentRank)
        .sort((a, b) => PLAN_RANK[a] - PLAN_RANK[b])[0] ?? null;

    return plans.map(plan => ({
        ...plan,
        isCurrent:     plan.key === currentPlan,
        isNextTier:    plan.key === nextTierKey,
        isEnterprise:  plan.key === "ENTERPRISE",
        // PRO is always recommended, but only shown when user is below PRO
        isRecommended: plan.key === "PRO" && currentRank < PLAN_RANK.PRO,
    }));
}

// ─── usePlanLimits ────────────────────────────────────────────────────────────

function usePlanLimits(isOpen: boolean) {
    const [plans,    setPlans]    = useState<PlanData[]>(buildInitialPlans);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        
        // Wrap in animation frame to avoid synchronous setState in effect warning
        const frame = requestAnimationFrame(() => {
            if (!cancelled) setFetching(true);
        });

        fetch("/api/admin/plan-limits")
            .then(res => {
                if (!res.ok) throw new Error(`[usePlanLimits] HTTP ${res.status}`);
                return res.json() as Promise<Record<string, RemotePlanLimits>>;
            })
            .then(data => {
                if (!cancelled) setPlans(prev => applyRemotePlans(prev, data));
            })
            .catch(err => console.error(err))
            .finally(() => { if (!cancelled) setFetching(false); });

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [isOpen]);

    return { plans, fetching };
}

// ─── PlanStatusBadge ──────────────────────────────────────────────────────────

function PlanStatusBadge({ isCurrent, isRecommended, mode }: { isCurrent: boolean; isRecommended: boolean; mode?: string }) {
    if (!isCurrent && !isRecommended) return null;

    return (
        <Box
            position="absolute"
            style={{ top: -14, left: 12, zIndex: 10 }}
        >
            {isCurrent ? (
                <Badge size="1" color="gray" variant="solid" radius="full"
                    style={{ padding: "3px 12px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    {mode === 'resubscribe' ? 'Current plan (cancelled)' : 'Current plan'}
                </Badge>
            ) : (
                <Badge size="1" color="green" variant="solid" radius="full"
                    style={{ padding: "3px 12px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    Recommended
                </Badge>
            )}
        </Box>
    );
}

// ─── FeatureList ──────────────────────────────────────────────────────────────

// ─── Included Models ─────────────────────────────────────────────────────────

const INCLUDED_MODELS = [
    { provider: "google",    name: "AI Overviews" },
    { provider: "google",    name: "AI Mode (Gemini Pro)" },
    { provider: "openai",    name: "ChatGPT 5" },
    { provider: "anthropic", name: "Claude Sonnet 4.6" },
    { provider: "mistral",   name: "Mistral Le Chat" },
];

function ModelStrip() {
    return (
        <Flex direction="column" gap="1">
            <Flex align="center" style={{ position: "relative", height: 22 }}>
                {INCLUDED_MODELS.map((m, i) => (
                    <Tooltip key={m.name} content={m.name}>
                        <Box
                            style={{
                                lineHeight: 0,
                                padding: 2,
                                border: "1.5px solid var(--green-9)",
                                borderRadius: "50%",
                                backgroundColor: "white",
                                position: "relative",
                                zIndex: INCLUDED_MODELS.length - i,
                                marginLeft: i === 0 ? 0 : -5,
                                width: 27,
                                height: 27,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxSizing: "border-box",
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={(PROVIDER_LOGOS[m.provider.toLowerCase()] as { src: string })?.src ?? ""}
                                alt={m.name}
                                width={15}
                                height={15}
                                style={{ borderRadius: "50%", display: "block" }}
                            />
                        </Box>
                    </Tooltip>
                ))}
            </Flex>
            <Text size="1" color="gray" mt="1">
                All major models included.
            </Text>
        </Flex>
    );
}

// ─── FeatureList ──────────────────────────────────────────────────────────────

function FeatureList({ features, color }: { features: string[]; color: RadixScaleColor }) {
    return (
        <Flex direction="column" gap="2" style={{ flex: 1 }}>
            {features.map(feature => (
                <Flex key={feature} align="center" gap="2">
                    <CheckIcon
                        width={13}
                        height={13}
                        style={{ color: `var(--${color}-9)`, flexShrink: 0 }}
                    />
                    <Text size="1" color="gray" style={{ lineHeight: 1.3 }}>
                        {feature}
                    </Text>
                </Flex>
            ))}
        </Flex>
    );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
    plan:       DerivedPlanData;
    track:      LLMTrack;
    isLoading:  boolean;
    isFetching: boolean;
    onSelect:   (key: PlanKey) => void;
    resourceName?: string;
    mode?:      'upgrade' | 'resubscribe';
    /** If set, the plan can't accommodate current usage — show this reason and disable */
    insufficientReason?: string;
}

function PlanCard({ plan, track, isLoading, isFetching, onSelect, resourceName, mode, insufficientReason }: PlanCardProps) {
    const ui          = PLAN_UI_CONFIG[plan.key as UpgradePlanKey] ?? PLAN_UI_CONFIG.STARTER;
    const isTrialing  = resourceName === "trial";
    const isDisabled  = !!insufficientReason || isLoading || isFetching || (plan.isCurrent && !isTrialing && mode !== 'resubscribe');

    const handleClick = useCallback(() => {
        if (!isDisabled) onSelect(plan.key as PlanKey);
    }, [isDisabled, onSelect, plan.key]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    }, [handleClick]);

    return (
        <Box position="relative" style={{ height: "100%" }}>
            <PlanStatusBadge isCurrent={plan.isCurrent} isRecommended={plan.isRecommended} mode={mode} />

            <Card
                style={{
                    ...getCardVars(ui.color, plan.isCurrent),
                    cursor:     isDisabled ? "default" : "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    height:     "100%",
                }}
            >
                {/* Hover/active states via inline event handlers — no Tailwind needed */}
                <Box
                    role="button"
                    aria-disabled={isDisabled}
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    style={{ outline: "none", height: "100%" }}
                    onMouseEnter={e => {
                        if (isDisabled) return;
                        const card = e.currentTarget.closest("[data-radix-card]") as HTMLElement | null;
                        if (card) {
                            Object.assign(card.style, { transform: "scale(1.01)", boxShadow: "var(--shadow-3)" });
                        }
                    }}
                    onMouseLeave={e => {
                        const card = e.currentTarget.closest("[data-radix-card]") as HTMLElement | null;
                        if (card) {
                            Object.assign(card.style, { transform: "scale(1)", boxShadow: "" });
                        }
                    }}
                >
                    <Flex direction="column" gap="3" p="2" style={{ height: "100%" }}>
                        <Box mt="2">
                            <PlanBadge plan={plan.key} />
                        </Box>

                        <Flex align="baseline" gap="1">
                            <Heading size="6" weight="bold" color="gray" highContrast>
                                {plan.prices[track]}
                            </Heading>
                            <Text size="1" color="gray">/mo excl. VAT</Text>
                        </Flex>

                        <ModelStrip />

                        <Separator size="4" style={{ opacity: 0.5 }} />

                        <FeatureList features={plan.features.filter(f => f !== "5 AI models included")} color={ui.color} />

                        {isLoading && (
                            <Text size="1" color="blue" weight="medium">
                                Redirecting…
                            </Text>
                        )}
                        {insufficientReason && (
                            <Text size="1" color="red" weight="medium">
                                {insufficientReason}
                            </Text>
                        )}
                    </Flex>
                </Box>
            </Card>
        </Box>
    );
}

// ─── EnterpriseCard ───────────────────────────────────────────────────────────

function EnterpriseCard({ plan }: PlanCardProps) {
    return (
        <Box position="relative" style={{ height: "100%" }}>
            <PlanStatusBadge isCurrent={plan.isCurrent} isRecommended={plan.isRecommended} />
            
            <Card style={{ ...getCardVars("gray", plan.isCurrent), height: "100%" }}>
                <Flex direction="column" gap="3" p="2" style={{ height: "100%" }}>
                    <Box mt="2">
                        <PlanBadge plan={plan.key} />
                    </Box>

                    <ModelStrip />

                    <Separator size="4" style={{ opacity: 0.5 }} />

                    <FeatureList features={plan.features.filter(f => f !== "5 AI models included")} color="gray" />

                    <Button
                        variant="tertiary"
                        asChild
                        style={{ marginTop: "auto" }}
                        size="sm"
                    >
                        <a href={`mailto:${ENTERPRISE_EMAIL}?subject=Enterprise Plan Inquiry`}>
                            Contact us
                        </a>
                    </Button>
                </Flex>
            </Card>
        </Box>
    );
}

// ─── LimitMessage ─────────────────────────────────────────────────────────────

function LimitMessage({
    limit,
    resourceName,
    llmProvider,
    mode,
}: Pick<UpgradeRequiredModalProps, "limit" | "resourceName" | "llmProvider" | "mode">) {
    return (
        <Text size="2" color="gray">
            {mode === 'activate' ? (
                "This space doesn't have an active subscription. Users who have already used their free trial, or who have an active subscription on another space, need to choose a plan to activate this space."
            ) : mode === 'resubscribe' ? (
                "Choose a plan to continue using Spectacl."
            ) : resourceName === "Collaboration" ? (
                <>{resourceName} is a Pro feature. Choose a plan below to unlock team collaboration.</>
            ) : limit !== null ? (
                <>
                    You&apos;ve reached the limit of{" "}
                    <Text weight="bold" color="gray" highContrast>
                        {limit} {resourceName}
                    </Text>{" "}
                    on your current plan. Choose a plan below to unlock more.
                </>
            ) : (
                "Choose a plan to unlock full access."
            )}
            {llmProvider === "BYOK" && (
                <Text color="blue" weight="medium" ml="2">
                    BYOK pricing applied.
                </Text>
            )}
        </Text>
    );
}

// ─── UpgradeRequiredModal ─────────────────────────────────────────────────────

export default function UpgradeRequiredModal({
    isOpen,
    onClose,
    resourceName = "entities",
    limit,
    spaceId,
    llmProvider  = "MANAGED",
    currentPlan,
    mode         = "upgrade",
}: UpgradeRequiredModalProps) {
    const [checkoutState, setCheckoutState] = useState<CheckoutState>({
        plan:    null,
        loading: false,
        error:   null,
        url:     null,
    });
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [pendingPlanKey, setPendingPlanKey] = useState<PlanKey | null>(null);
    const { error: toastError } = useToast();
    const pathname = usePathname();
    const isOutsideSpace = pathname === "/spaces";

    // Fetch current usage to block plans that can't accommodate existing resources
    const [currentUsage, setCurrentUsage] = useState<{ entities: number; activePrompts: number; members: number } | null>(null);
    useEffect(() => {
        if (!isOpen || !spaceId || isOutsideSpace) return;
        fetch("/api/spaces/current/usage")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setCurrentUsage({
                    entities: data.current.entities,
                    activePrompts: data.current.activePrompts,
                    members: data.current.members,
                });
            })
            .catch(() => {});
    }, [isOpen, spaceId, isOutsideSpace]);

    const { plans, fetching }           = usePlanLimits(isOpen);
    const track: LLMTrack               = llmProvider === "BYOK" ? "BYOK" : "MANAGED";

    const displayPlans = useMemo(
        () => derivePlans(plans, (isOutsideSpace || mode === 'activate') ? undefined : currentPlan),
        [plans, currentPlan, isOutsideSpace, mode]
    );

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowBillingModal(false);
            setPendingPlanKey(null);
        }
    }, [isOpen]);

    const proceedToCheckout = useCallback(async (planKey: PlanKey) => {
        setCheckoutState(prev => ({ ...prev, plan: planKey, loading: true, error: null }));

        try {
            sessionStorage.setItem("spectacl_return_url", window.location.href);

            const res = await fetch("/api/mollie/checkout", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ spaceId, plan: planKey, returnPath: window.location.pathname }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                console.error("[proceedToCheckout] checkout failed", err);
                toastError(err?.error ?? "Failed to start checkout. Please try again.");
                return;
            }

            const { checkoutUrl } = await res.json() as { checkoutUrl?: string };
            if (checkoutUrl) window.location.href = checkoutUrl;
        } catch (err) {
            console.error("[proceedToCheckout]", err);
            toastError("Something went wrong. Please try again.");
        } finally {
            setCheckoutState(prev => ({ ...prev, loading: false }));
        }
    }, [spaceId, toastError]);

    const handleSelectPlan = useCallback(async (planKey: PlanKey) => {
        if (!spaceId) {
            window.location.href = isOutsideSpace ? "/spaces" : "/settings?tab=billing";
            return;
        }

        // Check if billing profile exists
        try {
            const profileRes = await fetch(`/api/billing/profile?spaceId=${spaceId}`);
            const profileData = await profileRes.json();

            if (profileData.profile) {
                // Billing profile exists — go straight to checkout
                await proceedToCheckout(planKey);
            } else {
                // No billing profile — show billing modal first
                setPendingPlanKey(planKey);
                setShowBillingModal(true);
            }
        } catch {
            // On error, try checkout anyway (the checkout route will handle the gate)
            await proceedToCheckout(planKey);
        }
    }, [spaceId, isOutsideSpace, proceedToCheckout]);

    /** Check if current usage exceeds a plan's limits. Returns a reason string or undefined. */
    const getInsufficientReason = useCallback((planKey: string): string | undefined => {
        if (!currentUsage || isOutsideSpace) return undefined;
        const limits = PLAN_LIMITS[planKey.toUpperCase() as keyof typeof PLAN_LIMITS];
        if (!limits) return undefined;
        const reasons: string[] = [];
        if (limits.maxEntities > 0 && currentUsage.entities > limits.maxEntities) {
            reasons.push(`${currentUsage.entities} entities (limit: ${limits.maxEntities})`);
        }
        if (limits.maxActivePrompts > 0 && currentUsage.activePrompts > limits.maxActivePrompts) {
            reasons.push(`${currentUsage.activePrompts} prompts (limit: ${limits.maxActivePrompts})`);
        }
        if (limits.maxMembers > 0 && currentUsage.members > limits.maxMembers) {
            reasons.push(`${currentUsage.members} members (limit: ${limits.maxMembers})`);
        }
        if (reasons.length === 0) return undefined;
        return `Current usage exceeds this plan: ${reasons.join(", ")}`;
    }, [currentUsage, isOutsideSpace]);

    const gridColumns = displayPlans.length <= 2 ? "2" : "4";

    return (<>
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'activate' ? "Activate Space" : mode === 'resubscribe' ? "Resubscribe" : "Upgrade Your Plan"}
            size="4xl"
            actions={
                <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={checkoutState.loading}
                >
                    Cancel
                </Button>
            }
        >
            <Flex direction="column" gap="4">
                <LimitMessage
                    limit={limit}
                    resourceName={resourceName}
                    llmProvider={llmProvider}
                    mode={mode}
                />

                <Grid
                    columns={{ initial: "1", sm: gridColumns }}
                    gap="4"
                    style={{
                        opacity:    fetching ? 0.5 : 1,
                        transition: "opacity 0.2s ease",
                        paddingTop: "18px",
                    }}
                >
                    {displayPlans.map(plan =>
                        plan.isEnterprise ? (
                            <EnterpriseCard
                                key={plan.key}
                                plan={plan}
                                track={track}
                                isLoading={checkoutState.loading && checkoutState.plan === "ENTERPRISE"}
                                isFetching={fetching || checkoutState.loading}
                                onSelect={handleSelectPlan}
                            />
                        ) : (
                            <PlanCard
                                key={plan.key}
                                plan={plan}
                                track={track}
                                isLoading={checkoutState.loading && checkoutState.plan === plan.key}
                                isFetching={fetching || checkoutState.loading}
                                onSelect={handleSelectPlan}
                                resourceName={resourceName}
                                mode={mode}
                                insufficientReason={getInsufficientReason(plan.key)}
                            />
                        )
                    )}
                </Grid>
            </Flex>
        </Modal>

        {/* Billing details modal — shown when user has no billing profile */}
        {showBillingModal && spaceId && pendingPlanKey && (
            <BillingDetailsModal
                isOpen={showBillingModal}
                onClose={() => { setShowBillingModal(false); setPendingPlanKey(null); }}
                spaceId={spaceId}
                onSaved={() => {
                    setShowBillingModal(false);
                    proceedToCheckout(pendingPlanKey);
                }}
            />
        )}
    </>
    );
}