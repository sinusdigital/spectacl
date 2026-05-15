"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton, Tooltip, Popover, Text, Flex, Code, Badge } from "@radix-ui/themes";
import { UpdateIcon } from "@radix-ui/react-icons";

interface RegenerateResult {
    sampledResults: number;
    result: {
        skippedReason?: string;
        brandsFound: number;
        newSuggestions: number;
        skippedDuplicates: number;
        llmModel?: string;
        sampleNewNames?: string[];
        error?: string;
    };
    note?: string;
}

export default function RegenerateSuggestionsButton({ entityId }: { entityId: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<RegenerateResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function run() {
        setBusy(true);
        setError(null);
        setResult(null);
        setOpen(true);
        try {
            const res = await fetch(
                `/api/admin/entities/${entityId}/regenerate-suggestions?limit=30`,
                { method: "POST" }
            );
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Request failed");
                return;
            }
            setResult(data);
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Request failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger>
                <Tooltip content="Regenerate brand suggestions (admin diagnostic)">
                    <IconButton
                        size="1"
                        variant="soft"
                        color="gray"
                        onClick={run}
                        disabled={busy}
                        aria-label="Regenerate suggestions"
                    >
                        <UpdateIcon />
                    </IconButton>
                </Tooltip>
            </Popover.Trigger>
            <Popover.Content size="2" style={{ maxWidth: 360 }}>
                {busy && <Text size="2">Running extraction…</Text>}
                {error && (
                    <Text size="2" color="red">{error}</Text>
                )}
                {result && (
                    <Flex direction="column" gap="2">
                        <Text size="1" color="gray">
                            Sampled <strong>{result.sampledResults}</strong> successful results
                        </Text>
                        {result.note && <Text size="1" color="orange">{result.note}</Text>}
                        {result.result.skippedReason ? (
                            <Badge color="red" variant="soft">
                                Skipped: {result.result.skippedReason}
                            </Badge>
                        ) : (
                            <Flex gap="2" wrap="wrap">
                                <Badge color="blue" variant="soft">
                                    {result.result.brandsFound} found
                                </Badge>
                                <Badge color="green" variant="soft">
                                    {result.result.newSuggestions} inserted
                                </Badge>
                                <Badge color="gray" variant="soft">
                                    {result.result.skippedDuplicates} dup
                                </Badge>
                            </Flex>
                        )}
                        {result.result.llmModel && (
                            <Text size="1" color="gray">Model: <Code>{result.result.llmModel}</Code></Text>
                        )}
                        {result.result.sampleNewNames && result.result.sampleNewNames.length > 0 && (
                            <Text size="1" color="gray">
                                New: {result.result.sampleNewNames.join(", ")}
                            </Text>
                        )}
                        {result.result.error && (
                            <Text size="1" color="red" style={{ wordBreak: "break-word" }}>
                                {result.result.error}
                            </Text>
                        )}
                    </Flex>
                )}
            </Popover.Content>
        </Popover.Root>
    );
}
