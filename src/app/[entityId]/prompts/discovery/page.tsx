"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import PageHeader from "@/components/Shared/PageHeader";
import PromptDiscoveryFields, { PromptDiscoveryInputs } from "@/components/Prompts/PromptDiscoveryFields";

const EMPTY_INPUTS: PromptDiscoveryInputs = {
    entityDescription: "",
    entityDomain: "",
    personas: "",
    language: "",
};

export default function PromptDiscoveryPage() {
    const params = useParams();
    const router = useRouter();
    const entityId = params.entityId as string;

    const [entityName, setEntityName] = useState("our brand");
    const [inputs, setInputs] = useState<PromptDiscoveryInputs>(EMPTY_INPUTS);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!entityId) return;
        fetch(`/api/entities/${entityId}`)
            .then(r => r.json())
            .then(d => { if (d?.name) setEntityName(d.name); })
            .catch(() => { /* ignore */ });
    }, [entityId]);

    const canSubmit =
        inputs.entityDescription.trim().length > 0 &&
        inputs.personas.trim().length > 0 &&
        !submitting;

    const handleGenerate = () => {
        if (!canSubmit) return;
        setSubmitting(true);
        const payload = { entityName, ...inputs };
        sessionStorage.setItem("pending_discovery_inputs", JSON.stringify(payload));
        router.push(`/${entityId}/prompts`);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Discover prompts"
                breadcrumbs={[{ label: "Prompts", href: `/${entityId}/prompts` }]}
            />
            <Box className="max-w-3xl mx-auto">
                <Card size="3" variant="surface">
                    <Box p="4">
                        <Flex direction="column" gap="5">
                            <Box>
                                <Heading as="h2" size="4" weight="bold" mb="1">
                                    Tell us about your buyers
                                </Heading>
                                <Text size="2" color="gray">
                                    We&apos;ll generate prompt ideas your target personas would realistically ask an LLM.
                                </Text>
                            </Box>

                            <PromptDiscoveryFields
                                entityName={entityName}
                                inputs={inputs}
                                onChange={(patch) => setInputs(prev => ({ ...prev, ...patch }))}
                                disabled={submitting}
                            />

                            <Flex gap="3" justify="end">
                                <Button
                                    variant="tertiary"
                                    onClick={() => router.push(`/${entityId}/prompts`)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleGenerate}
                                    disabled={!canSubmit}
                                    isLoading={submitting}
                                >
                                    Generate prompts
                                </Button>
                            </Flex>
                        </Flex>
                    </Box>
                </Card>
            </Box>
        </div>
    );
}
