"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import TagSelector from "./TagSelector";

interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

interface TagAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    promptId: string;
    promptText: string;
    initialTags: Tag[];
    onSave: (promptId: string, tagNames: string[]) => Promise<void>;
}

export default function TagAssignmentModal({
    isOpen,
    onClose,
    entityId,
    promptId,
    promptText,
    initialTags,
    onSave
}: TagAssignmentModalProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedTags(initialTags.map(t => t.name));
        }
    }, [isOpen, initialTags]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(promptId, selectedTags);
            onClose();
        } catch (error) {
            console.error("Error saving tags:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Content maxWidth="450px" style={{ overflow: 'visible' }}>
                <Dialog.Title>Assign Tags</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Manage tags for: <Text weight="bold" color="gray">&ldquo;{promptText}&rdquo;</Text>
                </Dialog.Description>

                <Flex direction="column" gap="4">
                    <TagSelector
                        entityId={entityId}
                        selectedTags={selectedTags}
                        onChange={setSelectedTags}
                        placeholder="Type to add or create tags..."
                    />

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" disabled={isSaving}>
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Button onClick={handleSave} loading={isSaving}>
                            Save Tags
                        </Button>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
