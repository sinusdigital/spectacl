/**
 * Metrics module barrel export.
 * All existing `import { ... } from "@/lib/metrics"` continue to work unchanged.
 */

export { updateEntityMetrics } from './snapshots';
export { getLatestMetrics, getDynamicMetrics } from './dynamic';
export { getEntityVisibilityHistory, getCompetitorVisibilityHistory } from './history';
export { updatePromptMetrics } from './promptMetrics';
