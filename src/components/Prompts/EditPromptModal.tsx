"use client";

import { useState, useEffect, useRef } from "react";
import { Flex, Text, Grid } from "@radix-ui/themes";
import Modal from "@/components/Shared/Modal";
import Button from "@/components/Shared/Button";
import IntentSwitcher from "@/components/Prompts/IntentSwitcher";
import TagSelector from "@/components/Prompts/TagSelector";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface EditPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    intent: string;
    tags: string[];
    onIntentChange: (intent: string) => Promise<void>;
    onTagChange: (tags: string[]) => Promise<void>;
}

export default function EditPromptModal({
    isOpen,
    onClose,
    entityId,
    intent,
    tags,
    onIntentChange,
    onTagChange,
}: EditPromptModalProps) {
    const [localIntent, setLocalIntent] = useState(intent);
    const [localTags, setLocalTags] = useState<string[]>(tags);
    const [saving, setSaving] = useState(false);

    // Sync local state only when modal opens (not on every prop change while open)
    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevOpenRef.current) {
            setLocalIntent(intent);
            setLocalTags(tags);
        }
        prevOpenRef.current = isOpen;
    }, [isOpen, intent, tags]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const promises: Promise<void>[] = [];
            if (localIntent !== intent) {
                promises.push(onIntentChange(localIntent));
            }
            const tagsChanged =
                localTags.length !== tags.length ||
                localTags.some((t, i) => t !== tags[i]);
            if (tagsChanged) {
                promises.push(onTagChange(localTags));
            }
            await Promise.all(promises);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Prompt"
            description="Update the intent and tags for this prompt."
            size="md"
            actions={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={saving}
                        size="md"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        isLoading={saving}
                        loadingText="Saving..."
                        size="md"
                    >
                        Save
                    </Button>
                </>
            }
        >
            <Flex direction="column" gap="5">
                <Grid columns={{ initial: "1", sm: "2" }} gap="6" align="start">
                    <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="medium" color="gray">
                            Intent
                        </Text>
                        <IntentSwitcher
                            currentIntent={localIntent}
                            onIntentChange={setLocalIntent}
                            mode="input"
                        />
                        <Text size="1" color="gray">
                            Categorize the user intent for this prompt.
                        </Text>
                    </Flex>

                    <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="medium" color="gray">
                            Tags
                        </Text>
                        <TagSelector
                            entityId={entityId}
                            selectedTags={localTags}
                            onChange={setLocalTags}
                            placeholder="Add tags…"
                            className="w-full"
                        />
                        <Text size="1" color="gray">
                            Optional tags for organization.
                        </Text>
                    </Flex>
                </Grid>

                <Flex
                    align="center"
                    gap="2"
                    style={{
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--gray-a2)',
                        borderRadius: 'var(--radius-2)',
                        border: '1px solid var(--gray-a4)',
                    }}
                >
                    <InfoCircledIcon style={{ color: 'var(--gray-9)', flexShrink: 0 }} />
                    <Text size="1" color="gray">
                        Region cannot be changed after creation to keep analysis data consistent. To track a different region, create a new prompt.
                    </Text>
                </Flex>
            </Flex>
        </Modal>
    );
}
