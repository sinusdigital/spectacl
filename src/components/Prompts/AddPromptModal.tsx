import React, { useState } from 'react';
import { Flex, Text, Box, TextField, Grid } from '@radix-ui/themes';
import Modal from "@/components/Shared/Modal";
import Button from "@/components/Shared/Button";
import IntentSwitcher from "@/components/Prompts/IntentSwitcher";
import TagSelector from "@/components/Prompts/TagSelector";
import LanguageSelect from "@/components/Prompts/LanguageSelect";

interface AddPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    onAdd: (prompt: string, intent: string, tags: string[], shouldRun: boolean, language: string) => Promise<boolean>;
}

export default function AddPromptModal({ isOpen, onClose, entityId, onAdd }: AddPromptModalProps) {
    const [newPrompt, setNewPrompt] = useState("");
    const [newIntent, setNewIntent] = useState("Informational");
    const [customIntent, setCustomIntent] = useState("");
    const [newTags, setNewTags] = useState<string[]>([]);
    const [newLanguage, setNewLanguage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!newPrompt.trim()) return;
        const finalIntent = newIntent === "Custom" ? customIntent.trim() : newIntent;
        if (!finalIntent) return;

        setSubmitting(true);
        try {
            // Always run (shouldRun = true) as per new requirement
            const success = await onAdd(newPrompt, finalIntent, newTags, true, newLanguage);
            if (success) {
                // Reset form and close on success
                setNewPrompt("");
                setNewIntent("Informational");
                setCustomIntent("");
                setNewTags([]);
                setNewLanguage("");
                onClose();
            }
        } catch (error) {
            console.error("Error adding prompt:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Track New Prompt"
            description="Define the prompt you want to track visibility for in LLMs."
            size="lg"
            actions={
                <>
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={submitting}
                        size="md"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={submitting || !newPrompt.trim() || (newIntent === "Custom" && !customIntent.trim())}
                        isLoading={submitting}
                        loadingText="Adding..."
                        size="md"
                    >
                        Add Prompt and Run
                    </Button>
                </>
            }
        >
            <Flex direction="column" gap="6">
                {/* Prompt Input */}
                <Flex direction="column" gap="2">
                    <Text as="label" size="2" weight="medium" color="gray">
                        Prompt <Text color="red">*</Text>
                    </Text>
                    <TextField.Root
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        size="3"
                        autoFocus
                    />
                    <Text size="1" color="gray">
                        This is the question or query we will track in LLM responses.
                    </Text>
                </Flex>

                {/* Market, Intent & Tags Row */}
                <Grid columns={{ initial: "1", sm: "3" }} gap="6">
                    <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="medium" color="gray">Market</Text>
                        <LanguageSelect
                            value={newLanguage}
                            onChange={setNewLanguage}
                        />
                        <Text size="1" color="gray">
                            Regional context for how LLMs answer this prompt.
                        </Text>
                    </Flex>
                    <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="medium" color="gray">
                            Intent <Text color="red">*</Text>
                        </Text>
                        <IntentSwitcher
                            currentIntent={newIntent}
                            onIntentChange={setNewIntent}
                            mode="input"
                        />
                        {newIntent === "Custom" && (
                            <Box mt="2">
                                <TextField.Root
                                    value={customIntent}
                                    onChange={(e) => setCustomIntent(e.target.value)}
                                    placeholder="Enter custom intent..."
                                    size="3"
                                />
                            </Box>
                        )}
                        <Text size="1" color="gray">
                            Categorize the user intent for this prompt.
                        </Text>
                    </Flex>
                    <Flex direction="column" gap="2">
                        <Text as="label" size="2" weight="medium" color="gray">Tags</Text>
                        <TagSelector
                            entityId={entityId}
                            selectedTags={newTags}
                            onChange={setNewTags}
                            placeholder="Add tags..."
                            className="w-full"
                        />
                        <Text size="1" color="gray">
                            Optional tags for organization.
                        </Text>
                    </Flex>
                </Grid>
            </Flex>
        </Modal>
    );
}
