"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Pencil1Icon, CheckIcon, Cross2Icon, CheckCircledIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import {
    Box,
    Flex,
    Heading,
    Text,
    Card,
    Grid,
    IconButton,
    Tooltip,
    Badge,
    Separator,
    Switch,
} from "@radix-ui/themes";
import { Container } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import RadixInput from "@/components/Shared/RadixInput";
import { useToast } from "@/components/Shared/RadixToast";
import PlanBadge from "@/components/Shared/PlanBadge";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";
import { calculateMonthlyCredits, DAYS_PER_MONTH, TRIAL_DAYS_DEFAULT } from "@/lib/billing/plans";

// ── Types ────────────────────────────────────────────────────────────────────

type PlanKey = "FOUNDER" | "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE";

type RadixScaleColor =
    | "gray" | "blue" | "iris" | "teal" | "amber" | "lime" | "green"
    | "orange" | "red" | "purple" | "violet";

interface PlanLimits {
    maxMembers: number;
    maxEntities: number;
    maxActivePrompts: number;
    dataRetentionDays?: number;
    priceManaged?: number;
    priceByok?: number;
    features?: string[];
    prices?: { MANAGED: number; BYOK: number };
}

type PlanLimitsMap = Record<PlanKey, PlanLimits>;

interface PlanUIConfig {
    color: RadixScaleColor;
    description: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLAN_UI: Record<PlanKey, PlanUIConfig> = {
    STARTER:    { color: "blue",   description: "Individual users getting started" },
    PRO:        { color: "iris",   description: "Growing teams, recommended tier" },
    BUSINESS:   { color: "teal",   description: "Larger teams with multiple brands" },
    ENTERPRISE: { color: "gray",   description: "Custom pricing, contact sales" },
    FOUNDER:    { color: "amber",  description: "Internal / special access" },
};

const LIMIT_FIELDS: { key: keyof PlanLimits; label: string; unit?: string; icon: string }[] = [
    { key: "maxMembers",        label: "Members",    icon: "👤" },
    { key: "maxEntities",       label: "Entities",   icon: "🏢" },
    { key: "maxActivePrompts",  label: "Prompts",    icon: "💬" },
    { key: "dataRetentionDays", label: "Retention",  icon: "📅", unit: "d" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | undefined, unit?: string): string {
    if (val === undefined || val === null) return "—";
    if (val === -1) return "∞";
    return `${val.toLocaleString()}${unit ?? ""}`;
}

function getPrice(lim: PlanLimits): string {
    const price = lim.priceManaged ?? lim.prices?.MANAGED ?? 0;
    return price === 0 ? "Free" : `€${price}`;
}

// ── EditableField ────────────────────────────────────────────────────────────

function EditableField({
    value,
    onChange,
    label,
}: {
    value: number;
    onChange: (v: number) => void;
    label: string;
}) {
    return (
        <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" weight="medium">{label}</Text>
            <RadixInput
                type="number"
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
            />
        </Flex>
    );
}

// ── LimitRow (read-only) ─────────────────────────────────────────────────────

function LimitRow({ icon, label, value, unit, color }: {
    icon: string;
    label: string;
    value: number | undefined;
    unit?: string;
    color: RadixScaleColor;
}) {
    const isUnlimited = value === -1;
    return (
        <Flex align="center" justify="between" py="1">
            <Flex align="center" gap="2">
                <Text size="1">{icon}</Text>
                <Text size="1" color="gray">{label}</Text>
            </Flex>
            <Text
                size="1"
                weight="bold"
                style={{
                    fontFamily: "var(--font-mono)",
                    color: isUnlimited ? `var(--${color}-11)` : undefined,
                }}
                color={isUnlimited ? undefined : "gray"}
                highContrast={!isUnlimited}
            >
                {fmt(value, unit)}
            </Text>
        </Flex>
    );
}

// ── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
    planKey,
    limits,
    onSave,
    modelCount,
}: {
    planKey: PlanKey;
    limits: PlanLimits;
    onSave: (plan: PlanKey, limits: PlanLimits) => Promise<void>;
    modelCount: number;
}) {
    const ui = PLAN_UI[planKey];
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<PlanLimits>({ ...limits });
    const [saving, setSaving] = useState(false);

    // Sync form when limits change externally
    useEffect(() => {
        if (!editing) setForm({ ...limits });
    }, [limits, editing]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await onSave(planKey, form);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }, [planKey, form, onSave]);

    const handleCancel = () => {
        setForm({ ...limits });
        setEditing(false);
    };

    const updateField = (key: keyof PlanLimits, val: number) => {
        setForm(prev => ({ ...prev, [key]: val }));
    };

    const isEnterprise = planKey === "ENTERPRISE";
    const price = getPrice(limits);

    return (
        <Card
            size="2"
            style={{
                "--card-border-color": editing
                    ? `var(--${ui.color}-8)`
                    : `var(--${ui.color}-6)`,
                "--card-border-width": editing ? "2px" : "1px",
                backgroundColor: `var(--${ui.color}-2)`,
                position: "relative",
                overflow: "visible",
                display: "flex",
                flexDirection: "column",
            } as React.CSSProperties}
        >
            <Flex direction="column" gap="3" style={{ flex: 1 }}>
                {/* Header: badge + edit button */}
                <Flex align="center" justify="between" style={{ minHeight: 28 }}>
                    <PlanBadge plan={planKey} />
                    {!editing ? (
                        <Tooltip content={`Edit ${planKey} limits`}>
                            <IconButton
                                variant="ghost"
                                color="gray"
                                size="1"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil1Icon width="14" height="14" />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Flex align="center" gap="1">
                            <Tooltip content="Save">
                                <IconButton
                                    variant="soft"
                                    color="green"
                                    size="1"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    <CheckIcon width="14" height="14" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip content="Cancel">
                                <IconButton
                                    variant="ghost"
                                    color="gray"
                                    size="1"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    <Cross2Icon width="14" height="14" />
                                </IconButton>
                            </Tooltip>
                        </Flex>
                    )}
                </Flex>

                {/* Price */}
                <Flex align="baseline" gap="1">
                    {!editing ? (
                        <>
                            <Heading size="6" weight="bold" color="gray" highContrast>
                                {isEnterprise ? "Custom" : price}
                            </Heading>
                            {!isEnterprise && price !== "Free" && (
                                <Text size="1" color="gray">/mo</Text>
                            )}
                        </>
                    ) : (
                        <Flex direction="column" gap="1" width="100%">
                            <Text size="1" color="gray" weight="medium">Price (€/mo)</Text>
                            <RadixInput
                                type="number"
                                value={form.priceManaged ?? form.prices?.MANAGED ?? 0}
                                onChange={e => updateField("priceManaged", Number(e.target.value))}
                                style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700 }}
                            />
                        </Flex>
                    )}
                </Flex>

                {/* Description */}
                <Text size="1" color="gray" style={{ lineHeight: 1.4 }}>
                    {ui.description}
                </Text>

                <Separator size="4" />

                {/* Limits */}
                {!editing ? (
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                        {LIMIT_FIELDS.map(f => (
                            <LimitRow
                                key={f.key}
                                icon={f.icon}
                                label={f.label}
                                value={limits[f.key] as number | undefined}
                                unit={f.unit}
                                color={ui.color}
                            />
                        ))}
                        <LimitRow
                            icon="⚡"
                            label="Credits"
                            value={calculateMonthlyCredits(planKey, modelCount)}
                            unit="/mo"
                            color={ui.color}
                        />
                    </Flex>
                ) : (
                    <Flex direction="column" gap="3" style={{ flex: 1 }}>
                        <Grid columns="2" gap="3">
                            <EditableField
                                label="Members"
                                value={form.maxMembers}
                                onChange={v => updateField("maxMembers", v)}
                            />
                            <EditableField
                                label="Entities"
                                value={form.maxEntities}
                                onChange={v => updateField("maxEntities", v)}
                            />
                        </Grid>
                        <EditableField
                            label="Prompts"
                            value={form.maxActivePrompts}
                            onChange={v => updateField("maxActivePrompts", v)}
                        />
                        <EditableField
                            label="Retention (days)"
                            value={form.dataRetentionDays ?? 30}
                            onChange={v => updateField("dataRetentionDays", v)}
                        />
                        <Separator size="4" />
                        <LimitRow
                            icon="⚡"
                            label="Credits"
                            value={form.maxActivePrompts === -1 ? -1 : form.maxActivePrompts * DAYS_PER_MONTH * modelCount}
                            unit="/mo"
                            color={ui.color}
                        />
                        <Text size="1" color="gray" style={{ opacity: 0.6 }}>
                            Use -1 for unlimited
                        </Text>
                        <Separator size="4" />
                        <LimitRow
                            icon="⚡"
                            label="Credits"
                            value={
                                form.maxActivePrompts === -1
                                    ? -1
                                    : form.maxActivePrompts * DAYS_PER_MONTH * modelCount
                            }
                            unit="/mo"
                            color={ui.color}
                        />
                    </Flex>
                )}

                {/* Features preview */}
                {!editing && limits.features && limits.features.length > 0 && (
                    <>
                        <Separator size="4" />
                        <Flex direction="column" gap="1">
                            {limits.features.map((f, i) => (
                                <Flex key={i} align="center" gap="2">
                                    <CheckCircledIcon
                                        width={12}
                                        height={12}
                                        style={{ color: `var(--${ui.color}-9)`, flexShrink: 0 }}
                                    />
                                    <Text size="1" color="gray">{f}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </>
                )}
            </Flex>
        </Card>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
    const [plans, setPlans] = useState<PlanLimitsMap | null>(null);
    const [modelCount, setModelCount] = useState(5);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [trialDays, setTrialDays] = useState(TRIAL_DAYS_DEFAULT);
    const [trialEditing, setTrialEditing] = useState(false);
    const [trialForm, setTrialForm] = useState(TRIAL_DAYS_DEFAULT);
    const [trialSaving, setTrialSaving] = useState(false);
    const [trialPromptLimit, setTrialPromptLimit] = useState(10);
    const [trialPromptEditing, setTrialPromptEditing] = useState(false);
    const [trialPromptForm, setTrialPromptForm] = useState(10);
    const [trialPromptSaving, setTrialPromptSaving] = useState(false);
    const [allowNegativeCredits, setAllowNegativeCredits] = useState(false);
    const { success, error } = useToast();

    useEffect(() => {
        fetch("/api/admin/plan-limits")
            .then(r => r.json())
            .then((data: Record<string, Record<string, unknown>>) => {
                // Extract trial days from _trialDays meta key
                const meta = data._trialDays as { value: number } | undefined;
                if (meta?.value) {
                    setTrialDays(meta.value);
                    setTrialForm(meta.value);
                }
                // Extract trial prompt limit
                const promptMeta = data._trialPromptLimit as { value: number } | undefined;
                if (promptMeta?.value) {
                    setTrialPromptLimit(promptMeta.value);
                    setTrialPromptForm(promptMeta.value);
                }
                // Extract negative credits toggle
                const negCredits = data._allowNegativeCredits as { value: boolean } | undefined;
                if (negCredits) setAllowNegativeCredits(negCredits.value);
                // Remove meta keys before setting plans
                const { _trialDays: _, _trialPromptLimit: _p, _allowNegativeCredits: __, ...planData } = data;
                setPlans(planData as unknown as PlanLimitsMap);
            })
            .catch(() => error("Error", "Could not load plan limits"));
        fetch("/api/admin/global-models")
            .then(r => r.json())
            .then((models: { isEnabled: boolean; isArchived: boolean }[]) =>
                setModelCount(models.filter(m => m.isEnabled && !m.isArchived).length)
            )
            .catch(() => { /* fallback to default 5 */ });
    }, [error]);

    const handleSave = useCallback(async (plan: PlanKey, limits: PlanLimits) => {
        const res = await fetch("/api/admin/plan-limits", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, limits }),
        });
        if (!res.ok) {
            error("Error", "Failed to save plan limits");
            throw new Error("save failed");
        }
        setPlans(prev => (prev ? { ...prev, [plan]: { ...prev[plan], ...limits } } : prev));
        success("Saved", `${plan} plan limits updated`);
    }, [error, success]);

    const handleTrialSave = useCallback(async () => {
        setTrialSaving(true);
        try {
            const res = await fetch("/api/admin/plan-limits", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: "_settings", limits: { trialDays: trialForm } }),
            });
            if (!res.ok) {
                error("Error", "Failed to save trial settings");
                return;
            }
            setTrialDays(trialForm);
            setTrialEditing(false);
            success("Saved", `Trial duration updated to ${trialForm} days`);
        } finally {
            setTrialSaving(false);
        }
    }, [trialForm, error, success]);

    const handleTrialPromptSave = useCallback(async () => {
        setTrialPromptSaving(true);
        try {
            const res = await fetch("/api/admin/plan-limits", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: "_settings", limits: { trialPromptLimit: trialPromptForm } }),
            });
            if (!res.ok) {
                error("Error", "Failed to save trial prompt limit");
                return;
            }
            setTrialPromptLimit(trialPromptForm);
            setTrialPromptEditing(false);
            success("Saved", `Trial prompt limit updated to ${trialPromptForm}`);
        } finally {
            setTrialPromptSaving(false);
        }
    }, [trialPromptForm, error, success]);

    const handleNegativeCreditsToggle = useCallback(async (checked: boolean) => {
        setAllowNegativeCredits(checked);
        try {
            const res = await fetch("/api/admin/plan-limits", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: "_settings", limits: { allowNegativeCredits: checked } }),
            });
            if (!res.ok) {
                setAllowNegativeCredits(!checked);
                error("Error", "Failed to save setting");
                return;
            }
            success("Saved", checked ? "Negative credits enabled" : "Negative credits disabled");
        } catch {
            setAllowNegativeCredits(!checked);
            error("Error", "Failed to save setting");
        }
    }, [error, success]);

    // Separate purchasable plans from internal plans
    const purchasablePlans: PlanKey[] = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];
    const internalPlans: PlanKey[] = ["FOUNDER"];

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">
                {/* Header */}
                <Flex align="start" justify="between" gap="4">
                    <Flex direction="column" gap="2">
                        <Heading size="6">Pricing</Heading>
                        <Text size="3" color="gray">
                            Plan configuration as shown to customers. Click the pencil to edit inline.
                        </Text>
                    </Flex>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                    >
                        <Flex align="center" gap="2">
                            <EyeOpenIcon width="14" height="14" />
                            Preview Modal
                        </Flex>
                    </Button>
                </Flex>

                <UpgradeRequiredModal
                    isOpen={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    limit={null}
                    resourceName="entities"
                    mode="upgrade"
                />

                {/* Trial Settings */}
                <Card size="2" style={{ backgroundColor: "var(--blue-2)", "--card-border-color": "var(--blue-6)" } as React.CSSProperties}>
                    <Flex align="center" justify="between" gap="4">
                        <Flex align="center" gap="3">
                            <Text size="2">Free trial duration</Text>
                            {!trialEditing ? (
                                <Badge color="blue" variant="soft" size="2" style={{ fontFamily: "var(--font-mono)" }}>
                                    {trialDays} days
                                </Badge>
                            ) : (
                                <Flex align="center" gap="2">
                                    <RadixInput
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={trialForm}
                                        onChange={e => setTrialForm(Number(e.target.value))}
                                        style={{ width: 80, fontFamily: "var(--font-mono)", fontSize: 13 }}
                                    />
                                    <Text size="1" color="gray">days</Text>
                                </Flex>
                            )}
                        </Flex>
                        <Flex align="center" gap="1">
                            {!trialEditing ? (
                                <Tooltip content="Edit trial duration">
                                    <IconButton
                                        variant="ghost"
                                        color="gray"
                                        size="1"
                                        onClick={() => { setTrialForm(trialDays); setTrialEditing(true); }}
                                    >
                                        <Pencil1Icon width="14" height="14" />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <>
                                    <Tooltip content="Save">
                                        <IconButton
                                            variant="soft"
                                            color="green"
                                            size="1"
                                            onClick={handleTrialSave}
                                            disabled={trialSaving || trialForm < 1}
                                        >
                                            <CheckIcon width="14" height="14" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip content="Cancel">
                                        <IconButton
                                            variant="ghost"
                                            color="gray"
                                            size="1"
                                            onClick={() => { setTrialForm(trialDays); setTrialEditing(false); }}
                                            disabled={trialSaving}
                                        >
                                            <Cross2Icon width="14" height="14" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Flex>
                    </Flex>
                </Card>

                {/* Trial Prompt Limit */}
                <Card size="2" style={{ backgroundColor: "var(--blue-2)", "--card-border-color": "var(--blue-6)" } as React.CSSProperties}>
                    <Flex align="center" justify="between" gap="4">
                        <Flex align="center" gap="3">
                            <Text size="2">Trial prompt limit</Text>
                            {!trialPromptEditing ? (
                                <Badge color="blue" variant="soft" size="2" style={{ fontFamily: "var(--font-mono)" }}>
                                    {trialPromptLimit} prompts
                                </Badge>
                            ) : (
                                <Flex align="center" gap="2">
                                    <RadixInput
                                        type="number"
                                        min={1}
                                        max={500}
                                        value={trialPromptForm}
                                        onChange={e => setTrialPromptForm(Number(e.target.value))}
                                        style={{ width: 80, fontFamily: "var(--font-mono)", fontSize: 13 }}
                                    />
                                    <Text size="1" color="gray">prompts</Text>
                                </Flex>
                            )}
                        </Flex>
                        <Flex align="center" gap="1">
                            {!trialPromptEditing ? (
                                <Tooltip content="Edit trial prompt limit">
                                    <IconButton
                                        variant="ghost"
                                        color="gray"
                                        size="1"
                                        onClick={() => { setTrialPromptForm(trialPromptLimit); setTrialPromptEditing(true); }}
                                    >
                                        <Pencil1Icon width="14" height="14" />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <>
                                    <Tooltip content="Save">
                                        <IconButton
                                            variant="soft"
                                            color="green"
                                            size="1"
                                            onClick={handleTrialPromptSave}
                                            disabled={trialPromptSaving || trialPromptForm < 1}
                                        >
                                            <CheckIcon width="14" height="14" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip content="Cancel">
                                        <IconButton
                                            variant="ghost"
                                            color="gray"
                                            size="1"
                                            onClick={() => { setTrialPromptForm(trialPromptLimit); setTrialPromptEditing(false); }}
                                            disabled={trialPromptSaving}
                                        >
                                            <Cross2Icon width="14" height="14" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Flex>
                    </Flex>
                </Card>

                {/* Negative Credits Toggle */}
                <Card size="2" style={{ backgroundColor: "var(--amber-2)", "--card-border-color": "var(--amber-6)" } as React.CSSProperties}>
                    <Flex align="center" justify="between" gap="4">
                        <Flex direction="column" gap="1">
                            <Text size="2" weight="medium">Allow negative credits</Text>
                            <Text size="1" color="gray">
                                Let spaces continue past zero credits. Useful when adding models mid-cycle causes credit drift (issue #17). Monitor negative balances manually for misuse.
                            </Text>
                        </Flex>
                        <Switch
                            checked={allowNegativeCredits}
                            onCheckedChange={handleNegativeCreditsToggle}
                            color="amber"
                        />
                    </Flex>
                </Card>

                {/* Purchasable Plans */}
                {plans ? (
                    <Box>
                        <Flex align="center" gap="2" mb="4">
                            <Heading size="4">Plans</Heading>
                            <Badge color="green" variant="soft" size="1">
                                {purchasablePlans.length} tiers
                            </Badge>
                        </Flex>
                        <Grid
                            columns={{ initial: "1", sm: "2", lg: "4" }}
                            gap="4"
                        >
                            {purchasablePlans.map(key => {
                                const lim = plans[key];
                                if (!lim) return null;
                                return (
                                    <PlanCard
                                        key={key}
                                        planKey={key}
                                        limits={lim}
                                        onSave={handleSave}
                                        modelCount={modelCount}
                                    />
                                );
                            })}
                        </Grid>
                    </Box>
                ) : (
                    <Card size="3">
                        <Flex justify="center" py="8">
                            <Text size="2" color="gray">Loading plans…</Text>
                        </Flex>
                    </Card>
                )}

                {/* Internal Plans */}
                {plans && (
                    <Box>
                        <Flex align="center" gap="2" mb="4">
                            <Heading size="4">Internal</Heading>
                            <Badge color="amber" variant="soft" size="1">
                                Not shown to customers
                            </Badge>
                        </Flex>
                        <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
                            {internalPlans.map(key => {
                                const lim = plans[key];
                                if (!lim) return null;
                                return (
                                    <PlanCard
                                        key={key}
                                        planKey={key}
                                        limits={lim}
                                        onSave={handleSave}
                                        modelCount={modelCount}
                                    />
                                );
                            })}
                        </Grid>
                    </Box>
                )}

                {/* Quick reference */}
                <Card size="1" style={{ backgroundColor: "var(--gray-2)" }}>
                    <Flex direction="column" gap="1" p="1">
                        <Text size="1" weight="bold" color="gray">Quick reference</Text>
                        <Text size="1" color="gray">
                            Values persist to the database via <code style={{ fontSize: 11 }}>systemSetting</code> and override code defaults in <code style={{ fontSize: 11 }}>plans.ts</code>.
                            Use <strong>-1</strong> for unlimited. Enterprise pricing is &quot;Contact us&quot; — no checkout flow.
                        </Text>
                    </Flex>
                </Card>
            </Flex>
        </Container>
    );
}
