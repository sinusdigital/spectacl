"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { determineType as defaultDetermineType } from "@/lib/domainUtils";
import { useToast } from "@/components/Shared/RadixToast";

export interface AnalysisResult {
    id: string;
    createdAt?: string;
    response: string;
    mentioned?: boolean;
    links?: { url: string; domain: string }[];
}

export interface Prompt {
    id: string;
    text: string;
    intent: string;
    status: string;
    createdAt: string;
    analysisResults?: AnalysisResult[];
}

export interface SourceMetric {
    domain: string;
    type: string;
    typeId?: string | null;
    count: number;
    percentage: number;
    presence: number;
    /** Number of distinct URLs (paths) seen under this domain across all
     *  analyzed runs. High `uniqueUrls` means LLMs cite many different pages
     *  on this domain; low means they keep referencing the same handful. */
    uniqueUrls: number;
    logoUrl?: string | null;
}

export interface UrlMetric {
    url: string;
    domain: string;
    type: string;
    count: number;
    logoUrl?: string | null;
}

export interface DomainTypeRecord {
    id: string;
    name: string;
    color: string | null;
    description: string | null;
    isOwned?: boolean;
    isEarned?: boolean;
}

// ─── Owned / Earned / Other tier palette ────────────────────────────────────
// Color is computed from the DomainType registry's `isOwned` / `isEarned`
// flags — NOT from `Domain.color` — so the customer-facing UI reads as
// owned/earned/other regardless of admin hex choices. Admins still manage
// per-type colors in the registry for their own scanability.
export type DomainTier = 'owned' | 'earned' | 'other';

// Hex values (Recharts needs concrete colors at render time).
// Picked from Radix scales: green-9, iris-9, slate-9.
export const TIER_HEX: Record<DomainTier, string> = {
    owned:  '#30A46C',
    earned: '#5B5BD6',
    other:  '#8B8D98',
};

// Radix Badge / Text color tokens for the same tiers.
export const TIER_RADIX_COLOR: Record<DomainTier, 'green' | 'iris' | 'gray'> = {
    owned:  'green',
    earned: 'iris',
    other:  'gray',
};

// CSS variables for inline `style={{ color: ... }}` (e.g. ghost Select trigger).
export const TIER_TEXT_VAR: Record<DomainTier, string> = {
    owned:  'var(--green-11)',
    earned: 'var(--iris-11)',
    other:  'var(--gray-11)',
};

export function tierForType(
    typeName: string | null | undefined,
    types: DomainTypeRecord[],
): DomainTier {
    if (!typeName) return 'other';
    const t = types.find(x => x.name === typeName);
    if (t?.isOwned) return 'owned';
    if (t?.isEarned) return 'earned';
    return 'other';
}

// Fallback colors for SSR / before dynamic types load
export const FALLBACK_TYPE_COLORS: Record<string, string> = {
    'Own':                        '#10B981',
    'Corporate':                  '#8B5CF6',
    'Social & community':         '#3B82F6',
    'News & media':               '#F59E0B',
    'Q&A & developer':            '#6B7280',
    'E-commerce & retail':        '#EC4899',
    'Reference & encyclopedic':   '#A855F7',
    'Publishing & blogging':      '#06B6D4',
    'Search engines':             '#EF4444',
    'Reviews & ratings':          '#84CC16',
    'Government & institutional': '#64748B',
    'Finance & business data':    '#F97316',
    'Maps & local':               '#22C55E',
};

// Kept for backward compat — use TYPE_COLORS from the hook instead where possible
export const TYPE_COLORS = FALLBACK_TYPE_COLORS;

