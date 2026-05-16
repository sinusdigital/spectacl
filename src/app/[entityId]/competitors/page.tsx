"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Shared/Header";
import PageContainer from "@/components/Shared/PageContainer";
import { Box, Flex, Separator, Text } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";
import { useToast } from "@/components/Shared/RadixToast";
import { useCompetitors } from "@/hooks/useCompetitors";
import CompetitorModal from "@/components/Competitors/CompetitorModal";
import SuggestedCompetitorsList from "@/components/Competitors/SuggestedCompetitorsList";
import TrackedCompetitorsList from "@/components/Competitors/TrackedCompetitorsList";
import UntrackedCompetitorsList from "@/components/Competitors/UntrackedCompetitorsList";
import { Competitor, SuggestedCompetitor } from "@/types/competitors";
import { SpacePlan } from "@prisma/client";

export default function CompetitorsPage() {
    const params = useParams();
    const entityId = params.entityId as string;
    const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

    const {
        competitors,
        suggestions,
        suggestionsTotal,
        loading,
        error,
        updateCompetitor,
        deleteCompetitor,
        untrackCompetitor,
        addSuggestion,
        dismissSuggestion,
        removeSuggestion
    } = useCompetitors(entityId);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [competitorToDelete, setCompetitorToDelete] = useState<Competitor | null>(null);
    const [suggestionToDelete, setSuggestionToDelete] = useState<SuggestedCompetitor | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);

    // Subscription state
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | undefined>(undefined);
    const [currentSpaceId, setCurrentSpaceId] = useState<string | undefined>(undefined);
    const [currentPlan, setCurrentPlan] = useState<SpacePlan | undefined>(undefined);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/spaces/current')
            .then(res => res.ok ? res.json() : null)
            .then(space => {
                if (cancelled || !space) return;
                setSubscriptionStatus(space.subscriptionStatus);
                setCurrentSpaceId(space.id);
                setCurrentPlan(space.plan);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    // UI Loading states for deletions
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [removingSuggestionId, setRemovingSuggestionId] = useState<string | null>(null);

    const activeSuggestions = suggestions.filter(s =>
        s.status === 'suggested' &&
        !competitors.some(comp => comp.name.toLowerCase() === s.name.toLowerCase())
    );

    const untrackedSuggestions = suggestions.filter(s => s.status === 'untracked');

    const pollJobStatus = (jobId: string, startMessage: string, successMessage: string) => {
        toastInfo(startMessage);
        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`/api/jobs/${jobId}`);
                const data = await res.json();
                if (data.status === 'completed') {
                    clearInterval(intervalId);
                    toastSuccess(successMessage);
                } else if (data.status === 'failed') {
                    clearInterval(intervalId);
                    toastError("Analytics update failed");
                }
            } catch (err) {
                console.error("Error polling job status", err);
                clearInterval(intervalId);
            }
        }, 3000);
    };

    const handleAddCompetitor = async (data: { name: string; website: string }) => {
        // Prepare the request as expected by the API
        // The API expects { names, competitors: [{ name, website }] }
        const res = await fetch(`/api/entities/${entityId}/competitors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                names: data.name, // This seems odd, sending just the name as 'names'
                competitors: [{
                    name: data.name,
                    website: data.website
                }]
            }),
        });

        if (res.ok) {
            const result = await res.json();
            // No need for manual refresh here, pollJobStatus will do it
            // await fetchCompetitors(); // Manual refresh from useCompetitors hook
            return { success: true, jobId: result.jobId };
        }
        return { success: false };
    };

    const handleAddCompetitorsSubmit = async (data: { name: string; website: string }) => {
        const result = await handleAddCompetitor(data);
        if (result.success && result.jobId) {
            pollJobStatus(
                result.jobId,
                "Updating Analytics to include Competitor data",
                "Analytics now include new Competitor"
            );
        }
        return result;
    };

    const handleAddSuggestion = async (suggestion: SuggestedCompetitor) => {
        const result = await addSuggestion(suggestion);
        if (result.success && result.jobId) {
            pollJobStatus(
                result.jobId,
                "Updating analytics to include competitor data",
                "Analytics now include new Competitor"
            );
        }
        return result;
    };

    const handleUntrackCompetitor = async (competitor: Competitor) => {
        const result = await untrackCompetitor(competitor);
        if (result.success && result.jobId) {
            pollJobStatus(
                result.jobId,
                "Updating analytics to remove competitor data",
                "Analytics successfully updated"
            );
        }
        return result;
    };

    const handleConfirmDelete = async () => {
        if (!competitorToDelete) return;

        setDeletingId(competitorToDelete.id);
        await deleteCompetitor(competitorToDelete.id);
        setDeletingId(null);
        setCompetitorToDelete(null);
    };

    const handleConfirmRemoveSuggestion = async () => {
        if (!suggestionToDelete) return;

        setRemovingSuggestionId(suggestionToDelete.id);
        await removeSuggestion(suggestionToDelete.id);
        setRemovingSuggestionId(null);
        setSuggestionToDelete(null);
    };

    return (
        <PageContainer 
            headers={[
                {
                    content: (
                        <Flex justify="between" align="center" width="100%">
                            <Flex align="center" gap="4">
                                <Header.Title as="h1" size="4" weight="bold">
                                    Competitors
                                </Header.Title>
                                <Separator orientation="vertical" size="2" />
                                <Text size="2" color="gray">
                                    Getting competitors and aliases right makes or breaks your analysis results. Take your time to set this up properly.
                                </Text>
                            </Flex>
                            <Header.Actions>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => subscriptionStatus === 'INCOMPLETE' ? setIsUpgradeModalOpen(true) : setIsAddModalOpen(true)}
                                >
                                    Add Competitors
                                </Button>
                            </Header.Actions>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 20
                }
            ]}
        >
            <Box p="4">
            <div className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <SuggestedCompetitorsList
                    suggestions={activeSuggestions}
                    totalCount={suggestionsTotal}
                    onDismiss={dismissSuggestion}
                    onTrack={handleAddSuggestion}
                />

                <TrackedCompetitorsList
                    competitors={competitors}
                    loading={loading}
                    deletingId={deletingId}
                    onEdit={setEditingCompetitor}
                    onUntrack={handleUntrackCompetitor}
                />

                {untrackedSuggestions.length > 0 && (
                    <UntrackedCompetitorsList
                        suggestions={untrackedSuggestions}
                        onRemove={setSuggestionToDelete}
                        onTrack={handleAddSuggestion}
                    />
                )}

                {isAddModalOpen && (
                    <CompetitorModal
                        mode="create"
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSubmit={handleAddCompetitorsSubmit}
                    />
                )}

                {editingCompetitor && (
                    <CompetitorModal
                        mode="edit"
                        isOpen={!!editingCompetitor}
                        competitor={editingCompetitor}
                        onClose={() => setEditingCompetitor(null)}
                        onSubmit={(data) => updateCompetitor(editingCompetitor.id, data)}
                    />
                )}

                <DeleteConfirmationModal
                    isOpen={!!competitorToDelete}
                    onClose={() => !deletingId && setCompetitorToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Competitor"
                    message={`Are you sure you want to delete "${competitorToDelete?.name}"? This action cannot be undone.`}
                    isDeleting={!!deletingId}
                />

                <DeleteConfirmationModal
                    isOpen={!!suggestionToDelete}
                    onClose={() => !removingSuggestionId && setSuggestionToDelete(null)}
                    onConfirm={handleConfirmRemoveSuggestion}
                    title="Remove Competitor"
                    message={`Are you sure you want to permanently remove "${suggestionToDelete?.name}"?`}
                    isDeleting={!!removingSuggestionId}
                />
            </div>
            </Box>

            <UpgradeRequiredModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                limit={null}
                resourceName="competitors"
                spaceId={currentSpaceId}
                llmProvider="MANAGED"
                currentPlan={currentPlan}
                mode="activate"
            />
        </PageContainer>
    );
}

