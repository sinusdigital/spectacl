"use client";

import { useState, useEffect } from "react";
import { Flex, Text, TextField, Box } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import Modal from "@/components/Shared/Modal";
import { Competitor } from "@/types/competitors";

interface CompetitorModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    competitor?: Competitor;
    onSubmit: (data: { name: string; website: string; aliases: string[] }) => Promise<{ success: boolean } | boolean | void>;
    isLoading?: boolean;
}

export default function CompetitorModal({
    isOpen,
    onClose,
    mode,
    competitor,
    onSubmit,
    isLoading = false
}: CompetitorModalProps) {
    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [aliases, setAliases] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);

    // Reset or populate form when modal opens or mode changes
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && competitor) {
                setName(competitor.name);
                setWebsite(competitor.website || "");
                setAliases(competitor.aliases?.join(", ") || "");
            } else {
                setName("");
                setWebsite("");
                setAliases("");
            }
            setUrlError(null);
        }
    }, [isOpen, mode, competitor]);

    const normalizeUrl = (url: string) => {
        if (!url) return "";
        let normalized = url.trim();
        normalized = normalized.replace(/\s/g, '');
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = `https://${normalized}`;
        }
        return normalized;
    };

    const validateUrl = (url: string) => {
        if (!url) return true;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleWebsiteBlur = () => {
        if (!website) {
            setUrlError(null);
            return;
        }
        const normalized = normalizeUrl(website);
        setWebsite(normalized);
        if (!validateUrl(normalized)) {
            setUrlError("Please enter a valid URL (e.g., example.com)");
        } else {
            setUrlError(null);
        }
    };

    const handleFormSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!name.trim() || urlError) return;

        setIsSubmitting(true);
        const aliasesArray = aliases.split(",").map(s => s.trim()).filter(Boolean);
        
        try {
            const result = await onSubmit({ 
                name: name.trim(), 
                website: website.trim(),
                aliases: aliasesArray
            });
            
            // If it's a direct boolean success or a success object
            const isSuccess = typeof result === 'boolean' ? result : result?.success;
            
            if (isSuccess) {
                onClose();
            }
        } catch (error) {
            console.error("Failed to save competitor:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = mode === 'create' ? "Add Competitor" : "Edit Competitor";
    const submitLabel = mode === 'create' ? "Add Competitor" : "Update Competitor";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={mode === 'create' ? "Add a new competitor to track alongside your brand." : "Update competitor details and alternative names used for tracking."}
            style={{ maxWidth: '450px' }}
            actions={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleFormSubmit()}
                        disabled={!name.trim() || !!urlError || isSubmitting || isLoading}
                        isLoading={isSubmitting || isLoading}
                        type="submit"
                    >
                        {submitLabel}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleFormSubmit}>
                <Flex direction="column" gap="4">
                    <Box>
                        <Text as="label" size="2" weight="medium" mb="2" className="block">
                            Competitor Name
                        </Text>
                        <TextField.Root
                            size="3"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            required
                        />
                    </Box>

                    <Box>
                        <Text as="label" size="2" weight="medium" mb="2" className="block">
                            Website (URL)
                        </Text>
                        <TextField.Root
                            size="3"
                            value={website}
                            onChange={(e) => {
                                setWebsite(e.target.value);
                                setUrlError(null);
                            }}
                            onBlur={handleWebsiteBlur}
                            placeholder="e.g. example.com"
                            color={urlError ? "red" : undefined}
                        />
                        {urlError ? (
                            <Text size="1" color="red" mt="1" className="block">{urlError}</Text>
                        ) : (
                            <Text size="1" color="gray" mt="1" className="block">
                                Used to track direct sources and identify mentions.
                            </Text>
                        )}
                    </Box>

                    <Box>
                        <Text as="label" size="2" weight="medium" mb="2" className="block">
                            Aliases
                        </Text>
                        <TextField.Root
                            size="3"
                            value={aliases}
                            onChange={(e) => setAliases(e.target.value)}
                            placeholder="e.g. Alphabet, Google Cloud"
                        />
                        <Text size="1" color="gray" mt="1" className="block">
                            Alternative names used to detect mentions (comma separated).
                        </Text>
                    </Box>
                </Flex>
            </form>
        </Modal>
    );
}
