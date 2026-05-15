import { prisma } from "@/lib/prisma";
import { cached, invalidateCache } from "@/lib/cache";

export type InternalTaskKey =
    | "ranking"
    | "brand_extraction"
    | "suggested_prompts"
    | "competitor_discovery"
    | "aeo_personalization";

export const INTERNAL_TASK_KEYS: InternalTaskKey[] = [
    "ranking",
    "brand_extraction",
    "suggested_prompts",
    "competitor_discovery",
    "aeo_personalization",
];

export const INTERNAL_TASK_LABELS: Record<InternalTaskKey, string> = {
    ranking: "Ranking analysis",
    brand_extraction: "Brand extraction",
    suggested_prompts: "Suggested prompts",
    competitor_discovery: "Competitor discovery",
    aeo_personalization: "AEO personalization",
};

export const INTERNAL_TASK_DESCRIPTIONS: Record<InternalTaskKey, string> = {
    ranking:
        "Used for prompts with intent 'Competitor Analysis' (Ranking reports). One LLM call per ranking prompt cycle.",
    brand_extraction:
        "Runs after every analysis batch — scans LLM responses for new brand mentions. One call per prompt cycle, model-independent of customer-facing models.",
    suggested_prompts:
        "Generates prompt suggestions for an entity. Triggered manually from the discovery modal and automatically via the refill worker when suggestions hit zero.",
    competitor_discovery:
        "Discovers competitors for an entity. Used in onboarding and admin regenerate.",
    aeo_personalization:
        "Writes personalized markdown descriptions for the AEO tactics chosen by the rule engine (Phase 3 selector). One LLM call per /analyze run; cached so repeat-picks don't re-LLM.",
};

export interface InternalTaskModelConfig {
    taskKey: InternalTaskKey;
    provider: string;
    modelId: string;
    displayName: string | null;
    maxOutputTokens: number;
    apiKey: string;
}

/**
 * Internal task models are platform-owned. They always use env API keys
 * (never customer BYOK keys), even when invoked in the context of a space.
 * BYOK customers do not pay for these calls — the platform absorbs them.
 */
function envKeyForProvider(provider: string): string | undefined {
    switch (provider.toLowerCase()) {
        case "openai":
            return process.env.OPENAI_API_KEY;
        case "anthropic":
            return process.env.ANTHROPIC_API_KEY;
        case "google":
            return process.env.GOOGLE_API_KEY;
        case "mistral":
            return process.env.MISTRAL_API_KEY;
        default:
            return undefined;
    }
}

const CACHE_TTL_SECONDS = 60 * 5;
const cacheKey = (taskKey: InternalTaskKey) => `internal-task-model:${taskKey}`;

export async function getInternalTaskModel(taskKey: InternalTaskKey): Promise<InternalTaskModelConfig> {
    const row = await cached(
        cacheKey(taskKey),
        CACHE_TTL_SECONDS,
        async () =>
            prisma.internalTaskModel.findUnique({
                where: { taskKey },
            }),
    );

    if (!row) {
        throw new Error(
            `Internal task model not configured for "${taskKey}". Run Prisma migrations or configure on the Master LLMs admin page.`,
        );
    }

    const apiKey = envKeyForProvider(row.provider);
    if (!apiKey) {
        throw new Error(
            `Env API key for provider "${row.provider}" is missing. Internal task "${taskKey}" cannot run.`,
        );
    }

    return {
        taskKey: row.taskKey as InternalTaskKey,
        provider: row.provider,
        modelId: row.modelId,
        displayName: row.displayName,
        maxOutputTokens: row.maxOutputTokens,
        apiKey,
    };
}

export async function invalidateInternalTaskModelCache(taskKey: InternalTaskKey) {
    await invalidateCache(cacheKey(taskKey));
}

/**
 * Adapter to the shape `createLLMProvider` expects.
 */
export function toCreateLLMProviderInput(cfg: InternalTaskModelConfig): { provider: string; modelId: string; name: string } {
    return {
        provider: cfg.provider,
        modelId: cfg.modelId,
        name: cfg.displayName ?? `${cfg.provider}/${cfg.modelId}`,
    };
}
