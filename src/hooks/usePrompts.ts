"use client";

import { useState, useCallback } from "react";
import { Prompt, ModelConfig, PromptStatus } from "@/types/prompts";

interface UsePromptsOptions {
    entityId: string;
    modelConfigs: ModelConfig[];
    onUsageChange?: () => void;
}

interface UsePromptsReturn {
    prompts: Prompt[];
    loading: boolean;
    runningPromptIds: Set<string>;
    fetchPrompts: () => Promise<void>;
    addPrompt: (
        text: string, 
        intent: string, 
        tags: string[], 
        shouldRun: boolean
    ) => Promise<{ success: boolean; promptId?: string }>;
    updatePromptStatus: (id: string, status: PromptStatus) => Promise<void>;
    updatePromptLLMs: (id: string, llms: string[]) => Promise<void>;
    togglePromptLLM: (id: string, modelId: string, isActive: boolean) => Promise<void>;
    deletePrompt: (id: string) => Promise<boolean>;
    runPromptNow: (id: string, promptData?: Prompt) => Promise<void>;
    updatePromptTags: (id: string, tags: string[]) => Promise<void>;
}

export function usePrompts({ 
    entityId, 
    modelConfigs,
    onUsageChange 
}: UsePromptsOptions): UsePromptsReturn {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningPromptIds, setRunningPromptIds] = useState<Set<string>>(new Set());

    const fetchPrompts = useCallback(async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}/prompts`);
            const data = await res.json();

            if (Array.isArray(data)) {
                setPrompts(data);
            } else {
                console.error("API returned non-array for prompts:", data);
                setPrompts([]);
            }
        } catch (error) {
            console.error("Error fetching prompts:", error);
        } finally {
            setLoading(false);
        }
    }, [entityId]);

    const addPrompt = useCallback(async (
        text: string, 
        intent: string, 
        tags: string[], 
        shouldRun: boolean
    ): Promise<{ success: boolean; promptId?: string }> => {
        try {
            const activeModels = modelConfigs
                .filter(m => m.isEnabled && !m.isArchived && m.hasApiKey)
                .map(m => m.id);

            const res = await fetch(`/api/entities/${entityId}/prompts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    intent,
                    status: 'Running',
                    nextRunAt: shouldRun ? new Date().toISOString() : null,
                    llms: activeModels,
                    tags
                }),
            });

            if (res.ok) {
                const newPromptData = await res.json();
                await fetchPrompts();
                onUsageChange?.();
                return { success: true, promptId: newPromptData?.id };
            }
            return { success: false };
        } catch (error) {
            console.error("Error creating prompt:", error);
            return { success: false };
        }
    }, [entityId, modelConfigs, fetchPrompts, onUsageChange]);

    const updatePromptStatus = useCallback(async (id: string, newStatus: PromptStatus) => {
        // Optimistic update
        setPrompts(prev => prev.map(p => p.id === id ? {
            ...p,
            status: newStatus,
            nextRunAt: newStatus === 'Paused' ? null : p.nextRunAt
        } : p));

        try {
            const res = await fetch(`/api/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
                onUsageChange?.();
            } else {
                fetchPrompts(); // Revert
            }
        } catch (error) {
            console.error("Error updating status:", error);
            fetchPrompts(); // Revert
        }
    }, [fetchPrompts, onUsageChange]);

    const updatePromptLLMs = useCallback(async (id: string, llms: string[]) => {
        setPrompts(prev => prev.map(p => p.id === id ? { ...p, llms } : p));

        try {
            await fetch(`/api/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ llms }),
            });
        } catch (error) {
            console.error("Error updating LLMs:", error);
            fetchPrompts(); // Revert
        }
    }, [fetchPrompts]);

    const togglePromptLLM = useCallback(async (
        promptId: string, 
        modelId: string, 
        isActive: boolean
    ) => {
        const prompt = prompts.find(p => p.id === promptId);
        if (!prompt) return;

        let newLLMs = [...(prompt.llms || [])];
        if (isActive) {
            newLLMs = newLLMs.filter(id => id !== modelId);
        } else {
            newLLMs.push(modelId);
        }

        await updatePromptLLMs(promptId, newLLMs);
    }, [prompts, updatePromptLLMs]);

    const deletePrompt = useCallback(async (id: string): Promise<boolean> => {
        try {
            const res = await fetch(`/api/prompts/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setPrompts(prev => prev.filter(p => p.id !== id));
                onUsageChange?.();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error deleting prompt:", error);
            return false;
        }
    }, [onUsageChange]);

    const runPromptNow = useCallback(async (id: string, promptData?: Prompt) => {
        const prompt = promptData || prompts.find(p => p.id === id);
        if (!prompt) return;

        setRunningPromptIds(prev => new Set(prev).add(id));
        const now = new Date().toISOString();

        // Optimistic update
        setPrompts(prev => prev.map(p => p.id === id ? { 
            ...p, 
            nextRunAt: now, 
            status: 'Running' as PromptStatus 
        } : p));

        try {
            await fetch(`/api/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nextRunAt: now,
                    status: 'Running',
                    triggerAnalysis: true,
                    llms: prompt.llms
                }),
            });
            fetchPrompts();
        } catch (error) {
            console.error("Error running prompt:", error);
            fetchPrompts();
        } finally {
            setRunningPromptIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [prompts, fetchPrompts]);

    const updatePromptTags = useCallback(async (id: string, tags: string[]) => {
        // Optimistic update - need to handle tags array conversion
        setPrompts(prev => prev.map(p => {
            if (p.id !== id) return p;
            const tagObjects = tags.map(name => ({
                id: `temp-${name}`,
                name,
                color: null
            }));
            return { ...p, tags: tagObjects };
        }));

        try {
            const res = await fetch(`/api/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags }),
            });
            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
            } else {
                fetchPrompts();
            }
        } catch (error) {
            console.error("Error updating tags:", error);
            fetchPrompts();
        }
    }, [fetchPrompts]);

    return {
        prompts,
        loading,
        runningPromptIds,
        fetchPrompts,
        addPrompt,
        updatePromptStatus,
        updatePromptLLMs,
        togglePromptLLM,
        deletePrompt,
        runPromptNow,
        updatePromptTags
    };
}
