'use client';

import { useState, useEffect } from 'react';
import { Card, Flex, Box, Text, Heading, Callout, Button } from '@radix-ui/themes';
import { ModelConfig } from '@/types/models';
import ModelCard from '@/components/Models/ModelCard';
import EditModelModal from '@/components/Models/EditModelModal';

export default function ModelsSettings() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [llmProvider, setLlmProvider] = useState<'MANAGED' | 'BYOK'>('MANAGED');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);

  const fetchModels = async () => {
    try {
      const currentRes = await fetch('/api/spaces/current');
      const currentSpace = await currentRes.json();

      const res = await fetch(`/api/spaces/${currentSpace.id}/models?includeArchived=true`);
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      
      setModels(data.models || []);
      setLlmProvider(data.llmProvider || 'MANAGED');
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Could not load AI models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleUpdateModel = async (updates: Partial<ModelConfig> & { apiKey?: string }) => {
    if (!editingModel) return;
    
    try {
      const res = await fetch(`/api/spaces/current/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: editingModel.id,
          ...updates
        })
      });

      if (!res.ok) throw new Error('Failed to update model');
      await fetchModels();
    } catch (err) {
      console.error('Error updating model:', err);
      throw err;
    }
  };

  const handleArchiveModel = async (model: ModelConfig) => {
    try {
      const res = await fetch(`/api/spaces/current/models/${model.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to archive model');
      await fetchModels();
    } catch (err) {
      console.error('Error archiving model:', err);
    }
  };

  const handleUnarchiveModel = async (model: ModelConfig) => {
    try {
      const res = await fetch(`/api/spaces/current/models/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false, isEnabled: true })
      });
      if (!res.ok) throw new Error('Failed to activate model');
      await fetchModels();
    } catch (err) {
      console.error('Error activating model:', err);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" p="9">
        <Text color="gray">Loading models...</Text>
      </Flex>
    );
  }

  const activeModels = models.filter((m) => !m.isArchived);
  const archivedModels = models.filter((m) => m.isArchived);

  return (
    <Flex direction="column" gap="6">
      <Card size="3">
        <Flex direction="column" gap="4">
          <Box>
            <Heading size="4" mb="1">AI Models & API Keys</Heading>
            <Text size="2" color="gray">
              Manage the AI models available in this space. Configure your own API keys or use Spectacl managed models.
            </Text>
          </Box>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="4">
            <Box>
              <Heading size="3" mb="3">Active Models</Heading>
              {activeModels.length === 0 ? (
                <Text size="2" color="gray" italic>No active models configured.</Text>
              ) : (
                <Flex direction="column" gap="3">
                  {activeModels.map((model) => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setEditingModel(model)}
                      onArchive={handleArchiveModel}
                    />
                  ))}
                </Flex>
              )}
            </Box>

            {archivedModels.length > 0 && (
              <Box mt="4">
                <Heading size="3" mb="3" color="gray">Archived Models</Heading>
                <Flex direction="column" gap="3">
                  {archivedModels.map((model) => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setEditingModel(model)}
                      onArchive={handleArchiveModel}
                      onUnarchive={() => handleUnarchiveModel(model)}
                    />
                  ))}
                </Flex>
              </Box>
            )}
          </Flex>
        </Flex>
      </Card>
      
      <Card size="2" variant="surface">
        <Flex direction="column" gap="2" align="start">
          <Heading size="3">About Model Configuration</Heading>
          <Text size="2" color="gray">
            Models configured here are shared across all entities in this space. You can choose to use your own API keys for lower costs or use Spectacl&apos;s managed infrastructure.
          </Text>
          <Flex gap="4" mt="1">
            <Button variant="ghost" asChild size="1">
              <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">OpenAI Dashboard →</a>
            </Button>
            <Button variant="ghost" asChild size="1">
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">Anthropic Dashboard →</a>
            </Button>
          </Flex>
        </Flex>
      </Card>

      {editingModel && (
        <EditModelModal 
          model={editingModel}
          isManaged={llmProvider === 'MANAGED'}
          onClose={() => setEditingModel(null)}
          onSave={handleUpdateModel}
        />
      )}
    </Flex>
  );
}
