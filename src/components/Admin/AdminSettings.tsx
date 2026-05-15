"use client";

import { useState, useEffect } from "react";
import { Flex, Text, Box, Badge, Callout, Heading, Section, Separator, TextField } from "@radix-ui/themes";
import RadixSwitch from "@/components/Shared/RadixSwitch";
import RadixSelect from "@/components/Shared/RadixSelect";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useToast } from "@/components/Shared/RadixToast";
import { getNavigationSections, getGlobalSections, getSpaceSections } from "../Sidebar/navigationConfig";

export default function AdminSettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Record<string, string>>({
        signup_mode: "open"
    });

    useEffect(() => {
        const sidebarFlags = [
            ...getNavigationSections('dummy'),
            ...getGlobalSections(),
            ...getSpaceSections('dummy'),
        ]
            .flatMap(s => s.items)
            .map(item => `sidebar_flag_${item.id}`);

        const keys = [
            'signup_mode',
            'sso_google_enabled',
            'support_email',
            ...sidebarFlags
        ].join(',');

        fetch(`/api/admin/settings?keys=${keys}`)
            .then(res => res.json())
            .then(data => {
                setSettings(prev => ({ ...prev, ...data }));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load settings", err);
                setLoading(false);
            });
    }, []);

    const handleSettingChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const persistSetting = async (key: string, value: string) => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
            if (!res.ok) throw new Error("Failed");
            toast({ title: "Saved", description: `${key} updated.`, type: "success" });
        } catch {
            toast({ title: "Error", description: `Failed to update ${key}.`, type: "error" });
        }
    };

    if (loading) {
        return (
            <Flex align="center" justify="center" p="8">
                <Text color="gray">Loading settings...</Text>
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap="8">
            {/* General Settings */}
            <Section size="1">
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">General</Heading>
                        <Text size="2" color="gray">
                            Core application settings that affect signup and access.
                        </Text>
                    </Flex>

                    <Box style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-4)', overflow: 'hidden' }}>
                        {/* Signup Mode */}
                        <Flex align="center" justify="between" p="4" style={{ borderBottom: '1px solid var(--gray-4)' }}>
                            <Box flexGrow="1" pr="4">
                                <Text size="2" weight="medium">Signup Mode</Text>
                                <Text as="p" size="1" color="gray" mt="1">Control who can register for new accounts.</Text>
                            </Box>
                            <Box style={{ minWidth: '140px' }}>
                                <RadixSelect.Root
                                    value={settings.signup_mode}
                                    onValueChange={async (val) => {
                                        handleSettingChange("signup_mode", val);
                                        await persistSetting("signup_mode", val);
                                    }}
                                >
                                    <RadixSelect.Trigger style={{ width: '100%', backgroundColor: 'var(--color-surface)' }} placeholder="Select" />
                                    <RadixSelect.Content>
                                        <RadixSelect.Item value="open">Open</RadixSelect.Item>
                                        <RadixSelect.Item value="waitlist">Waitlist</RadixSelect.Item>
                                        <RadixSelect.Item value="closed">Closed</RadixSelect.Item>
                                    </RadixSelect.Content>
                                </RadixSelect.Root>
                            </Box>
                        </Flex>

                        {/* Google SSO */}
                        <Flex align="center" justify="between" p="4" style={{ borderBottom: '1px solid var(--gray-4)' }}>
                            <Box flexGrow="1" pr="4">
                                <Text size="2" weight="medium">Google SSO</Text>
                                <Text as="p" size="1" color="gray" mt="1">Allow users to sign in or sign up with Google. Disabling hides the Google button on login and signup pages.</Text>
                            </Box>
                            <RadixSwitch.Root
                                checked={settings.sso_google_enabled !== "false"}
                                onCheckedChange={async (checked) => {
                                    handleSettingChange("sso_google_enabled", String(checked));
                                    await persistSetting("sso_google_enabled", String(checked));
                                }}
                            />
                        </Flex>

                        {/* Support Email */}
                        <Flex align="center" justify="between" p="4">
                            <Box flexGrow="1" pr="4">
                                <Text size="2" weight="medium">Support Email</Text>
                                <Text as="p" size="1" color="gray" mt="1">Shown on the billing page as the contact address for billing questions.</Text>
                            </Box>
                            <Box style={{ minWidth: '240px' }}>
                                <TextField.Root
                                    size="2"
                                    placeholder="hello@spectacl.org"
                                    value={settings.support_email ?? ""}
                                    onChange={(e) => handleSettingChange("support_email", e.target.value)}
                                    onBlur={() => persistSetting("support_email", settings.support_email ?? "")}
                                    style={{ backgroundColor: 'var(--color-surface)' }}
                                />
                            </Box>
                        </Flex>
                    </Box>
                </Flex>
            </Section>

            <Separator size="4" />

            {/* Sidebar Visibility */}
            <Section size="1">
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Sidebar Visibility</Heading>
                        <Text size="2" color="gray">
                            Control which navigation items appear in the sidebar for all users.
                        </Text>
                    </Flex>

                    <Callout.Root color="amber" mb="2">
                        <Callout.Icon>
                            <ExclamationTriangleIcon />
                        </Callout.Icon>
                        <Callout.Text size="2">
                            Changes take effect immediately for all users.
                        </Callout.Text>
                    </Callout.Root>

                    <Flex direction="column" gap="5">
                        {[
                            ...getNavigationSections('dummy'),
                            ...getGlobalSections(),
                            ...getSpaceSections('dummy'),
                        ].map(section => (
                            <Box key={section.title}>
                                <Text size="1" weight="bold" color="gray" mb="2" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {section.title}
                                </Text>
                                <Box style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-4)', overflow: 'hidden' }}>
                                    {section.items.map((item, idx) => {
                                        const flagKey = `sidebar_flag_${item.id}`;
                                        const isEnabled = settings[flagKey] !== "false";

                                        return (
                                            <Flex
                                                key={item.id}
                                                align="center"
                                                justify="between"
                                                p="4"
                                                style={idx < section.items.length - 1 ? { borderBottom: '1px solid var(--gray-4)' } : undefined}
                                            >
                                                <Box flexGrow="1" pr="4">
                                                    <Text size="2" weight="medium">{typeof item.name === 'string' ? item.name : item.id}</Text>
                                                </Box>
                                                <RadixSwitch.Root
                                                    checked={isEnabled}
                                                    onCheckedChange={async (checked) => {
                                                        handleSettingChange(flagKey, String(checked));
                                                        await persistSetting(flagKey, String(checked));
                                                    }}
                                                />
                                            </Flex>
                                        );
                                    })}
                                </Box>
                            </Box>
                        ))}
                    </Flex>
                </Flex>
            </Section>

            <Separator size="4" />

            {/* Admin Scripts */}
            <Section size="1">
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Admin Scripts</Heading>
                        <Text size="2" color="gray">
                            Terminal utilities for bootstrapping, seeding, and maintenance. Run from the project root.
                        </Text>
                    </Flex>

                    <Flex direction="column" gap="3">
                        {[
                            {
                                name: "Promote Admin",
                                command: "npx tsx scripts/promote-admin.ts <email>",
                                description: "Grant ADMIN role to a user by email. Only needed the first time before any admin exists — after that, use the Admin UI at /admin/users.",
                                badge: { label: "Bootstrap", color: "amber" as const },
                            },
                            {
                                name: "Seed Global Models",
                                command: "npx tsx scripts/seed-global-models.ts",
                                description: "Syncs the GlobalModel table from DEFAULT_MODELS. Also detects orphaned model IDs in SpaceModelConfigs and inserts fallback records to prevent crashes.",
                                badge: { label: "Setup", color: "blue" as const },
                            },
                            {
                                name: "Check DB Health",
                                command: "node scripts/check-db-health.js",
                                description: "Quick connectivity check — prints user count, entity count, prompt count, and all user emails. Useful for verifying DB access after deploys.",
                                badge: { label: "Diagnostics", color: "gray" as const },
                            },
                            {
                                name: "Backfill Prompt Metrics",
                                command: "npx tsx scripts/backfill-prompt-metrics.ts",
                                description: "Recalculates visibility, sentiment, and position metrics for all prompts. Run after schema changes that affect metric calculations.",
                                badge: { label: "Maintenance", color: "purple" as const },
                            },
                        ].map((script) => (
                            <Box key={script.name} p="4" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-4)' }}>
                                <Flex direction="column" gap="2">
                                    <Flex align="center" gap="2">
                                        <Badge color={script.badge.color} variant="soft">{script.badge.label}</Badge>
                                        <Text size="2" weight="medium">{script.name}</Text>
                                    </Flex>
                                    <Text size="2" color="gray">{script.description}</Text>
                                    <Box p="3" style={{ backgroundColor: 'black', borderRadius: 'var(--radius-3)' }}>
                                        <Text size="2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-9)' }}>
                                            {script.command}
                                        </Text>
                                    </Box>
                                </Flex>
                            </Box>
                        ))}
                    </Flex>
                </Flex>
            </Section>
        </Flex>
    );
}
