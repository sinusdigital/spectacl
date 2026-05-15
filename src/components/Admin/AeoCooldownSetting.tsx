"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Flex, Heading, Text, TextField, Button, Badge, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useToast } from "@/components/Shared/RadixToast";

const SETTING_KEY = "aeo_generate_cooldown_hours";
const DEFAULT_HOURS = 168; // 7 days

/**
 * Admin editor for the AEO Generate cooldown. Bypassed for app admins and for
 * spaces on the FOUNDER plan; everyone else is limited to one Generate per
 * cooldown window per entity. Persists to SystemSettings via /api/admin/settings.
 */
export function AeoCooldownSetting() {
    const [hours, setHours] = useState<number | "">("");
    const [initial, setInitial] = useState<number>(DEFAULT_HOURS);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/settings?keys=${SETTING_KEY}`);
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            const raw = data[SETTING_KEY];
            const parsed = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : DEFAULT_HOURS;
            setHours(parsed);
            setInitial(parsed);
        } catch {
            toast({ title: "Error", description: "Failed to load AEO cooldown setting.", type: "error" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { void load(); }, [load]);

    const handleSave = async () => {
        const value = typeof hours === "number" ? hours : Number(hours);
        if (!Number.isFinite(value) || value < 0 || value > 24 * 365) {
            toast({ title: "Invalid value", description: "Cooldown must be 0–8760 hours (one year).", type: "error" });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: SETTING_KEY, value: String(Math.round(value)) }),
            });
            if (!res.ok) throw new Error("Save failed");
            setInitial(Math.round(value));
            toast({ title: "Saved", description: `Cooldown set to ${Math.round(value)}h.`, type: "success" });
        } catch (e) {
            toast({ title: "Error", description: e instanceof Error ? e.message : "Save failed", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const dirty = typeof hours === "number" && hours !== initial;
    const dayText = typeof hours === "number" && hours > 0
        ? hours % 24 === 0
            ? `${hours / 24} day${hours / 24 === 1 ? "" : "s"}`
            : `${(hours / 24).toFixed(1)} days`
        : hours === 0 ? "no cooldown" : "—";

    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="2">
                <Heading size="4">AEO Generate cooldown</Heading>
                <Text size="2" color="gray">
                    Rate-limits the &quot;Analyze website&quot; button on the user-facing AEO Suggestions page. After Generate, an entity is locked out for this many hours before it can be regenerated. Default 168h (7 days).
                </Text>
            </Flex>

            <Callout.Root color="blue" variant="surface" size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text size="1">
                    <strong>Bypassed for:</strong> app admins (<code>User.role === &quot;ADMIN&quot;</code>) and any space on the <Badge size="1" variant="soft" color="iris" radius="full">FOUNDER</Badge> plan. Set to <code>0</code> to disable the cooldown for all users.
                </Callout.Text>
            </Callout.Root>

            <Card>
                <Flex gap="3" align="end" wrap="wrap" p="2">
                    <Flex direction="column" gap="1" style={{ flex: "1 1 160px" }}>
                        <Text size="1" color="gray" weight="bold" className="uppercase tracking-wider">Cooldown (hours)</Text>
                        <TextField.Root
                            type="number"
                            min={0}
                            max={24 * 365}
                            value={hours === "" ? "" : String(hours)}
                            onChange={(e) => {
                                const v = e.target.value;
                                setHours(v === "" ? "" : Math.max(0, Math.min(24 * 365, parseInt(v) || 0)));
                            }}
                            disabled={loading || saving}
                        />
                    </Flex>
                    <Flex direction="column" gap="1" style={{ flex: "1 1 120px" }}>
                        <Text size="1" color="gray" weight="bold" className="uppercase tracking-wider">Equivalent</Text>
                        <Text size="2">{dayText}</Text>
                    </Flex>
                    <Button onClick={handleSave} disabled={!dirty || saving || loading}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </Flex>
            </Card>
        </Flex>
    );
}
