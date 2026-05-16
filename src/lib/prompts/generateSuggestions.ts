/**
 * Generate suggested prompts for an entity via LLM.
 *
 * Used by both manual discovery (from the modal) and auto-refill (worker).
 * Differences:
 *   - `targetCount`: when set, appended to the system prompt as a count hint
 *     and enforced client-side by slicing the parsed output.
 *   - `avoidTexts`: when non-empty, appended to reduce near-duplicates with
 *     prompts the user already has (tracked or suggested).
 *
 * Caller owns:
 *   - persisting results to the `SuggestedPrompt` table
 *   - resolving the LLM provider config (per-space)
 *   - credit / lock gating
 */

import { createLLMProvider } from "@/lib/llm/factory";
import { withLLMRetry } from "@/lib/llm/retry";
import { getProviderLimiter } from "@/lib/queue/rateLimiter";

interface SuggestionsModelConfig {
    provider: string;
    modelId: string;
    displayName?: string | null;
    apiKey: string;
    maxOutputTokens?: number;
}

export interface GenerateSuggestionsInputs {
    entityName: string;
    entityDescription: string;
    entityDomain?: string;
    personas: string;
    language?: string;
    targetCount?: number;
    avoidTexts?: string[];
}

export interface GeneratedSuggestion {
    text: string;
    intent: string;
}

function buildSystemPrompt(inputs: GenerateSuggestionsInputs): string {
    const {
        entityName,
        entityDescription,
        entityDomain,
        personas,
        language,
        targetCount,
        avoidTexts,
    } = inputs;

    const countHint = targetCount
        ? `\n\nIMPORTANT: Return exactly ${targetCount} prompts total across all personas. Prioritize the highest-signal ideas.`
        : "";

    const avoidHint = avoidTexts && avoidTexts.length > 0
        ? `\n\nAvoid phrasings similar to these existing prompts (do not duplicate or paraphrase them):\n${avoidTexts.slice(0, 10).map(t => `- ${t}`).join("\n")}`
        : "";

    const languageHint = language
        ? `\n\nPreferred language / market context: ${language}.`
        : "";

    return `
You are an entity discovery and intent-mapping system.

Analyze the following entity:
- Entity name: ${entityName}
- Entity description (if known): ${entityDescription}
- Industry / domain (optional): ${entityDomain || "Unspecified"}

User personas to consider:
${personas}

Goal:
For each provided persona, identify what users would search or ask an LLM when they do NOT yet know this entity, but have a problem, need, or intent that the entity can satisfy.

Instructions:
1. Use ONLY the personas provided above. Do not invent new personas.
2. For each persona, infer realistic needs, problems, and goals related to the entity.
3. Generate natural-language prompts/questions users would realistically ask an LLM or search engine.
4. Do NOT assume brand awareness.
5. Prompts must be phrased as direct user inputs.
6. Each prompt must include:
   - a single intent classification
   - zero, one, or more semantic tags
7. Do not include explanations or prose outside the JSON.
8. Output MUST be valid JSON and follow the schema exactly.${countHint}${avoidHint}${languageHint}

Intent classification (choose exactly one per prompt):
- Informational
- Navigational
- Commercial
- Transactional

Tags:
- Short, lowercase, snake_case strings
- Examples: "external_fixation", "supplier_discovery", "eu_manufacturer"
- Use an empty array if no tags apply

Output JSON schema:

{
  "entity": {
    "name": string,
    "domain": string | null
  },
  "personas": [
    {
      "persona_name": string,
      "prompts": [
        {
          "prompt": string,
          "intent": "informational" | "navigational" | "commercial" | "transactional",
          "tags": [string]
        }
      ]
    }
  ]
}

Quality rules:
- Prompts must be specific, realistic, and non-branded
- Avoid duplicates or near-duplicates within and across personas
- Prefer high-signal prompts over generic ones
- Do not invent capabilities the entity does not plausibly have

Return only the JSON.
    `.trim();
}

/**
 * Forgiving JSON extraction from an LLM response.
 *
 * Tries in order: raw parse → fence-stripped parse → first-`{` to last-`}`
 * substring parse. Handles the common failure modes where the model wraps
 * the JSON in ``` fences (with or without the `json` tag) or pads it with
 * leading/trailing prose. Returns undefined if nothing parseable is found.
 */
function tryParseJson(text: string): unknown {
    const attempts: string[] = [];
    attempts.push(text.trim());

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced?.[1]) attempts.push(fenced[1].trim());

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        attempts.push(text.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of attempts) {
        try {
            return JSON.parse(candidate);
        } catch {
            /* try next */
        }
    }
    return undefined;
}

/**
 * Normalize LLM-returned intent strings to the Title Case UI values.
 */
function normalizeIntent(intent: string): string {
    const lower = intent.toLowerCase();
    if (lower === "competitor analysis") return "Competitor Analysis";
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Call the LLM, parse the response, and return a flat list of prompts.
 * Does NOT persist to the database. Caller is responsible for writing rows.
 *
 * Throws on LLM errors after retries, on malformed JSON, or on an empty result.
 */
export async function generateSuggestions(
    modelConfig: SuggestionsModelConfig,
    inputs: GenerateSuggestionsInputs,
): Promise<GeneratedSuggestion[]> {
    const systemPrompt = buildSystemPrompt(inputs);
    const llm = createLLMProvider(
        { provider: modelConfig.provider, modelId: modelConfig.modelId, name: modelConfig.displayName ?? modelConfig.modelId },
        modelConfig.apiKey,
        modelConfig.maxOutputTokens,
    );
    const limiter = getProviderLimiter(modelConfig.provider);

    const response = await limiter.schedule(() =>
        withLLMRetry(() => llm.generate(systemPrompt), `generateSuggestions(${inputs.entityName})`)
    );

    const parsed = tryParseJson(response.text);
    if (parsed === undefined) {
        const preview = response.text.slice(0, 400).replace(/\s+/g, " ");
        console.error(
            `[generateSuggestions] Invalid JSON from ${modelConfig.provider}/${modelConfig.modelId} for ${inputs.entityName}. Response preview: ${preview}`,
        );
        throw new Error(`generateSuggestions: LLM returned invalid JSON for ${inputs.entityName}`);
    }

    const results: GeneratedSuggestion[] = [];
    const personas = (parsed as { personas?: unknown })?.personas;
    if (Array.isArray(personas)) {
        for (const persona of personas) {
            const prompts = (persona as { prompts?: unknown })?.prompts;
            if (!Array.isArray(prompts)) continue;
            for (const p of prompts) {
                const text = (p as { prompt?: unknown })?.prompt;
                const intent = (p as { intent?: unknown })?.intent;
                if (typeof text !== "string" || !text.trim()) continue;
                results.push({
                    text: text.trim(),
                    intent: typeof intent === "string" ? normalizeIntent(intent) : "Informational",
                });
            }
        }
    }

    if (inputs.targetCount && inputs.targetCount > 0) {
        return results.slice(0, inputs.targetCount);
    }
    return results;
}
