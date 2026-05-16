"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flex, Text, TextField, Box } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import TipCallout from "@/components/Shared/TipCallout";
import { Entity } from "@/types/entity";

interface EntityFormProps {
    initialData?: Entity | null;
    isEditing?: boolean;
    onSuccess?: (entity: Entity) => void;
    onCancel?: () => void;
}

export default function EntityForm({ initialData, isEditing = false, onSuccess, onCancel }: EntityFormProps) {
    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setWebsite(initialData.website || "");
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isEditing && initialData
                ? `/api/entities/${initialData.id}`
                : "/api/entities";
            const method = isEditing ? "PUT" : "POST";

            const body: { name: string, website: string, isArchived?: boolean } = { name, website };
            if (isEditing && initialData) {
                body.isArchived = initialData.isArchived;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Failed to ${isEditing ? 'update' : 'create'} entity`);
            }

            const data = await response.json();
            const entity = data.entity || data;

            // Refresh Server Components to get updated entity list
            router.refresh();

            if (onSuccess) {
                onSuccess(entity);
            } else {
                router.push(isEditing ? "/entities" : `/${entity.id}`);
            }
        } catch (error) {
            console.error("Error:", error);
            // Replace window.alert if a better toast mechanism is preferred, but sticking to logic per instructions
            alert(`Failed to ${isEditing ? 'update' : 'create'} entity. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
                <Box>
                    <Text as="label" size="2" weight="bold" mb="1">
                        Entity Name <Text color="red">*</Text>
                    </Text>
                    <TextField.Root
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Acme Corp, Product X"
                        required
                    />
                    <Text size="1" color="gray" mt="1">
                        This is the name we will look for in LLM responses.
                    </Text>
                </Box>

                <Box>
                    <Text as="label" size="2" weight="bold" mb="1">
                        Website
                    </Text>
                    <TextField.Root
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="e.g. example.com or https://example.com"
                    />
                    <Text size="1" color="gray" mt="1">
                        Used to track direct sources.
                    </Text>
                </Box>

                <TipCallout>
                    We&apos;ll set up the entity. You can then create prompts to track visibility across different LLMs. Switch entities by clicking the card.
                </TipCallout>

                <Box mt="4" width="100%">
                    <Flex gap="3" direction={{ initial: 'column', sm: 'row' }} style={{ width: '100%' }}>
                        <Box style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
                            <Button
                                variant="secondary"
                                type="button"
                                size="sm"
                                onClick={() => onCancel ? onCancel() : router.back()}
                                fullWidth
                                style={{ width: '100%' }}
                            >
                                Cancel
                            </Button>
                        </Box>
                        <Box style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
                            <Button
                                variant="primary"
                                type="submit"
                                size="sm"
                                disabled={!name}
                                isLoading={loading}
                                loadingText={isEditing ? "Updating..." : "Creating..."}
                                fullWidth
                                style={{ width: '100%' }}
                            >
                                {isEditing ? "Update Entity" : "Create Entity"}
                            </Button>
                        </Box>
                    </Flex>
                </Box>
            </Flex>
        </form>
    );
}
