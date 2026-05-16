export interface LLMUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    // Providers stuff additional vendor-specific fields here (rate limits, cost hints, etc.)
    [key: string]: unknown;
}

export interface LLMResponse {
    text: string;
    usage?: LLMUsage;
}

export interface LLMProvider {
    generate(prompt: string): Promise<LLMResponse>;
}
