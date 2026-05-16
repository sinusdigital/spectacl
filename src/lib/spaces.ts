import { cookies } from 'next/headers';
import type { Space } from '@prisma/client';
import { prisma } from './prisma';
import { getSupportSpaceId } from './support-mode';

/**
 * Get the current space ID from cookies
 */
export async function getCurrentSpaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('current-space-id')?.value || null;
}

/**
 * Get the current space for a user.
 * - Regular users: uses the `current-space-id` cookie, verifies membership,
 *   falls back to their first space.
 * - App admins using support mode: if the support-space cookie is set AND the
 *   user has `role === "ADMIN"`, returns that space even without a membership.
 *   This is how admins can "enter" a customer space without being invited.
 */
export async function getCurrentSpace(userId: string) {
  const spaceId = await getCurrentSpaceId();

  if (spaceId) {
    const member = await prisma.spaceMember.findUnique({
      where: { userId_spaceId: { userId, spaceId } },
      include: { Space: true },
    });

    if (member) return member.Space;
  }

  // Support-mode override: app admin is entering a space they don't belong to.
  const supportSpaceId = await getSupportSpaceId();
  if (supportSpaceId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') {
      const space = await prisma.space.findUnique({ where: { id: supportSpaceId } });
      if (space) return space;
    }
  }

  const membership = await prisma.spaceMember.findFirst({
    where: { userId },
    include: { Space: true },
    orderBy: { joinedAt: 'asc' },
  });

  if (membership) return membership.Space;

  return null;
}

/**
 * Require a current space for the user, or throw an error
 */
export async function requireCurrentSpace(userId: string) {
  const space = await getCurrentSpace(userId);
  
  if (!space) {
    throw new Error('No space found. Please create or join a space.');
  }

  return space;
}

export interface ResolvedModelConfig {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  isEnabled: boolean;
  isArchived: boolean;
  hasApiKey: boolean;
  apiKey?: string | null;
  spaceId: string;
  order?: number;
}

/**
 * Get space model configurations with API key availability
 */
export async function getSpaceModelConfigs(
  spaceId: string,
  options: { includeDisabled?: boolean } = {}
): Promise<{ space: Space, llmProvider: string, configs: ResolvedModelConfig[] }> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
  });

  if (!space) {
    throw new Error('Space not found');
  }

  console.log(`[Spaces] getSpaceModelConfigs for space ${spaceId}: llmProvider=${space.llmProvider}, includeDisabled=${options.includeDisabled ?? false}`);

  // Case 1: MANAGED Space
  // System should NOT look into space models. It should look at Master Keys and use those.
  if (space.llmProvider === 'MANAGED') {
    // 1. Fetch Master Keys strictly from ENV (No DB fallback)
    const providerApiKeys: Record<string, string | undefined> = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        mistral: process.env.MISTRAL_API_KEY,
    };

    const keyStatus = Object.entries(providerApiKeys).map(([p, v]) => `${p}=${v ? 'SET' : 'MISSING'}`).join(', ');
    console.log(`[Spaces] MANAGED master keys: ${keyStatus}`);

    // 2. Synthesize configs from GlobalModel + Master Keys.
    // When includeDisabled is true (Stage 2 worker), include ALL models so the worker
    // can always resolve a config by name — even if the master key was removed after Stage 1.
    const globalModels = await prisma.globalModel.findMany({
        where: options.includeDisabled ? undefined : { isArchived: false },
        orderBy: { order: 'asc' }
    });

    const configs: ResolvedModelConfig[] = globalModels
        .filter(globalModel => options.includeDisabled || !!providerApiKeys[globalModel.provider.toLowerCase()])
        .map(globalModel => {
            const apiKey = providerApiKeys[globalModel.provider.toLowerCase()];
            const hasKey = !!apiKey;
            return {
                id: globalModel.id,
                modelId: globalModel.modelId,
                name: globalModel.displayName,
                provider: globalModel.provider,
                isEnabled: hasKey && globalModel.isEnabled, // Must have API key AND be enabled in the global registry
                hasApiKey: hasKey,
                apiKey: apiKey,
                isArchived: globalModel.isArchived,
                spaceId: space.id,
                order: globalModel.order
            };
        });

    console.log(`[Spaces] MANAGED synthesized ${configs.length} configs: ${configs.map(c => `${c.name}(enabled=${c.isEnabled})`).join(', ')}`);

    return {
        space,
        llmProvider: 'MANAGED',
        configs
    };
  }

  // Case 2: BYOK (Bring Your Own Keys) Space
  // System should use and show the keys and models that are configured on space level.
  {
      const modelConfigs = await prisma.spaceModelConfig.findMany({
        where: { 
          spaceId: spaceId,
          isArchived: false 
        },
        orderBy: { order: 'asc' },
      });

      console.log(`[Spaces] BYOK space ${spaceId} has ${modelConfigs.length} SpaceModelConfig rows`);

      const providerApiKeys: Record<string, string | null | undefined> = {
        openai: space.openaiApiKey,
        anthropic: space.anthropicApiKey,
        google: space.googleApiKey,
        mistral: space.mistralApiKey,
      };

      const configs: ResolvedModelConfig[] = modelConfigs.map((config) => ({
          id: config.id,
          modelId: config.modelId,
          name: config.name,
          provider: config.provider,
          isEnabled: config.isEnabled,
          isArchived: config.isArchived,
          spaceId: config.spaceId,
          order: config.order,
          hasApiKey: !!providerApiKeys[config.provider.toLowerCase()],
          apiKey: providerApiKeys[config.provider.toLowerCase()],
      }));

      return {
        space,
        llmProvider: 'BYOK',
        configs
      };
  }
}
