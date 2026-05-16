import { LLMProvider, LLMResponse } from "./types";

export class MistralProvider implements LLMProvider {
    private apiKey: string;
    private model: string;
    private maxOutputTokens: number;

    constructor(apiKey: string, model: string, maxOutputTokens: number = 1500) {
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
    }

    async generate(prompt: string): Promise<LLMResponse> {
        try {
            console.log(`[Mistral] Generating for model: ${this.model}`);

            const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    max_tokens: this.maxOutputTokens,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Mistral API error: ${response.statusText}`);
            }

            const data = await response.json();
            const text = data.choices[0]?.message?.content || "";

            return {
                text: text,
                usage: data.usage
            };
        } catch (error: unknown) {
            console.error(`[Mistral] Generation failed:`, error);
            const message = error instanceof Error ? error.message : "Mistral generation failed";
            throw new Error(message);
        }
    }
}
