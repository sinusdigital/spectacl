import { LLMProvider, LLMResponse } from "./types";

export class GoogleProvider implements LLMProvider {
    private apiKey: string;
    private model: string;
    private maxOutputTokens: number;

    constructor(apiKey: string, model: string = "gemini-3.0-flash", maxOutputTokens: number = 1500) {
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
    }

    async generate(prompt: string): Promise<LLMResponse> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: this.maxOutputTokens
                }
            })
        });

        if (!response.ok) {
            let error = await response.text();
            if (response.status === 404) {
                try {
                    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
                    const modelsData = await modelsRes.json();
                    if (modelsData.models) {
                        const validModels = modelsData.models
                            .filter((m: { supportedGenerationMethods?: string[], name: string }) => m.supportedGenerationMethods?.includes('generateContent'))
                            .map((m: { name: string }) => m.name.replace('models/', ''))
                            .join(', ');
                        error += `\n\n[Spectacl Diagnostic] Available models for this API Key: ${validModels || 'None found'}`;
                    }
                } catch (e) {
                    console.error('Failed to fetch available models for diagnostic', e);
                }
            }
            throw new Error(`Google API Error: ${response.status} ${error}`);
        }

        const data = await response.json();

        // Safety: Extract text. Google API can return blocked content with no text.
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content) {
            if (candidate?.finishReason === "SAFETY") {
                throw new Error("Generation blocked due to safety settings.");
            }
            throw new Error("No content generated.");
        }

        const text = candidate.content.parts?.[0]?.text || "";

        return {
            text: text,
            usage: data.usageMetadata
        };
    }
}
