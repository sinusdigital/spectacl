"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Box, Flex, Heading, Text, VisuallyHidden } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

interface DetailDrawerProps {
    /** Controlled open state. */
    open: boolean;
    /** Called with `false` when the user dismisses (Esc, click-outside, X button). */
    onOpenChange: (open: boolean) => void;
    /** Drawer header — typically a title row with logo + name. Required for
     *  accessibility (becomes the dialog's `<title>`). String → wrapped in
     *  `<Heading size="4">`; JSX rendered as-is. */
    title: React.ReactNode;
    /** Optional one-line subtitle under the title. */
    description?: React.ReactNode;
    /** Optional right-side actions in the header (e.g. a context-menu button). */
    headerActions?: React.ReactNode;
    /** Drawer body. Rendered inside a scrollable region below the sticky header. */
    children: React.ReactNode;
    /** Width on desktop. Defaults to `480` (px). Mobile is full-width below `md`. */
    width?: number;
    /** Optional accessibility description for screen readers when no visible
     *  `description` is provided. */
    a11yDescription?: string;
}

/**
 * Right-side overlay drawer for detail views.
 *
 * Use when clicking a row should reveal supplementary detail without
 * disrupting the underlying page layout (e.g. URLs cited per domain on
 * the Sources card, full activity log per analysis result, etc.).
 *
 * Wraps Radix Dialog primitive — get focus trap, Escape dismiss, and
 * click-outside dismiss for free. Slide animation via the
 * `slideInRight` / `slideOutRight` keyframes in globals.css.
 *
 * Distinct from `<SidePanel>`: that's an inline collapsible aside
 * (always present, just rail-or-expanded). `DetailDrawer` is transient —
 * doesn't exist when `open` is false. Reach for `SidePanel` when the
 * panel is part of the page layout; reach for `DetailDrawer` when it's
 * triggered by a selection.
 */
export default function DetailDrawer({
    open,
    onOpenChange,
    title,
    description,
    headerActions,
    children,
    width = 480,
    a11yDescription,
}: DetailDrawerProps) {
    // Portal target: the existing `.radix-themes` element, so the drawer
    // renders INSIDE the project's Theme scope. CSS variables cascade
    // naturally — no need for an inner `<Theme>` re-application, which we
    // previously added but which interfered with Radix's effect cleanup
    // (the inner Theme's mount/unmount lifecycle desynced with `react-remove-
    // scroll`'s ref-counted body lock, leaving the dialog stuck open).
    const [container, setContainer] = React.useState<HTMLElement | null>(null);
    React.useEffect(() => {
        setContainer(document.querySelector<HTMLElement>(".radix-themes"));
    }, []);

    // Defensive: clear any leftover `pointer-events: none` on body after close.
    // Belt-and-suspenders if Radix's own cleanup misfires.
    React.useEffect(() => {
        if (open) return;
        const id = window.requestAnimationFrame(() => {
            if (document.body.style.pointerEvents === "none") {
                document.body.style.pointerEvents = "";
            }
        });
        return () => window.cancelAnimationFrame(id);
    }, [open]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={container}>
                <Dialog.Overlay
                    className="detail-drawer-overlay"
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.32)",
                        zIndex: 200,
                    }}
                />
                <Dialog.Content
                    className="detail-drawer-content"
                    // Bypass Radix's default focus return — when the dialog
                    // closes, focus tries to return to a trigger that may not
                    // exist (we open programmatically via state). Letting it run
                    // can leave the body's pointer-events lock stuck.
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    style={{
                        position: "fixed",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        // CSS clamp gives mobile a full-width drawer; desktop caps at the prop width.
                        width: `min(100vw, ${width}px)`,
                        backgroundColor: "var(--gray-1)",
                        boxShadow: "var(--shadow-5)",
                        zIndex: 210,
                        display: "flex",
                        flexDirection: "column",
                        outline: "none",
                    }}
                >
                    {/* No inner <Theme> wrapper — we Portal into `.radix-themes`
                        above so CSS variables and the project's Theme settings
                        cascade naturally. Removing the inner Theme also fixes
                        a Radix close-cascade bug where the Theme's
                        mount/unmount lifecycle desynced with `react-remove-
                        scroll`'s ref-counted body lock. */}
                        {/* Sticky header — stays put while body scrolls.
                            Padding `p="5"` (24px) matches the body's rhythm and
                            gives heading descenders (g, y, p) room — earlier
                            tighter padding clipped them. */}
                        <Flex
                            align="start"
                            justify="between"
                            gap="3"
                            p="5"
                            style={{
                                borderBottom: "1px solid var(--gray-a4)",
                                flexShrink: 0,
                            }}
                        >
                            <Box style={{ minWidth: 0, flex: 1 }}>
                                {/* When `title` is a string we own the heading element
                                    (via asChild + Heading). When it's JSX (caller
                                    composes their own logo/heading/badge), Dialog.Title
                                    renders its default h2 wrapper around the JSX —
                                    Radix uses the wrapper's text content as the
                                    dialog's accessible name. */}
                                {typeof title === "string" ? (
                                    <Dialog.Title asChild>
                                        <Heading as="h2" size="4" weight="bold" trim="both">
                                            {title}
                                        </Heading>
                                    </Dialog.Title>
                                ) : (
                                    <Dialog.Title>{title}</Dialog.Title>
                                )}
                                {description ? (
                                    <Dialog.Description asChild>
                                        <Text as="p" size="2" color="gray" mt="1">
                                            {description}
                                        </Text>
                                    </Dialog.Description>
                                ) : (
                                    <VisuallyHidden>
                                        <Dialog.Description>
                                            {a11yDescription ?? "Detail panel"}
                                        </Dialog.Description>
                                    </VisuallyHidden>
                                )}
                            </Box>
                            <Flex align="center" gap="1" style={{ flexShrink: 0 }}>
                                {headerActions}
                                {/* Vanilla `Dialog.Close` rendering its own
                                    button. Earlier asChild + Radix Themes
                                    `IconButton` setups left the close click
                                    intermittently failing to fire Radix's
                                    internal `setOpen(false)` — the layered
                                    handlers in Themes interactive components
                                    can swallow the slot-merged onClick. A
                                    plain styled button removes that chain. */}
                                <Dialog.Close
                                    aria-label="Close drawer"
                                    className="rt-reset"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 32,
                                        height: 32,
                                        borderRadius: "var(--radius-2)",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--gray-11)",
                                        padding: 0,
                                        transition: "background-color 120ms ease, color 120ms ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "var(--gray-a3)";
                                        e.currentTarget.style.color = "var(--gray-12)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.color = "var(--gray-11)";
                                    }}
                                >
                                    <Cross2Icon />
                                </Dialog.Close>
                            </Flex>
                        </Flex>

                        {/* Scrollable body. `p="5"` matches header rhythm. */}
                        <Box style={{ flex: 1, overflowY: "auto", minHeight: 0 }} p="5">
                            {children}
                        </Box>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
