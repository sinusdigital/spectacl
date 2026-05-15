import { useState, useCallback } from 'react';
import { ModelConfig, DEFAULT_MODELS } from '@/types/models';

export function useModels(entityId: string) {
    const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS);
    const [loading, setLoading] = useState(true);

    const fetchModels = useCallback(async () => {
        if (!entityId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/entities/${entityId}/models?includeArchived=true`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setModels(data);
                }
            } else {
                console.warn("Failed to fetch models, using defaults.");
            }
        } catch (error) {
            console.error("Error fetching models:", error);
        } finally {
            setLoading(false);
        }
    }, [entityId]);

    const saveModel = async (modelData: Partial<ModelConfig> & { apiKey?: string }, isNew: boolean = false) => {
        try {
            const body: any = {
                modelId: modelData.id,
                isEnabled: modelData.isEnabled,
                isArchived: modelData.isArchived,
                provider: modelData.provider,
                name: modelData.name,
            };
            if (modelData.apiKey) {
                body.apiKey = modelData.apiKey;
            }

            const res = await fetch(`/api/entities/${entityId}/models`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                await fetchModels();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error("Error saving model:", error);
            return false;
        }
    };

    const deleteModel = async (modelId: string) => {
        try {
            const res = await fetch(`/api/entities/${entityId}/models?modelId=${modelId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setModels(prev => prev.filter(m => m.id !== modelId));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error deleting model:", error);
            return false;
        }
    };


    const toggleStatus = async (model: ModelConfig, newStatus: boolean) => {
        // Optimistic
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, isEnabled: newStatus } : m));

        // API
        try {
            await fetch(`/api/entities/${entityId}/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: model.id,
                    isEnabled: newStatus,
                    isArchived: model.isArchived,
                    provider: model.provider,
                    name: model.name
                })
            });
        } catch (error) {
            console.error("Error toggling status:", error);
            fetchModels(); // Revert
        }
    };

    const archiveModel = async (model: ModelConfig) => {
        // Optimistic
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, isArchived: true, isEnabled: false } : m));

        try {
            await fetch(`/api/entities/${entityId}/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: model.id,
                    isEnabled: false,
                    isArchived: true,
                    provider: model.provider,
                    name: model.name
                })
            });
        } catch (error) {
            console.error("Error archiving:", error);
            fetchModels(); // Revert
        }
    };

    const unarchiveModel = async (model: ModelConfig) => {
        // Optimistic
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, isArchived: false } : m));
        try {
            await fetch(`/api/entities/${entityId}/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: model.id,
                    isEnabled: model.isEnabled,
                    isArchived: false,
                    provider: model.provider,
                    name: model.name
                })
            });
        } catch (error) {
            console.error("Error unarchiving:", error);
            fetchModels(); // Revert
        }
    }


    return {
        models,
        loading,
        fetchModels,
        saveModel,
        deleteModel,
        toggleStatus,
        archiveModel,
        unarchiveModel
    };
}
