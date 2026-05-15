"use client";

import React from "react";
import { Box, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import LanguageSelect from "./LanguageSelect";

export interface PromptDiscoveryInputs {
    entityDescription: string;
    entityDomain: string;
    personas: string;
    language: string;
}

interface PromptDiscoveryFieldsProps {
    entityName: string;
    inputs: PromptDiscoveryInputs;
    onChange: (patch: Partial<PromptDiscoveryInputs>) => void;
    disabled?: boolean;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <Text as="label" size="2" weight="medium" mb="1" color="gray" style={{ display: "block" }}>
            {children}{required && <Text color="red"> *</Text>}
        </Text>
    );
}

export default function PromptDiscoveryFields({
    entityName,
    inputs,
    onChange,
    disabled = false,
}: PromptDiscoveryFieldsProps) {
    return (
        <Flex direction="column" gap="4">
            <Box>
                <FieldLabel>Entity name</FieldLabel>
                <TextField.Root value={entityName} size="2" disabled />
            </Box>
            <Box>
                <FieldLabel required>What does this entity do?</FieldLabel>
                <TextArea
                    value={inputs.entityDescription}
                    onChange={e => onChange({ entityDescription: e.target.value })}
                    placeholder="Briefly describe what your entity does or sells."
                    rows={3}
                    size="2"
                    disabled={disabled}
                />
            </Box>
            <Box>
                <FieldLabel>Industry or domain</FieldLabel>
                <TextField.Root
                    value={inputs.entityDomain}
                    onChange={e => onChange({ entityDomain: e.target.value })}
                    placeholder="e.g. Medical devices, SaaS, Fintech"
                    size="2"
                    disabled={disabled}
                />
            </Box>
            <Box>
                <FieldLabel required>Target personas</FieldLabel>
                <TextArea
                    value={inputs.personas}
                    onChange={e => onChange({ personas: e.target.value })}
                    placeholder="e.g. CTO, Product Manager, Surgeon"
                    rows={2}
                    size="2"
                    disabled={disabled}
                />
                <Text size="1" color="gray" mt="1">Separate personas with commas.</Text>
            </Box>
            <Flex direction="column" gap="2" align="start">
                <Text as="label" size="2" weight="medium" color="gray">Market</Text>
                <LanguageSelect value={inputs.language} onChange={(v) => onChange({ language: v })} />
                <Text size="1" color="gray">
                    Regional context for how LLMs answer this prompt.
                </Text>
            </Flex>
        </Flex>
    );
}
