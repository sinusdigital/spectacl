"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    Flex,
    Text,
    TextField,
    Button,
    Badge,
    Callout,
    Select,
    Box,
    Separator,
    ScrollArea,
} from "@radix-ui/themes";
import { InfoCircledIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";

interface EntityOption {
    id: string;
    name: string;
    website: string | null;
    space: { id: string; name: string } | null;
}

interface PreviewTactic {
    slug: string;
    title: string;
    channel: "OnPage" | "OffPage";
    category: string;
    defaultImpact: number;
    defaultEffort: number;
    personalizedDescription: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export function AeoPlaybookPreviewDialog({ open, onClose }: Props) {
    const [search, setSearch] = useState("");
    const [entities, setEntities] = useState<EntityOption[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [tactics, setTactics] = useState<PreviewTactic[] | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/admin/entities-search?q=${encodeURIComponent(search)}`, { signal: controller.signal });
                if (!res.ok) throw new Error("Search failed");
                const data = await res.json();
                setEntities(data.entities);
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                console.error(e);
            }
        }, 250);
        return () => {
            controller.abort();
            clearTimeout(t);
        };
    }, [search, open]);

    useEffect(() => {
        if (!open) {
            setTactics(null);
            setError(null);
            setSelectedEntityId(null);
            setSearch("");
        }
    }, [open]);

    const runPreview = async () => {
        if (!selectedEntityId) return;
        setRunning(true);
        setError(null);
        setTactics(null);
        try {
            const res = await fetch("/api/admin/aeo-playbook/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityId: selectedEntityId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Preview failed");
            setTactics(data.tactics);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Preview failed");
        } finally {
            setRunning(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Dialog.Content style={{ maxWidth: 800 }}>
                <Dialog.Title>Preview playbook against entity</Dialog.Title>
                <Dialog.Description size="2" mb="4" color="gray">
                    Runs the AEO selector against a chosen entity and shows what the engine would suggest. Read-only — does not write to <code>EntitySuggestion</code>.
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <Flex gap="2" align="end">
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Text size="2" weight="bold">Search entity</Text>
                            <TextField.Root
                                placeholder="Type a name…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            >
                                <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
                            </TextField.Root>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Text size="2" weight="bold">Pick</Text>
                            <Select.Root
                                value={selectedEntityId ?? ""}
                                onValueChange={(v) => setSelectedEntityId(v || null)}
                            >
                                <Select.Trigger placeholder={entities.length ? "Select…" : "No matches"} />
                                <Select.Content>
                                    {entities.map(e => (
                                        <Select.Item key={e.id} value={e.id}>
                                            {e.name} {e.space ? <Text as="span" size="1" color="gray">— {e.space.name}</Text> : null}
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Root>
                        </Flex>
                        <Button onClick={runPreview} disabled={!selectedEntityId || running}>
                            {running ? "Running…" : "Run preview"}
                        </Button>
                    </Flex>

                    {error && (
                        <Callout.Root color="red" size="1">
                            <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                            <Callout.Text>{error}</Callout.Text>
                        </Callout.Root>
                    )}

                    {tactics && (
                        <>
                            <Separator size="4" />
                            <Text size="2" color="gray">
                                Selector returned {tactics.length} tactic{tactics.length === 1 ? "" : "s"}.
                            </Text>
                            <ScrollArea style={{ maxHeight: 460 }}>
                                <Flex direction="column" gap="3" pr="3">
                                    {tactics.map(t => (
                                        <Box key={t.slug} p="3" style={{ border: "1px solid var(--gray-a4)", borderRadius: 6 }}>
                                            <Flex direction="column" gap="2">
                                                <Flex align="center" gap="2" wrap="wrap">
                                                    <Text size="2" weight="bold">{t.title}</Text>
                                                    <Badge color="gray" variant="soft" radius="full" size="1">
                                                        {t.channel === "OnPage" ? "On-Page" : "Off-Page"}
                                                    </Badge>
                                                    <Badge color="blue" variant="soft" radius="full" size="1">{t.category}</Badge>
                                                    <Text size="1" color="gray">impact {t.defaultImpact} · effort {t.defaultEffort}</Text>
                                                    <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>{t.slug}</Text>
                                                </Flex>
                                                <Box className="prose prose-sm max-w-none">
                                                    <ReactMarkdown>{t.personalizedDescription}</ReactMarkdown>
                                                </Box>
                                            </Flex>
                                        </Box>
                                    ))}
                                </Flex>
                            </ScrollArea>
                        </>
                    )}
                </Flex>

                <Flex justify="end" mt="4">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">Close</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
