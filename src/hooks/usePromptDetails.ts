import { useState, useEffect, useCallback, useRef } from "react";
import { Prompt, ModelConfig } from "@/types/prompts";

export function usePromptDetails(entityId: string, promptId: string, showFailed: boolean = false) {
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [entityName, setEntityName] = useState("");
    const [entityLogo, setEntityLogo] = useState<string | null>(null);
    const [entityWebsite, setEntityWebsite] = useState<string | null>(null);
    const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([]);
    const [llmProvider, setLlmProvider] = useState<string>('MANAGED');
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const fetchEntity = useCallback(async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}`);
            const data = await res.json();
            setEntityName(data.name);
            setEntityLogo(data.logoUrl);
            setEntityWebsite(data.website);
        } catch (error) {
            console.error("Error fetching entity:", error);
        }
    }, [entityId]);

    const fetchModels = useCallback(async () => {
        try {
            const res = await fetch(`/api/spaces/current/models`);
            if (res.ok) {
                const data = await res.json();
                // API returns { models: [...], spaceId, spaceName }
                const models = Array.isArray(data) ? data : data.models || [];
                if (models.length > 0) {
                    setModelConfigs(models);
                }
                if (data.llmProvider) {
                    setLlmProvider(data.llmProvider);
                }
            }
        } catch (error) {
            console.error("Error fetching models:", error);
        }
    }, []);

    const fetchPrompt = useCallback(async (pageNum: number = 1, skipCount: boolean = false) => {
        try {
            const skipCountParam = skipCount ? '&skipCount=true' : '';
            const showFailedParam = showFailed ? '&showFailed=true' : '';
            const res = await fetch(`/api/prompts/${promptId}?page=${pageNum}&limit=10&t=${new Date().getTime()}${skipCountParam}${showFailedParam}`);
            if (res.ok) {
                const data = await res.json();
                setPrompt(data);

                if (data.pagination) {
                    setTotalResults(data.pagination.total ?? 0);
                }
            }
        } catch (error) {
            console.error("Error fetching prompt:", error);
        } finally {
            setLoading(false);
        }
    }, [promptId, showFailed]);

    useEffect(() => {
        if (entityId) {
            fetchEntity();
            fetchModels();
        }
    }, [entityId, fetchEntity, fetchModels]);

    useEffect(() => {
        if (promptId) {
            setPage(1);
            fetchPrompt(1);
        }
    }, [promptId, fetchPrompt]);

    // Polling Logic - use Ref to prevent interval resets
    // This approach ensures the interval is stable and doesn't reset on every prompt update
    const shouldPollRef = useRef(false);
    
    useEffect(() => {
        if (!prompt) {
            shouldPollRef.current = false;
            return;
        }

        // Poll only while an analysis is actively in flight. `prompt.status === 'Running'`
        // means the prompt is enabled (not paused) — NOT that work is currently processing,
        // so it must not gate polling. Otherwise every active prompt polls forever.
        const isProcessing = prompt.analysisResults?.some(
            r => ['pending', 'running', 'queued'].includes((r.status || '').toLowerCase())
        );
        shouldPollRef.current = !!isProcessing;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt?.analysisResults]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (shouldPollRef.current) {
                fetchPrompt(page, true);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchPrompt, page]);

    // --- Actions ---

    const handleRunNow = async () => {
        if (!prompt) return;

        // Identify Target Models
        let targetConfigs: ModelConfig[] = [];
        if (prompt.llms && prompt.llms.length > 0) {
            targetConfigs = modelConfigs.filter(c => 
                (prompt.llms.includes(c.id) || (c.modelId && prompt.llms.includes(c.modelId)) || prompt.llms.includes(c.name)) && 
                c.isEnabled && c.hasApiKey
            );
        }
        
        // Mirror backend logic: If managed space or if explicit intent yielded no matched active configs, fallback to all available
        if (llmProvider === 'MANAGED' || targetConfigs.length === 0) {
            targetConfigs = modelConfigs.filter(c => c.isEnabled && c.hasApiKey);
        }

        if (targetConfigs.length === 0) {
            alert("No active models configured or selected. Please check Model settings.");
            return;
        }

        setRunning(true);

        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nextRunAt: new Date().toISOString(),
                    status: 'Running',
                    triggerAnalysis: true,
                    // In MANAGED mode the platform owns the roster — don't persist a stale llms list.
                    ...(llmProvider === 'MANAGED' ? {} : { llms: prompt.llms }),
                }),
            });

            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompt(updatedPrompt);
            } else {
                const errText = await res.text();
                throw new Error(`API Failed: ${res.status} ${res.statusText} - ${errText}`);
            }
        } catch (error: unknown) {
            console.error("Error running prompt:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Analysis failed: ${message}`);
            fetchPrompt();
        } finally {
            setRunning(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!prompt) return;
        setPrompt({
            ...prompt,
            status: newStatus as Prompt['status'],
            nextRunAt: newStatus === 'Paused' ? null : prompt.nextRunAt
        });

        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompt(prev => prev ? { ...updatedPrompt, analysisResults: prev.analysisResults } : updatedPrompt);
            } else {
                throw new Error("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            fetchPrompt();
        }
    };

    const handleToggleLLM = async (modelId: string, isActive: boolean) => {
        if (!prompt) return;

        const config = modelConfigs.find(c => c.id === modelId);
        if (!config) return;

        let newLLMs = [...(prompt.llms || [])];
        if (isActive) {
            newLLMs = newLLMs.filter(id => id !== config.id && id !== config.modelId && id !== config.name);
        } else {
            newLLMs.push(config.modelId || config.id);
        }

        setPrompt({ ...prompt, llms: newLLMs });

        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ llms: newLLMs }),
            });
            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompt(prev => prev ? { ...updatedPrompt, analysisResults: prev.analysisResults } : updatedPrompt);
            } else {
                throw new Error("Failed to update LLMs");
            }
        } catch (error) {
            console.error("Error updating LLMs:", error);
            fetchPrompt();
        }
    };

    const deleteResult = async (resultId: string) => {
        try {
            const res = await fetch(`/api/analysis/${resultId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                if (prompt) {
                    setPrompt({
                        ...prompt,
                        analysisResults: prompt.analysisResults.filter(r => r.id !== resultId)
                    });
                }
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error("Error deleting result:", error);
            throw error;
        }
    };

    const handleIntentChange = async (newIntent: string) => {
        if (!prompt) return;

        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intent: newIntent }),
            });

            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompt(prev => prev ? { ...updatedPrompt, analysisResults: prev.analysisResults } : updatedPrompt);
            } else {
                throw new Error("Failed to update intent");
            }
        } catch (error) {
            console.error("Error updating intent:", error);
            fetchPrompt();
        }
    };

    const handleTagChange = async (newTags: string[]) => {
        if (!prompt) return;

        const updatedTags = newTags.map(name => ({
            id: `temp-${name}`,
            name,
            color: null
        }));

        setPrompt({
            ...prompt,
            tags: updatedTags
        });

        try {
            const res = await fetch(`/api/prompts/${promptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: newTags }),
            });

            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompt(prev => prev ? { ...updatedPrompt, analysisResults: prev.analysisResults } : updatedPrompt);
            } else {
                throw new Error("Failed to update tags");
            }
        } catch (error) {
            console.error("Error updating tags:", error);
            fetchPrompt();
        }
    };

    const goToPage = (newPage: number) => {
        setPage(newPage);
        fetchPrompt(newPage);
    };

    return {
        prompt,
        loading,
        running,
        entityName,
        entityLogo,
        entityWebsite,
        modelConfigs,
        llmProvider,
        fetchPrompt,
        handleRunNow,
        handleStatusChange,
        handleToggleLLM,
        deleteResult,
        handleIntentChange,
        handleTagChange,
        // Pagination
        page,
        totalResults,
        goToPage,
    };
}
