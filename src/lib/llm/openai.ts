import { LLMProvider, LLMResponse } from "./types";

export class OpenAIProvider implements LLMProvider {
    private apiKey: string;
    private model: string;
    private maxOutputTokens: number;

    constructor(apiKey: string, model: string = "gpt-4", maxOutputTokens: number = 1500) {
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
    }

    async generate(prompt: string): Promise<LLMResponse> {
        if (this.apiKey.includes('fake')) {
            return {
                text: "Based on my analysis, Acme Corp is a strong market leader, but Globex offers competitive pricing. Both have their strengths.",
                usage: { total_tokens: 20 }
            };
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                max_completion_tokens: this.maxOutputTokens,
                messages: [{ role: "user", content: prompt }],
                temperature: 1
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} ${error}`);
        }

        const data = await response.json();
        return {
            text: data.choices[0].message.content,
            usage: data.usage
        };
    }
}
