'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Flex, Grid, Text, Heading, Callout, Spinner } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { ModelConfig } from '@/types/models';
import ModelCard from '@/components/Models/ModelCard';
import SectionHeader from '@/components/Shared/SectionHeader';
import MasterKeyModal from './MasterKeyModal';
import { DEFAULT_MODELS } from '@/types/models';

export interface MasterKey {
    provider: string;
    displayName: string;
    key: string;
    masked: string;
    isSet: boolean;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    mistral: 'Mistral AI'
};

export default function MasterLLMManager() {
    const [keys, setKeys] = useState<MasterKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingKey, setEditingKey] = useState<MasterKey | null>(null);

    // Derive unique providers from supported models
    const distinctProviders = useMemo(() => {
        const providers = new Set(DEFAULT_MODELS.map(m => m.provider));
        return Array.from(providers);
    }, []);

    const fetchMasterKeys = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/master-llm-keys');

            if (!response.ok) {
                throw new Error('Failed to fetch master keys');
            }

            const data = await response.json();

            // Map distinct providers to MasterKey objects
            const mergedKeys: MasterKey[] = distinctProviders.map(provider => {
                const config = data[provider];
                return {
                    provider,
                    displayName: PROVIDER_DISPLAY_NAMES[provider] || provider.charAt(0).toUpperCase() + provider.slice(1),
                    key: '',
                    masked: config?.masked || '',
                    isSet: config?.isSet || false
                };
            });

            setKeys(mergedKeys);
        } catch (err) {
            console.error('Error fetching master keys:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMasterKeys();
    }, [distinctProviders]);

    const handleSaveKey = async (provider: string, newKey: string) => {
        if (!newKey) return; 

        try {
            const response = await fetch('/api/admin/master-llm-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [provider]: newKey }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save master key');
            }

            await fetchMasterKeys();
        } catch (err) {
            console.error('Error saving master key:', err);
            throw err;
        }
    };

    if (loading) {
        return (
            <Flex align="center" justify="center" p="9">
                <Flex direction="column" align="center" gap="3">
                    <Spinner size="3" />
                    <Text size="2" color="gray">Loading master LLM configuration...</Text>
                </Flex>
            </Flex>
        );
    }

    // Convert MasterKey to ModelConfig shape for the card
    const getKeyAsModelConfig = (k: MasterKey): ModelConfig => ({
        id: k.provider, 
        name: k.displayName,
        provider: k.provider,
        isEnabled: true, 
        isArchived: false,
        hasApiKey: k.isSet,
        apiKeyMasked: k.masked
    });

    const activeKeys = keys.filter(k => k.isSet);
    const availableKeys = keys.filter(k => !k.isSet);

    return (
        <Flex direction="column" gap="9">
            {/* Info Banner */}
            <Callout.Root color="blue">
                <Callout.Icon>
                    <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                    <Text weight="bold" mb="1">Global Configuration</Text>
                    These API keys are used by spaces with the <strong>MANAGED</strong> provider type.
                    Spaces with <strong>BYOK</strong> (Bring Your Own Keys) will use their own API keys instead.
                </Callout.Text>
            </Callout.Root>

            {/* Active Providers */}
            <Box>
                <SectionHeader
                    title="Active Providers"
                    count={activeKeys.length}
                    description="These providers are configured and available for Managed spaces."
                />

                {activeKeys.length === 0 ? (
                    <Box 
                        p="9" 
                        style={{ 
                            textAlign: 'center', 
                            backgroundColor: 'var(--gray-2)', 
                            borderRadius: 'var(--radius-3)', 
                            border: '1px dashed var(--gray-6)' 
                        }}
                    >
                        <Text size="2" color="gray" mb="2" as="p">No master keys configured</Text>
                        <Text size="1" color="gray">Add an API key below to enable a provider.</Text>
                    </Box>
                ) : (
                    <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="6">
                        {activeKeys.map((k) => (
                            <Box key={k.provider}>
                                <ModelCard
                                    model={getKeyAsModelConfig(k)}
                                    onClick={() => setEditingKey(k)}
                                    onArchive={() => { }} // Not applicable
                                />
                            </Box>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Available Providers */}
            {availableKeys.length > 0 && (
                <Box>
                     <SectionHeader
                        title="Available Providers"
                        count={availableKeys.length}
                        description="Configure these providers by adding your master API keys."
                    />
                    <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="6">
                        {availableKeys.map((k) => (
                            <Box key={k.provider}>
                                <ModelCard
                                    model={getKeyAsModelConfig(k)}
                                    onClick={() => setEditingKey(k)}
                                    onArchive={() => { }} // Not applicable
                                />
                            </Box>
                        ))}
                    </Grid>
                </Box>
            )}

            {editingKey && (
                <MasterKeyModal
                    masterKey={editingKey}
                    onClose={() => setEditingKey(null)}
                    onSave={handleSaveKey}
                />
            )}
        </Flex>
    );
}
