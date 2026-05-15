import { SpacePlan } from '@prisma/client';
import { isSelfHosted } from '@/lib/mode';

/** Number of days assumed per billing month for credit calculations. */
export const DAYS_PER_MONTH = 31;

/** Default trial duration in days. Overridable via systemSetting `trial_days`. */
export const TRIAL_DAYS_DEFAULT = 14;

/**
 * Get the configured trial duration in days.
 * Reads from systemSetting `trial_days`, falls back to TRIAL_DAYS_DEFAULT.
 */
export async function getTrialDays(): Promise<number> {
    try {
        const { prisma } = await import('@/lib/prisma');
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'trial_days' },
        });
        if (setting?.value) {
            const parsed = parseInt(setting.value, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
    } catch {
        // Fall through to default
    }
    return TRIAL_DAYS_DEFAULT;
}

export const PLAN_LIMITS = {
  FOUNDER: {
    maxMembers: -1,
    maxEntities: -1,
    maxActivePrompts: -1,
    dataRetentionDays: 365,
    prices: { MANAGED: 0, BYOK: 0 },
    features: ["All features included", "Unlimited everything"],
  },
  STARTER: {
    maxMembers: 1,
    maxEntities: 1,
    maxActivePrompts: 25,
    dataRetentionDays: 90,
    prices: { MANAGED: 39, BYOK: 39 },
    features: ["1 user", "1 entity", "25 active prompts", "90 days data retention", "5 AI models included"],
  },
  PRO: {
    maxMembers: 3,
    maxEntities: 3,
    maxActivePrompts: 75,
    dataRetentionDays: 180,
    prices: { MANAGED: 99, BYOK: 99 },
    features: ["3 users", "3 entities", "75 active prompts", "180 days data retention", "5 AI models included"],
  },
  BUSINESS: {
    maxMembers: 10,
    maxEntities: 9,
    maxActivePrompts: 200,
    dataRetentionDays: 365,
    prices: { MANAGED: 249, BYOK: 249 },
    features: ["10 users", "9 entities", "200 active prompts", "1 year data retention", "5 AI models included"],
  },
  ENTERPRISE: {
    maxMembers: -1,
    maxEntities: -1,
    maxActivePrompts: -1,
    dataRetentionDays: -1, // custom
    prices: { MANAGED: 0, BYOK: 0 }, // contact us — no checkout
    features: ["Custom limits available", "5 AI models included"],
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

/**
 * Get plan limits for a specific plan (synchronous, hardcoded defaults only)
 */
export function getPlanLimits(plan: PlanKey) {
  return PLAN_LIMITS[plan];
}

/** Unlimited plan limits returned in self-hosted mode. */
const SELFHOSTED_LIMITS = {
  maxMembers: -1,
  maxEntities: -1,
  maxActivePrompts: -1,
  dataRetentionDays: -1,
  prices: { MANAGED: 0, BYOK: 0 },
  features: ['Unlimited — self-hosted'],
} as const;

/**
 * Get plan limits with DB overrides applied.
 * Reads from systemSetting key `plan_limits_<PLAN>` and merges over defaults.
 * Use this in API routes where limits must reflect admin edits.
 *
 * In self-hosted mode, returns unlimited limits regardless of plan.
 */
export async function getPlanLimitsFromDb(plan: PlanKey): Promise<(typeof PLAN_LIMITS)[PlanKey]> {
  // Self-hosted mode: everything unlimited, no plan enforcement
  if (isSelfHosted()) return SELFHOSTED_LIMITS as unknown as (typeof PLAN_LIMITS)[PlanKey];

  // NOTE: Redis caching is NOT applied here because plans.ts is imported by
  // client components for sync exports. ioredis is Node-only and would break
  // the client bundle. HTTP caching headers on /api/admin/plan-limits handle
  // client-side caching instead.
  try {
    const { prisma } = await import('@/lib/prisma');
    const setting = await prisma.systemSetting.findUnique({
      where: { key: `plan_limits_${plan}` }
    });
    const defaults = PLAN_LIMITS[plan] as Record<string, unknown>;
    const overrides = setting ? JSON.parse(setting.value) : {};
    return { ...defaults, ...overrides } as (typeof PLAN_LIMITS)[SpacePlan];
  } catch {
    return PLAN_LIMITS[plan] as (typeof PLAN_LIMITS)[PlanKey];
  }
}

/**
 * Check if a value is unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Generates a list of feature strings based on limits.
 */
export function getFeaturesList(plan: PlanKey, limits: (typeof PLAN_LIMITS)[PlanKey]): string[] {
  if (plan === 'FOUNDER') {
    return ["All features included", "Unlimited everything"];
  }

  if (plan === 'ENTERPRISE') {
    return [
      "Custom limits available",
      "5 AI models included",
    ];
  }

  const features: string[] = [];

  features.push(
    isUnlimited(limits.maxMembers)
      ? "Unlimited users"
      : `${limits.maxMembers} ${limits.maxMembers === 1 ? 'user' : 'users'}`
  );

  features.push(
    isUnlimited(limits.maxEntities)
      ? "Unlimited entities"
      : `${limits.maxEntities} ${limits.maxEntities === 1 ? 'entity' : 'entities'}`
  );

  features.push(
    isUnlimited(limits.maxActivePrompts)
      ? "Unlimited prompts"
      : `${limits.maxActivePrompts} active prompts`
  );

  if (limits.dataRetentionDays >= 365) {
    features.push("1 year data retention");
  } else {
    features.push(`${limits.dataRetentionDays} days data retention`);
  }

  features.push("5 AI models included");

  return features;
}

/**
 * Check if adding a resource would exceed the limit
 */
export function wouldExceedLimit(current: number, limit: number): boolean {
  if (isUnlimited(limit)) return false;
  return current >= limit;
}

/**
 * Calculate usage percentage
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  return Math.round((current / limit) * 100);
}

/**
 * Get color class based on usage percentage
 */
export function getUsageColorClass(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 bg-red-100';
  if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
}

/**
 * Get progress bar color based on usage percentage
 */
export function getProgressBarColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Calculate the credit limit for a plan (sync, uses hardcoded defaults).
 * Use for client-side previews only. For server-side (workers, webhooks, APIs),
 * use calculateMonthlyCreditsFromDb() which respects admin overrides.
 *
 * Formula: maxActivePrompts × days × modelCount
 * Returns -1 for unlimited plans.
 *
 * @param days - defaults to DAYS_PER_MONTH (31). Pass trialDays for trial spaces.
 */
export function calculateMonthlyCredits(plan: PlanKey, modelCount: number, days: number = DAYS_PER_MONTH): number {
  const limits = PLAN_LIMITS[plan];
  if (isUnlimited(limits.maxActivePrompts)) return -1;
  return limits.maxActivePrompts * days * modelCount;
}

/**
 * Calculate the credit limit for a plan (async, respects DB overrides).
 * Use in workers, webhooks, API routes — anywhere admin pricing changes must apply.
 *
 * In self-hosted mode, always returns -1 (unlimited credits).
 *
 * @param days - defaults to DAYS_PER_MONTH (31). Pass trialDays for trial spaces.
 */
export async function calculateMonthlyCreditsFromDb(plan: PlanKey, modelCount: number, days: number = DAYS_PER_MONTH): Promise<number> {
  if (isSelfHosted()) return -1;
  const limits = await getPlanLimitsFromDb(plan);
  if (isUnlimited(limits.maxActivePrompts)) return -1;
  return limits.maxActivePrompts * days * modelCount;
}

/**
 * Calculate projected credit usage for a space based on actual active prompts.
 * Returns projected total usage for the given remaining days.
 */
export function calculateCreditPrognosis(
  activePromptCount: number,
  modelCount: number,
  remainingDays: number,
): number {
  return activePromptCount * modelCount * remainingDays;
}

/**
 * Get the count of active (enabled, non-archived) global models.
 */
export async function getActiveModelCount(): Promise<number> {
  // NOTE: Redis caching not applied here — see getPlanLimitsFromDb comment.
  // Called only from server contexts (workers, webhooks) where the query is fast.
  const { prisma } = await import('@/lib/prisma');
  return prisma.globalModel.count({
    where: { isEnabled: true, isArchived: false },
  });
}
