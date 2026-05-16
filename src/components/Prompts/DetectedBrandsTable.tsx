"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Flex, Spinner, Text } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";
import CompanyLogo from "@/components/CompanyLogo";
import RadixTable from "@/components/Shared/RadixTable";
import SplitCard from "@/components/Shared/SplitCard";
import { MentionMetric, PositionMetric } from "@/components/Shared/MetricTriplet";
import BrandsBarChart from "@/components/Charts/BrandsBarChart";
import { useToast } from "@/components/Shared/RadixToast";
import type { TimeRangeType } from "@/components/Shared/FilterBar";

const PAGE_SIZE = 10;

interface DetectedBrand {
    normalizedKey: string;
    canonicalName: string;
    mentionCount: number;
    runCount: number;
    coveragePct: number;
    avgPosition: number | null;
    lastSeenAt: string;
    status: "self" | "tracked" | "suggested" | "untracked" | "new";
    competitorId: string | null;
    competitorWebsite: string | null;
    competitorLogoUrl: string | null;
    suggestedCompetitorId: string | null;
    suggestedWebsite: string | null;
    brandColor: string | null;
}

interface ApiResponse {
    totalRuns: number;
    brands: DetectedBrand[];
}

interface Props {
    promptId: string;
    entityId: string;
    /** Page-level 7d/30d/90d toggle. Forwarded to the API so this view
     *  agrees with the overview chart's mention-rate calculation. */
    timeRange?: TimeRangeType;
    /** Page-level model filter. Empty / undefined = all models. */
    modelFilter?: string[];
    /** True when the prompt still has analysis runs in flight (pending/running/
     *  queued status). The detected-brands API only counts *completed* results,
     *  so on a freshly-run prompt totalRuns will be 0 even though brand detection
     *  is just delayed. We use this signal to keep the section visible with a
     *  "scanning" state instead of hiding it (which felt like the feature broke). */
    hasPendingRuns?: boolean;
    /** Bump to trigger a refetch (e.g. when the parent observes more runs
     *  completing). Pairs with `useOverviewMetrics`'s refresh signal. */
    refreshKey?: number | string;
}

