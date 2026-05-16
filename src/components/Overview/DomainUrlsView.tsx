"use client";

import React from "react";
import { Box, Flex, Link, Text } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import type { UrlMetric } from "@/hooks/useSourceMetrics";

interface DomainUrlsViewProps {
    urls: UrlMetric[];
}

function parseUrl(url: string): { domain: string; path: string } {
    try {
        const parsed = new URL(url);
        const domain = parsed.hostname.replace(/^www\./, "");
        const path = parsed.pathname === "/" ? "" : parsed.pathname;
        return { domain, path };
    } catch {
        return { domain: url, path: "" };
    }
}

/**
 * Drawer body — list of URLs cited under a single domain.
 * Each row: path (or the bare domain for homepage links) + bar viz scaled to the most-cited URL +
 * absolute count. Click row → opens URL in new tab.
 *
 * Lives inside `<DetailDrawer>`, NOT inside the source table — avoids the
 * column-mismatch issues of inline expansion.
 */
export default function DomainUrlsView({ urls }: DomainUrlsViewProps) {
    if (urls.length === 0) {
        return (
            <Text size="2" color="gray">No URLs recorded for this domain yet.</Text>
        );
    }

    const maxCount = Math.max(...urls.map(u => u.count), 1);

    return (
        <Flex direction="column" gap="1">
            {urls.map((urlMetric) => {
                const { domain, path } = parseUrl(urlMetric.url);
                const barPct = Math.round((urlMetric.count / maxCount) * 100);
                const display = path || domain;

                return (
                    <Link
                        key={urlMetric.url}
                        href={urlMetric.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="none"
                        color="gray"
                        highContrast
                        className="group"
                        style={{
                            display: "block",
                            padding: "var(--space-2) var(--space-2)",
                            borderRadius: "var(--radius-2)",
                            transition: "background 120ms ease",
                        }}
                    >
                        <Flex align="center" gap="3">
                            <Box style={{ minWidth: 0, flex: 1 }}>
                                <Flex align="center" gap="1">
                                    <Text
                                        size="2"
                                        truncate
                                        style={{ color: "var(--gray-12)" }}
                                    >
                                        {display}
                                    </Text>
                                    <ExternalLinkIcon
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: "var(--gray-10)", flexShrink: 0 }}
                                    />
                                </Flex>
                            </Box>
                            <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
                                <Box
                                    style={{
                                        width: 64,
                                        height: 4,
                                        background: "var(--gray-a4)",
                                        borderRadius: 2,
                                    }}
                                >
                                    <Box
                                        style={{
                                            width: `${barPct}%`,
                                            height: "100%",
                                            background: "var(--accent-9)",
                                            borderRadius: 2,
                                        }}
                                    />
                                </Box>
                                <Text
                                    size="1"
                                    color="gray"
                                    weight="medium"
                                    className="tabular-nums"
                                    style={{ minWidth: 24, textAlign: "right" }}
                                >
                                    {urlMetric.count}
                                </Text>
                            </Flex>
                        </Flex>
                    </Link>
                );
            })}
        </Flex>
    );
}
