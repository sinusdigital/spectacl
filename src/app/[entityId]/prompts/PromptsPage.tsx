"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import FilterBar, { PromptFilterType, TimeRangeType } from '@/components/Shared/FilterBar';
import PromptsTable from "@/components/Prompts/PromptsTable";
import SuggestedPrompts from "@/components/Prompts/SuggestedPrompts";
import DiscoveryModal from "@/components/Prompts/DiscoveryModal";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";

import AddPromptModal from "@/components/Prompts/AddPromptModal";
import PromptsKickstart from "@/components/Prompts/PromptsKickstart";
import SuggestedSidePanel from "@/components/Prompts/SuggestedSidePanel";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import PageContainer from "@/components/Shared/PageContainer";
import TwoColumnPage from "@/components/Shared/TwoColumnPage";
import Header from "@/components/Shared/Header";
import { Flex, Separator, Box, Badge, Tooltip } from "@radix-ui/themes";

import { Prompt, SuggestedPrompt, ModelConfig, DEFAULT_MODELS } from "@/types/prompts";
import { SpacePlan } from "@prisma/client";
import { useSuggestedPrompts } from "@/hooks/useSuggestedPrompts";

export default function PromptsPage() {
    const params = useParams();
    const entityId = params.entityId as string;
    
    // Core Data State
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);

    // Suggested prompts (fetch, accept, reject, discovery polling)
    const {
        suggestions: suggestedPrompts,
        loading: loadingSuggestions,
        isGenerating: isGeneratingDiscovery,
        fetch: fetchSuggestedPrompts,
        triggerDiscovery,
        accept: acceptSuggestionApi,
        reject: rejectSuggestionApi,
    } = useSuggestedPrompts(entityId);
    
    // Models State
    const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(DEFAULT_MODELS);
    const [llmProvider, setLlmProvider] = useState<string>('MANAGED');
    
    // Usage Limits
    const [maxActivePrompts, setMaxActivePrompts] = useState<number | null>(null);
    const [currentActivePrompts, setCurrentActivePrompts] = useState<number>(0);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [currentSpaceId, setCurrentSpaceId] = useState<string | undefined>(undefined);
    const [currentPlan, setCurrentPlan] = useState<SpacePlan | undefined>(undefined);
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | undefined>(undefined);
    const [isTrial, setIsTrial] = useState(false);
    
    // UI State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [promptFilter, setPromptFilter] = useState<PromptFilterType>('tracked');
    const [timeRange, setTimeRange] = useState<TimeRangeType>('7d');
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [intentFilter, setIntentFilter] = useState<string[]>([]);
    const [filterRefreshKey, setFilterRefreshKey] = useState(0);
    const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

    // Initial Fetch
    useEffect(() => {
        if (!entityId) return;

        fetchModels();
        fetchPrompts();
        fetchUsage();

        // Check for pending discovery inputs (set by the standalone /discovery page on redirect)
        const pendingDiscovery = sessionStorage.getItem('pending_discovery_inputs');
        if (pendingDiscovery) {
            sessionStorage.removeItem('pending_discovery_inputs');
            const inputs = JSON.parse(pendingDiscovery) as Record<string, string>;
            triggerDiscovery(inputs);
        } else {
            fetchSuggestedPrompts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId]);

    // Polling for active jobs
    useEffect(() => {
        const isProcessing = prompts.some(p => p.analysisResults?.some(r => r.status === 'running' || r.status === 'pending'));
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            interval = setInterval(() => {
                fetchPrompts();
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompts]);

    // --- API Calls ---
    
    const fetchUsage = async () => {
        try {
            const currentRes = await fetch(`/api/spaces/current`);
            if (currentRes.ok) {
                const currentSpace = await currentRes.json();
                setCurrentSpaceId(currentSpace.id);
                if (currentSpace.llmProvider) {
                    setLlmProvider(currentSpace.llmProvider);
                }
                if (currentSpace.plan) {
                    setCurrentPlan(currentSpace.plan);
                }
                if (currentSpace.subscriptionStatus) {
                    setSubscriptionStatus(currentSpace.subscriptionStatus);
                }

                const usageRes = await fetch(`/api/spaces/current/usage`);
                if (usageRes.ok) {
                    const data = await usageRes.json();
                    setMaxActivePrompts(data.limits.maxActivePrompts);
                    setCurrentActivePrompts(data.current.activePrompts);
                    setIsTrial(data.isTrial === true);
                }
            }
        } catch (error) {
            console.error("Error fetching usage:", error);
        }
    };

    const fetchModels = async () => {
        try {
            const res = await fetch(`/api/spaces/current/models`);
            if (res.ok) {
                const data = await res.json();
                const models = Array.isArray(data) ? data : data.models || [];
                if (models.length > 0) {
                    setModelConfigs(models);
                }
                if (data.llmProvider) {
                    setLlmProvider(data.llmProvider);
                }
                if (data.spaceId) {
                    setCurrentSpaceId(data.spaceId);
                }
            }
        } catch (error) {
            console.error("Error fetching models:", error);
        }
    };

    const fetchPrompts = async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}/prompts`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setPrompts(data);
            } else {
                setPrompts([]);
            }
        } catch (error) {
            console.error("Error fetching prompts:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Action Handlers ---

    const handleAddClick = () => {
        if (subscriptionStatus === 'INCOMPLETE') {
            setIsUpgradeModalOpen(true);
            return;
        }
        if (maxActivePrompts !== null && maxActivePrompts !== -1) {
            if (currentActivePrompts >= maxActivePrompts) {
                setIsUpgradeModalOpen(true);
                return;
            }
        }
        setIsAddModalOpen(true);
    };

    const handleAddPrompt = async (promptText: string, intent: string, tags: string[], shouldRun: boolean, language: string = ""): Promise<boolean> => {
        if (subscriptionStatus === 'INCOMPLETE') {
            setIsUpgradeModalOpen(true);
            return false;
        }
        if (maxActivePrompts !== null && maxActivePrompts !== -1) {
             if (currentActivePrompts >= maxActivePrompts) {
                 setIsUpgradeModalOpen(true);
                 return false;
             }
        }

        try {
            const res = await fetch(`/api/entities/${entityId}/prompts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: promptText,
                    intent: intent,
                    status: 'Running',
                    nextRunAt: shouldRun ? new Date().toISOString() : null,
                    llms: modelConfigs.filter(m => m.isEnabled && !m.isArchived && m.hasApiKey).map(m => m.id),
                    tags: tags,
                    language: language || null,
                }),
            });

            if (res.ok) {
                const newPromptData = await res.json();
                await fetchPrompts();
                fetchUsage();
                if (tags.length > 0) {
                    setFilterRefreshKey(k => k + 1);
                }
                if (shouldRun && newPromptData?.id) {
                    handleRunNow(newPromptData.id, newPromptData);
                }
                return true;
            }
            if (res.status === 403) {
                setIsUpgradeModalOpen(true);
            }
            return false;
        } catch (error) {
            console.error("Error creating prompt:", error);
            return false;
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'Running' | 'Paused') => {
        if (newStatus === 'Running') {
            if (maxActivePrompts !== null && maxActivePrompts !== -1) {
                if (currentActivePrompts >= maxActivePrompts) {
                    setIsUpgradeModalOpen(true);
                    return;
                }
            }
        }

        setPrompts(prompts.map(p => p.id === id ? {
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
                fetchUsage();
            } else {
                fetchPrompts();
            }
        } catch (error) {
            console.error("Error updating status:", error);
            fetchPrompts();
        }
    };

    const handleIntentChange = async (id: string, newIntent: string) => {
        setPrompts(prompts.map(p => p.id === id ? { ...p, intent: newIntent } : p));
        try {
            await fetch(`/api/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intent: newIntent }),
            });
        } catch (error) {
            console.error("Error updating intent:", error);
            fetchPrompts();
        }
    };

    const handleTagsChange = async (id: string, tags: string[]) => {
        try {
            const res = await fetch(`/api/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags }),
            });

            if (res.ok) {
                const updatedPrompt = await res.json();
                setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
                setFilterRefreshKey(k => k + 1);
            } else {
                fetchPrompts();
            }
        } catch (error) {
            console.error("Error updating tags:", error);
            fetchPrompts();
        }
    };

    const handleRunNow = async (id: string, promptData?: Prompt) => {
        const prompt = promptData || prompts.find(p => p.id === id);
        if (!prompt) return;

        const now = new Date().toISOString();
        setPrompts(prev => prev.map(p => p.id === id ? { ...p, nextRunAt: now, status: 'Running' } : p));

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
        }
    };

    const confirmDelete = async () => {
        if (!promptToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/prompts/${promptToDelete}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setPrompts(prompts.filter(p => p.id !== promptToDelete));
                setPromptToDelete(null);
                fetchUsage();
            } else {
                alert("Failed to delete prompt");
            }
        } catch (error) {
            console.error("Error deleting prompt:", error);
            alert("Error deleting prompt");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: SuggestedPrompt) => {
        if (maxActivePrompts !== null && maxActivePrompts !== -1) {
            if (currentActivePrompts >= maxActivePrompts) {
                setIsUpgradeModalOpen(true);
                return;
            }
        }

        const activeLLMs = modelConfigs
            .filter(m => m.isEnabled && !m.isArchived && m.hasApiKey)
            .map(m => m.id);

        const result = await acceptSuggestionApi(suggestion, activeLLMs);
        if (!result) return;

        fetchUsage();
        fetchPrompts();
        if (result.newPrompt?.id) {
            handleRunNow(result.newPrompt.id, result.newPrompt);
        }
    };

    const handleRejectSuggestion = async (suggestionId: string) => {
        await rejectSuggestionApi(suggestionId);
    };



    // --- Render Helpers ---

    // Apply tag and intent filters to prompts
    const filteredPrompts = prompts.filter(p => {
        const matchesTags = tagFilter.length === 0 || p.tags?.some(t => tagFilter.includes(t.name));
        const matchesIntent = intentFilter.length === 0 || (p.intent && intentFilter.includes(p.intent));
        return matchesTags && matchesIntent;
    });

    const activePrompts = filteredPrompts.filter(p => p.status === 'Running');
    const pausedPrompts = filteredPrompts.filter(p => p.status === 'Paused');

    const handleQuickAdd = async (text: string) => {
        if (maxActivePrompts !== null && maxActivePrompts !== -1 && currentActivePrompts >= maxActivePrompts) {
            setIsUpgradeModalOpen(true);
            return;
        }
        await handleAddPrompt(text, 'Informational', [], true);
    };
    
    const renderPromptsTable = (tablePrompts: Prompt[], hideAddRow = false) => (
        <PromptsTable
            prompts={tablePrompts}
            loading={loading}
            entityId={entityId}
            onStatusChange={handleStatusChange}
            onIntentChange={handleIntentChange}
            onTagsChange={handleTagsChange}
            onDelete={(id) => setPromptToDelete(id)}
            onAdd={handleQuickAdd}
            onDiscover={() => setIsDiscoveryOpen(true)}
            hideAddRow={hideAddRow}
            timeRange={timeRange}
            variant="table"
        />
    );


    return (
        <PageContainer
            noContentPadding={promptFilter === 'tracked'}
            headers={[
                {
                    content: (
                        <Flex align="center" width="100%" gap="4">
                            <Header.Content>
                                <Flex align="center" gap="2">
                                    <Header.Title as="h1" size="4" weight="bold">Prompts</Header.Title>
                                    {maxActivePrompts !== null && maxActivePrompts >= 0 && (
                                        <Tooltip content={
                                            isTrial
                                                ? `Active prompts across all entities in your space. During trial, you can use up to ${maxActivePrompts} prompts. Upgrade to unlock your full plan limits.`
                                                : "Active prompts and rankings across all entities in your space vs how many are available in your plan"
                                        }>
                                            <Badge variant={isTrial ? "soft" : "solid"} color={isTrial ? "amber" : undefined} size="1">
                                                {currentActivePrompts} / {maxActivePrompts}{isTrial ? " (trial)" : ""}
                                            </Badge>
                                        </Tooltip>
                                    )}
                                </Flex>
                            </Header.Content>
                            <Separator orientation="vertical" size="2" />
                            <Box style={{ flex: 1 }}>
                                <FilterBar
                                    promptFilter={promptFilter}
                                    setPromptFilter={setPromptFilter}
                                    counts={{
                                        active: activePrompts.length,
                                        paused: pausedPrompts.length,
                                        suggested: suggestedPrompts.length
                                    }}
                                    timeRange={timeRange}
                                    setTimeRange={setTimeRange}
                                    onAddClick={handleAddClick}
                                    entityId={entityId}
                                    tagFilter={tagFilter}
                                    setTagFilter={setTagFilter}
                                    intentFilter={intentFilter}
                                    setIntentFilter={setIntentFilter}
                                    hideIntents={promptFilter === 'suggested'}
                                    refreshKey={filterRefreshKey}
                                />
                            </Box>
                        </Flex>
                    ),
                    sticky: true,
                    className: "",
                    zIndex: 20
                }
            ]}
        >
            {promptFilter === 'tracked' ? (
                <TwoColumnPage
                    aside={
                        !(loadingSuggestions && !isGeneratingDiscovery) ? (
                            <SuggestedSidePanel
                                suggestions={suggestedPrompts}
                                isGenerating={isGeneratingDiscovery}
                                onAccept={handleAcceptSuggestion}
                                onReject={handleRejectSuggestion}
                                onDiscover={() => setIsDiscoveryOpen(true)}
                            />
                        ) : null
                    }
                >
                    {/* Below md: horizontal kickstart strip above the table */}
                    <Box display={{ initial: 'block', md: 'none' }}>
                        <PromptsKickstart
                            entityId={entityId}
                            suggestions={suggestedPrompts}
                            isGenerating={isGeneratingDiscovery}
                            isLoadingInitial={loadingSuggestions && !isGeneratingDiscovery}
                            onAccept={handleAcceptSuggestion}
                            onReject={handleRejectSuggestion}
                            onDiscover={() => setIsDiscoveryOpen(true)}
                        />
                    </Box>
                    {renderPromptsTable(activePrompts)}
                </TwoColumnPage>
            ) : (
                <div className="flex flex-col">
                    {promptFilter === 'paused' && renderPromptsTable(pausedPrompts, true)}
                    {promptFilter === 'suggested' && (
                        <SuggestedPrompts
                            suggestions={suggestedPrompts}
                            onAccept={handleAcceptSuggestion}
                            onReject={handleRejectSuggestion}
                            onDiscover={() => setIsDiscoveryOpen(true)}
                            loading={loadingSuggestions}
                        />
                    )}
                </div>
            )}

                <DiscoveryModal
                    isOpen={isDiscoveryOpen}
                    onClose={() => setIsDiscoveryOpen(false)}
                    entityId={entityId}
                    onDiscoveryComplete={(inputs) => {
                        setIsDiscoveryOpen(false);
                        triggerDiscovery(inputs);
                    }}
                />

                <AddPromptModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    entityId={entityId}
                    onAdd={handleAddPrompt}
                />

                <DeleteConfirmationModal
                    isOpen={!!promptToDelete}
                    onClose={() => setPromptToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Prompt"
                    message="Are you sure you want to delete this prompt? This will also delete all analysis history associated with it."
                    isDeleting={isDeleting}
                />
                
                <UpgradeRequiredModal
                    isOpen={isUpgradeModalOpen}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    limit={subscriptionStatus === 'INCOMPLETE' ? null : maxActivePrompts}
                    resourceName="active prompts"
                    spaceId={currentSpaceId}
                    llmProvider={llmProvider as "MANAGED" | "BYOK"}
                    currentPlan={currentPlan}
                    mode={subscriptionStatus === 'INCOMPLETE' ? 'activate' : 'upgrade'}
                />
        </PageContainer>
    );
}
