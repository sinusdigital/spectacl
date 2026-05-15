'use client';

import React from 'react';
import { Card, Flex, Box } from '@radix-ui/themes';
import { cn } from '@/lib/utils';
import { SectionCardHeader } from './SectionCard';

type CardVariant = 'classic' | 'surface' | 'ghost';
type CardSize = '1' | '2' | '3' | '4' | '5';

interface SplitCardRootProps {
    children: React.ReactNode;
    /** Outer card visual variant. Defaults to "classic" (elevated, demo-aesthetic). */
    variant?: CardVariant;
    /** Radix Card size — controls the outer card's native padding. Defaults
     *  to `"4"` (32px) to match the Radix Themes demo rhythm. We rely on
     *  Radix's own padding rather than overriding to `!p-0` and reimposing
     *  per-pane padding — keeps us closer to Radix conventions. */
    size?: CardSize;
    /** Flex-grow ratio per pane. Length should match the number of panes.
     *  Omit for an even split. e.g. `[2, 1]` → left pane 2/3, right 1/3. */
    ratio?: number[];
    className?: string;
}

interface SplitCardPaneProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Multi-pane card with a vertical separator between panes.
 * Uses Radix `<Card>`'s native padding via the `size` prop — panes sit
 * inside the card's padding box and the divider is inset (matches the
 * Radix Themes demo rhythm where horizontal separators inside cards are
 * also inset, not edge-to-edge).
 *
 * Layout mechanics:
 *   - `<Card size="3">` (default) supplies the outer padding (24px).
 *   - Outer Flex uses `align="stretch"` (default) so panes match each
 *     other's heights — the taller pane sets the row height, the shorter
 *     stretches to match.
 *   - The divider is a `<div>` with `align-self: stretch` rather than
 *     Radix `<Separator size="4">`: the Radix component sets `height:
 *     100%`, which collapses to 0 when the parent's height is content-
 *     based (our case). `align-self: stretch` is the reliable way to
 *     fill cross-axis space in a flex row.
 *   - On mobile the panes stack column-wise and the divider flips to a
 *     horizontal 1px line via the responsive Tailwind classes.
 */
function SplitCardRoot({
    children,
    variant = 'classic',
    size = '4',
    ratio,
    className,
}: SplitCardRootProps) {
    const panes = React.Children.toArray(children).filter(
        (c): c is React.ReactElement => React.isValidElement(c),
    );

    return (
        <Card variant={variant} size={size} className={className}>
            <Flex
                direction={{ initial: 'column', md: 'row' }}
                align="stretch"
                gap="4"
            >
                {panes.map((pane, i) => {
                    const grow = ratio?.[i] ?? 1;
                    return (
                        <React.Fragment key={i}>
                            <Box
                                style={{
                                    flexGrow: grow,
                                    flexBasis: 0,
                                    minWidth: 0,
                                    // Make the wrapper a flex column so children
                                    // (Pane → Header + body) can flex-grow inside it.
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {pane}
                            </Box>
                            {i < panes.length - 1 && (
                                <div
                                    role="separator"
                                    aria-orientation="vertical"
                                    className="bg-[var(--gray-a5)] w-full h-px md:w-px md:h-auto md:self-stretch shrink-0"
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </Flex>
        </Card>
    );
}

/**
 * One pane inside a `SplitCard`. Flex column that fills its wrapper's height
 * (`flex-1 min-h-0`) so a body element (chart, list) inside can `flex-grow`
 * to consume remaining space below the header.
 */
function SplitCardPane({ children, className }: SplitCardPaneProps) {
    return <div className={cn('flex flex-col flex-1 min-h-0 min-w-0', className)}>{children}</div>;
}

// `SplitCard.Header` and `SectionCard.Header` are the same component — single
// source of truth in `SectionCard.tsx`. Keeps section headers identical
// regardless of whether the surrounding card is single-pane or split.
const SplitCard = Object.assign(SplitCardRoot, {
    Pane: SplitCardPane,
    Header: SectionCardHeader,
});

export default SplitCard;
