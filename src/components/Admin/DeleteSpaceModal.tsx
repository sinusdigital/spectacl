"use client";

import React, { useEffect, useState } from "react";
import {
    AlertDialog,
    Badge,
    Box,
    Button,
    Callout,
    Flex,
    Separator,
    Spinner,
    Text,
    TextField,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, TrashIcon } from "@radix-ui/react-icons";

interface EntityPreview {
    id: string;
    name: string;
    website: string | null;
    promptCount: number;
}

interface DeleteSummary {
    entityCount: number;
    promptCount: number;
    analysisResultCount: number;
}

interface DeleteSpaceModalProps {
    spaceId: string | null;
    spaceName: string;
    onClose: () => void;
    onDeleted: () => void;
}

const CONFIRM_WORD = "DELETE";

export default function DeleteSpaceModal({
    spaceId,
    spaceName,
    onClose,
    onDeleted,
}: DeleteSpaceModalProps) {
    const isOpen = !!spaceId;

    const [confirmInput, setConfirmInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [entities, setEntities] = useState<EntityPreview[]>([]);
    const [summary, setSummary] = useState<DeleteSummary | null>(null);

    useEffect(() => {
        if (!spaceId) {
            setConfirmInput("");
            setEntities([]);
            setSummary(null);
            return;
        }

        setPreviewLoading(true);
        fetch(`/api/admin/spaces/${spaceId}`)
            .then((r) => r.json())
            .then((data) => {
                setEntities(data.entities ?? []);
                setSummary(data.summary ?? null);
            })
            .catch(() => {
                setEntities([]);
                setSummary(null);
            })
            .finally(() => setPreviewLoading(false));
    }, [spaceId]);

    const canConfirm = confirmInput === CONFIRM_WORD && !loading;

    const handleDelete = async () => {
        if (!spaceId || !canConfirm) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/spaces/${spaceId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error();
            onDeleted();
        } catch {
            // error handled by parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
            <AlertDialog.Content maxWidth="520px">
                {/* Header */}
                <Flex align="center" gap="3" mb="4">
                    <Flex
                        align="center" justify="center"
                        style={{
                            background: "var(--red-3)",
                            borderRadius: "var(--radius-3)",
                            width: 36,
                            height: 36,
                            flexShrink: 0,
                        }}
                    >
                        <TrashIcon width={18} height={18} color="var(--red-9)" />
                    </Flex>
                    <Flex direction="column" gap="1">
                        <AlertDialog.Title mb="0">Delete Space</AlertDialog.Title>
                        <Text size="2" color="gray">This action is permanent and cannot be undone.</Text>
                    </Flex>
                </Flex>

                {/* Danger callout */}
                <Callout.Root color="red" variant="surface" mb="4" size="1">
                    <Callout.Icon>
                        <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>
                        <Text weight="bold">Warning:</Text> Deleting <Text weight="bold">&ldquo;{spaceName}&rdquo;</Text> will permanently
                        remove all associated data from the database.
                    </Callout.Text>
                </Callout.Root>

                {/* What will be deleted */}
                <Box mb="4">
                    <Text size="2" weight="bold" mb="2" as="p">Everything that will be deleted:</Text>

                    {previewLoading ? (
                        <Flex align="center" justify="center" py="4">
                            <Spinner size="2" />
                        </Flex>
                    ) : (
                        <>
                            {/* Summary counts */}
                            {summary && (
                                <Flex gap="2" mb="3" wrap="wrap">
                                    <Badge color="red" variant="soft" size="1">
                                        {summary.entityCount} {summary.entityCount === 1 ? "entity" : "entities"}
                                    </Badge>
                                    <Badge color="red" variant="soft" size="1">
                                        {summary.promptCount} {summary.promptCount === 1 ? "prompt" : "prompts"}
                                    </Badge>
                                    <Badge color="red" variant="soft" size="1">
                                        {summary.analysisResultCount} analysis results
                                    </Badge>
                                    <Badge color="red" variant="soft" size="1">
                                        all members &amp; invitations
                                    </Badge>
                                </Flex>
                            )}

                            {/* Entity list */}
                            {entities.length > 0 ? (
                                <Box
                                    style={{
                                        border: "1px solid var(--red-6)",
                                        borderRadius: "var(--radius-3)",
                                        overflow: "hidden",
                                        maxHeight: 240,
                                        overflowY: "auto",
                                    }}
                                >
                                    {entities.map((entity, i) => (
                                        <React.Fragment key={entity.id}>
                                            {i > 0 && <Separator size="4" />}
                                            <Flex
                                                align="center" justify="between" px="3" py="2"
                                                style={{ background: i % 2 === 0 ? "var(--red-2)" : "var(--red-1)" }}
                                            >
                                                <Flex direction="column" gap="0">
                                                    <Text size="2" weight="medium">{entity.name}</Text>
                                                    {entity.website && (
                                                        <Text size="1" color="gray">{entity.website}</Text>
                                                    )}
                                                </Flex>
                                                <Badge color="red" variant="soft" size="1">
                                                    {entity.promptCount} {entity.promptCount === 1 ? "prompt" : "prompts"}
                                                </Badge>
                                            </Flex>
                                        </React.Fragment>
                                    ))}
                                </Box>
                            ) : !previewLoading && (
                                <Text size="2" color="gray">No entities in this space.</Text>
                            )}
                        </>
                    )}
                </Box>

                <Separator size="4" mb="4" />

                {/* Typed confirmation */}
                <Flex direction="column" gap="2" mb="4">
                    <Text size="2" as="label" htmlFor="confirm-delete">
                        Type <Text weight="bold" style={{ fontFamily: "var(--font-mono)", color: "var(--red-11)" }}>{CONFIRM_WORD}</Text> to confirm deletion:
                    </Text>
                    <TextField.Root
                        id="confirm-delete"
                        placeholder={CONFIRM_WORD}
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        color={confirmInput && confirmInput !== CONFIRM_WORD ? "red" : undefined}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </Flex>

                {/* Actions */}
                <Flex gap="3">
                    <AlertDialog.Cancel style={{ flex: 1 }}>
                        <Button
                            variant="soft"
                            color="gray"
                            disabled={loading}
                            onClick={onClose}
                            style={{ width: '100%' }}
                        >
                            Cancel
                        </Button>
                    </AlertDialog.Cancel>
                    <Button
                        color="red"
                        variant="solid"
                        disabled={!canConfirm}
                        loading={loading}
                        onClick={handleDelete}
                        style={{ flex: 1 }}
                    >
                        <TrashIcon />
                        Delete Space
                    </Button>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
