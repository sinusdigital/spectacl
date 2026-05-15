'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RadixStepper from '@/components/Shared/RadixStepper';
import Button from '@/components/Shared/Button';
import RadixInput from '@/components/Shared/RadixInput';
import { Box, Text, Card } from '@radix-ui/themes';
import ShaderBackground from '@/components/ui/ShaderBackground';
import { ModelConfig } from '@/types/models';

function OnboardingModelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spaceId = searchParams.get('spaceId');
  const entityId = searchParams.get('entityId');
  
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/spaces/current/models')
        .then(res => res.json())
        .then(data => {
            setModels(data.models || []);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
  }, []);

  const uniqueProviders = Array.from(new Set(models.map(m => m.provider)));

  const handleContinue = async () => {
    setSaving(true);
    
    // Save keys for each provider
    for (const [provider, key] of Object.entries(keys)) {
        if (!key) continue;
        
        // Find a model for this provider to attach the key update to
        // (The backend updates the space-level key based on the provider of the model)
        const model = models.find(m => m.provider === provider);
        if (model) {
            try {
                await fetch('/api/spaces/current/models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        modelId: model.id,
                        provider: model.provider,
                        name: model.name,
                        apiKey: key,
                        isEnabled: true // Auto-enable if key is provided
                    })
                });
            } catch (e) {
                console.error(`Failed to save key for ${provider}`, e);
            }
        }
    }

    router.push(`/onboarding/prompts?spaceId=${spaceId}&entityId=${entityId}`);
  };

  const getProviderLabel = (p: string) => {
      switch(p) {
          case 'openai': return 'OpenAI';
          case 'anthropic': return 'Anthropic';
          case 'google': return 'Google Gemini';
          case 'mistral': return 'Mistral AI';
          default: return p;
      }
  };

  if (loading) {
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
        <div className="mb-6">
          <RadixStepper
            steps={['Space', 'Entity', 'Models', 'Prompts']}
            currentStep={3}
          />
        </div>

        <div className="text-center mb-8">
          <Text size="8" weight="bold" style={{ display: 'block' }}>Configure API Keys</Text>
          <Text as="p" size="3" color="gray" mt="2" style={{ display: 'block' }}>
            Enter your API keys for the providers you want to use. You can skip this and add them later.
          </Text>
        </div>

        <div className="space-y-6">
            <div className="grid gap-4">
                {uniqueProviders.map(provider => (
                    <Box key={provider} p="4" style={{ border: '1px solid var(--gray-a5)', borderRadius: 'var(--radius-2)', background: 'var(--color-surface)' }}>
                        <Text as="label" size="2" weight="bold" mb="2" align="left" style={{ display: 'block' }}>
                            {getProviderLabel(provider)}
                        </Text>
                        <RadixInput
                            type="password"
                            placeholder={`Enter ${getProviderLabel(provider)} API Key`}
                            value={keys[provider] || ''}
                            onChange={e => setKeys({...keys, [provider]: e.target.value})}
                        />
                        <Text size="1" color="gray" mt="2" style={{ display: 'block' }}>
                            Applied to all {getProviderLabel(provider)} models.
                        </Text>
                    </Box>
                ))}
            </div>

            <Button
                onClick={handleContinue}
                fullWidth
                variant="primary"
                size="lg"
                isLoading={saving}
            >
                Continue
            </Button>

            <Text size="2" color="gray" align="center" style={{ display: 'block' }}>
                Depending on the keys you provide, available models will be enabled automatically.
            </Text>
        </div>
      </Card>
      </ShaderBackground>
    </div>
  );
}

export default function OnboardingModelsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative w-full h-full flex flex-col bg-[var(--color-background)]">
        <ShaderBackground scrollable>
          <Text color="gray">Loading...</Text>
        </ShaderBackground>
      </div>
    }>
      <OnboardingModelsContent />
    </Suspense>
  );
}
