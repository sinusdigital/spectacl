/**
 * Tests for the Mollie webhook's month-addition helper.
 * This function drives period boundaries on every recurring payment —
 * wrong math here mis-dates every invoice and credit reset.
 */
import { describe, it, expect } from 'vitest';
import { addOneMonth } from './route';

describe('addOneMonth', () => {
  it('adds one calendar month to a mid-month date', () => {
    const result = addOneMonth(new Date('2026-05-10T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-06-10');
  });

  it('clamps Jan 31 → Feb 28 in a non-leap year', () => {
    // 2027 is NOT a leap year
    const result = addOneMonth(new Date('2027-01-31T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2027-02-28');
  });

  it('clamps Jan 31 → Feb 29 in a leap year', () => {
    // 2024 is a leap year
    const result = addOneMonth(new Date('2024-01-31T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2024-02-29');
  });

  it('clamps Mar 31 → Apr 30 (30-day month)', () => {
    const result = addOneMonth(new Date('2026-03-31T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-04-30');
  });

  it('clamps May 31 → Jun 30', () => {
    const result = addOneMonth(new Date('2026-05-31T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-06-30');
  });

  it('Dec 15 → Jan 15 (year rollover)', () => {
    const result = addOneMonth(new Date('2026-12-15T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2027-01-15');
  });

  it('Dec 31 → Jan 31 (year rollover, no clamp)', () => {
    const result = addOneMonth(new Date('2026-12-31T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2027-01-31');
  });

  it('Feb 29 leap-year → Mar 29', () => {
    const result = addOneMonth(new Date('2024-02-29T10:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2024-03-29');
  });

  it('preserves the time-of-day component', () => {
    const input = new Date('2026-05-10T14:30:45.123Z');
    const result = addOneMonth(input);
    expect(result.getUTCHours()).toBe(input.getUTCHours());
    expect(result.getUTCMinutes()).toBe(input.getUTCMinutes());
    expect(result.getUTCSeconds()).toBe(input.getUTCSeconds());
  });

  it('does not mutate the input date', () => {
    const input = new Date('2026-05-10T10:00:00Z');
    const before = input.toISOString();
    addOneMonth(input);
    expect(input.toISOString()).toBe(before);
  });

  it('handles the Dec-to-Jan overflow-check edge case (month % 12)', () => {
    // The function uses `result.getMonth() !== targetMonth % 12` to detect
    // overflow. For Dec (month=11), targetMonth=12, and 12 % 12 = 0 = Jan.
    // This test pins the correctness of that modulo branch.
    const result = addOneMonth(new Date('2026-12-15T10:00:00Z'));
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCFullYear()).toBe(2027);
  });
});
