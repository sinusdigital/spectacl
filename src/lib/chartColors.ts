/**
 * Shared chart color palette for Recharts components.
 *
 * Recharts renders SVG — CSS variables don't work in SVG paint attributes
 * (stroke, fill, stopColor). These hex values match the Radix color scale
 * so charts stay visually consistent with the rest of the UI.
 *
 * For HTML elements (color dots, badges), use the CSS variable form instead:
 *   style={{ backgroundColor: 'var(--accent-9)' }}
 */

export interface ChartColor {
  hex: string;
  cssVar: string;
}

/** Primary entity color — matches the app accent (forest-green). */
export const PRIMARY_COLOR: ChartColor = {
  hex: '#2B4D1A',
  cssVar: 'var(--accent-9)',
};

/** Competitor colors — ordered, cycled via index. */
export const COMPETITOR_COLORS: ChartColor[] = [
  { hex: '#30A46C', cssVar: 'var(--green-9)' },
  { hex: '#F5A623', cssVar: 'var(--amber-9)' },
  { hex: '#E5484D', cssVar: 'var(--red-9)' },
  { hex: '#8E4EC6', cssVar: 'var(--violet-9)' },
  { hex: '#E93D82', cssVar: 'var(--pink-9)' },
];

/** Fallback for HTML color dots when no color is available. */
export const COLOR_DOT_FALLBACK = 'var(--gray-8)';

/**
 * Get the chart hex color for an entity at a given index.
 * Index 0 with isPrimary=true returns the accent color.
 */
export function getEntityChartColor(index: number, isPrimary: boolean): string {
  if (isPrimary) return PRIMARY_COLOR.hex;
  return COMPETITOR_COLORS[index % COMPETITOR_COLORS.length].hex;
}

/**
 * Get the CSS variable color for an entity (use in HTML, not SVG).
 */
export function getEntityCssColor(index: number, isPrimary: boolean): string {
  if (isPrimary) return PRIMARY_COLOR.cssVar;
  return COMPETITOR_COLORS[index % COMPETITOR_COLORS.length].cssVar;
}
