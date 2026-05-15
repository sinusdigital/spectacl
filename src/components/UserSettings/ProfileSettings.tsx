import { useState, useEffect } from 'react';
import { Flex, Card, Heading, Text, TextField, Box, Callout, Button, Separator, Badge } from '@radix-ui/themes';
import { InfoCircledIcon, CheckIcon } from '@radix-ui/react-icons';
import { useSession } from '@/lib/auth-client';
import { UserAvatar } from '@/components/Shared/UserAvatar';

export default function ProfileSettings() {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Reload session to get updated data
      window.location.reload();
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const user = session?.user;

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Box>
          <Heading size="4" mb="1">Profile Information</Heading>
          <Text size="2" color="gray">
            Update your personal information and how others see you
          </Text>
        </Box>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="5">
            {/* Avatar Section */}
            <Flex direction="column" gap="3">
              <Text size="2" weight="bold">Avatar</Text>
              <Flex align="center" gap="4">
                <UserAvatar 
                  name={user?.name} 
                  email={user?.email} 
                  image={user?.image} 
                  size="xl" 
                />
                <Box>
                  <Text size="2" color="gray" style={{ display: 'block' }}>
                    Your avatar is automatically generated from your initials.
                  </Text>
                  <Badge color="blue" variant="soft" mt="1">
                    Custom avatars coming soon
                  </Badge>
                </Box>
              </Flex>
            </Flex>

            <Separator size="4" />

            {/* Name Input */}
            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="bold" htmlFor="name">
                Name
              </Text>
              <TextField.Root
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                size="3"
              />
            </Flex>

            {/* Email Input (Read-only) */}
            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="bold" htmlFor="email">
                Email
              </Text>
              <TextField.Root
                id="email"
                value={email}
                disabled
                size="3"
              />
              <Text size="1" color="gray">
                Email cannot be changed as it&apos;s linked to your authentication provider.
              </Text>
            </Flex>

            {message && (
              <Callout.Root color={message.type === 'success' ? 'green' : 'red'} size="1">
                <Callout.Icon>
                  {message.type === 'success' ? <CheckIcon /> : <InfoCircledIcon />}
                </Callout.Icon>
                <Callout.Text>
                  {message.text}
                </Callout.Text>
              </Callout.Root>
            )}

            <Flex gap="3" pt="4" mt="2" style={{ borderTop: '1px solid var(--gray-4)' }}>
              <Button
                type="submit"
                loading={loading}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => {
                  setName(session?.user?.name || '');
                  setMessage(null);
                }}
              >
                Cancel
              </Button>
            </Flex>
          </Flex>
        </form>
      </Flex>
    </Card>
  );
}
