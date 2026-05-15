import { SubscriptionStatus, SpacePlan } from '@prisma/client';
import { isSelfHosted } from '@/lib/mode';

export type TrialState = 'active' | 'expiring_soon' | 'expired' | 'paid';

interface SpaceTrialFields {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  plan: SpacePlan;
}

export function getDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function getTrialState(space: SpaceTrialFields): TrialState {
  // Self-hosted mode: no trials, everything is "paid"
  if (isSelfHosted()) return 'paid';

  const { subscriptionStatus, trialEndsAt, plan } = space;

  // Paid plans (non-trial active)
  if (subscriptionStatus === 'ACTIVE' && plan !== 'STARTER') return 'paid';
  if (plan === 'FOUNDER') return 'paid';

  // Locked: trial expired with no plan chosen
  if (subscriptionStatus === 'INCOMPLETE') return 'expired';

  // Trial active
  if (subscriptionStatus === 'TRIALING') {
    const days = getDaysLeft(trialEndsAt);
    if (days <= 0) return 'expired';
    if (days <= 3) return 'expiring_soon';
    return 'active';
  }

  return 'paid';
}

export function isSpaceLocked(space: SpaceTrialFields): boolean {
  if (isSelfHosted()) return false;
  const state = getTrialState(space);
  return state === 'expired';
}
