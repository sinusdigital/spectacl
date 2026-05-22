'use client';

import { useState, useEffect } from 'react';
import { Card, Flex, Box, Text, Button, Badge, TextField, Callout, Grid, Select, Tooltip, Table, IconButton, Code, Theme } from '@radix-ui/themes';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { EnvelopeClosedIcon, Link1Icon, TrashIcon, CopyIcon, CheckIcon, ReloadIcon } from '@radix-ui/react-icons';
import UpgradeRequiredModal from '@/components/Shared/UpgradeRequiredModal';
import ActionDialog from '@/components/Shared/ActionDialog';
import { SpacePlan } from '@prisma/client';

interface Invitation {
  id: string;
  email: string | null;
  role: string;
  token: string;
  status: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  invitedBy: {
    name: string | null;
    email: string;
  };
}

export default function InvitationsSettings() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [sending, setSending] = useState(false);
  const [linkRole, setLinkRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentSpace, setCurrentSpace] = useState<{ id: string, plan: SpacePlan, llmProvider: 'MANAGED' | 'BYOK', canManageMembers?: boolean } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [memberLimitMessage, setMemberLimitMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const currentRes = await fetch('/api/spaces/current');
      const space = await currentRes.json();
      setCurrentSpace(space);

      // Skip listing invitations for non-managers — they won't see the table.
      if (!space.canManageMembers) {
        setInvitations([]);
        return;
      }

      const res = await fetch(`/api/spaces/${space.id}/invitations`);
      const data = await res.json();
      setInvitations(data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (currentSpace?.plan === ('STARTER' as SpacePlan)) {
      setShowUpgradeModal(true);
      return;
    }

    setSending(true);
    setError(null);
    try {
      if (!currentSpace) throw new Error('Space not loaded');

      const res = await fetch(`/api/spaces/${currentSpace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, type: 'email' }),
      });

      if (res.ok) {
        setInviteEmail('');
        await fetchInvitations();
      } else {
        const data = await res.json();
        if (data.error === 'MEMBER_LIMIT') {
          setMemberLimitMessage(data.message);
        } else {
          setError(data.message || data.error || 'Failed to send invitation');
        }
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateLink = async () => {
    if (currentSpace?.plan === ('STARTER' as SpacePlan)) {
      setShowUpgradeModal(true);
      return;
    }

    setGeneratingLink(true);
    setError(null);
    try {
      if (!currentSpace) throw new Error('Space not loaded');

      const res = await fetch(`/api/spaces/${currentSpace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: linkRole, type: 'link' }),
      });

      if (res.ok) {
        await fetchInvitations();
      } else {
        const data = await res.json();
        if (data.error === 'MEMBER_LIMIT') {
          setMemberLimitMessage(data.message);
        } else {
          setError(data.message || data.error || 'Failed to generate link');
        }
      }
    } catch (error) {
      console.error('Error generating link:', error);
      setError('Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleResendInvitation = async (id: string) => {
    setLoading(true);
    try {
      if (!currentSpace) throw new Error('Space not loaded');

      const res = await fetch(`/api/spaces/${currentSpace.id}/invitations/${id}`, {
        method: 'POST',
      });

      if (res.ok) {
        await fetchInvitations();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      setError('Failed to resend invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!revokeTarget || !currentSpace) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/spaces/${currentSpace.id}/invitations/${revokeTarget}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchInvitations();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to revoke invitation');
      }
    } catch (error) {
      console.error('Error revoking invitation:', error);
      setError('Failed to revoke invitation');
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'green';
      case 'EXPIRED': return 'red';
      case 'PENDING': return 'amber';
      default: return 'gray';
    }
  };

  if (loading && invitations.length === 0) {
    return (
      <Flex align="center" justify="center" p="9">
        <Text color="gray">Loading invitations...</Text>
      </Flex>
    );
  }

  // Non-managers (regular Members) don't see the invite forms, the pending
  // invitations table, or any of the modal actions — the whole component is
  // an admin/owner affordance.
  if (currentSpace && !currentSpace.canManageMembers) {
    return null;
  }

  return (
    <Flex direction="column" gap="6">
      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Card size="3">
        <Flex direction="column" gap="5">
          <Grid columns={{ initial: '1', md: '2' }} gap="6">
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <EnvelopeClosedIcon />
                <Text weight="bold" size="2">Invite by Email</Text>
              </Flex>
              <form onSubmit={handleSendInvite}>
                <Flex direction="column" gap="3">
                  <Box>
                    <Text as="label" size="1" weight="bold" color="gray" mb="1" style={{ display: 'block' }}>EMAIL ADDRESS</Text>
                    <TextField.Root
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      type="email"
                      required
                    />
                  </Box>
                  <Box>
                    <Text as="label" size="1" weight="bold" color="gray" mb="1" style={{ display: 'block' }}>ROLE</Text>
                    <Select.Root
                      value={inviteRole}
                      onValueChange={(val) => setInviteRole(val as 'ADMIN' | 'MEMBER')}
                    >
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        <Select.Item value="MEMBER">Member</Select.Item>
                        <Select.Item value="ADMIN">Admin</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Box>
                  <Button disabled={sending || !inviteEmail.trim()} mt="2">
                    {sending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </Flex>
              </form>
            </Flex>

            <Flex direction="column" gap="3" style={{ borderLeft: '1px solid var(--gray-4)', paddingLeft: 'var(--space-6)' }}>
              <Flex align="center" gap="2">
                <Link1Icon />
                <Text weight="bold" size="2">Invite by Link</Text>
              </Flex>
              <Text size="2" color="gray">Generate a single-use invite link. It expires once someone joins through it. Do not share with anyone not intended to join.</Text>
              <Box mt="auto">
                <Text as="label" size="1" weight="bold" color="gray" mb="1" style={{ display: 'block' }}>ROLE FOR LINK</Text>
                <Select.Root
                  value={linkRole}
                  onValueChange={(val) => setLinkRole(val as 'ADMIN' | 'MEMBER')}
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="MEMBER">Member</Select.Item>
                    <Select.Item value="ADMIN">Admin</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Button
                  variant="soft"
                  mt="3"
                  style={{ width: '100%' }}
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                >
                  {generatingLink ? 'Generating...' : 'Generate New Link'}
                </Button>
              </Box>
            </Flex>
          </Grid>
        </Flex>
      </Card>

      {invitations.length > 0 && (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Invitation</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Expires</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invitations.map((invitation) => {
              const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
              const isEmail = invitation.email && invitation.email.trim() !== '';
              return (
                <Table.Row key={invitation.id} align="center">
                  <Table.Cell>
                    <Flex direction="column" gap="1">
                      <Flex align="center" gap="2">
                        {isEmail ? <EnvelopeClosedIcon style={{ color: 'var(--gray-9)', flexShrink: 0 }} /> : <Link1Icon style={{ color: 'var(--gray-9)', flexShrink: 0 }} />}
                        <Text weight="medium" size="2">
                          {isEmail ? invitation.email : 'Shareable Link'}
                        </Text>
                      </Flex>
                      <Code size="1" color="gray" truncate style={{ maxWidth: 360 }}>{inviteUrl}</Code>
                      <Text size="1" color="gray">
                        by {invitation.invitedBy.name || invitation.invitedBy.email}
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={invitation.role === 'ADMIN' ? 'blue' : 'gray'} size="1">
                      {invitation.role}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getStatusColor(invitation.status)} variant="soft" size="1">
                      {invitation.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="2" justify="end" align="center">
                      <Tooltip content={copiedId === invitation.id ? 'Copied!' : 'Copy invite link'}>
                        <IconButton size="1" variant="ghost" color="gray" onClick={() => copyToClipboard(inviteUrl, invitation.id)}>
                          {copiedId === invitation.id ? <CheckIcon color="green" /> : <CopyIcon />}
                        </IconButton>
                      </Tooltip>
                      {isEmail && invitation.status === 'PENDING' && (
                        <Button variant="ghost" size="1" onClick={() => handleResendInvitation(invitation.id)}>
                          <ReloadIcon /> Resend
                        </Button>
                      )}
                      <Button variant="ghost" color="red" size="1" onClick={() => setRevokeTarget(invitation.id)}>
                        <TrashIcon /> Revoke
                      </Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      <ActionDialog
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeInvitation}
        title="Revoke invitation"
        message="This invitation link will no longer work. The recipient won't be able to join this space with it."
        confirmText="Revoke"
        variant="destructive"
        isLoading={revoking}
        loadingText="Revoking..."
      />

      <AlertDialog.Root open={memberLimitMessage !== null} onOpenChange={(open) => !open && setMemberLimitMessage(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-[var(--black-a9)] z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Theme style={{ display: 'contents' }}>
            <AlertDialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl bg-[var(--color-background)] p-6 shadow-xl z-50 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
              <div className="flex flex-col items-center">
                <AlertDialog.Title className="text-lg font-bold text-center text-[var(--gray-12)] mb-2">
                  Member limit reached
                </AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-center text-[var(--gray-11)] mb-6">
                  {memberLimitMessage}
                </AlertDialog.Description>
              </div>
              <AlertDialog.Action asChild>
                <Button style={{ width: '100%', justifyContent: 'center' }}>
                  Got it
                </Button>
              </AlertDialog.Action>
            </AlertDialog.Content>
          </Theme>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {showUpgradeModal && currentSpace && (
        <UpgradeRequiredModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          resourceName="Collaboration"
          limit={0}
          spaceId={currentSpace.id}
          currentPlan={currentSpace.plan}
        />
      )}
    </Flex>
  );
}
