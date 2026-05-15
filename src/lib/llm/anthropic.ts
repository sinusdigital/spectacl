import { LLMProvider, LLMResponse } from "./types";

export class AnthropicProvider implements LLMProvider {
    private apiKey: string;
    private model: string;
    private maxOutputTokens: number;

    constructor(apiKey: string, model: string = "claude-3-5-sonnet-20240620", maxOutputTokens: number = 1500) {
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
    }

    async generate(prompt: string): Promise<LLMResponse> {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: this.maxOutputTokens,
                messages: [{ role: "user", content: prompt }],
                temperature: 0
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API Error: ${response.status} ${error}`);
        }

        const data = await response.json();

        // Anthropic returns an array of content blocks
        const text = (data.content as Array<{ type: string; text?: string }>)
            .filter((block) => block.type === "text")
            .map((block) => block.text || "")
            .join("\n");

        return {
            text: text,
            usage: {
                prompt_tokens: data.usage?.input_tokens,
                completion_tokens: data.usage?.output_tokens,
                total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
            }
        };
    }
}
