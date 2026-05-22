'use client';

import { useState, useEffect } from 'react';
import { SpaceRole } from '@prisma/client';
import { Flex, Box, Text, Button, Badge, Select, Callout, Table } from '@radix-ui/themes';
import { UserAvatar } from '@/components/Shared/UserAvatar';
import Modal from '@/components/Shared/Modal';

interface Member {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: SpaceRole;
  joinedAt: Date;
  invitedBy: string | null;
}

export default function MembersSettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [newRole, setNewRole] = useState<SpaceRole>('MEMBER');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok || res.status === 204) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      setCurrentUserId(data.user?.id || null);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const currentRes = await fetch('/api/spaces/current');
      const currentSpace = await currentRes.json();
      setCanManage(!!currentSpace.canManageMembers);

      const res = await fetch(`/api/spaces/${currentSpace.id}/members`);
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;

    setProcessing(true);
    setError(null);
    try {
      const currentRes = await fetch('/api/spaces/current');
      const currentSpace = await currentRes.json();

      const res = await fetch(
        `/api/spaces/${currentSpace.id}/members/${selectedMember.userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (res.ok) {
        await fetchMembers();
        closeRoleModal();
      } else {
        const error = await res.json();
        setError(error.error || 'Failed to change role');
      }
    } catch (error) {
      console.error('Error changing role:', error);
      setError('Failed to change role');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setProcessing(true);
    setError(null);
    try {
      const currentRes = await fetch('/api/spaces/current');
      const currentSpace = await currentRes.json();

      const res = await fetch(
        `/api/spaces/${currentSpace.id}/members/${selectedMember.userId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        await fetchMembers();
        closeRemoveModal();
      } else {
        const error = await res.json();
        setError(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member');
    } finally {
      setProcessing(false);
    }
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setSelectedMember(null);
  };

  const closeRemoveModal = () => {
    setShowRemoveModal(false);
    setSelectedMember(null);
  };

  const getRoleColor = (role: SpaceRole) => {
    switch (role) {
      case 'OWNER': return 'purple';
      case 'ADMIN': return 'blue';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" p="9">
        <Text color="gray">Loading members...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Member</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Joined</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
            {canManage && <Table.ColumnHeaderCell />}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {members.map((member) => (
            <Table.Row key={member.userId} align="center">
              <Table.Cell>
                <Flex align="center" gap="3">
                  <UserAvatar
                    name={member.name}
                    email={member.email}
                    image={member.image}
                    size="sm"
                  />
                  <Flex direction="column">
                    <Flex align="center" gap="2">
                      <Text weight="bold" size="2">{member.name || member.email}</Text>
                      {member.userId === currentUserId && (
                        <Badge color="blue" variant="soft" size="1">You</Badge>
                      )}
                    </Flex>
                    <Text size="1" color="gray">{member.email}</Text>
                  </Flex>
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Text size="2" color="gray">
                  {new Date(member.joinedAt).toLocaleDateString()}
                  {member.invitedBy && (
                    <Text size="1" color="gray" as="span"><br />via {member.invitedBy}</Text>
                  )}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={getRoleColor(member.role)} size="2">
                  {member.role}
                </Badge>
              </Table.Cell>
              {canManage && (
                <Table.Cell>
                  {member.userId !== currentUserId && (
                    <Flex gap="2" justify="end">
                      <Button
                        variant="ghost"
                        size="1"
                        disabled={member.role === 'OWNER'}
                        onClick={() => {
                          setSelectedMember(member);
                          setNewRole(member.role);
                          setShowRoleModal(true);
                        }}
                      >
                        Change Role
                      </Button>
                      <Button
                        variant="ghost"
                        color="red"
                        size="1"
                        disabled={member.role === 'OWNER'}
                        onClick={() => {
                          setSelectedMember(member);
                          setShowRemoveModal(true);
                        }}
                      >
                        Remove
                      </Button>
                    </Flex>
                  )}
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Modal
        isOpen={showRoleModal}
        onClose={closeRoleModal}
        title="Change Member Role"
        description={
          selectedMember
            ? `Change role for ${selectedMember.name || selectedMember.email}`
            : undefined
        }
        size="sm"
        actions={
          <>
            <Button variant="soft" color="gray" onClick={closeRoleModal}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={processing || newRole === selectedMember?.role}
            >
              {processing ? 'Changing...' : 'Change Role'}
            </Button>
          </>
        }
      >
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            New Role
          </Text>
          <Select.Root value={newRole} onValueChange={(val) => setNewRole(val as SpaceRole)}>
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              <Select.Item value="MEMBER">Member</Select.Item>
              <Select.Item value="ADMIN">Admin</Select.Item>
              <Select.Item value="OWNER">Owner</Select.Item>
            </Select.Content>
          </Select.Root>
        </Box>
      </Modal>

      <Modal
        isOpen={showRemoveModal}
        onClose={closeRemoveModal}
        title="Remove Member?"
        size="sm"
        actions={
          <>
            <Button variant="soft" color="gray" onClick={closeRemoveModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleRemoveMember} disabled={processing}>
              {processing ? 'Removing...' : 'Remove Member'}
            </Button>
          </>
        }
      >
        <Text size="2" color="gray">
          Are you sure you want to remove{' '}
          <strong>{selectedMember?.name || selectedMember?.email}</strong> from this space?
          They will lose access to all entities and data.
        </Text>
      </Modal>
    </Flex>
  );
}