export const TYPE_BADGE_COLORS: Record<string, "green" | "purple" | "blue" | "orange" | "gray" | "pink" | "cyan" | "red" | "lime" | "indigo"> = {
    'Own':                        'green',
    'Corporate':                  'purple',
    'Social & community':         'blue',
    'News & media':               'orange',
    'Q&A & developer':            'gray',
    'E-commerce & retail':        'pink',
    'Reference & encyclopedic':   'indigo',
    'Publishing & blogging':      'cyan',
    'Search engines':             'red',
    'Reviews & ratings':          'lime',
    'Government & institutional': 'gray',
    'Finance & business data':    'orange',
    'Maps & local':               'green',
};

export function useSourceMetrics(prompts: Prompt[], limit: number = 0, entityId?: string) {
    const [domainMetadata, setDomainMetadata] = useState<Record<string, { logoUrl?: string | null, type?: string, typeId?: string | null }>>({});
    const [domainTypes, setDomainTypes] = useState<DomainTypeRecord[]>([]);
    const { error: showError } = useToast();

    // Load domain types from registry
    useEffect(() => {
        fetch('/api/domain-types')
            .then(r => r.ok ? r.json() : [])
            .then((types: DomainTypeRecord[]) => setDomainTypes(types))
            .catch(() => {/* use fallback */});
    }, []);

    const typeColorMap = useMemo((): Record<string, string> => {
        if (domainTypes.length === 0) return FALLBACK_TYPE_COLORS;
        const map: Record<string, string> = { ...FALLBACK_TYPE_COLORS };
        domainTypes.forEach(t => {
            if (t.color) map[t.name] = t.color;
        });
        return map;
    }, [domainTypes]);

    const sourceStats = useMemo(() => {
        const domainCounts: Record<string, number> = {};
        const urlCounts: Record<string, number> = {};
        const urlToDomain: Record<string, string> = {};
        const domainPresenceCounts: Record<string, number> = {};
        // Track distinct URLs per domain for the `uniqueUrls` column.
        const uniqueUrlsByDomain: Record<string, Set<string>> = {};
        let totalMentions = 0;
        let promptsWithResultsCount = 0;

        prompts.forEach(prompt => {
            if (prompt.analysisResults && prompt.analysisResults.length > 0) {
                promptsWithResultsCount++;
                const uniqueDomainsInPrompt = new Set<string>();

                prompt.analysisResults.forEach(result => {
                    if (result.links) {
                        (result.links as Array<{ domain: string, url: string }>).forEach((link) => {
                            const hostname = link.domain;
                            const fullUrl = link.url;

                            domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
                            urlCounts[fullUrl] = (urlCounts[fullUrl] || 0) + 1;
                            urlToDomain[fullUrl] = hostname;
                            totalMentions++;

                            uniqueDomainsInPrompt.add(hostname);

                            if (!uniqueUrlsByDomain[hostname]) {
                                uniqueUrlsByDomain[hostname] = new Set();
                            }
                            uniqueUrlsByDomain[hostname].add(fullUrl);
                        });
                    }
                });

                uniqueDomainsInPrompt.forEach(domain => {
                    domainPresenceCounts[domain] = (domainPresenceCounts[domain] || 0) + 1;
                });
            }
        });

        return {
            domainCounts,
            urlCounts,
            urlToDomain,
            domainPresenceCounts,
            uniqueUrlsByDomain,
            totalMentions,
            promptsWithResultsCount
        };
    }, [prompts]);

    const topSources = useMemo(() => {
        const sliceCount = limit > 0 ? limit : undefined;
        return Object.entries(sourceStats.domainCounts)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, sliceCount)
            .map(([domain, count]) => {
                const metadata = domainMetadata[domain];
                const type = metadata?.type || defaultDetermineType(domain);
                return {
                    domain,
                    type,
                    typeId: metadata?.typeId ?? null,
                    count,
                    percentage: sourceStats.totalMentions > 0 ? Math.round((count / sourceStats.totalMentions) * 100) : 0,
                    presence: sourceStats.promptsWithResultsCount > 0 ? Math.round(((sourceStats.domainPresenceCounts[domain] || 0) / sourceStats.promptsWithResultsCount) * 100) : 0,
                    uniqueUrls: sourceStats.uniqueUrlsByDomain[domain]?.size ?? 0,
                    logoUrl: metadata?.logoUrl
                } as SourceMetric;
            });
    }, [sourceStats, limit, domainMetadata]);

    const topUrls = useMemo(() => {
        const sliceCount = limit > 0 ? limit : undefined;
        return Object.entries(sourceStats.urlCounts)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, sliceCount)
            .map(([url, count]) => {
                const domain = sourceStats.urlToDomain[url];
                const metadata = domainMetadata[domain];
                const type = metadata?.type || defaultDetermineType(domain);
                return {
                    url,
                    domain,
                    type,
                    count,
                    logoUrl: metadata?.logoUrl
                } as UrlMetric;
            });
    }, [sourceStats, limit, domainMetadata]);

    const domainTypeData = useMemo(() => {
        const typeCounts: Record<string, number> = {};

        Object.keys(sourceStats.domainCounts).forEach((domain) => {
            const metadata = domainMetadata[domain];
            const type = metadata?.type || defaultDetermineType(domain);
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return Object.entries(typeCounts)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({
                name,
                value,
                // Tier-based color (owned / earned / other) instead of the
                // per-type registry hex — keeps the chart from going rainbow.
                color: TIER_HEX[tierForType(name, domainTypes)],
            }));
    }, [sourceStats, domainMetadata, domainTypes]);

    const totalUniqueDomains = Object.keys(sourceStats.domainCounts).length;

    const fetchDomainInfo = useCallback(async (domains: string[]) => {
        try {
            const response = await fetch('/api/domains/logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domains, entityId }),
            });

            if (response.ok) {
                const domainData: { domain: string, logoUrl: string, type: string | null, typeId: string | null }[] = await response.json();

                setDomainMetadata(prev => {
                    const newMetadata = { ...prev };
                    domainData.forEach((d) => {
                        const existing = prev[d.domain];
                        newMetadata[d.domain] = {
                            logoUrl: d.logoUrl,
                            type: existing?.type || d.type || undefined,
                            typeId: existing?.typeId || d.typeId,
                        };
                    });
                    return newMetadata;
                });
            }
        } catch (error) {
            console.error('Error fetching domain info:', error);
        }
    }, [entityId]);

    useEffect(() => {
        if (topSources.length > 0) {
            const domainsToFetch = topSources
                .map((s: SourceMetric) => s.domain)
                .filter((domain: string) => !domainMetadata[domain]);

            if (domainsToFetch.length > 0) {
                fetchDomainInfo(domainsToFetch);
            }
        }
    }, [topSources, domainMetadata, fetchDomainInfo]);

    const handleTypeChange = async (domain: string, newTypeId: string | null) => {
        const prev = domainMetadata[domain];
        const resolvedType = newTypeId ? domainTypes.find(t => t.id === newTypeId) : null;
        setDomainMetadata(existing => ({
            ...existing,
            [domain]: { ...existing[domain], typeId: newTypeId, type: resolvedType?.name ?? undefined }
        }));

        try {
            // Entity-scoped override — does NOT touch the global domain registry
            const endpoint = entityId
                ? `/api/entities/${entityId}/domains/${encodeURIComponent(domain)}`
                : `/api/domains/${domain}`;

            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ typeId: newTypeId }),
            });

            if (!response.ok) throw new Error('Failed to update domain type');
        } catch (error) {
            console.error('Error updating domain type:', error);
            setDomainMetadata(existing => ({
                ...existing,
                [domain]: { ...existing[domain], typeId: prev?.typeId, type: prev?.type }
            }));
            showError("Error", "Failed to save domain type. Please try again.");
        }
    };

    return {
        topSources,
        topUrls,
        domainTypeData,
        domainTypes,
        typeColorMap,
        totalUniqueDomains,
        handleTypeChange,
        sourceStats
    };
}
