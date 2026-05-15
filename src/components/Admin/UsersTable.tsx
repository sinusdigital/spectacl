"use client";

import React, { useState } from "react";
import { User as PrismaUser, SpaceRole } from "@prisma/client";
import RadixTable from "@/components/Shared/RadixTable";
import RadixSelect from "@/components/Shared/RadixSelect";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PersonIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { Flex, Box, Text, Badge, Avatar, Grid, Heading, Link as RadixLink } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import RadixInput from "@/components/Shared/RadixInput";
import Modal from "@/components/Shared/Modal";
import { useToast } from "@/components/Shared/RadixToast";

interface UserEntity {
  id: string;
  name: string;
  spaceId: string | null;
  isArchived: boolean;
}

interface UserSpaceMembership {
  role: SpaceRole;
  joinedAt: Date | string;
  Space: {
    id: string;
    name: string;
    plan: string;
  };
}

interface User extends Omit<PrismaUser, "role"> {
    role: "ADMIN" | "USER" | string;
    entities?: UserEntity[];
    SpaceMember_SpaceMember_userIdToUser?: UserSpaceMembership[];
}

interface UsersTableProps {
  users: User[];
  totalUsers: number;
  currentPage: number;
  pageSize: number;
  lastSeenMap: Record<string, string>;
  lastSeenAtMap: Record<string, string>;
  nowMs: number;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

function LastLoginBadge({ lastSeen, nowMs }: { lastSeen: string | undefined; nowMs: number }) {
  if (!lastSeen) return <Text color="gray" size="1">—</Text>;

  const ms = nowMs - new Date(lastSeen).getTime();
  const isRecent = ms < ONLINE_THRESHOLD_MS;

  const minutes = Math.floor(ms / 60000);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  const ago = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : `${minutes}m ago`;

  return (
    <Flex align="center" gap="2">
      <Box 
        width="8px" 
        height="8px" 
        style={{ 
          borderRadius: '50%', 
          backgroundColor: isRecent ? 'var(--green-9)' : 'var(--gray-6)' 
        }} 
      />
      <Text size="1" color={isRecent ? "green" : "gray"} weight={isRecent ? "medium" : "regular"}>
        {ago}
      </Text>
    </Flex>
  );
}

function ActiveBadge({ lastSeenAt, nowMs }: { lastSeenAt: string | undefined; nowMs: number }) {
  if (!lastSeenAt) {
    return <Text color="gray" size="1">Never</Text>;
  }

  const ms = nowMs - new Date(lastSeenAt).getTime();
  const isOnline = ms < ONLINE_THRESHOLD_MS;

  if (isOnline) {
    return (
      <Flex align="center" gap="2">
        <Box position="relative" width="8px" height="8px">
          <Box 
            position="absolute" 
            inset="0" 
            style={{ 
                borderRadius: '50%', 
                backgroundColor: 'var(--green-9)', 
                opacity: 0.75,
                animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
            }} 
          />
          <Box 
            position="relative" 
            width="8px" 
            height="8px" 
            style={{ borderRadius: '50%', backgroundColor: 'var(--green-9)' }} 
          />
        </Box>
        <Text size="1" color="green" weight="medium">Online</Text>
      </Flex>
    );
  }

  const minutes = Math.floor(ms / 60000);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  const ago = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : `${minutes}m ago`;

  return (
    <Flex align="center" gap="2">
      <Box width="8px" height="8px" style={{ borderRadius: '50%', backgroundColor: 'var(--gray-6)' }} />
      <Text size="1" color="gray">{ago}</Text>
    </Flex>
  );
}

interface RoleModalState {
  userId: string;
  userName: string;
  currentRole: string;
  targetRole: "ADMIN" | "USER";
}

function RoleChangeModal({
  state,
  onClose,
  onConfirmed,
}: {
  state: RoleModalState;
  onClose: () => void;
  onConfirmed: (userId: string, role: string) => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  const requiredWord = state.targetRole;
  const isValid = confirmText === requiredWord;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    await onConfirmed(state.userId, state.targetRole);
    setSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={`Change role to ${state.targetRole}`}
      description={state.targetRole === "ADMIN"
        ? `This will give ${state.userName} full admin access to the platform.`
        : `This will remove admin access from ${state.userName} and demote them to a regular user.`}
      actions={
        <>
          <Button variant="tertiary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saving}
            isLoading={saving}
            loadingText="Updating…"
          >
            Make {state.targetRole}
          </Button>
        </>
      }
    >
      <Flex direction="column" gap="4" px="6" pb="6">
        <Text size="1" color="gray">
          To confirm, type{" "}
          <Text weight="bold" color="red" style={{ backgroundColor: 'var(--gray-3)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>{requiredWord}</Text>{" "}
          in the field below:
        </Text>
        <RadixInput
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && isValid && handleSubmit()}
          placeholder={`Type ${requiredWord} to confirm`}
          autoFocus
          style={{ 
            fontFamily: 'monospace',
            borderColor: confirmText && !isValid ? 'var(--red-8)' : isValid ? 'var(--green-8)' : undefined,
            backgroundColor: confirmText && !isValid ? 'var(--red-1)' : isValid ? 'var(--green-1)' : undefined
          }}
        />
      </Flex>
    </Modal>
  );
}

export default function UsersTable({ users, totalUsers, currentPage, pageSize, lastSeenMap, lastSeenAtMap, nowMs }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [roleModal, setRoleModal] = useState<RoleModalState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/admin/users?${params.toString()}`);
  };

  const openRoleModal = (user: User) => {
    const targetRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    setRoleModal({
      userId: user.id,
      userName: user.name ?? user.email,
      currentRole: user.role,
      targetRole,
    });
  };

  const handleRoleConfirmed = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update role");
      }

      success("Role Updated", `User is now ${role}.`);
      setRoleModal(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      error("Update Failed", err instanceof Error ? err.message : "Could not update role");
    }
  };

  const handleSpaceRoleChange = async (userId: string, spaceId: string, role: SpaceRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/spaces/${spaceId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update space role");
      }

      success("Space Role Updated", `Role updated to ${role}.`);
      router.refresh();
    } catch (err) {
      console.error(err);
      error("Update Failed", err instanceof Error ? err.message : "Could not update space role");
    }
  };

  return (
    <Flex direction="column" gap="4">
        <RadixTable.Root>
          <RadixTable.Header>
            <RadixTable.Row>
              <RadixTable.Head>Name</RadixTable.Head>
              <RadixTable.Head>Email</RadixTable.Head>
              <RadixTable.Head>Role</RadixTable.Head>
              <RadixTable.Head>Active</RadixTable.Head>
              <RadixTable.Head>Last Login</RadixTable.Head>
              <RadixTable.Head>Joined</RadixTable.Head>
              <RadixTable.Head></RadixTable.Head>
            </RadixTable.Row>
          </RadixTable.Header>
          <RadixTable.Body>
            {users.length === 0 ? (
              <RadixTable.Row>
                <RadixTable.Cell colSpan={7}>
                  <Text align="center" color="gray" size="2" style={{ display: 'block', padding: 'var(--space-8)' }}>
                    No users found.
                  </Text>
                </RadixTable.Cell>
              </RadixTable.Row>
            ) : (
              users.map((user) => (
                <React.Fragment key={user.id}>
                  <RadixTable.ExpandableRow 
                    isExpanded={expanded.has(user.id)}
                    onToggle={() => toggleExpand(user.id)}
                  >
                    <RadixTable.Cell>
                      <Flex align="center" gap="3">
                        <Avatar 
                          size="1" 
                          src={user.image || undefined} 
                          fallback={user.name?.[0] || <PersonIcon />} 
                          radius="full"
                        />
                        <RadixLink asChild>
                          <Link href={`/admin/users/${user.id}`}>
                            <Text weight="medium" style={{ maxWidth: '150px' }} truncate>{user.name}</Text>
                          </Link>
                        </RadixLink>
                      </Flex>
                    </RadixTable.Cell>
                  <RadixTable.Cell>{user.email}</RadixTable.Cell>
                  <RadixTable.Cell>
                    <Badge color={user.role === "ADMIN" ? "purple" : "gray"} variant="soft">
                      {user.role}
                    </Badge>
                  </RadixTable.Cell>
                  <RadixTable.Cell>
                    <ActiveBadge lastSeenAt={lastSeenAtMap[user.id]} nowMs={nowMs} />
                  </RadixTable.Cell>
                  <RadixTable.Cell>
                    <LastLoginBadge lastSeen={lastSeenMap[user.id]} nowMs={nowMs} />
                  </RadixTable.Cell>
                  <RadixTable.Cell>
                    <Text size="1">
                        {new Date(user.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                  </RadixTable.Cell>
                  <RadixTable.Cell>
                    <Button 
                        variant="tertiary" 
                        size="xs" 
                        onClick={() => openRoleModal(user)}
                        icon={<Pencil1Icon />}
                    >
                      Change Role
                    </Button>
                  </RadixTable.Cell>
                  </RadixTable.ExpandableRow>
                
                  <RadixTable.ExpandedContent
                    colSpan={7}
                    isExpanded={expanded.has(user.id)}
                  >
                      <Box p="6">
                        <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="6">
                          {user.SpaceMember_SpaceMember_userIdToUser && user.SpaceMember_SpaceMember_userIdToUser.length > 0 ? (
                            user.SpaceMember_SpaceMember_userIdToUser.map((membership) => {
                              const spaceEntities = user.entities?.filter(e => e.spaceId === membership.Space.id) || [];
                              
                              return (
                                <Box key={membership.Space.id} p="4" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)' }}>
                                  <Flex justify="between" align="start" mb="4">
                                    <Flex direction="column" gap="1">
                                      <Text size="2" weight="bold">{membership.Space.name}</Text>
                                      <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono)' }}>{membership.Space.id}</Text>
                                      <Box mt="1">
                                        <Badge size="1" color="gray" variant="surface" style={{ textTransform: 'uppercase' }}>
                                          {membership.Space.plan}
                                        </Badge>
                                      </Box>
                                    </Flex>
                                    
                                    <Flex direction="column" align="end" gap="1">
                                      <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Space Role</Text>
                                      <RadixSelect.Root 
                                        defaultValue={membership.role} 
                                        size="1"
                                        onValueChange={(val) => handleSpaceRoleChange(user.id, membership.Space.id, val as SpaceRole)}
                                      >
                                        <RadixSelect.Trigger color="gray" variant="soft" style={{ minWidth: '100px' }} />
                                        <RadixSelect.Content position="popper">
                                          <RadixSelect.Item value="OWNER">Owner</RadixSelect.Item>
                                          <RadixSelect.Item value="ADMIN">Admin</RadixSelect.Item>
                                          <RadixSelect.Item value="MEMBER">Member</RadixSelect.Item>
                                        </RadixSelect.Content>
                                      </RadixSelect.Root>
                                    </Flex>
                                  </Flex>

                                  <Box pt="3" style={{ borderTop: '1px solid var(--gray-3)' }}>
                                    <Text size="1" weight="bold" color="gray" mb="2" style={{ textTransform: 'uppercase', display: 'block' }}>Entities</Text>
                                    {spaceEntities.length > 0 ? (
                                      <Flex direction="column" gap="2">
                                        {spaceEntities.map((entity) => (
                                          <Flex key={entity.id} direction="column" gap="1" p="2" style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-2)' }}>
                                            <Flex justify="between" align="center">
                                              <Text size="1" weight="medium">{entity.name}</Text>
                                              {entity.isArchived && (
                                                <Badge size="1" color="red" variant="soft" style={{ textTransform: 'uppercase' }}>
                                                  Archived
                                                </Badge>
                                              )}
                                            </Flex>
                                            <Text size="1" color="gray" style={{ fontFamily: 'monospace', fontSize: '10px' }}>{entity.id}</Text>
                                          </Flex>
                                        ))}
                                      </Flex>
                                    ) : (
                                      <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>No entities in this space</Text>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })
                          ) : (
                            <Box py="8" p="4" style={{ gridColumn: '1 / -1', textAlign: 'center', backgroundColor: 'var(--gray-2)', border: '1px dashed var(--gray-4)', borderRadius: 'var(--radius-3)' }}>
                              <Text size="2" color="gray">This user is not a member of any spaces.</Text>
                            </Box>
                          )}

                          {user.entities && user.entities.filter(e => !e.spaceId).length > 0 && (
                            <Box p="4" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)' }}>
                              <Heading as="h4" size="2" mb="4">
                                <Flex align="center" gap="2">
                                  Personal Entities
                                  <Text size="1" weight="regular" color="gray">(No Space)</Text>
                                </Flex>
                              </Heading>
                              <Flex direction="column" gap="2">
                                {user.entities.filter(e => !e.spaceId).map((entity) => (
                                  <Flex key={entity.id} direction="column" gap="1" p="2" style={{ backgroundColor: 'var(--blue-2)', border: '1px solid var(--blue-4)', borderRadius: 'var(--radius-2)' }}>
                                    <Flex justify="between" align="center">
                                      <Text size="1" weight="medium" color="blue">{entity.name}</Text>
                                      {entity.isArchived && (
                                        <Badge size="1" color="red" variant="soft" style={{ textTransform: 'uppercase' }}>
                                          Archived
                                        </Badge>
                                      )}
                                    </Flex>
                                    <Text size="1" color="blue" style={{ fontFamily: 'monospace', fontSize: '10px', opacity: 0.7 }}>{entity.id}</Text>
                                  </Flex>
                                ))}
                              </Flex>
                            </Box>
                          )}
                        </Grid>
                      </Box>
                  </RadixTable.ExpandedContent>
                </React.Fragment>
              ))
            )}
          </RadixTable.Body>
        </RadixTable.Root>
        
        <RadixTable.Pagination 
          currentPage={currentPage}
          total={totalUsers}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          label="users"
        />

      {roleModal && (
        <RoleChangeModal
          state={roleModal}
          onClose={() => setRoleModal(null)}
          onConfirmed={handleRoleConfirmed}
        />
      )}
    </Flex>
  );
}
