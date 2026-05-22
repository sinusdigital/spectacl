import { describe, it, expect } from 'vitest';
import { calculatePositions } from './positions';

describe('calculatePositions', () => {
  it('ranks targets by first appearance order', () => {
    const result = calculatePositions('Apple is great, then Google', ['Apple', 'Google']);
    expect(result.get('apple')).toBe(1);
    expect(result.get('google')).toBe(2);
  });

  it('returns empty map for no matches', () => {
    const result = calculatePositions('No matches here', ['Apple']);
    expect(result.size).toBe(0);
  });

  it('is case insensitive', () => {
    const result = calculatePositions('APPLE is mentioned', ['apple']);
    expect(result.get('apple')).toBe(1);
  });

  it('deduplicates targets by lowercase', () => {
    const result = calculatePositions('Apple is here', ['Apple', 'apple']);
    expect(result.size).toBe(1);
    expect(result.get('apple')).toBe(1);
  });

  it('filters out empty targets', () => {
    const result = calculatePositions('Apple is here', ['Apple', '', '  ']);
    // Empty string is filtered by Boolean check
    expect(result.has('apple')).toBe(true);
  });

  it('returns empty map for empty targets', () => {
    const result = calculatePositions('Some text', []);
    expect(result.size).toBe(0);
  });

  it('returns empty map for empty text', () => {
    const result = calculatePositions('', ['Apple']);
    expect(result.size).toBe(0);
  });
});
