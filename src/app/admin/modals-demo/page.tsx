"use client";

import React, { useState } from 'react';
import { Container, Heading, Section, Flex, Grid, Box, Text, Card, Button as RadixButton } from '@radix-ui/themes';
import { Competitor } from '@/types/competitors';
import { AnalysisResult } from '@/types/prompts';
import { ModelConfig } from '@/types/models';
import { Entity } from '@/types/entity';
import PageContainer from "@/components/Shared/PageContainer";

// Import all modals
import TagModal from '@/components/Prompts/TagModal';
import CompetitorModal from '@/components/Competitors/CompetitorModal';
import AddPromptModal from '@/components/Prompts/AddPromptModal';
import EditModelModal from '@/components/Models/EditModelModal';
import AddModelModal from '@/components/Models/AddModelModal';
import CreateSpaceModal from '@/components/Spaces/CreateSpaceModal';
import HowToJoinModal from '@/components/Spaces/HowToJoinModal';
import EntityModal from '@/components/EntityModal';
import MasterKeyModal from '@/components/Admin/MasterKeyModal';
import DeleteConfirmationModal from '@/components/Shared/DeleteConfirmationModal';
import ActionDialog from '@/components/Shared/ActionDialog';
import AnalysisDetailModal from '@/components/Prompts/AnalysisDetailModal';
import TagAssignmentModal from '@/components/Prompts/TagAssignmentModal';
import DiscoveryModal from '@/components/Prompts/DiscoveryModal';
import UpgradeRequiredModal from '@/components/Shared/UpgradeRequiredModal';
import UpgradeSuccessBanner from '@/components/Shared/UpgradeSuccessBanner';
import PaymentSuccessModal from '@/components/Shared/PaymentSuccessModal';
import SpaceLockedModal from '@/components/Shared/SpaceLockedModal';
import TrialExpiredModal from '@/components/Shared/TrialExpiredModal';

// Mock data
const mockCompetitor: Competitor = {
    id: "1",
    name: "Apple",
    website: "https://apple.com",
    aliases: ["Apple Inc."],
    logoUrl: null,
    createdAt: new Date().toISOString()
};
const mockEntityId = "e1";
const mockConfig: ModelConfig = { 
    id: "c1", 
    name: "GPT-4", 
    provider: "openai", 
    isEnabled: true, 
    isArchived: false, 
    hasApiKey: true 
};


// Properly typed mock Analysis Result
const mockAnalysisResult: AnalysisResult = {
    id: "ar1",
    createdAt: new Date().toISOString(),
    llmModel: "GPT-4",
    response: "Spectacl is great.",
    sentiment: 0.8,
    mentioned: true,
    position: 1,
    status: 'success',
    mentions: [],
    links: []
};

// Properly typed mock Entity
const mockEntity: Entity = {
    id: "e1",
    name: "Spectacl",
    website: "spectacl.com"
};

