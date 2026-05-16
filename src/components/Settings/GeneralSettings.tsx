'use client';

import { useState, useEffect } from 'react';
import { Card, Flex, Box, Text, Heading, TextField, Button, Callout, Badge } from '@radix-ui/themes';

interface Space {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  memberCount: number;
}

export default function GeneralSettings() {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpace();
  }, []);

  const fetchSpace = async () => {
    try {
      const currentRes = await fetch('/api/spaces/current');
      const currentSpace = await currentRes.json();

      const res = await fetch(`/api/spaces/${currentSpace.id}`);
      const data = await res.json();
      setSpace(data);
      setSpaceName(data.name);
    } catch (error) {
      console.error('Error fetching space:', error);
      setError('Failed to load space settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!space || !spaceName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${space.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: spaceName.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSpace(updated);
        setEditing(false);
      } else {
        const error = await res.json();
        setError(error.error || 'Failed to update space');
      }
    } catch (error) {
      console.error('Error updating space:', error);
      setError('Failed to update space');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <Flex align="center" justify="center" p="9">
        <Text color="gray">Loading...</Text>
      </Flex>
    );
  }

  if (!space) {
    return (
      <Box p="6">
        <Callout.Root color="red">
          <Callout.Text>Space not found</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FOUNDER': return 'purple';
      case 'ENTERPRISE': return 'indigo';
      case 'BUSINESS': return 'blue';
      case 'PRO': return 'green';
      default: return 'gray';
    }
  };

  return (
    <Flex direction="column" gap="6">
      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Space Information */}
      <Card size="3">
        <Flex direction="column" gap="4">
          <Heading size="4">Space Information</Heading>

          <Flex direction="column" gap="1">
            <Text size="2" weight="bold" color="gray">Space Name</Text>
            {editing ? (
              <Flex gap="2">
                <Box flexGrow="1">
                  <TextField.Root
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder="Enter space name"
                  />
                </Box>
                <Button onClick={handleSave} disabled={saving || !spaceName.trim()}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="soft" color="gray" onClick={() => {
                  setEditing(false);
                  setSpaceName(space.name);
                }}>
                  Cancel
                </Button>
              </Flex>
            ) : (
              <Flex align="center" justify="between">
                <Text>{space.name}</Text>
                <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              </Flex>
            )}
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="bold" color="gray">Created</Text>
            <Text>
              {new Date(space.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="bold" color="gray">Current Plan</Text>
            <Box>
              <Badge color={getPlanColor(space.plan)} size="2">
                {space.plan}
              </Badge>
            </Box>
          </Flex>
        </Flex>
      </Card>

    </Flex>
  );
}
