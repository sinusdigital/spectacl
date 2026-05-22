/**
 * Utility functions for Prompts functionality
 */

import { ModelConfig } from '@/types/prompts';

/**
 * Format a future date as a countdown string
 * @param dateString - ISO date string or null
 * @returns Formatted countdown like "in 2d 5h" or "in 30m"
 */
export function formatCountdown(dateString: string | null): string {
    if (!dateString) return 'Pending';
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) return 'Overdue';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    return `in ${minutes}m`;
}

/**
 * Format a past date as a relative time string
 * @param dateString - ISO date string or null
 * @returns Formatted relative time like "2 hours ago" or "3 days ago"
 */
export function formatTimeAgo(dateString: string | null): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diff = now - date;

    if (diff < 0) return 'Just now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
}

/**
 * Get list of active models that can be used for prompts
 * @param modelConfigs - Array of model configurations
 * @returns Array of model IDs that are enabled and have API keys
 */
export function getActiveModels(modelConfigs: ModelConfig[]): string[] {
    return modelConfigs
        .filter(m => m.isEnabled && !m.isArchived && m.hasApiKey)
        .map(m => m.id);
}

/**
 * Check if user can add more prompts based on usage limits
 * @param currentCount - Current number of active prompts
 * @param maxLimit - Maximum allowed prompts (null means unlimited)
 * @returns Boolean indicating if more prompts can be added
 */
export function canAddPrompt(currentCount: number, maxLimit: number | null): boolean {
    if (maxLimit === null) return true;
    return currentCount < maxLimit;
}

/**
 * Get remaining prompts count
 * @param currentCount - Current number of active prompts  
 * @param maxLimit - Maximum allowed prompts (null means unlimited)
 * @returns Number of remaining prompts or null if unlimited
 */
export function getRemainingPrompts(currentCount: number, maxLimit: number | null): number | null {
    if (maxLimit === null) return null;
    return Math.max(0, maxLimit - currentCount);
}
