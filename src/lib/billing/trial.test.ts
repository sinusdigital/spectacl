import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDaysLeft, getTrialState, isSpaceLocked } from './trial';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getDaysLeft', () => {
  it('returns 0 for null', () => {
    expect(getDaysLeft(null)).toBe(0);
  });

  it('returns days remaining for future date', () => {
    const fiveDaysFromNow = new Date('2026-04-08T12:00:00Z');
    expect(getDaysLeft(fiveDaysFromNow)).toBe(5);
  });

  it('returns 0 for past date', () => {
    const yesterday = new Date('2026-04-02T12:00:00Z');
    expect(getDaysLeft(yesterday)).toBe(0);
  });

  it('returns 1 for partial day remaining (ceiling)', () => {
    const halfDay = new Date('2026-04-04T00:00:00Z');
    expect(getDaysLeft(halfDay)).toBe(1);
  });
});

describe('getTrialState', () => {
  it('returns paid for ACTIVE non-STARTER plan', () => {
    expect(getTrialState({
      subscriptionStatus: 'ACTIVE',
      plan: 'PRO',
      trialEndsAt: null,
    })).toBe('paid');
  });

  it('returns paid for FOUNDER plan regardless of status', () => {
    expect(getTrialState({
      subscriptionStatus: 'TRIALING',
      plan: 'FOUNDER',
      trialEndsAt: null,
    })).toBe('paid');
  });

  it('returns expired for INCOMPLETE status', () => {
    expect(getTrialState({
      subscriptionStatus: 'INCOMPLETE',
      plan: 'STARTER',
      trialEndsAt: null,
    })).toBe('expired');
  });

  it('returns active for TRIALING with many days left', () => {
    expect(getTrialState({
      subscriptionStatus: 'TRIALING',
      plan: 'STARTER',
      trialEndsAt: new Date('2026-04-13T12:00:00Z'),
    })).toBe('active');
  });

  it('returns expiring_soon for TRIALING with 3 or fewer days', () => {
    expect(getTrialState({
      subscriptionStatus: 'TRIALING',
      plan: 'STARTER',
      trialEndsAt: new Date('2026-04-05T12:00:00Z'),
    })).toBe('expiring_soon');
  });

  it('returns expired for TRIALING with past date', () => {
    expect(getTrialState({
      subscriptionStatus: 'TRIALING',
      plan: 'STARTER',
      trialEndsAt: new Date('2026-04-01T12:00:00Z'),
    })).toBe('expired');
  });

  it('returns paid as default fallback', () => {
    expect(getTrialState({
      subscriptionStatus: 'CANCELED',
      plan: 'PRO',
      trialEndsAt: null,
    })).toBe('paid');
  });
});

describe('isSpaceLocked', () => {
  it('returns true when trial is expired', () => {
    expect(isSpaceLocked({
      subscriptionStatus: 'INCOMPLETE',
      plan: 'STARTER',
      trialEndsAt: null,
    })).toBe(true);
  });

  it('returns false when trial is active', () => {
    expect(isSpaceLocked({
      subscriptionStatus: 'TRIALING',
      plan: 'STARTER',
      trialEndsAt: new Date('2026-04-13T12:00:00Z'),
    })).toBe(false);
  });

  it('returns false when paid', () => {
    expect(isSpaceLocked({
      subscriptionStatus: 'ACTIVE',
      plan: 'PRO',
      trialEndsAt: null,
    })).toBe(false);
  });
});
