/**
 * Pure calculation functions for metrics.
 * No Prisma or external dependencies — just math.
 */

/** Mention rate: what % of results mentioned the target */
export function calcVisibility(mentioned: number, total: number): number {
    return total > 0 ? (mentioned / total) * 100 : 0;
}

/** Share of voice: what % of all market mentions belong to the target */
export function calcShareOfVoice(entityMentions: number, totalMarketMentions: number): number {
    return totalMarketMentions > 0 ? (entityMentions / totalMarketMentions) * 100 : 0;
}

/** Delta between current and previous period. Returns null if no previous data. */
export function calcChange(current: number, previous: number, hasPreviousData: boolean): number | null {
    return hasPreviousData ? current - previous : null;
}

/** Position change (null-safe). Negative = improved ranking. */
export function calcPositionChange(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null) return null;
    return current - previous;
}

/** Link percentage (mock formula) */
export function calcLinkPercentage(visibility: number, factor = 0.8): number {
    return Math.min(visibility * factor, 100);
}

/** Round to N decimal places, return as number */
export function roundMetric(value: number, decimals = 1): number {
    return Number(value.toFixed(decimals));
}

/** Round a nullable metric — returns number or null */
export function roundMetricNullable(value: number | null, decimals = 1): number | null {
    if (value === null) return null;
    return Number(value.toFixed(decimals));
}
