import { describe, it, expect } from 'vitest';
import {
  calcVisibility,
  calcShareOfVoice,
  calcChange,
  calcPositionChange,
  calcLinkPercentage,
  roundMetric,
  roundMetricNullable,
} from './calculations';

describe('calcVisibility', () => {
  it('returns percentage of mentions', () => {
    expect(calcVisibility(5, 10)).toBe(50);
  });

  it('returns 0 when total is 0', () => {
    expect(calcVisibility(5, 0)).toBe(0);
  });

  it('returns 0 when mentioned is 0', () => {
    expect(calcVisibility(0, 10)).toBe(0);
  });

  it('returns 100 when all mentioned', () => {
    expect(calcVisibility(10, 10)).toBe(100);
  });
});

describe('calcShareOfVoice', () => {
  it('returns share percentage', () => {
    expect(calcShareOfVoice(25, 100)).toBe(25);
  });

  it('returns 0 when total is 0', () => {
    expect(calcShareOfVoice(10, 0)).toBe(0);
  });

  it('returns 0 when entity mentions is 0', () => {
    expect(calcShareOfVoice(0, 100)).toBe(0);
  });
});

describe('calcChange', () => {
  it('returns difference when previous data exists', () => {
    expect(calcChange(80, 60, true)).toBe(20);
  });

  it('returns negative difference', () => {
    expect(calcChange(50, 70, true)).toBe(-20);
  });

  it('returns null when no previous data', () => {
    expect(calcChange(80, 60, false)).toBeNull();
  });

  it('returns 0 when values are equal', () => {
    expect(calcChange(50, 50, true)).toBe(0);
  });
});

describe('calcPositionChange', () => {
  it('returns difference between positions', () => {
    expect(calcPositionChange(3, 5)).toBe(-2);
  });

  it('returns null when current is null', () => {
    expect(calcPositionChange(null, 5)).toBeNull();
  });

  it('returns null when previous is null', () => {
    expect(calcPositionChange(3, null)).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(calcPositionChange(null, null)).toBeNull();
  });

  it('returns 0 when positions are equal', () => {
    expect(calcPositionChange(3, 3)).toBe(0);
  });
});

describe('calcLinkPercentage', () => {
  it('applies factor to visibility', () => {
    expect(calcLinkPercentage(50, 0.8)).toBe(40);
  });

  it('caps at 100', () => {
    expect(calcLinkPercentage(130, 0.8)).toBe(100);
  });

  it('uses default factor of 0.8', () => {
    expect(calcLinkPercentage(50)).toBe(40);
  });

  it('returns 0 for 0 visibility', () => {
    expect(calcLinkPercentage(0)).toBe(0);
  });
});

describe('roundMetric', () => {
  it('rounds to 1 decimal by default', () => {
    expect(roundMetric(3.456)).toBe(3.5);
  });

  it('rounds to specified decimals', () => {
    expect(roundMetric(3.456, 2)).toBe(3.46);
  });

  it('rounds to 0 decimals', () => {
    expect(roundMetric(3.456, 0)).toBe(3);
  });
});

describe('roundMetricNullable', () => {
  it('returns null for null input', () => {
    expect(roundMetricNullable(null)).toBeNull();
  });

  it('rounds non-null values', () => {
    expect(roundMetricNullable(3.456, 1)).toBe(3.5);
  });

  it('uses default decimals', () => {
    expect(roundMetricNullable(3.456)).toBe(3.5);
  });
});