export default function ModalsDemoPage() {
    const [openModal, setOpenModal] = useState<string | null>(null);

    const closeModal = () => setOpenModal(null);

    const modalList = [
        { id: 'add-tag', name: 'Add Tag (Unified)', component: (
            <TagModal
                isOpen={openModal === 'add-tag'}
                onClose={closeModal}
                onSubmit={async () => {}}
                mode="create"
                predefinedColors={['#3B82F6', '#10B981', '#F59E0B']}
            />
        )},
        { id: 'add-competitor', name: 'Add Competitor', component: (
            <CompetitorModal
                mode="create"
                isOpen={openModal === 'add-competitor'}
                onClose={closeModal}
                onSubmit={async () => ({ success: true })}
            />
        )},
        { id: 'edit-competitor', name: 'Edit Competitor', component: openModal === 'edit-competitor' ? (
            <CompetitorModal
                mode="edit"
                competitor={mockCompetitor}
                isOpen={true}
                onClose={closeModal}
                onSubmit={async () => ({ success: true })}
            />
        ) : null},
        { id: 'add-prompt', name: 'Add Prompt', component: (
            <AddPromptModal
                isOpen={openModal === 'add-prompt'}
                onClose={closeModal}
                entityId={mockEntityId}
                onAdd={async () => true}
            />
        )},
        { id: 'analysis-detail', name: 'Analysis Detail', component: (
            <AnalysisDetailModal
                isOpen={openModal === 'analysis-detail'}
                onClose={closeModal}
                onDelete={() => {}}
                result={mockAnalysisResult}
                entityName="Spectacl"
            />
        )},
        { id: 'tag-assignment', name: 'Tag Assignment', component: (
            <TagAssignmentModal
                isOpen={openModal === 'tag-assignment'}
                onClose={closeModal}
                entityId={mockEntityId}
                promptId="p1"
                promptText="Sample Prompt Text"
                initialTags={[]}
                onSave={async () => {}}
            />
        )},
        { id: 'discovery', name: 'Discovery Modal', component: (
            <DiscoveryModal
                isOpen={openModal === 'discovery'}
                onClose={closeModal}
                entityId={mockEntityId}
                onDiscoveryComplete={() => {}}
            />
        )},
        { id: 'entity-modal', name: 'Entity Modal', component: (
            <EntityModal
                isOpen={openModal === 'entity-modal'}
                onClose={closeModal}
                onSuccess={() => {}}
                entity={mockEntity}
            />
        )},
        { id: 'add-model', name: 'Add Model', component: openModal === 'add-model' ? (
            <AddModelModal 
                onClose={closeModal}
                onSave={async () => {}}
            />
        ) : null},
        { id: 'edit-model', name: 'Edit Model', component: openModal === 'edit-model' ? (
            <EditModelModal 
                model={mockConfig}
                isManaged={false}
                onClose={closeModal}
                onSave={async () => {}}
            />
        ) : null},
        { id: 'create-space', name: 'Create Space', component: (
            <CreateSpaceModal 
                isOpen={openModal === 'create-space'} 
                onClose={closeModal}
                onSuccess={() => {}}
            />
        )},
        { id: 'how-to-join', name: 'How to Join', component: (
            <HowToJoinModal 
                isOpen={openModal === 'how-to-join'} 
                onClose={closeModal}
            />
        )},
        { id: 'master-key', name: 'Master Key', component: openModal === 'master-key' ? (
            <MasterKeyModal 
                onClose={closeModal}
                onSave={async () => { /* demo — no-op */ }}
                masterKey={{ provider: 'openai', displayName: 'OpenAI', key: '', masked: '•••• 1234', isSet: true }}
            />
        ) : null},
        { id: 'delete-confirmation', name: 'Delete Confirmation', component: (
            <DeleteConfirmationModal
                isOpen={openModal === 'delete-confirmation'}
                onClose={closeModal}
                onConfirm={() => {}}
                title="Delete Competitor"
                message="Are you sure you want to delete this competitor? This action cannot be undone."
            />
        )},
        { id: 'action-dialog', name: 'Action Dialog', component: (
            <ActionDialog
                isOpen={openModal === 'action-dialog'}
                onClose={closeModal}
                title="Reset Database"
                message="This will clear all processed results. Continue?"
                confirmText="Reset"
                onConfirm={() => {}}
                variant="destructive"
            />
        )},
        { id: 'upgrade-required', name: 'Upgrade Required', component: (
            <UpgradeRequiredModal
                isOpen={openModal === 'upgrade-required'}
                onClose={closeModal}
                limit={5}
                resourceName="active prompts"
            />
        )},
        { id: 'payment-success', name: 'Payment Success', component: (
            <PaymentSuccessModal
                isOpen={openModal === 'payment-success'}
                onClose={closeModal}
                plan="PRO"
                returnUrl="/admin/modals-demo"
            />
        )},
        { id: 'space-locked', name: 'Space Locked', component: openModal === 'space-locked' ? (
            <SpaceLockedModal spaceName="Acme Corp" />
        ) : null},
        { id: 'trial-expired', name: 'Trial Expired', component: openModal === 'trial-expired' ? (
            <TrialExpiredModal spaceName="Acme Corp" spaceId="demo" />
        ) : null}
    ];

    const bannerList = [
        { id: 'upgrade-success', name: 'Upgrade Success Banner', component: (
            <UpgradeSuccessBanner />
        )}
    ];

    return (
        <PageContainer>
            <Container size="4" py="8">
                <Flex direction="column" gap="6">
                    <Box>
                        <Heading size="8" mb="2">Modal Showroom</Heading>
                        <Text color="gray" size="3">
                            This page exists to preview all modals in the application before and after standardization.
                        </Text>
                    </Box>

                    <Grid columns={{ initial: '1', sm: '2', md: '3', lg: '4' }} gap="4">
                        {modalList.map((modal) => (
                            <Card key={modal.id} variant="surface">
                                <Flex direction="column" gap="3" p="2">
                                    <Text weight="bold" size="2">{modal.name}</Text>
                                    <RadixButton 
                                        variant="soft" 
                                        onClick={() => setOpenModal(modal.id)}
                                    >
                                        Open Modal
                                    </RadixButton>
                                </Flex>
                                {modal.component}
                            </Card>
                        ))}
                    </Grid>
                </Flex>
                {/* Banners Section */}
                <Section size="1">
                    <Heading size="4" mb="4">Success Banners</Heading>
                    <Flex direction="column" gap="4">
                        {bannerList.map(item => (
                            <Box key={item.id} style={{ border: '1px dashed var(--gray-6)', borderRadius: 'var(--radius-3)' }}>
                                <Text size="1" color="gray" mb="2" style={{ display: 'block', padding: '8px 16px', borderBottom: '1px dashed var(--gray-6)' }}>
                                    {item.name}
                                </Text>
                                {item.component}
                            </Box>
                        ))}
                    </Flex>
                </Section>
            </Container>
        </PageContainer>
    );
}
