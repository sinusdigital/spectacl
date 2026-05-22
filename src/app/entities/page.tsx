"use client";


import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CompanyLogo from "@/components/CompanyLogo";
import EntityCard from "@/components/Shared/EntityCard";
import PlaceholderCard from "@/components/Shared/PlaceholderCard";
import EntityModal from "@/components/EntityModal";
import Button from "@/components/Shared/Button";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";

import PageContainer from "@/components/Shared/PageContainer";
import Header from "@/components/Shared/Header";
import { Box, Badge, Flex, Grid, Separator, Text } from "@radix-ui/themes";
import { Entity } from "@/types/entity";
import { SpacePlan } from "@prisma/client";

import { Suspense } from "react";

function EntitiesContent() {
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [entityToDelete, setEntityToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [maxEntities, setMaxEntities] = useState<number | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [currentSpaceId, setCurrentSpaceId] = useState<string | undefined>(undefined);
    const [currentPlan, setCurrentPlan] = useState<SpacePlan | undefined>(undefined);
    const [llmProvider, setLlmProvider] = useState<"MANAGED" | "BYOK">("MANAGED");
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | undefined>(undefined);
    const router = useRouter();
    const searchParams = useSearchParams();
    const processedCreateParam = useRef(false);

    useEffect(() => {
        if (searchParams.get("create") === "true" && !processedCreateParam.current) {
            processedCreateParam.current = true;
            setIsCreating(true);
            // Clear the param so it can't re-trigger after the modal closes
            router.replace("/entities", { scroll: false });
        }
    }, [searchParams, router]);

    useEffect(() => {
        fetchEntities();
        fetchUsage();

    }, []);

    const fetchUsage = async () => {
        try {
            const currentRes = await fetch('/api/spaces/current');
            if (!currentRes.ok) return;
            const currentSpace = await currentRes.json();
            setCurrentSpaceId(currentSpace.id);
            setCurrentPlan(currentSpace.plan);
            setSubscriptionStatus(currentSpace.subscriptionStatus);
            if (currentSpace.llmProvider) setLlmProvider(currentSpace.llmProvider as "MANAGED" | "BYOK");

            const res = await fetch(`/api/spaces/${currentSpace.id}/usage`);
            if (!res.ok) return;
            const data = await res.json();
            setMaxEntities(data.limits.maxEntities);
        } catch (error) {
            console.error('Error fetching usage:', error);
        }
    };

    const fetchEntities = async () => {
        try {
            const response = await fetch("/api/entities?includeArchived=true");
            const data = await response.json();
            setEntities(data);
        } catch (error) {
            console.error("Error fetching entities:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = (entity: Entity) => {
        if (editingEntity) {
            // Update existing entity
            setEntities(prev => prev.map(e => e.id === entity.id ? { ...e, ...entity, _count: e._count } : e));
        } else {
            // Add new entity
            setEntities(prev => [{ ...entity, _count: { prompts: 0 }, isArchived: false }, ...prev]);
        }
        setEditingEntity(null);
        setIsCreating(false);
        // Notify sidebar to refresh entity list
        window.dispatchEvent(new Event('entities-changed'));
    };

    const handleDelete = (id: string, name: string) => {
        setEntityToDelete({ id, name });
    };

    const handleArchive = async (id: string, isArchived: boolean) => {
        try {
            const entity = entities.find(e => e.id === id);
            if (!entity) return;

            const response = await fetch(`/api/entities/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...entity, isArchived }),
            });

            if (!response.ok) throw new Error("Failed to update entity");

            const updatedEntity = await response.json();
            setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updatedEntity } : e));
            // Notify sidebar to refresh entity list
            window.dispatchEvent(new Event('entities-changed'));
        } catch (error) {
            console.error("Error archiving entity:", error);
            alert(`Failed to ${isArchived ? 'archive' : 'unarchive'} entity. Please try again.`);
        }
    };

    const confirmDelete = async () => {
        if (!entityToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/entities/${entityToDelete.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete entity");
            }

            // Remove from local state
            setEntities(entities.filter(e => e.id !== entityToDelete.id));
            setEntityToDelete(null);
            // Notify sidebar to refresh entity list
            window.dispatchEvent(new Event('entities-changed'));
        } catch (error) {
            console.error("Error deleting entity:", error);
            alert("Failed to delete entity. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Construct entity count display
    const activeCount = entities.filter(e => !e.isArchived).length;
    const countDisplay = maxEntities !== null && maxEntities >= 0
        ? `${activeCount} / ${maxEntities}`
        : activeCount;
    
    const isLimitReached = maxEntities !== null && maxEntities >= 0 && activeCount >= maxEntities;

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center py-12">
                    <Text color="gray">Loading...</Text>
                </div>
            </div>
        );
    }

    const handleAddEntity = () => {
        if (subscriptionStatus === 'INCOMPLETE' || isLimitReached) {
            setIsUpgradeModalOpen(true);
        } else {
            setIsCreating(true);
        }
    };

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" width="100%" gap="4">
                            <Header.Content>
                                <Flex align="center" gap="2">
                                    <Header.Title as="h1" size="4" weight="bold">Entities</Header.Title>
                                    <Badge variant="solid" size="1">{countDisplay}</Badge>
                                </Flex>
                            </Header.Content>
                            <Separator orientation="vertical" size="2" />
                            <Text size="2" color="gray">Brands being tracked across AI search</Text>
                            <Box flexGrow="1" />
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAddEntity}
                            >
                                Add Entity
                            </Button>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 20,
                }
            ]}
        >
            <Box p="4">
                <div className="space-y-6">
                    {/* Entities Sections */}
            <div className="space-y-12">
                {/* Active Entities & Create Card */}
                <div>
                     <Header.Root mb="4">
                        <Header.Content>
                            <Flex align="center" gap="2">
                                <Header.Title size="4" weight="bold">Active Entities</Header.Title>
                            </Flex>
                            <Header.Description>These brands are currently being tracked</Header.Description>
                        </Header.Content>
                    </Header.Root>
                    <Grid columns={{ initial: '1', md: '2', lg: '3', xl: '4' }} gap="6">
                        {entities.filter(e => !e.isArchived).map((entity) => (
                            <EntityCard
                                key={entity.id}
                                title={entity.name}
                                subtitle={entity.website}
                                onClick={() => router.push(`/${entity.id}`)}
                                logo={
                                    <CompanyLogo
                                        domain={entity.website}
                                        name={entity.name}
                                        size={48}
                                        className="rounded-xl"
                                        logoUrl={entity.logoUrl}
                                    />
                                }
                                descriptionClassName="mt-4"
                                actions={
                                    <>
                                        <Button
                                            variant="tertiary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleArchive(entity.id, true);
                                            }}
                                            fullWidth
                                        >
                                            Deactivate
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingEntity(entity);
                                            }}
                                            fullWidth
                                        >
                                            Edit
                                        </Button>
                                    </>
                                }
                                className="h-full"
                                style={{ minHeight: '251px' }}
                            >
                                <EntityCard.Metrics
                                    mentionRate={entity.metrics?.[0]?.visibility}
                                    avgPosition={entity.metrics?.[0]?.position}
                                    shareOfVoice={entity.metrics?.[0]?.shareOfVoice}
                                />
                            </EntityCard>
                        ))}

                        {/* Create Entity Card */}
                        <PlaceholderCard
                            title={entities.length === 0 ? 'No entities yet' : 'Add Entity'}
                            description={entities.length === 0
                                ? "Get started by creating your first entity to track."
                                : "Track another entity or brand to expand your search observability."}
                            onClick={() => {
                                if (subscriptionStatus === 'INCOMPLETE' || isLimitReached) {
                                    setIsUpgradeModalOpen(true);
                                } else {
                                    setIsCreating(true);
                                }
                            }}
                            actions={
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (subscriptionStatus === 'INCOMPLETE' || isLimitReached) {
                                            setIsUpgradeModalOpen(true);
                                        } else {
                                            setIsCreating(true);
                                        }
                                    }}
                                    fullWidth
                                >
                                    Create New Entity
                                </Button>
                            }
                            style={{ minHeight: '251px' }}
                        />
                    </Grid>
                </div>

                {/* Archived Entities Section */}
                {entities.some(e => e.isArchived) && (
                    <div className="pt-8 border-t border-[var(--gray-6)]">
                        <Header.Root mb="4">
                            <Header.Content>
                                <Flex align="center" gap="2">
                                    <Header.Title size="4" weight="bold">Archived Entities</Header.Title>
                                    <Badge variant="soft" color="gray" size="1">{entities.filter(e => e.isArchived).length}</Badge>
                                </Flex>
                            </Header.Content>
                        </Header.Root>
                        <Grid columns={{ initial: '1', md: '2', lg: '3', xl: '4' }} gap="6">
                            {entities.filter(e => e.isArchived).map((entity) => (
                                    <EntityCard
                                        key={entity.id}
                                        title={entity.name}
                                        subtitle={entity.website}
                                        variant="inactive"
                                        logo={
                                            <CompanyLogo
                                                domain={entity.website}
                                                name={entity.name}
                                                size={48}
                                                className="rounded-xl"
                                                logoUrl={entity.logoUrl}
                                            />
                                        }
                                        descriptionClassName="mt-4"
                                        actions={
                                            <>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        handleDelete(entity.id, entity.name);
                                                    }}
                                                    fullWidth
                                                >
                                                    Delete
                                                </Button>
                                                <Button
                                                    variant="tertiary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (subscriptionStatus === 'INCOMPLETE' || isLimitReached) {
                                                            setIsUpgradeModalOpen(true);
                                                        } else {
                                                            handleArchive(entity.id, false);
                                                        }
                                                    }}
                                                    fullWidth
                                                >
                                                    Activate
                                                </Button>
                                            </>
                                        }
                                        className="h-full"
                                        style={{ minHeight: '251px' }}
                                    >
                                        <EntityCard.Metrics
                                            mentionRate={entity.metrics?.[0]?.visibility}
                                            avgPosition={entity.metrics?.[0]?.position}
                                            shareOfVoice={entity.metrics?.[0]?.shareOfVoice}
                                        />
                                    </EntityCard>
                            ))}
                        </Grid>
                    </div>
                )}
            </div>

            {/* Upgrade Modal */}
            <UpgradeRequiredModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                limit={subscriptionStatus === 'INCOMPLETE' ? null : maxEntities}
                spaceId={currentSpaceId}
                llmProvider={llmProvider}
                currentPlan={currentPlan}
                mode={subscriptionStatus === 'INCOMPLETE' ? 'activate' : 'upgrade'}
            />

            {/* Create/Edit Modal */}
            <EntityModal
                isOpen={isCreating || !!editingEntity}
                onClose={() => {
                    setIsCreating(false);
                    setEditingEntity(null);
                }}
                onSuccess={handleSuccess}
                entity={editingEntity}
            />

            <DeleteConfirmationModal
                isOpen={!!entityToDelete}
                onClose={() => setEntityToDelete(null)}
                onConfirm={confirmDelete}
                title={`Delete ${entityToDelete?.name || 'Entity'}?`}
                message={`Are you sure you want to delete "${entityToDelete?.name}"? All associated data including prompts and analysis history will be permanently removed.`}
                isDeleting={isDeleting}
            />
        </div>
            </Box>
        </PageContainer>
    );
}

export default function EntitiesPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-[var(--gray-9)]">Loading entities...</div>}>
            <EntitiesContent />
        </Suspense>
    );
}
