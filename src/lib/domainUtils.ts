/**
 * Determine the display type for a domain.
 * If the domain already has a registry type, it takes priority.
 * Falls back to a lightweight heuristic for domains not in the registry.
 */
export const determineType = (domain: string, registryType?: string | null): string => {
    if (registryType) return registryType;
    if (domain.includes('reddit') || domain.includes('quora') || domain.includes('twitter') || domain.includes('linkedin')) return 'Social & community';
    if (domain.includes('news') || domain.includes('times') || domain.includes('post') || domain.includes('guardian')) return 'News & media';
    if (domain.includes('docs') || domain.includes('github') || domain.includes('stackoverflow')) return 'Q&A & developer';
    if (domain.includes('shop') || domain.includes('store') || domain.includes('amazon') || domain.includes('ebay')) return 'E-commerce & retail';
    return 'Corporate';
};

export const normalizeUrl = (url: string | null | undefined): string | null => {
    if (!url || !url.trim()) return null;
    let normalized = url.trim();
    if (!normalized.match(/^https?:\/\//i)) {
        normalized = `https://${normalized}`;
    }
    return normalized;
};
