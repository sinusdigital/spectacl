'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Grid, Flex, Text, Separator } from '@radix-ui/themes';
import BuildingIcon from '@/components/Icons/BuildingIcon';
import Button from '@/components/Shared/Button';
import PlaceholderCard from '@/components/Shared/PlaceholderCard';

import Modal from '@/components/Shared/Modal';
import Header from '@/components/Shared/Header';

import CreateSpaceModal from '@/components/Spaces/CreateSpaceModal';
import HowToJoinModal from '@/components/Spaces/HowToJoinModal';
import SpaceCard from '@/components/Spaces/SpaceCard';
import PageContainer from '@/components/Shared/PageContainer';

interface Entity {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  isArchived: boolean;
}

interface Space {
  id: string;
  name: string;
  slug: string;
  plan: 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE' | 'FOUNDER';
  llmProvider: 'MANAGED' | 'BYOK';
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  isOwner: boolean;
  memberCount: number;
  entityCount: number;
  entities: Entity[];
  promptCount: number;
  promptLimit: number;
  memberLimit: number;
  entityLimit: number;
}

interface Invitation {
  id: string;
  token: string;
  role: string;
  space: {
    id: string;
    name: string;
    slug: string;
    plan: 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE' | 'FOUNDER';
    llmProvider: 'MANAGED' | 'BYOK';
  };
  inviter: {
    name: string;
    email: string;
  };
  memberCount: number;
  entityCount: number;
  entities: Entity[];
  promptCount: number;
  promptLimit: number;
  memberLimit: number;
  entityLimit: number;
  createdAt: string;
}

export default function SpacesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>}>
      <SpacesContent />
    </Suspense>
  );
}

function SpacesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/user/spaces');
      
      if (!response.ok) {
        throw new Error('Failed to fetch spaces');
      }

      const data = await response.json();
      setSpaces(data.spaces);
      setInvitations(data.invitations || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    try {
      setProcessingInvitation(invitation.id);
      const response = await fetch(`/api/invitations/${invitation.token}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      // Refresh spaces list
      await fetchSpaces();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setError('Failed to accept invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitation: Invitation) => {
    if (!confirm('Are you sure you want to decline this invitation?')) return;

    try {
      setProcessingInvitation(invitation.id);
      const response = await fetch(`/api/invitations/${invitation.token}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to decline invitation');
      }

      // Remove from list
      setInvitations(invitations.filter((i) => i.id !== invitation.id));
    } catch (err) {
      console.error('Failed to decline invitation:', err);
      setError('Failed to decline invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const switchSpace = async (spaceId: string, redirectUrl: string) => {
    try {
      setLoading(true);
      setError('');

      // Call switch space API
      const response = await fetch('/api/user/switch-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch space');
      }

      // Hard refresh to clear all client state (sidebar, entity selector, etc.)
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Failed to switch space:', err);
      const error = err as Error;
      setError(error.message || 'Failed to switch space');
      setLoading(false);
    }
  };

  const handleSpaceClick = async (spaceId: string) => {
    await switchSpace(spaceId, '/entities');
  };

  const handleEditSpace = async (spaceId: string) => {
    await switchSpace(spaceId, '/settings');
  };

  const handleLeaveClick = (space: Space) => {
    setSelectedSpace(space);
    setShowLeaveModal(true);
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
    setSelectedSpace(null);
  };

  const handleConfirmLeave = async () => {
    if (!selectedSpace) return;

    try {
      setLeaving(true);
      const response = await fetch(`/api/spaces/${selectedSpace.id}/leave`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to leave space');
      }

      // Remove the space from the list
      setSpaces(spaces.filter(s => s.id !== selectedSpace.id));
      setShowLeaveModal(false);
      setSelectedSpace(null);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to leave space');
    } finally {
      setLeaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <PageContainer
      headers={[
        {
          content: (
            <Flex align="center" width="100%" gap="4">
              <Header.Content>
                <Header.Title as="h1" size="4" weight="bold">Your Spaces</Header.Title>
              </Header.Content>
              <Separator orientation="vertical" size="2" />
              <Text size="2" color="gray">Your workspace holds your entities, prompts, and team members. Select one to continue.</Text>
            </Flex>
          ),
          sticky: true,
          zIndex: 20,
        }
      ]}
    >
      <Box p="4">
        {loading ? (
          <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
            <Text color="gray">Loading spaces...</Text>
          </Flex>
        ) : (
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Spaces Grid */}
            <Grid columns={{ initial: '1', md: '2', lg: '2', xl: '3' }} gap="6">
            {/* Invitations */}
            {invitations.map((invitation) => {
              const activeEntities = invitation.entities?.filter(e => !e.isArchived) || [];
              const archivedEntities = invitation.entities?.filter(e => e.isArchived) || [];
              
              return (
                <SpaceCard key={invitation.id} className="min-h-[300px]">
                    <SpaceCard.Header 
                        title={invitation.space.name}
                        plan={invitation.space.plan}
                        role={undefined}
                        inviterName={invitation.inviter.name}
                        joinedDate={formatDate(invitation.createdAt)}
                    />
                    <SpaceCard.EntitiesList entities={[...activeEntities, ...archivedEntities]} />
                    <SpaceCard.Stats 
                        members={invitation.memberCount}
                        memberLimit={invitation.memberLimit}
                        entities={invitation.entityCount}
                        entityLimit={invitation.entityLimit}
                        prompts={invitation.promptCount}
                        promptLimit={invitation.promptLimit}
                    />
                    <SpaceCard.Footer>
                         <div className="text-xs text-gray-500 text-center w-full mb-3">
                            You have been invited to join this workspace.
                        </div>
                         <div className="flex gap-3 w-full">
                             <div className="flex-1">
                                 <Button
                                    variant="ghost-danger"
                                    size="md"
                                    onClick={() => handleDeclineInvitation(invitation)}
                                    isLoading={processingInvitation === invitation.id}
                                    className="w-full justify-center"
                                >
                                    Decline
                                </Button>
                            </div>
                            <div className="flex-1">
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={() => handleAcceptInvitation(invitation)}
                                    isLoading={processingInvitation === invitation.id}
                                    className="w-full justify-center"
                                >
                                    Accept
                                </Button>
                            </div>
                        </div>
                    </SpaceCard.Footer>
                </SpaceCard>
              );
            })}

            {spaces.map((space) => {
              const activeEntities = space.entities.filter(e => !e.isArchived);
              const archivedEntities = space.entities.filter(e => e.isArchived);
              
              return (
                <SpaceCard 
                    key={space.id} 
                    onClick={() => handleSpaceClick(space.id)}
                    className="min-h-[320px]"
                >
                    <SpaceCard.Header
                        title={space.name}
                        plan={space.plan}
                        role={space.role}
                        joinedDate={formatDate(space.joinedAt)}
                    />
                    <SpaceCard.EntitiesList entities={[...activeEntities, ...archivedEntities]} />
                    <SpaceCard.Stats
                        members={space.memberCount}
                        memberLimit={space.memberLimit}
                        entities={space.entityCount}
                        entityLimit={space.entityLimit}
                        prompts={space.promptCount}
                        promptLimit={space.promptLimit}
                    />
                    <SpaceCard.Footer>
                        <Button
                            variant="tertiary"
                            size="md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLeaveClick(space);
                            }}
                            disabled={space.isOwner}
                            title={space.isOwner ? 'Transfer ownership before leaving' : 'Leave space'}
                            className="flex-1 justify-center"
                        >
                            Leave
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditSpace(space.id);
                            }}
                            className="flex-1 justify-center"
                        >
                            Edit Space
                        </Button>
                    </SpaceCard.Footer>
                </SpaceCard>
              );
            })}

            {/* Create/Join Space Card */}
            <PlaceholderCard
              title="Add Space"
              description="Create a new space or join an existing one"
              onClick={() => {}}
              actions={
                <div className="grid grid-flow-col auto-cols-fr gap-3 w-full">
                  <Button
                    variant="tertiary"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowJoinModal(true);
                    }}
                    className="w-full justify-center"
                  >
                    Join Space
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModal(true);
                    }}
                    className="w-full justify-center"
                  >
                    Create New Space
                  </Button>
                </div>
              }
            />
            </Grid>

            {/* Empty State */}
            {spaces.length === 0 && invitations.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <BuildingIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No spaces</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You&apos;re not a member of any spaces yet.
                </p>
              </div>
            )}
          </div>
        )}
      </Box>

      {/* Leave Confirmation Modal */}
      <Modal
        isOpen={showLeaveModal && !!selectedSpace}
        onClose={handleCancelLeave}
        title="Leave Space"
        size="sm"
        actions={
          <>
            <Button variant="tertiary" size="sm" onClick={handleCancelLeave} disabled={leaving}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleConfirmLeave} isLoading={leaving} loadingText="Leaving...">Leave Space</Button>
          </>
        }
      >
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-600">
            Are you sure you want to leave <strong>{selectedSpace?.name}</strong>?
            You will lose access to all entities and data in this space.
          </p>
        </div>
      </Modal>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(spaceId) => {
          switchSpace(spaceId, '/entities');
        }}
      />

      {/* How to Join Modal */}
      <HowToJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </PageContainer>
  );
}