export default function DetectedBrandsTable({ promptId, entityId, timeRange = '30d', modelFilter, hasPendingRuns = false, refreshKey }: Props) {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    const refetch = useCallback(async () => {
        try {
            const apiTimeframe = timeRange === '7d' ? 'weekly' : timeRange === '90d' ? 'extended' : 'standard';
            const params = new URLSearchParams({ timeframe: apiTimeframe });
            if (modelFilter && modelFilter.length > 0) params.set('models', modelFilter.join(','));
            const res = await fetch(`/api/prompts/${promptId}/detected-brands?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load");
            setData(await res.json());
        } catch (err) {
            console.error("[DetectedBrandsTable] load failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [promptId, timeRange, modelFilter]);

    useEffect(() => {
        refetch();
    // refreshKey is intentional in the dep array — bumping it from the parent
    // re-runs the fetch as more analysis runs complete.
     
    }, [refetch, refreshKey]);

    const brands = data?.brands ?? [];

    // Sort by average position ascending. Null positions (suggested-only brands with
    // no parser-detected ranking) sort to the bottom.
    const visibleBrands: DetectedBrand[] = [...brands].sort((a, b) => {
        const aPos = a.avgPosition ?? Infinity;
        const bPos = b.avgPosition ?? Infinity;
        return aPos - bPos;
    });

    const paginatedBrands = visibleBrands.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleTrack = async (brand: DetectedBrand) => {
        setPendingKey(brand.normalizedKey);
        try {
            const website = brand.suggestedWebsite ?? null;
            const res = await fetch(`/api/entities/${entityId}/competitors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    names: brand.canonicalName,
                    competitors: [{ name: brand.canonicalName, website }],
                }),
            });
            if (!res.ok) throw new Error("Track failed");

            // Mirror tracking state onto the SuggestedCompetitor row if one exists,
            // so the Competitors page reflects the change immediately.
            if (brand.suggestedCompetitorId) {
                await fetch(`/api/suggestions/${brand.suggestedCompetitorId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "tracked" }),
                });
            }

            success(
                `Tracking ${brand.canonicalName}`,
                "Re-running historical analyses to populate metrics.",
            );
            refetch();
        } catch (err) {
            console.error(err);
            toastError("Track failed", "Could not add competitor. Try again.");
        } finally {
            setPendingKey(null);
        }
    };

    // Always render the section. Earlier we hid it when `totalRuns === 0`,
    // which made the panel disappear for freshly-run prompts (pending results
    // don't count toward `totalRuns`) and only reappear after a page reload.
    // Now the panel stays visible and the body explains the state.
    const totalRuns = data?.totalRuns ?? 0;
    const isScanning = !isLoading && totalRuns === 0 && hasPendingRuns;
    const hasBrands = !isLoading && visibleBrands.length > 0;

    const tableBody = isLoading ? (
        <Text size="2" color="gray">Loading detected brands…</Text>
    ) : isScanning ? (
        <Flex align="center" gap="2">
            <Spinner size="1" />
            <Text size="2" color="gray">
                Scanning answers for brands — results will appear as runs complete.
            </Text>
        </Flex>
    ) : visibleBrands.length === 0 ? (
        <Text size="2" color="gray">
            No brands detected yet — run this prompt to see what comes up.
        </Text>
    ) : (
        <>
            <RadixTable.Root variant="ghost">
                <RadixTable.Header>
                    <RadixTable.Row>
                        <RadixTable.Head variant="modal">Brand</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="130px" className="border-l border-[var(--gray-a4)] pl-4">Mention Rate</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="140px">Average Position</RadixTable.Head>
                        <RadixTable.Head variant="modal" width="110px" className="border-l border-[var(--gray-a4)] pl-4">Status</RadixTable.Head>
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {paginatedBrands.map(brand => (
                        <BrandRow
                            key={brand.normalizedKey}
                            brand={brand}
                            onTrack={handleTrack}
                            isPending={pendingKey === brand.normalizedKey}
                        />
                    ))}
                </RadixTable.Body>
            </RadixTable.Root>
            <RadixTable.Pagination
                currentPage={currentPage}
                total={visibleBrands.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                label="brands"
            />
        </>
    );

    return (
        <SplitCard ratio={[2, 1]}>
            <SplitCard.Pane>
                <SplitCard.Header
                    title="Detected brands"
                    description={
                        isScanning
                            ? "Brands will appear as analysis runs complete."
                            : `Every brand that surfaced across ${totalRuns} runs, including tracked competitors.`
                    }
                />
                {tableBody}
            </SplitCard.Pane>
            {hasBrands && (
                <SplitCard.Pane>
                    <SplitCard.Header
                        title="Mention Rate"
                        description={`${brands.length} brands`}
                    />
                    <BrandsBarChart data={visibleBrands} totalBrands={brands.length} headerless />
                </SplitCard.Pane>
            )}
        </SplitCard>
    );
}

function BrandRow({
    brand,
    onTrack,
    isPending,
}: {
    brand: DetectedBrand;
    onTrack: (brand: DetectedBrand) => void;
    isPending: boolean;
}) {
    const website = brand.competitorWebsite ?? brand.suggestedWebsite ?? null;
    // Track action only makes sense for brands the user hasn't already pulled in
    // and isn't their own. Hover-revealed so the row stays calm when idle.
    const canTrack = brand.status !== 'self' && brand.status !== 'tracked';

    return (
        <RadixTable.Row align="center" className="group">
            <RadixTable.Cell>
                <Flex align="center" justify="between" gap="2">
                    <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                        <CompanyLogo
                            domain={website}
                            name={brand.canonicalName}
                            logoUrl={brand.competitorLogoUrl}
                            size={24}
                            radius="full"
                        />
                        <Text size="2" weight="medium" truncate>{brand.canonicalName}</Text>
                    </Flex>
                    {canTrack && (
                        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onTrack(brand)}
                                isLoading={isPending}
                                loadingText="Adding..."
                            >
                                Track
                            </Button>
                        </div>
                    )}
                </Flex>
            </RadixTable.Cell>

            <RadixTable.Cell className="border-l border-[var(--gray-a4)] pl-4">
                <MentionMetric
                    value={brand.coveragePct}
                    showLabel={false}
                    flex={false}
                />
            </RadixTable.Cell>

            <RadixTable.Cell>
                <PositionMetric
                    value={brand.avgPosition ?? undefined}
                    showLabel={false}
                    flex={false}
                />
            </RadixTable.Cell>

            <RadixTable.Cell className="border-l border-[var(--gray-a4)] pl-4">
                <StatusBadge status={brand.status} />
            </RadixTable.Cell>
        </RadixTable.Row>
    );
}

function StatusBadge({ status }: { status: DetectedBrand["status"] }) {
    switch (status) {
        case "self":
            return <Badge color="iris" variant="soft" size="1">Your brand</Badge>;
        case "tracked":
            return <Badge color="green" variant="soft" size="1">Tracked</Badge>;
        case "suggested":
            return <Badge color="amber" variant="soft" size="1">Suggested</Badge>;
        case "untracked":
            return <Badge color="gray" variant="outline" size="1">Dismissed</Badge>;
        case "new":
            return <Badge color="blue" variant="soft" size="1">New</Badge>;
    }
}
