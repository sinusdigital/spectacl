export interface ModelConfig {
    id: string;
    modelId?: string;
    name: string;
    provider: string;
    isEnabled: boolean;
    isArchived: boolean;
    hasApiKey: boolean;
    apiKeyMasked?: string | null;
    configId?: string;
}

export const DEFAULT_MODELS: ModelConfig[] = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', isEnabled: false, isArchived: false, hasApiKey: false },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', isEnabled: false, isArchived: false, hasApiKey: false },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', isEnabled: false, isArchived: false, hasApiKey: false },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', isEnabled: false, isArchived: false, hasApiKey: false },
    { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', provider: 'google', isEnabled: false, isArchived: false, hasApiKey: false },
    { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', isEnabled: false, isArchived: false, hasApiKey: false },
];
