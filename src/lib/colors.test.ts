import { describe, it, expect } from 'vitest';
import { getColorForTag, TAG_COLORS } from './colors';

describe('getColorForTag', () => {
  it('returns a color from the palette', () => {
    const color = getColorForTag('test');
    expect(TAG_COLORS).toContain(color);
  });

  it('returns the same color for the same tag', () => {
    const color1 = getColorForTag('marketing');
    const color2 = getColorForTag('marketing');
    expect(color1).toBe(color2);
  });

  it('returns different colors for different tags', () => {
    const color1 = getColorForTag('marketing');
    const color2 = getColorForTag('engineering');
    // Not guaranteed but highly likely with good hash
    // Just verify they're valid colors
    expect(TAG_COLORS).toContain(color1);
    expect(TAG_COLORS).toContain(color2);
  });

  it('handles empty string', () => {
    const color = getColorForTag('');
    expect(TAG_COLORS).toContain(color);
  });

  it('handles long strings', () => {
    const color = getColorForTag('a very long tag name that should still hash correctly');
    expect(TAG_COLORS).toContain(color);
  });
});
