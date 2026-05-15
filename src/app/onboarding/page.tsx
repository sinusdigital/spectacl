'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import Button from '@/components/Shared/Button';
import RadixInput from '@/components/Shared/RadixInput';
import RadixSelectionCard from '@/components/Shared/RadixSelectionCard';
import RadixStepper from '@/components/Shared/RadixStepper';
import { Suspense } from 'react';
import ShaderBackground from '@/components/ui/ShaderBackground';
import { Text, Card, Flex, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';

interface InvitationData {
  space: {
    id: string;
    name: string;
    plan: string;
  };
  inviter: {
    name: string;
  };
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const invitationToken = searchParams.get('invitation');

  const [entityName, setEntityName] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'join' | 'create'>('join');

  const fetchInvitation = useCallback(async () => {
    setLoadingInvitation(true);
    try {
      const response = await fetch(`/api/invitations/${invitationToken}`);
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to load invitation');
        return;
      }
      const data = await response.json();
      setInvitationData(data);
    } catch {
      setError('Failed to load invitation');
    } finally {
      setLoadingInvitation(false);
    }
  }, [invitationToken]);

  useEffect(() => {
    if (invitationToken) {
      fetchInvitation();
    }
  }, [invitationToken, fetchInvitation]);

  const handleJoinSpace = async () => {
    if (!invitationToken) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/invitations/${invitationToken}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join space');
      }

      window.location.href = '/entities';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join space');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpaceAndEntity = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create Space (Automated)
      const spaceResponse = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: session?.user?.name ? `${session.user.name}'s Space` : 'My Space',
          llmProvider: 'MANAGED' 
        }),
      });

      if (!spaceResponse.ok) {
        const data = await spaceResponse.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      const spaceData = await spaceResponse.json();
      const spaceId = spaceData.space.id;

      // 2. Create Entity
      const entityResponse = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: entityName,
          website: website || undefined,
          spaceId,
        }),
      });

      if (!entityResponse.ok) {
        const data = await entityResponse.json();
        throw new Error(data.error || 'Failed to create entity');
      }

      const entityData = await entityResponse.json();
      
      // Navigate to competitor discovery
      router.push(`/onboarding/competitors?spaceId=${spaceId}&entityId=${entityData.entity.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set up workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invitationData && selectedOption === 'join') {
      await handleJoinSpace();
    } else {
      await handleCreateSpaceAndEntity();
    }
  };

  if (isPending || loadingInvitation) {
    return (
      <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
        <ShaderBackground scrollable>
          <Text color="gray">Loading...</Text>
        </ShaderBackground>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <Card size="4" variant="surface" className="w-full max-w-2xl relative z-20 mx-4 shadow-2xl">

        {(!invitationData || selectedOption === 'create') && (
           <div className="mb-8">
             <RadixStepper
                steps={['Entity', 'Competitors', 'Prompts']}
                currentStep={1}
            />
           </div>
        )}

        <div className="text-center mb-8">
          <Text size="8" weight="bold" style={{ display: 'block' }}>
            {invitationData && selectedOption === 'join' ? 'Welcome to Spectacl' : 'Track Your Brand'}
          </Text>
          <Text as="p" size="3" color="gray" mt="2" style={{ display: 'block' }}>
            {invitationData
              ? 'Join a space or create your own'
              : 'Let\'s start by defining the product or brand you want to track'}
          </Text>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {invitationData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RadixSelectionCard
                title={`Join "${invitationData.space.name}"`}
                description={`Invited by ${invitationData.inviter.name} (${invitationData.space.plan})`}
                value="join"
                selectedValue={selectedOption}
                onChange={() => setSelectedOption('join')}
                name="option"
              />

              <RadixSelectionCard
                title="Create My Own Space"
                description="Start fresh with a new space."
                value="create"
                selectedValue={selectedOption}
                onChange={() => setSelectedOption('create')}
                name="option"
              />
              
              {selectedOption === 'create' && (
                <div className="col-span-1 md:col-span-2 mt-2 space-y-4">
                  <div>
                    <Text as="label" htmlFor="entityName" size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                      Entity Name *
                    </Text>
                    <RadixInput
                      id="entityName"
                      type="text"
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      required
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <Text as="label" htmlFor="entityName" size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                  Entity Name *
                </Text>
                <Text as="p" size="2" color="gray" mb="3" style={{ display: 'block' }}>
                  The name of the product or brand you want to track.
                </Text>
                <RadixInput
                  id="entityName"
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  required
                  placeholder="e.g. My Product"
                />
              </div>

              <div>
                <Text as="label" htmlFor="website" size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                  Website URL
                </Text>
                <Text as="p" size="2" color="gray" mb="3" style={{ display: 'block' }}>
                  The official website of your brand. This helps AI identify you accurately.
                </Text>
                <RadixInput
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            isLoading={loading}
            fullWidth
            variant="primary"
            size="lg"
            disabled={loading || (selectedOption === 'create' && !entityName) || (!invitationData && !entityName)}
          >
            {invitationData && selectedOption === 'join'
              ? 'Join Workspace'
              : 'Continue'}
          </Button>
        </form>
      </Card>
      </ShaderBackground>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <Flex align="center" justify="center" className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Text color="gray">Loading...</Text>
      </Flex>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
