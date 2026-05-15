import { GoogleProvider } from "./google";
import { ModelConfig } from "@prisma/client";
import { OpenAIProvider } from "./openai";
import { LLMProvider } from "./types";
import { MistralProvider } from "./mistral";
import { AnthropicProvider } from "./anthropic";

export function createLLMProvider(
    config: ModelConfig | { provider: string; modelId: string; name: string },
    apiKey?: string,
    maxOutputTokens: number = 1500
): LLMProvider {
    const effectiveApiKey = apiKey || ('apiKey' in config ? config.apiKey : null);

    switch (config.provider.toLowerCase()) {
        case 'openai':
            if (!effectiveApiKey) {
                throw new Error(`API Key missing for ${config.name}`);
            }
            return new OpenAIProvider(effectiveApiKey, config.modelId, maxOutputTokens);

        case 'google':
            if (!effectiveApiKey) {
                throw new Error(`API Key missing for ${config.name}`);
            }
            return new GoogleProvider(effectiveApiKey, config.modelId, maxOutputTokens);

        case 'mistral':
            if (!effectiveApiKey) {
                throw new Error(`API Key missing for ${config.name}`);
            }
            return new MistralProvider(effectiveApiKey, config.modelId, maxOutputTokens);

        case 'anthropic':
            if (!effectiveApiKey) {
                throw new Error(`API Key missing for ${config.name}`);
            }
            return new AnthropicProvider(effectiveApiKey, config.modelId, maxOutputTokens);

        default:
            throw new Error(`Unsupported provider: ${config.provider}`);
    }
}
