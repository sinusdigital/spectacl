'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";
import RadixStepper from '@/components/Shared/RadixStepper';
import { Box, Flex, Text, Heading, Card, Progress, Button, Spinner } from "@radix-ui/themes";
import OnboardingResults from './OnboardingResults';
import ShaderBackground from '@/components/ui/ShaderBackground';
import RadixTextArea from '@/components/Shared/RadixTextArea';
import { ArrowRightIcon } from '@radix-ui/react-icons';

interface AnalysisResult {
    id: string;
    status: string;
    llmModel: string;
    mentioned: boolean;
    position: number | null;
    mentions: Array<{
        id: string;
        competitorId: string | null;
        position: number | null;
    }>;
}

interface PromptData {
    id: string;
    text: string;
    analysisResults: AnalysisResult[];
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

function OnboardingPromptsContent() {
  const searchParams = useSearchParams();
  const entityId = searchParams.get('entityId');

  const [view, setView] = useState<'form' | 'running' | 'results'>('form');
  const [loading, setLoading] = useState(true);
  const [promptText, setPromptText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entityName, setEntityName] = useState('');
  const [analysisPrompt, setAnalysisPrompt] = useState<PromptData | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
        if (!entityId) {
            setLoading(false);
            return;
        }
        try {
            // Fetch entity name and existing prompts with results in parallel
            const [entityRes, promptsRes] = await Promise.all([
                fetch(`/api/entities/${entityId}`),
                fetch(`/api/entities/${entityId}/prompts?limit=1`)
            ]);
            const entityData = await entityRes.json();
            const promptsData = await promptsRes.json();

            if (!isMounted) return;

            if (entityData.name) setEntityName(entityData.name);

            // If there's already a prompt with completed analysis, jump straight to results
            const existingPrompts: PromptData[] = Array.isArray(promptsData) ? promptsData : [];
            const completedPrompt = existingPrompts.find(p =>
                p.analysisResults?.length > 0 &&
                p.analysisResults.every(r => r.status !== 'pending')
            );

            if (completedPrompt) {
                setAnalysisPrompt(completedPrompt);
                setView('results');
            }
        } catch {
            // Non-fatal — fall through to form
        } finally {
            if (isMounted) setLoading(false);
        }
    }

    fetchData();

    return () => {
        isMounted = false;
        stopPolling();
    };
  }, [entityId]);

  const startPolling = (promptId: string) => {
    setView('running');

    pollTimeoutRef.current = setTimeout(() => {
        stopPolling();
        setView('results');
    }, POLL_TIMEOUT_MS);

    pollIntervalRef.current = setInterval(async () => {
        try {
            const res = await fetch(`/api/prompts/${promptId}?skipCount=true&limit=50`);
            if (!res.ok) return;
            const data: PromptData = await res.json();

            const results = data.analysisResults ?? [];
            const allSettled = results.length > 0 && results.every(r => r.status === 'success' || r.status === 'failed');

            if (results.length > 0 && allSettled) {
                stopPolling();
                setAnalysisPrompt(data);
                setView('results');
            } else {
                setPollCount(prev => prev + 1);
            }
        } catch {
            // Swallow network errors — keep polling
        }
    }, POLL_INTERVAL_MS);
  };

  const handleFinish = async () => {
    if (!promptText.trim() || !entityId) return;
    setSubmitting(true);

    try {
        const res = await fetch(`/api/entities/${entityId}/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: promptText,
                intent: 'Informational',
                status: 'Running',
                frequency: 'Every24Hours',
                triggerAnalysis: true,
            })
        });

        if (!res.ok) throw new Error(`Failed to create prompt: ${res.status}`);

        const prompt: { id?: string } = await res.json();
        if (prompt.id) {
            startPolling(prompt.id);
        } else {
            // No prompt ID — navigate to dashboard anyway
            window.location.href = `/${entityId}`;
        }
    } catch {
        setSubmitting(false);
    }
  };

  const steps = ['Entity', 'Competitors', 'Prompts'];

  if (loading) {
    return (
      <div className="h-screen relative w-full flex flex-col" style={{ background: 'var(--color-background)' }}>
        <ShaderBackground scrollable>
          <Flex align="center" justify="center" p="8">
            <Spinner size="3" />
          </Flex>
        </ShaderBackground>
      </div>
    );
  }

  return (
    <div className="h-screen relative w-full flex flex-col" style={{ background: 'var(--color-background)' }}>
      <ShaderBackground scrollable>
        <Box
          className={cn(
            "w-full relative z-20 transition-all duration-500",
            view === 'results' ? "max-w-6xl" : "max-w-3xl"
          )}
        >
          <Card size="4">
            <Box mb="6">
              <RadixStepper steps={steps} currentStep={3} />
            </Box>

            {view === 'form' && (
              <Flex direction="column" gap="6">
                <Box className="text-center">
                  <Heading size="7" mb="2">Create Your First Prompt</Heading>
                  <Text size="3" color="gray">What do you want to ask AI about your brand?</Text>
                </Box>

                <Flex direction="column" gap="3">
                  <RadixTextArea
                    label="Prompt"
                    placeholder={`e.g. What are the key features of ${entityName || 'your brand'}?`}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={5}
                  />
                  <Text size="2" color="gray" align="center">
                    Not sure what to ask? Don&apos;t sweat it. You can set up relevant prompts later.
                  </Text>
                </Flex>

                <Button
                  size="3"
                  variant="solid"
                  onClick={handleFinish}
                  disabled={!promptText.trim() || submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? <Spinner /> : null}
                  Finish Setup
                  <ArrowRightIcon />
                </Button>
              </Flex>
            )}

            {view === 'running' && (
              <Flex direction="column" gap="4" align="center" py="8">
                <Spinner size="3" />
                <Heading size="5">Analyzing AI Visibility...</Heading>
                <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
                  We&apos;re asking top AI models about your brand. This usually takes 15–30 seconds.
                </Text>
                <Box width="300px" mt="2">
                  <Progress
                    value={Math.min(pollCount * 10, 95)}
                    size="2"
                    color="lime"
                  />
                </Box>
              </Flex>
            )}

            {view === 'results' && (
              <OnboardingResults
                prompt={analysisPrompt}
                entityId={entityId!}
              />
            )}
          </Card>
        </Box>
      </ShaderBackground>
    </div>
  );
}

export default function OnboardingPromptsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen relative w-full flex flex-col" style={{ background: 'var(--color-background)' }}>
        <ShaderBackground scrollable>
          <Flex align="center" justify="center" p="8">
            <Spinner size="3" />
          </Flex>
        </ShaderBackground>
      </div>
    }>
      <OnboardingPromptsContent />
    </Suspense>
  );
}
