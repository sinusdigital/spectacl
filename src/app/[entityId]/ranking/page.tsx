"use client";

import { useState, useEffect, useCallback } from "react";
import RankingWizard from "@/components/Prompts/RankingWizard";
import RankingTeaserCard from "@/components/Prompts/RankingTeaserCard";
import Header from "@/components/Shared/Header";
import PageContainer from "@/components/Shared/PageContainer";
import Button from "@/components/Shared/Button";
import { useParams, useRouter } from "next/navigation";
import { Box, Flex, Grid, Spinner, Badge, Separator, Text, Tooltip } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import BaseCard from "@/components/Shared/BaseCard";
import { RankingReport } from "@/types/ranking";
import { useToast } from "@/components/Shared/RadixToast";

import Modal from "@/components/Shared/Modal";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";
import { SpacePlan } from "@prisma/client";

export default function RankingPage() {
    const params = useParams();
    const router = useRouter();
    const entityId = params.entityId as string;
    const toast = useToast();

    // State
    const [reports, setReports] = useState<RankingReport[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rankingToDelete, setRankingToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Usage Limits
    const [maxActivePrompts, setMaxActivePrompts] = useState<number | null>(null);
    const [currentActivePrompts, setCurrentActivePrompts] = useState<number>(0);
    const [isTrial, setIsTrial] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [currentSpaceId, setCurrentSpaceId] = useState<string | undefined>(undefined);
    const [currentPlan, setCurrentPlan] = useState<SpacePlan | undefined>(undefined);
    const [llmProvider, setLlmProvider] = useState<string>('MANAGED');
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | undefined>(undefined);

    const fetchUsage = useCallback(async () => {
        try {
            const currentRes = await fetch(`/api/spaces/current`);
            if (currentRes.ok) {
                const currentSpace = await currentRes.json();
                setCurrentSpaceId(currentSpace.id);
                setCurrentPlan(currentSpace.plan);
                setSubscriptionStatus(currentSpace.subscriptionStatus);
                if (currentSpace.llmProvider) {
                    setLlmProvider(currentSpace.llmProvider);
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
    }, []);

    const fetchRankings = useCallback(async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}/rankings`);
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (error) {
            console.error("Failed to fetch rankings:", error);
        } finally {
            setIsLoading(false);
        }
    }, [entityId]);

    useEffect(() => {
        if (entityId) {
            fetchRankings();
            fetchUsage();
        }
    }, [entityId, fetchRankings, fetchUsage]);

    const handleNewAnalysisClick = () => {
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
        setIsCreating(true);
    };

    const handleAnalysisComplete = (newRanking: RankingReport) => {
        setIsCreating(false);
        router.push(`/${entityId}/ranking/${newRanking.id}`);
    };

    const handleArchive = async (rankingId: string, isArchived: boolean) => {
        try {
            const res = await fetch(`/api/rankings/${rankingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived })
            });
            if (!res.ok) throw new Error("Failed to update ranking");
            setReports(prev => prev.map(r =>
                r.id === rankingId ? { ...r, isArchived } : r
            ));
            fetchUsage();
        } catch (error) {
            console.error("Error archiving ranking:", error);
            toast.error(`Failed to ${isArchived ? 'archive' : 'activate'} ranking.`);
        }
    };

    const handleDelete = async () => {
        if (!rankingToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/rankings/${rankingToDelete}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete ranking");
            setReports(prev => prev.filter(r => r.id !== rankingToDelete));
            setRankingToDelete(null);
            fetchUsage();
            toast.success("Ranking deleted.");
        } catch (error) {
            console.error("Error deleting ranking:", error);
            toast.error("Failed to delete ranking.");
        } finally {
            setIsDeleting(false);
        }
    };

    const activeReports = reports.filter(r => !r.isArchived);
    const archivedReports = reports.filter(r => r.isArchived);

    if (isLoading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: 400 }}>
                <Spinner size="3" />
            </Flex>
        );
    }

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" width="100%" gap="4">
                            <Header.Content>
                                <Flex align="center" gap="2">
                                    <Header.Title as="h1" size="4" weight="bold">Custom Rankings</Header.Title>
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
                            <Text size="2" color="gray">Track your brand against competitors across AI models</Text>
                            <Box flexGrow="1" />
                            <Button variant="primary" onClick={handleNewAnalysisClick} size="sm">
                                New Ranking
                            </Button>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 20
                }
            ]}
        >
            <Box p="4">
                <Flex direction="column" gap="9">
                    {/* Active Rankings */}
                    <Flex direction="column" gap="4">
                        <Header.Root mb="0">
                            <Header.Content>
                                <Flex align="center" gap="2">
                                    <Header.Title size="4" weight="bold">Active Rankings</Header.Title>
                                </Flex>
                                <Header.Description>These rankings are actively tracked and run against AI models</Header.Description>
                            </Header.Content>
                        </Header.Root>
                        <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="6">
                            {activeReports.map(report => (
                                <RankingTeaserCard
                                    key={report.id}
                                    report={report}
                                    entityId={entityId}
                                    onArchive={() => handleArchive(report.id, true)}
                                    onDelete={() => setRankingToDelete(report.id)}
                                />
                            ))}
                            <BaseCard
                                variant="translucent"
                                onClick={handleNewAnalysisClick}
                                style={{ borderStyle: 'dashed' }}
                            >
                                <BaseCard.Header
                                    title={activeReports.length === 0 ? "No Rankings Yet" : "New Ranking"}
                                    logo={
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 'var(--radius-3)',
                                                background: 'var(--gray-a3)',
                                                color: 'var(--gray-9)',
                                            }}
                                        >
                                            <PlusIcon width="20" height="20" />
                                        </Flex>
                                    }
                                    subtitle={
                                        <Text size="1" color="gray" mt="1">
                                            {activeReports.length === 0
                                                ? "See how your brand ranks against competitors across AI models."
                                                : "Create another ranking report."}
                                        </Text>
                                    }
                                />
                                <BaseCard.Body>
                                    <Box mt="auto" />
                                </BaseCard.Body>
                            </BaseCard>
                        </Grid>
                    </Flex>

                    {/* Archived Rankings */}
                    {archivedReports.length > 0 && (
                        <Flex direction="column" gap="4" pt="4" style={{ borderTop: '1px solid var(--gray-6)' }}>
                            <Header.Root mb="0">
                                <Header.Content>
                                    <Flex align="center" gap="2">
                                        <Header.Title size="4" weight="bold">Archived Rankings</Header.Title>
                                        <Badge variant="soft" color="gray" size="1">{archivedReports.length}</Badge>
                                    </Flex>
                                </Header.Content>
                            </Header.Root>
                            <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="6">
                                {archivedReports.map(report => (
                                    <RankingTeaserCard
                                        key={report.id}
                                        report={report}
                                        entityId={entityId}
                                        variant="inactive"
                                        onActivate={() => handleArchive(report.id, false)}
                                        onDelete={() => setRankingToDelete(report.id)}
                                    />
                                ))}
                            </Grid>
                        </Flex>
                    )}
                </Flex>
            </Box>

            <Modal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                title="New Custom Ranking"
                description="Configure your analysis parameters below to start a new ranking report."
                size="3xl"
            >
                <RankingWizard
                    onComplete={handleAnalysisComplete}
                    onCancel={() => setIsCreating(false)}
                    onLimitReached={() => {
                        setIsCreating(false);
                        setIsUpgradeModalOpen(true);
                    }}
                />
            </Modal>

            <DeleteConfirmationModal
                isOpen={!!rankingToDelete}
                onClose={() => setRankingToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Ranking"
                message="This will permanently delete this ranking report and all its analysis results. This action cannot be undone."
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
