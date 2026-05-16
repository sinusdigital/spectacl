"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Text, Flex, Grid, Spinner, Card, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from '@radix-ui/react-icons';
import Button from '@/components/Shared/Button';
import ShaderBackground from '@/components/ui/ShaderBackground';
import RadixStepper from '@/components/Shared/RadixStepper';
import SelectCard from '@/components/Shared/SelectCard';
import CompanyLogo from '@/components/CompanyLogo';

interface Competitor {
  name: string;
  website: string;
}

function CompetitorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spaceId = searchParams.get('spaceId');
  const entityId = searchParams.get('entityId');

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCompetitors() {
      if (!entityId) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch('/api/onboarding/suggest-competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to discover competitors');
        }

        const data = await response.json();
        setCompetitors(data.competitors);
        // Select all by default
        setSelectedNames(new Set(data.competitors.map((c: Competitor) => c.name)));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to discover competitors');
      } finally {
        setLoading(false);
      }
    }

    fetchCompetitors();
  }, [entityId]);

  const toggleCompetitor = (name: string) => {
    const next = new Set(selectedNames);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedNames(next);
  };

  const handleContinue = async () => {
    if (!entityId || !spaceId) return;

    setSubmitting(true);
    setError('');

    try {
      const selected = competitors.filter(c => selectedNames.has(c.name));
      
      const response = await fetch(`/api/entities/${entityId}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           competitors: selected.map(c => ({
             name: c.name,
             website: c.website
           }))
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save competitors');
      }

      router.push(`/onboarding/prompts?spaceId=${spaceId}&entityId=${entityId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save competitors');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <Card size="4" variant="surface" className="w-full max-w-2xl relative z-20 mx-4 shadow-2xl">
          <div className="mb-8">
            <RadixStepper
              steps={['Entity', 'Competitors', 'Prompts']}
              currentStep={2}
            />
          </div>

          <div className="text-center mb-8">
            <Text size="8" weight="bold" style={{ display: 'block' }}>
              Competitors
            </Text>
            <Text as="p" size="3" color="gray" mt="2" style={{ display: 'block' }}>
              What competitors do you want to track? Deselect any you don&apos;t want to add.
            </Text>
          </div>

          {loading ? (
            <Flex direction="column" align="center" justify="center" py="8" gap="4">
              <Spinner size="3" />
              <Text size="2" color="gray" className="animate-pulse">Analyzing the market landscape...</Text>
            </Flex>
          ) : error ? (
            <Callout.Root color="red" size="1" mb="6">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          ) : (
            <div className="space-y-6">
              <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                {competitors.map((comp) => (
                  <SelectCard
                    key={comp.name}
                    title={comp.name}
                    subtitle={comp.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    icon={
                      <CompanyLogo
                        name={comp.name}
                        domain={comp.website}
                        size={40}
                      />
                    }
                    selected={selectedNames.has(comp.name)}
                    onClick={() => toggleCompetitor(comp.name)}
                  />
                ))}
              </Grid>

              <Flex direction="column" gap="4" mt="6">
                <Text size="2" color="gray" align="center">
                  Wrong set of competitors? You can edit this later.
                </Text>

                <Button
                  onClick={handleContinue}
                  isLoading={submitting}
                  fullWidth
                  variant="primary"
                  size="lg"
                  disabled={submitting || selectedNames.size === 0}
                >
                  Continue
                </Button>
              </Flex>
            </div>
          )}
        </Card>
      </ShaderBackground>
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompetitorsContent />
    </Suspense>
  );
}
