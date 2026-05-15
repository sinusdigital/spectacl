'use client';

import React from 'react';
import { Card, Flex, Heading, Text } from '@radix-ui/themes';

type CardVariant = 'classic' | 'surface' | 'ghost';
type CardSize = '1' | '2' | '3' | '4' | '5';
type SpacingScale = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type HeadingSize = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface SectionCardRootProps {
    children: React.ReactNode;
    /** Outer card visual variant. Defaults to "classic" (elevated, demo-aesthetic). */
    variant?: CardVariant;
    /** Radix Card size — controls native padding. Defaults to `"4"` (32px),
     *  matching the Radix Themes demo rhythm. */
    size?: CardSize;
    className?: string;
}

interface SectionCardHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    /** Heading visual size. Defaults to `"4"`. */
    titleSize?: HeadingSize;
    /** Semantic heading level. Defaults to `"h2"` — section headings sit
     *  under the page's `<h1>` (rendered by `PageBrief`). */
    titleAs?: HeadingTag;
    /** Bottom margin between header and body. Defaults to `"4"`. */
    mb?: SpacingScale;
}

/**
 * Single-pane section card. The same compositional pattern as `SplitCard`,
 * minus the multi-pane layout — for sections that don't have a side chart
 * or supplementary view (e.g. a wide table that owns the whole card).
 *
 * Header API is identical to `SplitCard.Header` — they're literally the
 * same component, re-exported under both namespaces.
 */
function SectionCardRoot({
    children,
    variant = 'classic',
    size = '4',
    className,
}: SectionCardRootProps) {
    return (
        <Card variant={variant} size={size} className={className}>
            {children}
        </Card>
    );
}

/**
 * Standard section header: title + optional description + optional right-side
 * actions. Accepts string or JSX for `title` / `description`. Strings get
 * wrapped in `<Heading>` / `<Text>` with project defaults.
 */
export function SectionCardHeader({
    title,
    description,
    actions,
    titleSize = '4',
    titleAs = 'h2',
    mb = '4',
}: SectionCardHeaderProps) {
    return (
        <Flex justify="between" align="start" gap="4" mb={mb}>
            <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                {typeof title === 'string' ? (
                    <Heading as={titleAs} size={titleSize} weight="bold">{title}</Heading>
                ) : (
                    title
                )}
                {description != null && (
                    typeof description === 'string' ? (
                        <Text size="2" color="gray">{description}</Text>
                    ) : (
                        description
                    )
                )}
            </Flex>
            {actions && (
                <Flex align="center" gap="2" style={{ flexShrink: 0 }}>{actions}</Flex>
            )}
        </Flex>
    );
}

const SectionCard = Object.assign(SectionCardRoot, {
    Header: SectionCardHeader,
});

export default SectionCard;
