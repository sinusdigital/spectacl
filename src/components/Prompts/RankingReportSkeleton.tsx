"use client";

import { Card, Grid, Flex, Box, Text, Badge, Spinner } from "@radix-ui/themes";
import CompanyLogo from "@/components/CompanyLogo";
import { Competitor } from "@/types/competitors";

interface RankingReportSkeletonProps {
    entityName?: string | null;
    entityLogoUrl?: string | null;
    entityWebsite?: string | null;
    competitors?: (Competitor & { primaryColor?: string | null })[] | null;
    progressStep?: string | null;
}

const FALLBACK_COPY = "AI is researching the market — usually under a minute. You can leave this page and come back.";

export default function RankingReportSkeleton({
    entityName,
    entityLogoUrl,
    entityWebsite,
    competitors,
    progressStep,
}: RankingReportSkeletonProps) {
    const rows = [
        ...(entityName
            ? [{ id: "__entity", name: entityName, logoUrl: entityLogoUrl, website: entityWebsite }]
            : []),
        ...(competitors ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            logoUrl: c.logoUrl,
            website: c.website,
        })),
    ].slice(0, 6);

    return (
        <Flex direction="column" gap="4">
            {/* Status banner */}
            <Card variant="surface" size="2">
                <Flex align="center" gap="3" p="1">
                    <Spinner size="2" />
                    <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="2" weight="bold">Running first analysis…</Text>
                        <Text size="1" color="gray">
                            {progressStep || FALLBACK_COPY}
                        </Text>
                    </Flex>
                    <Badge color="amber" variant="soft" size="1">In progress</Badge>
                </Flex>
            </Card>

            {/* Skeleton matching the real RankingReport shape so there's no layout shift on land */}
            <Card variant="surface" size="3" className="overflow-hidden !p-0">
                <Grid columns={{ initial: "1", lg: "3fr 2fr" }} gap="0">
                    {/* Chart placeholder */}
                    <Flex
                        direction="column"
                        p="5"
                        gap="4"
                        style={{ borderRight: "1px solid var(--gray-4)" }}
                    >
                        <Box style={{ height: 300, position: "relative" }}>
                            {/* faux gridlines */}
                            {[20, 40, 60, 80].map((pct) => (
                                <Box
                                    key={pct}
                                    style={{
                                        position: "absolute",
                                        top: `${pct}%`,
                                        left: 0,
                                        right: 0,
                                        height: 1,
                                        background: "var(--gray-3)",
                                    }}
                                />
                            ))}
                            {/* faux trend lines (shimmer) — 3 staggered lengths */}
                            <Box
                                className="ranking-skeleton-shimmer"
                                style={{
                                    position: "absolute",
                                    top: "28%",
                                    left: 0,
                                    width: "82%",
                                    height: 3,
                                    borderRadius: 2,
                                    animationDelay: "0ms",
                                }}
                            />
                            <Box
                                className="ranking-skeleton-shimmer"
                                style={{
                                    position: "absolute",
                                    top: "52%",
                                    left: 0,
                                    width: "62%",
                                    height: 3,
                                    borderRadius: 2,
                                    animationDelay: "180ms",
                                }}
                            />
                            <Box
                                className="ranking-skeleton-shimmer"
                                style={{
                                    position: "absolute",
                                    top: "76%",
                                    left: 0,
                                    width: "94%",
                                    height: 3,
                                    borderRadius: 2,
                                    animationDelay: "360ms",
                                }}
                            />
                        </Box>
                    </Flex>

                    {/* Table placeholder — uses real competitor names + logos */}
                    <Box p="5">
                        <Flex direction="column" gap="3">
                            <Flex justify="between" px="2" pb="1" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                                <Text size="1" weight="bold" color="gray">Competitors</Text>
                                <Text size="1" weight="bold" color="gray">Position</Text>
                            </Flex>
                            {rows.length === 0 ? (
                                // No competitors known yet — show 5 fully-skeletal rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Flex key={i} align="center" justify="between" px="2" py="1">
                                        <Flex align="center" gap="2" style={{ flex: 1 }}>
                                            <Box
                                                className="ranking-skeleton-shimmer"
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: "50%",
                                                    animationDelay: `${i * 80}ms`,
                                                }}
                                            />
                                            <Box
                                                className="ranking-skeleton-shimmer"
                                                style={{
                                                    width: `${50 + ((i * 13) % 30)}%`,
                                                    height: 12,
                                                    borderRadius: 3,
                                                    animationDelay: `${i * 80 + 60}ms`,
                                                }}
                                            />
                                        </Flex>
                                        <Box
                                            className="ranking-skeleton-shimmer"
                                            style={{
                                                width: 28,
                                                height: 14,
                                                borderRadius: "var(--radius-2)",
                                                animationDelay: `${i * 80 + 120}ms`,
                                            }}
                                        />
                                    </Flex>
                                ))
                            ) : (
                                rows.map((row, i) => (
                                    <Flex key={row.id} align="center" justify="between" px="2" py="1">
                                        <Flex align="center" gap="2" style={{ flex: 1, minWidth: 0 }}>
                                            <CompanyLogo
                                                name={row.name}
                                                logoUrl={row.logoUrl ?? undefined}
                                                domain={row.website ?? undefined}
                                                size={20}
                                                radius="full"
                                                className="flex-shrink-0"
                                            />
                                            <Text size="2" weight="medium" color="gray" highContrast truncate>
                                                {row.name}
                                            </Text>
                                        </Flex>
                                        <Box
                                            className="ranking-skeleton-shimmer"
                                            style={{
                                                width: 28,
                                                height: 14,
                                                borderRadius: "var(--radius-2)",
                                                animationDelay: `${i * 80}ms`,
                                                flexShrink: 0,
                                            }}
                                        />
                                    </Flex>
                                ))
                            )}
                        </Flex>
                    </Box>
                </Grid>
            </Card>
        </Flex>
    );
}
