'use client';

import { useState, useEffect } from 'react';
import { Dialog, Button, Flex, TextField, Text, Select, Switch } from '@radix-ui/themes';
import { GlobalModel } from '@prisma/client';

interface GlobalModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<GlobalModel>) => Promise<void>;
  initialData?: Partial<GlobalModel>;
  mode: 'create' | 'edit';
  envStatus: Record<string, boolean>;
}

export function GlobalModelDialog({ open, onOpenChange, onSubmit, initialData, mode, envStatus }: GlobalModelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<GlobalModel>>({
    provider: 'openai',
    modelId: '',
    displayName: '',
    contextWindow: null,
    maxOutputTokens: 1500,
    isEnabled: true,
    isArchived: false,
    order: 0,
    ...initialData,
  });



  const [fetchedModels, setFetchedModels] = useState<{ id: string, displayName: string, contextWindow?: number | null }[] | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  useEffect(() => {
    setFetchedModels(null);
    setFormData({
      provider: 'openai',
      modelId: '',
      displayName: '',
      contextWindow: null,
      maxOutputTokens: 1500,
      isEnabled: true,
      isArchived: false,
      order: 0,
      ...initialData,
    });
  }, [open, initialData]);

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const res = await fetch(`/api/admin/provider-models?provider=${formData.provider}`);
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      setFetchedModels(data.models);
    } catch (e: unknown) {
      console.error('Error fetching models:', e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.contextWindow) {
          // ensure it's a number
          formData.contextWindow = parseInt(formData.contextWindow.toString(), 10);
      }
      if (formData.order !== undefined && formData.order !== null) {
          formData.order = parseInt(formData.order.toString(), 10);
      }
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>{mode === 'create' ? 'Add Global Model' : 'Edit Global Model'}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Configure an LLM model available for tracking across workspaces.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold">Provider</Text>
              <Select.Root
                value={formData.provider}
                onValueChange={(val) => setFormData({ ...formData, provider: val })}
              >
                <Select.Trigger placeholder="Select provider" />
                <Select.Content>
                  <Select.Item value="openai">OpenAI</Select.Item>
                  <Select.Item value="anthropic">Anthropic</Select.Item>
                  <Select.Item value="google">Google</Select.Item>
                  <Select.Item value="mistral">Mistral</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Flex align="center" justify="between">
                <Text as="label" size="2" weight="bold">API Model ID</Text>
                {formData.provider && envStatus[formData.provider] && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="1" 
                    disabled={isFetchingModels}
                    onClick={handleFetchModels}
                  >
                    {isFetchingModels ? 'Fetching...' : 'Fetch Available Models'}
                  </Button>
                )}
              </Flex>

              {fetchedModels ? (
                <Flex direction="column" gap="2">
                  <Select.Root
                    value={formData.modelId || ''}
                    onValueChange={(val) => {
                      const selected = fetchedModels.find(m => m.id === val);
                      setFormData((prev: Partial<GlobalModel>) => ({
                        ...prev,
                        modelId: val,
                        displayName: prev.displayName || selected?.displayName || val,
                        contextWindow: selected?.contextWindow || prev.contextWindow || undefined
                      }));
                    }}
                  >
                    <Select.Trigger placeholder="Select a model..." />
                    <Select.Content>
                      {fetchedModels.map(m => (
                        <Select.Item key={m.id} value={m.id}>{m.displayName || m.id}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Text size="1" color="gray">
                    Model not listed?{' '}
                    <a 
                      href="#" 
                      style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }} 
                      onClick={(e) => { e.preventDefault(); setFetchedModels(null); }}
                    >
                      Enter manually
                    </a>
                  </Text>
                </Flex>
              ) : (
                <TextField.Root 
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet-20240620" 
                  value={formData.modelId || ''}
                  onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  required
                />
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold">Display Name</Text>
              <TextField.Root 
                placeholder="e.g. GPT-4o, Claude 3.5 Sonnet" 
                value={formData.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                required
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold">Context Window (Optional)</Text>
              <TextField.Root
                type="number"
                placeholder="e.g. 128000"
                value={formData.contextWindow || ''}
                onChange={(e) => setFormData({ ...formData, contextWindow: e.target.value ? parseInt(e.target.value) : null })}
              />
              <Text size="1" color="gray">
                Informational only — the model&apos;s total token capacity for input + output combined.
                Spectacl prompts are short, so this limit is never reached in practice.
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold">Max Output Tokens</Text>
              <TextField.Root
                type="number"
                placeholder="e.g. 1500"
                value={formData.maxOutputTokens ?? 1500}
                onChange={(e) => setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value) || 1500 })}
              />
              <Text size="1" color="gray">
                Caps the LLM response length to control cost and prevent misuse.
                <strong> 1500</strong> tokens (~1,100 words) is recommended for brand visibility queries —
                enough for detailed AI search answers, too short for code generation abuse.
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold">Sort Order</Text>
              <TextField.Root 
                type="number"
                value={formData.order || 0}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              />
            </Flex>

            <Flex align="center" justify="between" mt="2">
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">Enabled</Text>
                <Text size="1" color="gray">Allow spaces to select this model.</Text>
              </Flex>
              <Switch 
                checked={formData.isEnabled} 
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
            </Flex>

          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
