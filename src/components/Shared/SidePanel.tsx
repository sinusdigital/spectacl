"use client";

import React from "react";
import { Box, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import {
    DoubleArrowLeftIcon,
    DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { useReducedMotion } from "motion/react";
import { useSidePanelState } from "@/hooks/useSidePanelState";

const DEFAULT_RAIL_WIDTH = 40;
const DEFAULT_PANEL_WIDTH = 320;

export interface SidePanelProps {
    /** localStorage key used to persist open/closed state across visits. */
    stateKey: string;
    /** Open on first visit when no stored preference exists. */
    defaultOpen?: boolean;
    /** Shown at the top of the expanded panel, left-aligned. Title + optional badge. */
    header?: React.ReactNode;
    /** Optional one-line subtitle under the header. */
    description?: React.ReactNode;
    /** Shown below the top chevron in the collapsed rail. Usually a count Badge. */
    railBadge?: React.ReactNode;
    /** Tooltip shown on hover of the collapsed rail. Describes what's behind it. */
    railTooltip?: React.ReactNode;
    /** Width overrides. Defaults to 40 (rail) / 320 (panel). */
    widths?: { rail?: number; panel?: number };
    /** Which edge of the page the panel attaches to. Default `"right"`. */
    position?: "left" | "right";
    /** When false, the panel is always open — no hide button, no rail mode,
     *  no shadow (sits flat like the main app sidebar). Header row is
     *  suppressed entirely if there's no `header` content to show.
     *  Defaults to `true` (collapsible behavior preserved for existing callers). */
    collapsible?: boolean;
    /** Body content shown when the panel is expanded. */
    children: React.ReactNode;
}

/**
 * Collapsible right-edge side panel, pinned to the top of its scroll parent.
 *
 * The shell owns the stretch-fill (bg + border reach viewport bottom), the
 * sticky-inner container, the width animation, the open/collapsed toggle, and
 * the persistence hook. Callers supply header + body content.
 *
 * Requires the parent page layout to provide a definite height (e.g. a
 * `<Flex align="stretch" style={{ minHeight: '100%' }}>` inside a
 * `PageContainer noContentPadding`). See `<TwoColumnPage>` for the standard
 * wrapper.
 */
export default function SidePanel({
    stateKey,
    defaultOpen = true,
    header,
    description,
    railBadge,
    railTooltip,
    widths,
    position = "right",
    collapsible = true,
    children,
}: SidePanelProps) {
    const prefersReducedMotion = useReducedMotion() ?? false;
    const stored = useSidePanelState(stateKey, defaultOpen);
    // When non-collapsible, force-open and ignore stored state.
    const isOpen = collapsible ? stored.isOpen : true;
    const setOpen = stored.setOpen;
    const toggle = stored.toggle;

    const railWidth = widths?.rail ?? DEFAULT_RAIL_WIDTH;
    const panelWidth = widths?.panel ?? DEFAULT_PANEL_WIDTH;

    // Edge-pinning: when on the left, the visible border is the right edge
    // (and vice versa). Chevron icons reflect spatial direction so the user
    // sees an arrow pointing toward the action's destination.
    const edgeBorder = position === "left"
        ? { borderRight: "1px solid var(--gray-a4)" }
        : { borderLeft: "1px solid var(--gray-a4)" };
    const HideIcon = position === "left" ? DoubleArrowLeftIcon : DoubleArrowRightIcon;
    const RailIcon = position === "left" ? DoubleArrowRightIcon : DoubleArrowLeftIcon;
    const railTooltipSide = position === "left" ? "right" : "left";

    return (
        // Outer wrapper: fills its wrapping flex-item parent so the border + background
        // reach the row's full height even when the content inside is short.
        // Border + shadow match DetailDrawer for visual consistency between
        // inline asides (this) and transient overlays (DetailDrawer).
        <Box
            style={{
                width: isOpen ? panelWidth : railWidth,
                flexShrink: 0,
                height: "100%",
                minHeight: "100%",
                ...edgeBorder,
                background: "var(--gray-1)",
                // Shadow only when expanded AND collapsible — non-collapsible
                // panels sit flat like the main app sidebar; collapsed rails
                // also stay flat so they don't look like a floating overlay.
                boxShadow: isOpen && collapsible ? "var(--shadow-5)" : "none",
                transition: prefersReducedMotion ? "none" : "width 250ms ease-out",
                alignSelf: "stretch",
            }}
        >
            {/* Inner sticky container: the actual interactive panel; sticks to
                top of the scroll area and caps its own height to the viewport. */}
            <Box
                style={{
                    position: "sticky",
                    top: 0,
                    maxHeight: "calc(100vh - var(--header-h))",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {isOpen ? (
                    <Flex direction="column" gap="3" p="3" style={{ height: "100%", minHeight: 0 }}>
                        {/* Header row only when there's a header to show OR a hide button to render */}
                        {(header || collapsible) && (
                            <Flex align="center" justify="between" gap="2">
                                <Box style={{ minWidth: 0, flex: 1 }}>{header}</Box>
                                {collapsible && (
                                    <Tooltip content="Hide panel">
                                        <IconButton
                                            variant="ghost"
                                            color="gray"
                                            size="1"
                                            onClick={() => setOpen(false)}
                                            aria-label="Hide panel"
                                        >
                                            <HideIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Flex>
                        )}

                        {description && (
                            <Text size="1" color="gray">{description}</Text>
                        )}

                        {children}
                    </Flex>
                ) : (
                    // Collapsed rail: chevron at top + optional badge below.
                    // Whole rail is the click target; stacking chevron+badge at
                    // the top mirrors the hide-button position so muscle memory holds.
                    // Tooltip wraps just the icon cluster so it anchors correctly
                    // (tall rail button would center the tooltip mid-page).
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={toggle}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggle();
                            }
                        }}
                        aria-label="Show panel"
                        className="cursor-pointer"
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            paddingTop: "var(--space-3)",
                        }}
                    >
                        <Tooltip content={railTooltip ?? "Show panel"} side={railTooltipSide}>
                            <Flex direction="column" align="center" gap="1">
                                <RailIcon color="var(--gray-11)" />
                                {railBadge}
                            </Flex>
                        </Tooltip>
                    </div>
                )}
            </Box>
        </Box>
    );
}
