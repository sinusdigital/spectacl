import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateNextSlot } from './scheduling';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('calculateNextSlot', () => {
  describe('Every6Hours', () => {
    it('at 03:00 returns 06:00 same day', () => {
      const from = new Date('2026-04-03T03:00:00Z');
      const result = calculateNextSlot('Every6Hours', from);
      expect(result.getHours()).toBe(6);
      expect(result.getDate()).toBe(3);
    });

    it('at 07:00 returns 12:00 same day', () => {
      const from = new Date('2026-04-03T07:00:00Z');
      const result = calculateNextSlot('Every6Hours', from);
      expect(result.getHours()).toBe(12);
    });

    it('at 14:00 returns 18:00 same day', () => {
      const from = new Date('2026-04-03T14:00:00Z');
      const result = calculateNextSlot('Every6Hours', from);
      expect(result.getHours()).toBe(18);
    });

    it('at 19:00 returns 00:00 next day', () => {
      const from = new Date('2026-04-03T19:00:00Z');
      const result = calculateNextSlot('Every6Hours', from);
      expect(result.getHours()).toBe(0);
      expect(result.getDate()).toBe(4);
    });
  });

  describe('Every24Hours', () => {
    it('returns next day at midnight', () => {
      const from = new Date('2026-04-03T15:30:00Z');
      const result = calculateNextSlot('Every24Hours', from);
      expect(result.getDate()).toBe(4);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('Every2Days', () => {
    it('returns 2 days later at midnight', () => {
      const from = new Date('2026-04-03T17:00:00Z');
      const result = calculateNextSlot('Every2Days', from);
      expect(result.getDate()).toBe(5);
      expect(result.getHours()).toBe(0);
    });
  });

  describe('Every7Days', () => {
    it('returns 7 days later at midnight', () => {
      const from = new Date('2026-04-03T17:00:00Z');
      const result = calculateNextSlot('Every7Days', from);
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(0);
    });
  });

  describe('unknown frequency', () => {
    it('defaults to 24h behavior', () => {
      const from = new Date('2026-04-03T15:00:00Z');
      const result = calculateNextSlot('UnknownFreq', from);
      expect(result.getDate()).toBe(4);
      expect(result.getHours()).toBe(0);
    });
  });
});
