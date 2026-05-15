import { Flex, Grid, Box, Text } from '@radix-ui/themes';
import SectionLabel from '@/components/Shared/SectionLabel';
import { AnalysisResult } from "@/types/prompts";
import EntityBadge from '@/components/Shared/EntityBadge';
import SourceBadge from '@/components/Shared/SourceBadge';
import PillList from '@/components/Shared/PillList';
import MetricTriplet from '@/components/Shared/MetricTriplet';
import { cn } from '@/lib/utils';
import { calculateSov, isTrackedMention } from "@/lib/metrics/mention-utils";

// --- Types ---
interface EntitiesProps {
    mentions: AnalysisResult['mentions'];
    entityName: string;
    entityLogo?: string | null;
    entityWebsite?: string | null;
    variant?: 'tags' | 'list';
    className?: string;
    layout?: 'wrap' | 'single-row';
}

// --- Helper Functions ---
function getShareOfVoice(result: AnalysisResult) {
    return calculateSov(result.mentions || []);
}

// --- Components ---

/**
 * Displays Mention, Position, and Share of Voice metrics.
 * Supports 'row' (for Cards) and 'cards' (for Modal/Detailed views).
 */
export function AnalysisKeyMetrics({ result, variant = 'row', labelVariant = 'card' }: { result: AnalysisResult, variant?: 'row' | 'cards', labelVariant?: 'card' | 'modal' }) {
    if (variant === 'cards') {
        // Detailed Card Layout (for Modal)
        return (
            <Grid columns="3" gap="3">
                {/* Mentioned */}
                <Box className="p-4 bg-[var(--color-panel-solid)] border border-[var(--gray-4)] rounded-xl">
                    <Flex align="center" justify="between" mb="2">
                        <SectionLabel variant="modal" mb="0">Mention</SectionLabel>
                        <Box className="w-6 h-6 bg-[var(--gray-3)] rounded-md flex items-center justify-center">
                            {result.mentioned ? (
                                <svg className="w-3.5 h-3.5 text-[var(--green-9)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5 text-[var(--red-9)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </Box>
                    </Flex>
                    <Box className="flex items-baseline gap-1">
                        <Text size="6" weight="bold" className={result.mentioned ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]'}>
                            {result.mentioned ? 'Yes' : 'No'}
                        </Text>
                    </Box>
                </Box>

                {/* Position */}
                <Box className="p-4 bg-[var(--color-panel-solid)] border border-[var(--gray-4)] rounded-xl">
                    <Flex align="center" justify="between" mb="2">
                        <SectionLabel variant="modal" mb="0">Position</SectionLabel>
                        <Box className="w-6 h-6 bg-[var(--gray-3)] rounded-md flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-[var(--gray-11)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </Box>
                    </Flex>
                    <Box className="flex items-baseline gap-1">
                        <Text size="6" weight="bold" className="text-[var(--gray-12)]">
                            {result.position !== null ? `#${result.position}` : '-'}
                        </Text>
                    </Box>
                </Box>

                {/* Share of Voice */}
                <Box className="p-4 bg-[var(--color-panel-solid)] border border-[var(--gray-4)] rounded-xl">
                    <Flex align="center" justify="between" mb="2">
                        <SectionLabel variant="modal" mb="0">Share of Voice</SectionLabel>
                        <Box className="w-6 h-6 bg-[var(--gray-3)] rounded-md flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-[var(--gray-11)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </Box>
                    </Flex>
                    <Box className="flex items-baseline gap-1">
                        <Text size="6" weight="bold" className="text-[var(--gray-12)]">
                            {getShareOfVoice(result)}%
                        </Text>
                    </Box>
                </Box>
            </Grid>
        );
    }

    // Row Layout (for Results Card)
    return (
        <MetricTriplet
            mentioned={result.mentioned}
            avgPosition={result.position}
            shareOfVoice={getShareOfVoice(result)}
            showIndicators={true}
            variant="compact"
            className="w-full border-t-0 pt-0 mt-0"
            labels={{
                mention: 'Mention',
                position: 'Position',
                sov: 'SOV'
            }}
            labelVariant={labelVariant}
        />
    );
}

/**
 * Handles deduplication and display of detected entities.
 */
export function AnalysisEntitiesList({ mentions, entityName, entityLogo, entityWebsite, variant = 'tags', className = '', layout = 'wrap' }: EntitiesProps) {
    const uniqueEntities = new Map<string, {
        name: string,
        position: number,
        isPrimary: boolean,
        detectedName: string,
        logoUrl?: string | null,
        website?: string | null
    }>();

    (mentions || []).forEach(m => {
        // Only show the primary entity + tracked competitors. Suggested-brand mentions
        // (no Competitor record) are surfaced separately in the Detected Brands panel.
        if (!isTrackedMention(m)) return;

        const canonicalName = m.isPrimaryEntity
            ? entityName
            : (m.competitor?.name || m.detectedName);

        const existing = uniqueEntities.get(canonicalName);
        const pos = m.position !== null && m.position !== undefined ? m.position : 9999;

        if (!existing || pos < existing.position) {
            uniqueEntities.set(canonicalName, {
                name: canonicalName,
                position: pos,
                isPrimary: m.isPrimaryEntity,
                detectedName: m.detectedName,
                logoUrl: m.isPrimaryEntity ? entityLogo : m.competitor?.logoUrl,
                website: m.isPrimaryEntity ? entityWebsite : m.competitor?.website
            });
        }
    });

    const sortedEntities = Array.from(uniqueEntities.values())
        .sort((a, b) => a.position - b.position);

    return (
        <PillList
            layout={variant === 'tags' ? layout : 'detailed'}
            className={className}
            emptyMessage={variant === 'tags' ? '-' : 'No entities detected'}
        >
            {sortedEntities.map((m, i) => variant === 'tags' ? (
                <EntityBadge
                    key={i}
                    name={m.name}
                    logoUrl={m.logoUrl}
                    website={m.website}
                    variant={m.isPrimary ? "primary" : "default"}
                    className="shrink-0"
                />
            ) : (
                <Flex key={i} align="center" justify="between" p="2" className="rounded-lg bg-[var(--gray-3)] hover:bg-gray-100 transition-colors">
                    <Text size="2" weight="medium" className={cn("flex items-center gap-2", m.isPrimary ? "text-green-700" : "text-gray-700")}>
                        {m.isPrimary && <Box className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        {m.name}
                    </Text>
                    {m.position !== 9999 && (
                        <Text size="1" weight="bold" className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            #{m.position}
                        </Text>
                    )}
                </Flex>
            ))}
        </PillList>
    );
}

/**
 * Handles display of source links.
 */
interface LinksProps {
    links: { url: string }[] | undefined;
    entityName: string;
    variant?: 'compact' | 'detailed';
    clickable?: boolean;
    className?: string;
    layout?: 'wrap' | 'single-row';
}

// ... (skipping to AnalysisLinksList)

export function AnalysisLinksList({ links = [], entityName, variant = 'compact', clickable = true, className = '', layout = 'wrap' }: LinksProps) {
    return (
        <PillList
            layout={variant === 'compact' ? layout : 'detailed'}
            className={className}
            emptyMessage={variant === 'compact' ? 'No links' : 'No sources found'}
        >
            {links.map((link, i) => (
                <SourceBadge
                    key={i}
                    url={link.url}
                    entityName={entityName}
                    clickable={clickable}
                />
            ))}
        </PillList>
    );
}

// Helper for top actions in Card
export function ShareOfVoiceBadge({ result }: { result: AnalysisResult }) {
    const sov = getShareOfVoice(result);
    return (
        <Text size="1" weight="medium" className="px-2 py-1 rounded-md bg-gray-100 text-gray-700">
            SOV: {sov}%
        </Text>
    );
}
