'use client';

import { useEffect, useState } from 'react';
import { Card, Flex, Text, Select, TextField, Button, Badge, Skeleton, Callout, Heading } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useToast } from '@/components/Shared/RadixToast';

interface InternalTaskModelRow {
    taskKey: string;
    provider: string;
    modelId: string;
    displayName: string | null;
    maxOutputTokens: number;
    updatedAt: string;
}

interface FetchedModel {
    id: string;
    displayName: string;
    contextWindow?: number | null;
}

const TASK_LABELS: Record<string, string> = {
    ranking: "Ranking analysis",
    brand_extraction: "Brand extraction",
    suggested_prompts: "Suggested prompts",
    competitor_discovery: "Competitor discovery",
    aeo_personalization: "AEO personalization",
};

const TASK_DESCRIPTIONS: Record<string, string> = {
    ranking: "Used for prompts with intent 'Competitor Analysis' (Ranking reports). One LLM call per ranking prompt cycle.",
    brand_extraction: "Runs after every analysis batch — scans LLM responses for new brand mentions. Model-independent of customer-facing models.",
    suggested_prompts: "Generates prompt suggestions. Triggered manually from the discovery modal and automatically by the refill worker.",
    competitor_discovery: "Discovers competitors for an entity. Used in onboarding and admin regenerate.",
    aeo_personalization: "Writes personalized markdown descriptions for the engine-selected AEO tactics, using the entity's scraped website content. One LLM call per /analyze run; cached for items already personalized.",
};

const PROVIDERS = ["openai", "anthropic", "google", "mistral"] as const;

export function InternalTaskModelsTable() {
    const [rows, setRows] = useState<InternalTaskModelRow[] | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetch('/api/admin/internal-models')
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => setRows(data.models))
            .catch(() => toast({ title: "Error", description: "Failed to load internal task models.", type: "error" }));
    }, [toast]);

    if (rows === null) {
        return (
            <Flex direction="column" gap="3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="80px" />)}
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="2">
                <Heading size="4">Internal Task Models</Heading>
                <Text size="2" color="gray">
                    Models used by the platform for internal tasks (not visible to customers, not part of the Global Models registry). All calls run on platform env API keys regardless of the customer&apos;s LLM provider setting.
                </Text>
            </Flex>

            <Callout.Root color="blue" variant="surface" size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text size="1">
                    Pick any model the provider exposes — it does <strong>not</strong> need to be in the Global Models registry. Click &quot;Fetch available models&quot; to load the live list per provider, or type a model ID manually.
                </Callout.Text>
            </Callout.Root>

            <Flex direction="column" gap="3">
                {rows.map(row => (
                    <TaskModelCard
                        key={row.taskKey}
                        row={row}
                        onSaved={(updated) => {
                            setRows(prev => prev?.map(r => r.taskKey === updated.taskKey ? updated : r) ?? null);
                            toast({ title: "Saved", description: `${TASK_LABELS[updated.taskKey]} updated.`, type: "success" });
                        }}
                        onError={(msg) => toast({ title: "Error", description: msg, type: "error" })}
                    />
                ))}
            </Flex>
        </Flex>
    );
}

function TaskModelCard({
    row,
    onSaved,
    onError,
}: {
    row: InternalTaskModelRow;
    onSaved: (updated: InternalTaskModelRow) => void;
    onError: (msg: string) => void;
}) {
    const [provider, setProvider] = useState(row.provider);
    const [modelId, setModelId] = useState(row.modelId);
    const [displayName, setDisplayName] = useState(row.displayName ?? "");
    const [maxTokens, setMaxTokens] = useState(row.maxOutputTokens);
    const [fetched, setFetched] = useState<FetchedModel[] | null>(null);
    const [fetching, setFetching] = useState(false);
    const [saving, setSaving] = useState(false);

    const dirty =
        provider !== row.provider ||
        modelId !== row.modelId ||
        (displayName || null) !== (row.displayName || null) ||
        maxTokens !== row.maxOutputTokens;

    const handleFetch = async () => {
        setFetching(true);
        try {
            const res = await fetch(`/api/admin/provider-models?provider=${provider}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Failed to fetch models for ${provider}`);
            }
            const data = await res.json();
            setFetched(data.models);
        } catch (e) {
            onError(e instanceof Error ? e.message : `Failed to fetch ${provider} models`);
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/internal-models', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskKey: row.taskKey,
                    provider,
                    modelId,
                    displayName: displayName || null,
                    maxOutputTokens: maxTokens,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Save failed");
            }
            const data = await res.json();
            onSaved(data.model);
        } catch (e) {
            onError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <Flex direction="column" gap="3" p="2">
                <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                        <Text size="3" weight="bold">{TASK_LABELS[row.taskKey] ?? row.taskKey}</Text>
                        <Badge size="1" variant="soft" color="gray">{row.taskKey}</Badge>
                    </Flex>
                    <Text size="1" color="gray">{TASK_DESCRIPTIONS[row.taskKey] ?? ""}</Text>
                </Flex>

                <Flex gap="3" wrap="wrap" align="end">
                    <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
                        <Text size="1" color="gray">Provider</Text>
                        <Select.Root
                            value={provider}
                            onValueChange={(v) => { setProvider(v); setFetched(null); }}
                        >
                            <Select.Trigger />
                            <Select.Content>
                                {PROVIDERS.map(p => <Select.Item key={p} value={p}>{p}</Select.Item>)}
                            </Select.Content>
                        </Select.Root>
                    </Flex>

                    <Flex direction="column" gap="1" style={{ flex: "2 1 280px" }}>
                        <Flex align="center" justify="between">
                            <Text size="1" color="gray">Model ID</Text>
                            <Button type="button" variant="ghost" size="1" disabled={fetching} onClick={handleFetch}>
                                {fetching ? "Fetching..." : "Fetch available"}
                            </Button>
                        </Flex>
                        {fetched ? (
                            <Flex direction="column" gap="1">
                                <Select.Root value={modelId} onValueChange={(val) => {
                                    setModelId(val);
                                    const sel = fetched.find(m => m.id === val);
                                    if (sel && !displayName) setDisplayName(sel.displayName);
                                }}>
                                    <Select.Trigger placeholder="Select a model..." />
                                    <Select.Content>
                                        {fetched.map(m => (
                                            <Select.Item key={m.id} value={m.id}>{m.displayName || m.id}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                                <Text size="1" color="gray">
                                    Not listed?{" "}
                                    <a href="#" style={{ textDecoration: "underline", color: "inherit" }} onClick={(e) => { e.preventDefault(); setFetched(null); }}>
                                        Enter manually
                                    </a>
                                </Text>
                            </Flex>
                        ) : (
                            <TextField.Root
                                placeholder="e.g. claude-haiku-4-5-20251001"
                                value={modelId}
                                onChange={(e) => setModelId(e.target.value)}
                            />
                        )}
                    </Flex>

                    <Flex direction="column" gap="1" style={{ flex: "1 1 180px" }}>
                        <Text size="1" color="gray">Display Name (optional)</Text>
                        <TextField.Root
                            placeholder="e.g. Haiku"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </Flex>

                    <Flex direction="column" gap="1" style={{ width: 120 }}>
                        <Text size="1" color="gray">Max tokens</Text>
                        <TextField.Root
                            type="number"
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                        />
                    </Flex>

                    <Button onClick={handleSave} disabled={!dirty || saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
