"use client";

import React from "react";
import { Box, Flex } from "@radix-ui/themes";

interface TwoColumnPageProps {
    /** Aside content (typically a `<SidePanel>`). Hidden below the `md` breakpoint. */
    aside: React.ReactNode;
    /** Main column content. */
    children: React.ReactNode;
    /** Which side the aside renders on. Default `"right"`. */
    asidePosition?: "left" | "right";
}

/**
 * Two-column page layout: main column + sticky/collapsible aside.
 *
 * Must live inside a `<PageContainer noContentPadding>` so the aside's
 * background and border can reach the viewport bottom. The main column owns
 * its own bottom padding (matching what PageContainer would have applied)
 * so the aside can extend full-bleed without an awkward gap below it.
 *
 * Below the `md` breakpoint the aside is hidden — pages are expected to
 * render its content inline above the main column at small sizes.
 *
 * `asidePosition`:
 *  - `"right"` (default) — main on left, aside on right (e.g. /prompts)
 *  - `"left"` — aside on left, main on right (e.g. /[entityId]/suggestions
 *    where the sidebar acts like a Jira-style backlog filter nav)
 */
export default function TwoColumnPage({ aside, children, asidePosition = "right" }: TwoColumnPageProps) {
    const asideBox = (
        <Box display={{ initial: "none", md: "block" }}>{aside}</Box>
    );
    const mainBox = (
        <Box flexGrow="1" minWidth="0" pb={{ initial: "8", md: "4" }}>
            {children}
        </Box>
    );

    return (
        <Flex direction="row" align="stretch" style={{ minHeight: "100%" }}>
            {asidePosition === "left" ? (
                <>
                    {asideBox}
                    {mainBox}
                </>
            ) : (
                <>
                    {mainBox}
                    {asideBox}
                </>
            )}
        </Flex>
    );
}
