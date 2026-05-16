"use client";

import { useState, useCallback } from "react";
import { ModelConfig, DEFAULT_MODELS } from "@/types/prompts";

interface UseModelConfigsOptions {
    entityId: string;
}

interface UseModelConfigsReturn {
    modelConfigs: ModelConfig[];
    isLoading: boolean;
    fetchModels: () => Promise<void>;
    getActiveModels: () => ModelConfig[];
    getActiveModelIds: () => string[];
}

export function useModelConfigs({ entityId }: UseModelConfigsOptions): UseModelConfigsReturn {
    const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(DEFAULT_MODELS);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Suppress unused variable warning - entityId is part of the interface for future use
    void entityId;

    const fetchModels = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/spaces/current/models`);
            if (res.ok) {
                const data = await res.json();
                const fetchedModels = Array.isArray(data) ? data : (data.models || []);
                if (fetchedModels.length > 0) {
                    setModelConfigs(fetchedModels);
                }
            }
        } catch (error) {
            console.error("Error fetching models:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getActiveModels = useCallback(() => {
        // Only return models that are enabled and not archived
        // We allow models without explicit keys if they are enabled (e.g. MANAGED mode)
        return modelConfigs.filter(m => m.isEnabled && !m.isArchived);
    }, [modelConfigs]);

    const getActiveModelIds = useCallback(() => {
        return getActiveModels().map(m => m.id);
    }, [getActiveModels]);

    return {
        modelConfigs,
        isLoading,
        fetchModels,
        getActiveModels,
        getActiveModelIds
    };
}
