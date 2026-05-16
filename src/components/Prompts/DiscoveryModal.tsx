"use client";

import React, { useEffect, useState } from "react";
import Modal from "@/components/Shared/Modal";
import Button from "@/components/Shared/Button";
import PromptDiscoveryFields, { PromptDiscoveryInputs } from "./PromptDiscoveryFields";

interface DiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    onDiscoveryComplete: (inputs: Record<string, string>) => void;
}

const EMPTY_INPUTS: PromptDiscoveryInputs = {
    entityDescription: "",
    entityDomain: "",
    personas: "",
    language: "",
};

function hydrateInputs(raw: unknown): PromptDiscoveryInputs {
    if (!raw || typeof raw !== "object") return EMPTY_INPUTS;
    const r = raw as Record<string, unknown>;
    return {
        entityDescription: typeof r.entityDescription === "string" ? r.entityDescription : "",
        entityDomain: typeof r.entityDomain === "string" ? r.entityDomain : "",
        personas: typeof r.personas === "string" ? r.personas : "",
        language: typeof r.language === "string" ? r.language : "",
    };
}

export default function DiscoveryModal({ isOpen, onClose, entityId, onDiscoveryComplete }: DiscoveryModalProps) {
    const [entityName, setEntityName] = useState("our brand");
    const [inputs, setInputs] = useState<PromptDiscoveryInputs>(EMPTY_INPUTS);

    useEffect(() => {
        if (!isOpen || !entityId) return;
        let cancelled = false;
        fetch(`/api/entities/${entityId}`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                if (d?.name) setEntityName(d.name);
                // Pre-fill from server-persisted discovery inputs if present.
                // Only overwrite local state on open — don't clobber in-progress edits.
                if (d?.discoveryInputs) {
                    setInputs(hydrateInputs(d.discoveryInputs));
                }
            })
            .catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [isOpen, entityId]);

    const canSubmit = inputs.entityDescription.trim().length > 0 && inputs.personas.trim().length > 0;

    const handleClose = () => {
        // Reset only on close so mid-edit state survives an accidental reopen flicker.
        setInputs(EMPTY_INPUTS);
        onClose();
    };

    const handleGenerate = () => {
        if (!canSubmit) return;
        onDiscoveryComplete({ entityName, ...inputs });
        setInputs(EMPTY_INPUTS);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="2xl"
            title="Discover prompts"
            description="Tell us about your buyers. We'll generate prompt ideas they'd realistically ask an LLM."
            actions={
                <>
                    <Button variant="tertiary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleGenerate} disabled={!canSubmit}>
                        Generate prompts
                    </Button>
                </>
            }
        >
            <PromptDiscoveryFields
                entityName={entityName}
                inputs={inputs}
                onChange={(patch) => setInputs(prev => ({ ...prev, ...patch }))}
            />
        </Modal>
    );
}
