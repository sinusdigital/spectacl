import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock transitive deps that throw without env vars in CI
vi.mock('@/lib/email', () => ({ resend: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { getSpaceAccessStatus } from './access';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getSpaceAccessStatus', () => {
  it('returns ACTIVE for active subscription with no expiry', () => {
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: null,
      trialEndsAt: null,
    })).toBe('ACTIVE');
  });

  it('returns ACTIVE for active subscription with future period end', () => {
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: new Date('2026-05-01'),
      trialEndsAt: null,
    })).toBe('ACTIVE');
  });

  it('returns ACTIVE for trialing with future trial end', () => {
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'TRIALING',
      currentPeriodEnd: null,
      trialEndsAt: new Date('2026-04-15'),
    })).toBe('ACTIVE');
  });

  it('returns ACTIVE for canceled but still within paid period', () => {
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'CANCELED',
      currentPeriodEnd: new Date('2026-04-15'),
      trialEndsAt: null,
    })).toBe('ACTIVE');
  });

  it('returns READ_ONLY within 90-day grace period', () => {
    // Period ended 30 days ago — within 90-day grace
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: new Date('2026-03-04'),
      trialEndsAt: null,
    })).toBe('READ_ONLY');
  });

  it('returns READ_ONLY at day 89 of grace period', () => {
    // Period ended 89 days ago
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: new Date('2026-01-04'),
      trialEndsAt: null,
    })).toBe('READ_ONLY');
  });

  it('returns EXPIRED after 90-day grace period', () => {
    // Period ended 100 days ago
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: new Date('2025-12-25'),
      trialEndsAt: null,
    })).toBe('EXPIRED');
  });

  it('uses trialEndsAt as fallback when currentPeriodEnd is null', () => {
    // Trial ended 30 days ago — within grace
    expect(getSpaceAccessStatus({
      subscriptionStatus: 'TRIALING',
      currentPeriodEnd: null,
      trialEndsAt: new Date('2026-03-04'),
    })).toBe('READ_ONLY');
  });
});
