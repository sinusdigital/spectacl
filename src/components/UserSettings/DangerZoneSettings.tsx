import { useState, useEffect } from 'react';
import { Flex, Card, Heading, Text, Box, TextField, Callout, Dialog, Button, Badge, Separator } from '@radix-ui/themes';
import { ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { signOut } from '@/lib/auth-client';

interface UserSpace {
  id: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isOwner: boolean;
}

export default function DangerZoneSettings() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);

  // Fetch spaces when modal opens
  useEffect(() => {
    if (!showDeleteModal) return;
    setSpacesLoading(true);
    fetch('/api/user/spaces')
      .then(res => res.json())
      .then(data => setSpaces(data.spaces ?? []))
      .catch(() => setSpaces([]))
      .finally(() => setSpacesLoading(false));
  }, [showDeleteModal]);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      await signOut();
      window.location.href = '/login';
    } catch {
      setError('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card size="3" style={{ border: '1px solid var(--red-6)' }}>
      <Flex direction="column" gap="4">
        <Box>
          <Flex align="center" gap="2" mb="1">
            <ExclamationTriangleIcon color="var(--red-9)" width="20" height="20" />
            <Heading size="4" color="red">Danger Zone</Heading>
          </Flex>
          <Text size="2" color="gray">
            Irreversible and destructive actions
          </Text>
        </Box>

        <Box px="4">
          <Flex direction="column" gap="4" p="4" style={{ backgroundColor: 'var(--red-2)', borderRadius: 'var(--radius-3)', border: '1px solid var(--red-4)' }}>
            <Box>
              <Heading size="3" mb="1">Delete Account</Heading>
              <Text size="2" color="gray">
                Once you delete your account, there is no going back. This will:
              </Text>
            </Box>
            
            <ul style={{ 
              color: 'var(--gray-11)', 
              fontSize: 'var(--font-size-2)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-1)', 
              marginLeft: 'var(--space-4)', 
              listStyleType: 'disc' 
            }}>
              <li>Permanently delete your user profile</li>
              <li>Remove you from all spaces you&apos;re a member of</li>
              <li>Delete all your personal data</li>
              <li>Cancel any active subscriptions</li>
            </ul>

            <Callout.Root color="amber" size="1" variant="soft">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Spaces you own will need to be transferred or deleted separately.
              </Callout.Text>
            </Callout.Root>

            <Flex>
              <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <Dialog.Trigger>
                  <Button color="red" variant="solid">
                    Delete My Account
                  </Button>
                </Dialog.Trigger>
                <Dialog.Content maxWidth="450px">
                  <Dialog.Title>Delete Account</Dialog.Title>
                  <Dialog.Description size="2" mb="4">
                    This action cannot be undone. All of your data will be permanently removed.
                  </Dialog.Description>

                  <Flex direction="column" gap="3">
                    {/* Space memberships */}
                    {spacesLoading ? (
                      <Text size="2" color="gray">Loading spaces...</Text>
                    ) : spaces.length > 0 ? (
                      <Box>
                        <Text size="2" weight="bold" mb="2" as="p">
                          Your spaces
                        </Text>
                        <Flex direction="column" gap="1" p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
                          {spaces.map(space => (
                            <Flex key={space.id} align="center" justify="between" py="1">
                              <Text size="2">{space.name}</Text>
                              <Badge
                                size="1"
                                variant="soft"
                                color={space.role === 'OWNER' ? 'red' : space.role === 'ADMIN' ? 'amber' : 'gray'}
                              >
                                {space.role}
                              </Badge>
                            </Flex>
                          ))}
                        </Flex>
                        {spaces.some(s => s.isOwner) && (
                          <Callout.Root color="red" size="1" mt="2">
                            <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                            <Callout.Text>
                              You must transfer or delete owned spaces before deleting your account.
                            </Callout.Text>
                          </Callout.Root>
                        )}
                      </Box>
                    ) : null}

                    <Separator size="4" />

                    <Flex direction="column" gap="2">
                      <Text as="label" size="2" weight="bold">
                        Type <Text weight="bold" color="red">DELETE</Text> to confirm
                      </Text>
                      <TextField.Root
                        size="3"
                        placeholder="DELETE"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        color={confirmText === 'DELETE' ? undefined : 'red'}
                      />
                    </Flex>

                    {error && (
                      <Callout.Root color="red" size="1">
                        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                        <Callout.Text>{error}</Callout.Text>
                      </Callout.Root>
                    )}

                    <Flex gap="3" mt="4" justify="end">
                      <Dialog.Close>
                        <Button variant="soft" color="gray">
                          Cancel
                        </Button>
                      </Dialog.Close>
                      <Button
                        color="red"
                        disabled={confirmText !== 'DELETE'}
                        loading={loading}
                        onClick={handleDeleteAccount}
                      >
                        Delete Account
                      </Button>
                    </Flex>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </Card>
  );
}
