"use client";

import React, { useState, useEffect } from "react";
import { Dialog, Flex, Text, Box, TextField, IconButton, Theme } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { BaseCard } from "@/components/Shared/BaseCard";
import Button from "@/components/Shared/Button";

interface Tag {
    id?: string;
    name: string;
    color: string | null;
}

interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, color: string) => Promise<void>;
    mode: "create" | "edit";
    tag?: Tag; // Required for "edit" mode
    predefinedColors: string[];
    initialColor?: string; // Opt-in default for "create" mode
}

export default function TagModal({
    isOpen,
    onClose,
    onSubmit,
    mode,
    tag,
    predefinedColors,
    initialColor = "#3B82F6"
}: TagModalProps) {
    const isEdit = mode === "edit";
    const [name, setName] = useState("");
    const [color, setColor] = useState(initialColor);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync state when modal opens or tag/mode changes
    useEffect(() => {
        if (isOpen) {
            if (isEdit && tag) {
                setName(tag.name);
                setColor(tag.color || initialColor);
            } else {
                setName("");
                setColor(initialColor);
            }
        }
    }, [isOpen, isEdit, tag, initialColor]);

    const handleFormSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!name.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name.trim(), color);
            onClose();
        } catch (error) {
            console.error(`Error ${isEdit ? "updating" : "creating"} tag:`, error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Content size="2" style={{ padding: 0, overflow: 'hidden', maxWidth: '450px' }}>
                <Theme panelBackground="translucent">
                    <BaseCard className="border-none shadow-none h-auto">
                        <BaseCard.Header
                            title={isEdit ? "Edit Tag" : "Add Tag"}
                            subtitle={isEdit ? "Update tag name and color" : "Create a new tag to organize your prompts"}
                            headerExtra={
                                <Dialog.Close>
                                    <IconButton variant="ghost" color="gray">
                                        <Cross2Icon />
                                    </IconButton>
                                </Dialog.Close>
                            }
                        />

                        <BaseCard.Body className="px-1">
                            <form id="tag-form" onSubmit={handleFormSubmit}>
                                <Flex direction="column" gap="4">
                                    <Box>
                                        <Text as="label" size="2" weight="medium" mb="2" className="block">
                                            Tag Name
                                        </Text>
                                        <TextField.Root
                                            size="3"
                                            placeholder="Enter tag name..."
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            autoFocus
                                            required
                                        />
                                    </Box>

                                    <Box>
                                        <Text as="label" size="2" weight="medium" mb="2" className="block">
                                            Color
                                        </Text>
                                        <Flex wrap="wrap" gap="2" mb="3">
                                            {predefinedColors.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setColor(c)}
                                                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                                                        color === c ? 'border-[var(--gray-12)] scale-110 shadow-sm' : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: c }}
                                                    aria-label={`Select color ${c}`}
                                                />
                                            ))}
                                        </Flex>
                                    </Box>
                                </Flex>
                            </form>
                        </BaseCard.Body>

                        <BaseCard.Footer className="px-0 pb-0">
                            <Flex gap="3" width="100%">
                                <Dialog.Close style={{ flex: 1 }}>
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        disabled={isSubmitting}
                                        style={{ width: '100%' }}
                                    >
                                        Cancel
                                    </Button>
                                </Dialog.Close>
                                <Button
                                    form="tag-form"
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    disabled={!name.trim() || isSubmitting}
                                    isLoading={isSubmitting}
                                    style={{ flex: 1 }}
                                >
                                    {isEdit ? "Update Tag" : "Create Tag"}
                                </Button>
                            </Flex>
                        </BaseCard.Footer>
                    </BaseCard>
                </Theme>
            </Dialog.Content>
        </Dialog.Root>
    );
}
