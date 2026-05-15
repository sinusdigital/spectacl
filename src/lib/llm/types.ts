export interface LLMResponse {
    text: string;
    usage?: any;
}

export interface LLMProvider {
    generate(prompt: string): Promise<LLMResponse>;
}
