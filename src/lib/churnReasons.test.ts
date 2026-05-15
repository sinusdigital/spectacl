import { describe, it, expect } from 'vitest';
import { resolveChurnLabel, CHURN_REASONS } from './churnReasons';

describe('resolveChurnLabel', () => {
  it('returns label for known reason', () => {
    expect(resolveChurnLabel('too_expensive')).toBe('Too expensive for my needs');
  });

  it('returns label for each defined reason', () => {
    for (const reason of CHURN_REASONS) {
      if (reason.id !== 'other') {
        expect(resolveChurnLabel(reason.id)).toBe(reason.label);
      }
    }
  });

  it('returns custom text for "other" reason', () => {
    expect(resolveChurnLabel('other', 'My custom reason')).toBe('My custom reason');
  });

  it('returns "Other" when other has no text', () => {
    expect(resolveChurnLabel('other')).toBe('Other');
  });

  it('returns "Other" when other text is whitespace', () => {
    expect(resolveChurnLabel('other', '   ')).toBe('Other');
  });

  it('returns the raw id for unknown reason', () => {
    expect(resolveChurnLabel('unknown_reason')).toBe('unknown_reason');
  });
});
