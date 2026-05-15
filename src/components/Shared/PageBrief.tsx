import React from 'react';
import { Flex, Heading, Text, Separator } from '@radix-ui/themes';

export interface PageBriefMetric {
    label: string;
    value: React.ReactNode;
}

interface PageBriefProps {
    /** Small kicker label above the description (e.g. "Prompt", "Report"). */
    label?: string;
    /** The page's main subject — rendered as the document `<h1>` when `label` is set.
     *  Optional: pages that surface the description elsewhere (e.g. inside the sticky
     *  header) can omit this and use PageBrief as a metrics-only strip. */
    description?: string;
    /** Right-side label/value pairs (live summary metrics). */
    metrics?: PageBriefMetric[];
    /** Right-side action(s) (e.g. an Edit button). Rendered after `metrics`,
     *  separated by a vertical `<Separator>` if both are present. */
    actions?: React.ReactNode;
    /** When true, skip the component's own background / border / padding —
     *  for use inside a parent that already provides them (e.g. as the
     *  `content` of a `PageContainer.headers` config so the brief can be
     *  sticky without the scrollbar running through it). */
    unstyled?: boolean;
}

/**
 * Compact horizontal strip below the sticky header.
 * Left: contextual description (becomes page `<h1>` when `label` is provided).
 * Right: live summary metrics + optional actions.
 *
 * Two placements supported:
 *   1. As a child of `PageContainer` — scrolls with content, uses its own
 *      gray-2 bg + bottom border + padding. (Default.)
 *   2. As the `content` of a `PageContainer.headers` entry — pass `unstyled`
 *      so the wrapping `ScrollableHeader` provides the chrome and the brief
 *      stays sticky without the scrollbar passing through.
 */
export default function PageBrief({
    label,
    description,
    metrics = [],
    actions,
    unstyled = false,
}: PageBriefProps) {
    const containerStyle = unstyled
        ? { width: '100%' }
        : {
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--gray-a4)',
            background: 'var(--gray-2)',
            flexShrink: 0,
        };

    return (
        <Flex
            direction={{ initial: 'column', md: 'row' }}
            align={{ initial: 'start', md: 'center' }}
            justify="between"
            gap={{ initial: '3', md: '6' }}
            py={unstyled ? '3' : undefined}
            style={containerStyle}
        >
            {(label || description) && (
                <Flex direction="column" gap="0" style={{ maxWidth: 560, minWidth: 0 }}>
                    {label && <Text size="1" color="gray">{label}</Text>}
                    {label && description ? (
                        <Heading as="h1" size="3" weight="bold" trim="both">
                            {description}
                        </Heading>
                    ) : description ? (
                        <Text size="2" color="gray">{description}</Text>
                    ) : null}
                </Flex>
            )}

            {(metrics.length > 0 || actions) && (
                <Flex align="center" gap="4" style={{ flexShrink: 0 }} wrap="wrap">
                    {metrics.map((metric, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <Separator orientation="vertical" size="1" />}
                            <Flex direction="column" align={{ initial: 'start', md: 'end' }} gap="0">
                                <Text size="1" color="gray">{metric.label}</Text>
                                <Text size="2" weight="bold">{metric.value}</Text>
                            </Flex>
                        </React.Fragment>
                    ))}
                    {actions && metrics.length > 0 && <Separator orientation="vertical" size="1" />}
                    {actions}
                </Flex>
            )}
        </Flex>
    );
}
