'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RadixStepper from '@/components/Shared/RadixStepper';
import RadixInput from '@/components/Shared/RadixInput';
import Button from '@/components/Shared/Button';
import { Text, Card, Flex, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';

import { Suspense } from 'react';
import ShaderBackground from '@/components/ui/ShaderBackground';

function  OnboardingEntityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spaceId = searchParams.get('spaceId');

  const [entityName, setEntityName] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New state for space details
  const [llmProvider, setLlmProvider] = useState<'MANAGED' | 'BYOK' | null>(null);
  const [fetchingSpace, setFetchingSpace] = useState(true);

  useEffect(() => {
    if (!spaceId) {
      setError('No workspace selected. Please start over.');
      setFetchingSpace(false);
      return;
    }

    // Fetch space details to know LLM Provider
    fetch(`/api/spaces/${spaceId}`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch space');
            return res.json();
        })
        .then(data => {
            setLlmProvider(data.llmProvider);
            setFetchingSpace(false);
        })
        .catch(err => {
            console.error("Error fetching space:", err);
            setError('Failed to verify workspace settings.');
            setFetchingSpace(false);
        });

  }, [spaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!spaceId) {
      setError('No workspace selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: entityName,
          website: website || undefined,
          spaceId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create entity');
      }

      const data = await response.json();
      
      // Dynamic routing based on LLM Provider
      const nextStep = llmProvider === 'BYOK' ? 'models' : 'prompts';
      router.push(`/onboarding/${nextStep}?spaceId=${spaceId}&entityId=${data.entity.id}`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create entity';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingSpace) {
      return (
        <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
          <ShaderBackground scrollable>
            <Text color="gray">Loading workspace settings...</Text>
          </ShaderBackground>
        </div>
      );
  }

  const steps = llmProvider === 'BYOK' 
    ? ['Space', 'Entity', 'Models', 'Prompts']
    : ['Space', 'Entity', 'Prompts'];

  return (
    <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <Card size="4" variant="surface" className="w-full max-w-2xl relative z-20 mx-4 shadow-2xl">
        {/* Progress Indicator */}
        <div className="mb-6">
          <RadixStepper steps={steps} currentStep={2} />
        </div>

        <div className="text-center mb-8">
          <Text size="8" weight="bold" style={{ display: 'block' }}>Create Your First Entity</Text>
          <Text as="p" size="3" color="gray" mt="2" style={{ display: 'block' }}>
            An entity represents your product or brand that you want to track
          </Text>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <div>
            <Text as="label" htmlFor="entityName" size="2" weight="medium" mb="2" style={{ display: 'block' }}>
              Entity Name <Text color="red">*</Text>
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
              placeholder="My Product"
            />
          </div>

          <div>
            <Text as="label" htmlFor="website" size="2" weight="medium" mb="2" style={{ display: 'block' }}>
              Website URL
            </Text>
            <Text as="p" size="2" color="gray" mb="3" style={{ display: 'block' }}>
              The official website of your brand. We don&apos;t want to guess. Let us know the definite URL you want to track in AI answers. You can add more URLs later.
            </Text>
            <RadixInput
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <Button
            type="submit"
            isLoading={loading}
            fullWidth
            variant="primary"
            size="lg"
            disabled={loading || !entityName}
          >
            Continue
          </Button>
        </form>
      </Card>
      </ShaderBackground>
    </div>
  );
}

export default function OnboardingEntityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
        <ShaderBackground scrollable>
          <Text color="gray">Loading...</Text>
        </ShaderBackground>
      </div>
    }>
      <OnboardingEntityContent />
    </Suspense>
  );
}
