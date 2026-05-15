import { describe, it, expect } from 'vitest';
import {
  getPlanLimits,
  isUnlimited,
  getFeaturesList,
  wouldExceedLimit,
  getUsagePercentage,
  getUsageColorClass,
  getProgressBarColor,
  calculateMonthlyCredits,
  calculateCreditPrognosis,
  PLAN_LIMITS,
  DAYS_PER_MONTH,
} from './plans';

describe('getPlanLimits', () => {
  it('returns STARTER limits', () => {
    const limits = getPlanLimits('STARTER');
    expect(limits.maxMembers).toBe(1);
    expect(limits.maxEntities).toBe(1);
    expect(limits.maxActivePrompts).toBe(25);
  });

  it('returns FOUNDER limits as unlimited', () => {
    const limits = getPlanLimits('FOUNDER');
    expect(limits.maxMembers).toBe(-1);
    expect(limits.maxEntities).toBe(-1);
    expect(limits.maxActivePrompts).toBe(-1);
  });

  it('returns PRO limits', () => {
    const limits = getPlanLimits('PRO');
    expect(limits.maxMembers).toBe(3);
    expect(limits.maxEntities).toBe(3);
  });

  it('returns BUSINESS limits', () => {
    const limits = getPlanLimits('BUSINESS');
    expect(limits.maxMembers).toBe(10);
    expect(limits.maxEntities).toBe(9);
  });

  it('returns ENTERPRISE limits as unlimited', () => {
    const limits = getPlanLimits('ENTERPRISE');
    expect(limits.maxMembers).toBe(-1);
    expect(limits.maxEntities).toBe(-1);
  });
});

describe('isUnlimited', () => {
  it('returns true for -1', () => {
    expect(isUnlimited(-1)).toBe(true);
  });

  it('returns false for 0', () => {
    expect(isUnlimited(0)).toBe(false);
  });

  it('returns false for positive numbers', () => {
    expect(isUnlimited(5)).toBe(false);
  });
});

describe('getFeaturesList', () => {
  it('returns hardcoded FOUNDER features', () => {
    const features = getFeaturesList('FOUNDER', PLAN_LIMITS.FOUNDER);
    expect(features).toContain('All features included');
    expect(features).toContain('Unlimited everything');
  });

  it('returns hardcoded ENTERPRISE features', () => {
    const features = getFeaturesList('ENTERPRISE', PLAN_LIMITS.ENTERPRISE);
    expect(features).toContain('Custom limits available');
  });

  it('returns STARTER features with singular forms', () => {
    const features = getFeaturesList('STARTER', PLAN_LIMITS.STARTER);
    expect(features).toContain('1 user');
    expect(features).toContain('1 entity');
    expect(features).toContain('25 active prompts');
    expect(features).toContain('90 days data retention');
  });

  it('returns PRO features with model inclusion', () => {
    const features = getFeaturesList('PRO', PLAN_LIMITS.PRO);
    expect(features).toContain('3 users');
    expect(features).toContain('5 AI models included');
  });

  it('returns BUSINESS features with 1 year data retention', () => {
    const features = getFeaturesList('BUSINESS', PLAN_LIMITS.BUSINESS);
    expect(features).toContain('1 year data retention');
  });
});

describe('wouldExceedLimit', () => {
  it('returns true when at limit', () => {
    expect(wouldExceedLimit(5, 5)).toBe(true);
  });

  it('returns true when over limit', () => {
    expect(wouldExceedLimit(6, 5)).toBe(true);
  });

  it('returns false when under limit', () => {
    expect(wouldExceedLimit(4, 5)).toBe(false);
  });

  it('returns false for unlimited (-1)', () => {
    expect(wouldExceedLimit(100, -1)).toBe(false);
  });
});

