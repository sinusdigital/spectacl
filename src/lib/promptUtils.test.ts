import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCountdown,
  formatTimeAgo,
  getActiveModels,
  canAddPrompt,
  getRemainingPrompts,
} from './promptUtils';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatCountdown', () => {
  it('returns Pending for null', () => {
    expect(formatCountdown(null)).toBe('Pending');
  });

  it('returns Overdue for past date', () => {
    expect(formatCountdown('2026-04-01T12:00:00Z')).toBe('Overdue');
  });

  it('returns days and hours for future date', () => {
    const result = formatCountdown('2026-04-06T00:00:00Z');
    expect(result).toMatch(/in 2d/);
  });

  it('returns hours and minutes for same-day future', () => {
    const result = formatCountdown('2026-04-03T15:30:00Z');
    expect(result).toMatch(/in 3h/);
  });

  it('returns minutes for near future', () => {
    const result = formatCountdown('2026-04-03T12:45:00Z');
    expect(result).toMatch(/in 45m/);
  });
});

describe('formatTimeAgo', () => {
  it('returns Never for null', () => {
    expect(formatTimeAgo(null)).toBe('Never');
  });

  it('returns Just now for future date', () => {
    expect(formatTimeAgo('2026-04-04T12:00:00Z')).toBe('Just now');
  });

  it('returns hours ago', () => {
    expect(formatTimeAgo('2026-04-03T09:00:00Z')).toBe('3 hours ago');
  });

  it('returns 1 hour ago (singular)', () => {
    expect(formatTimeAgo('2026-04-03T11:00:00Z')).toBe('1 hour ago');
  });

  it('returns days ago', () => {
    expect(formatTimeAgo('2026-04-01T12:00:00Z')).toBe('2 days ago');
  });

  it('returns Just now for very recent', () => {
    expect(formatTimeAgo('2026-04-03T11:50:00Z')).toBe('Just now');
  });
});

describe('getActiveModels', () => {
  it('filters to enabled models with API keys', () => {
    const models = [
      { id: '1', isEnabled: true, isArchived: false, hasApiKey: true },
      { id: '2', isEnabled: false, isArchived: false, hasApiKey: true },
      { id: '3', isEnabled: true, isArchived: true, hasApiKey: true },
      { id: '4', isEnabled: true, isArchived: false, hasApiKey: false },
    ] as unknown as Parameters<typeof getActiveModels>[0];
    expect(getActiveModels(models)).toEqual(['1']);
  });

  it('returns empty array for no active models', () => {
    expect(getActiveModels([])).toEqual([]);
  });
});

describe('canAddPrompt', () => {
  it('returns true when under limit', () => {
    expect(canAddPrompt(5, 10)).toBe(true);
  });

  it('returns false when at limit', () => {
    expect(canAddPrompt(10, 10)).toBe(false);
  });

  it('returns true when unlimited (null)', () => {
    expect(canAddPrompt(100, null)).toBe(true);
  });
});

describe('getRemainingPrompts', () => {
  it('returns remaining count', () => {
    expect(getRemainingPrompts(5, 10)).toBe(5);
  });

  it('returns 0 when at or over limit', () => {
    expect(getRemainingPrompts(12, 10)).toBe(0);
  });

  it('returns null when unlimited', () => {
    expect(getRemainingPrompts(5, null)).toBeNull();
  });
});
