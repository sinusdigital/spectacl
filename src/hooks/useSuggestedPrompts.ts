"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Prompt, SuggestedPrompt } from "@/types/prompts";

interface AcceptResult {
    newPrompt: Prompt & { refillEnqueued?: boolean };
    refillEnqueued: boolean;
}

interface RejectResult {
    refillEnqueued: boolean;
}

interface UseSuggestedPromptsReturn {
    suggestions: SuggestedPrompt[];
    loading: boolean;
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
    fetch: () => Promise<void>;
    triggerDiscovery: (inputs: Record<string, string>) => Promise<void>;
    accept: (suggestion: SuggestedPrompt, llms: string[]) => Promise<AcceptResult | null>;
    reject: (suggestionId: string) => Promise<RejectResult | null>;
}

const DISCOVERY_POLL_INTERVAL_MS = 3_000;
const DISCOVERY_POLL_TIMEOUT_MS = 60_000;

export function useSuggestedPrompts(entityId: string): UseSuggestedPromptsReturn {
    const [suggestions, setSuggestions] = useState<SuggestedPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const suggestionsRef = useRef(suggestions);
    suggestionsRef.current = suggestions;

    const fetchSuggestions = useCallback(async () => {
        if (!entityId) return;
        setLoading(true);
        try {
            const res = await window.fetch(`/api/entities/${entityId}/prompts/suggested`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.filter((s: SuggestedPrompt) => s.status === "suggested"));
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        } finally {
            setLoading(false);
        }
    }, [entityId]);

    const triggerDiscovery = useCallback(
        async (inputs: Record<string, string>) => {
            setIsGenerating(true);
            try {
                await window.fetch(`/api/entities/${entityId}/prompts/discovery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(inputs),
                });
            } catch (error) {
                console.error("Discovery enqueue error:", error);
                setIsGenerating(false);
            }
        },
        [entityId]
    );

    const accept = useCallback(
        async (suggestion: SuggestedPrompt, llms: string[]): Promise<AcceptResult | null> => {
            try {
                const res = await window.fetch(
                    `/api/entities/${entityId}/prompts/suggested/${suggestion.id}/accept`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ llms, nextRunAt: new Date().toISOString() }),
                    }
                );
                if (!res.ok) return null;

                const newPrompt = await res.json();
                setSuggestions(prev => prev.filter(p => p.id !== suggestion.id));

                const refillEnqueued = !!newPrompt?.refillEnqueued;
                if (refillEnqueued) setIsGenerating(true);

                return { newPrompt, refillEnqueued };
            } catch (error) {
                console.error("Error accepting suggestion:", error);
                return null;
            }
        },
        [entityId]
    );

    const reject = useCallback(
        async (suggestionId: string): Promise<RejectResult | null> => {
            try {
                const res = await window.fetch(
                    `/api/entities/${entityId}/prompts/suggested/${suggestionId}/reject`,
                    { method: "POST" }
                );
                if (!res.ok) return null;

                const data = await res.json().catch(() => ({}));
                setSuggestions(prev => prev.filter(p => p.id !== suggestionId));

                const refillEnqueued = !!data?.refillEnqueued;
                if (refillEnqueued) setIsGenerating(true);

                return { refillEnqueued };
            } catch (error) {
                console.error("Error rejecting suggestion:", error);
                return null;
            }
        },
        [entityId]
    );

    // Poll for new suggestions while the worker is generating (manual discovery
    // submit or auto refill after accept/reject). Stops when count grows past
    // the baseline captured at start, or after the timeout.
    useEffect(() => {
        if (!isGenerating || !entityId) return;

        const baseline = suggestionsRef.current.length;
        const startedAt = Date.now();

        const interval = setInterval(async () => {
            if (Date.now() - startedAt > DISCOVERY_POLL_TIMEOUT_MS) {
                clearInterval(interval);
                setIsGenerating(false);
                return;
            }
            try {
                const res = await window.fetch(`/api/entities/${entityId}/prompts/suggested`);
                if (!res.ok) return;
                const data = await res.json();
                const fresh = Array.isArray(data)
                    ? data.filter((s: SuggestedPrompt) => s.status === "suggested")
                    : [];
                if (fresh.length > baseline) {
                    setSuggestions(fresh);
                    clearInterval(interval);
                    setIsGenerating(false);
                }
            } catch {
                /* transient — retry on next tick */
            }
        }, DISCOVERY_POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isGenerating, entityId]);

    return {
        suggestions,
        loading,
        isGenerating,
        setIsGenerating,
        fetch: fetchSuggestions,
        triggerDiscovery,
        accept,
        reject,
    };
}