describe('getUsagePercentage', () => {
  it('returns percentage', () => {
    expect(getUsagePercentage(50, 100)).toBe(50);
  });

  it('returns 0 for unlimited', () => {
    expect(getUsagePercentage(50, -1)).toBe(0);
  });

  it('returns 100 when at limit', () => {
    expect(getUsagePercentage(10, 10)).toBe(100);
  });

  it('returns over 100 when exceeding limit', () => {
    expect(getUsagePercentage(15, 10)).toBe(150);
  });
});

describe('getUsageColorClass', () => {
  it('returns red for >= 90%', () => {
    expect(getUsageColorClass(95)).toContain('red');
  });

  it('returns yellow for >= 70%', () => {
    expect(getUsageColorClass(75)).toContain('yellow');
  });

  it('returns green for < 70%', () => {
    expect(getUsageColorClass(50)).toContain('green');
  });

  it('returns red at exactly 90%', () => {
    expect(getUsageColorClass(90)).toContain('red');
  });

  it('returns yellow at exactly 70%', () => {
    expect(getUsageColorClass(70)).toContain('yellow');
  });
});

describe('getProgressBarColor', () => {
  it('returns red for >= 90%', () => {
    expect(getProgressBarColor(95)).toContain('red');
  });

  it('returns yellow for >= 70%', () => {
    expect(getProgressBarColor(75)).toContain('yellow');
  });

  it('returns green for < 70%', () => {
    expect(getProgressBarColor(50)).toContain('green');
  });
});

describe('calculateMonthlyCredits', () => {
  it('calculates correctly for paid plans with 5 models', () => {
    // Formula: maxActivePrompts × DAYS_PER_MONTH × modelCount
    expect(calculateMonthlyCredits('STARTER', 5)).toBe(25 * DAYS_PER_MONTH * 5);   // 3,875
    expect(calculateMonthlyCredits('PRO', 5)).toBe(75 * DAYS_PER_MONTH * 5);        // 11,625
    expect(calculateMonthlyCredits('BUSINESS', 5)).toBe(200 * DAYS_PER_MONTH * 5);  // 31,000
  });

  it('returns -1 for unlimited plans', () => {
    expect(calculateMonthlyCredits('FOUNDER', 5)).toBe(-1);
    expect(calculateMonthlyCredits('ENTERPRISE', 5)).toBe(-1);
  });

  it('scales with model count', () => {
    expect(calculateMonthlyCredits('STARTER', 3)).toBe(25 * DAYS_PER_MONTH * 3);  // 2,325
    expect(calculateMonthlyCredits('STARTER', 8)).toBe(25 * DAYS_PER_MONTH * 8);  // 6,200
  });

  it('returns 0 when model count is 0', () => {
    expect(calculateMonthlyCredits('STARTER', 0)).toBe(0);
  });

  it('uses custom days parameter for trial periods', () => {
    // Trial: 25 prompts × 14 days × 1 model = 350
    expect(calculateMonthlyCredits('STARTER', 1, 14)).toBe(25 * 14 * 1);
    // Trial: 75 prompts × 14 days × 3 models = 3,150
    expect(calculateMonthlyCredits('PRO', 3, 14)).toBe(75 * 14 * 3);
  });

  it('defaults to DAYS_PER_MONTH when days omitted', () => {
    expect(calculateMonthlyCredits('STARTER', 5)).toBe(calculateMonthlyCredits('STARTER', 5, DAYS_PER_MONTH));
  });

  it('returns -1 for unlimited plans regardless of days', () => {
    expect(calculateMonthlyCredits('FOUNDER', 5, 14)).toBe(-1);
    expect(calculateMonthlyCredits('ENTERPRISE', 3, 7)).toBe(-1);
  });
});

describe('calculateCreditPrognosis', () => {
  it('projects usage for remaining days', () => {
    // 10 prompts × 5 models × 20 days
    expect(calculateCreditPrognosis(10, 5, 20)).toBe(1000);
  });

  it('returns 0 when no active prompts', () => {
    expect(calculateCreditPrognosis(0, 5, 31)).toBe(0);
  });

  it('returns 0 when no remaining days', () => {
    expect(calculateCreditPrognosis(10, 5, 0)).toBe(0);
  });
});
