"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Flex } from '@radix-ui/themes';
import { cn } from "@/lib/utils";

/**
 * Z-index ladder for sticky headers. Headers defined first sit on top —
 * use `HEADER_Z_TOP` for the primary nav bar (back button + filters), and
 * `HEADER_Z_BRIEF` for any secondary strip (e.g. `<PageBrief>`) below it.
 * Inline magic numbers led to mismatched stacks across pages — these
 * constants keep every detail page consistent.
 */
export const HEADER_Z_TOP = 25;
export const HEADER_Z_BRIEF = 20;

export interface HeaderConfig {
    content: React.ReactNode;
    sticky?: boolean;
    className?: string;
    zIndex?: number;
}

interface PageContainerProps {
    children: React.ReactNode;
    /** @deprecated Use headers prop instead */
    stickyHeader?: React.ReactNode;
    headers?: HeaderConfig[];
    className?: string;
    /**
     * Disable the default bottom padding on the scroll area. Use when the page
     * manages its own bottom padding (e.g. a layout with a full-height side panel
     * whose background must reach the viewport bottom).
     */
    noContentPadding?: boolean;
}

/**
 * Standardized layout container for pages with fixed headers.
 * Headers sit above the scroll area — the scrollbar only appears
 * beside the content, not beside the header.
 */
export default function PageContainer({
    children,
    stickyHeader,
    headers = [],
    className,
    noContentPadding = false,
}: PageContainerProps) {
    // Backward compatibility for stickyHeader prop
    const activeHeaders = [...headers];
    if (stickyHeader && activeHeaders.length === 0) {
        activeHeaders.push({
            content: stickyHeader,
            sticky: true,
        });
    }

    return (
        <Flex direction="column" className={cn("h-full", className)}>
            {activeHeaders.map((header, index) => (
                <ScrollableHeader
                    key={index}
                    header={header}
                    index={index}
                />
            ))}
            <Box
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                    background: 'var(--color-background)',
                }}
                pb={noContentPadding ? '0' : { initial: '8', md: '4' }}
            >
                {children}
            </Box>
        </Flex>
    );
}

function ScrollableHeader({ header, index }: { header: HeaderConfig; index: number }) {
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const checkScroll = useCallback(() => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftFade(scrollLeft > 2);
            setShowRightFade(scrollLeft + clientWidth < scrollWidth - 2);
        }
    }, []);

    useEffect(() => {
        const currentRef = scrollRef.current;
        if (!currentRef) return;

        checkScroll();

        currentRef.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        const timer1 = setTimeout(checkScroll, 100);
        const timer2 = setTimeout(checkScroll, 500);

        return () => {
            currentRef.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [checkScroll, header.content]);

    const zIndex = header.zIndex ?? (30 - index);

    return (
        <Box
            style={{
                position: 'relative',
                zIndex,
                flexShrink: 0,
            }}
        >
            <Flex
                ref={scrollRef}
                align="center"
                className={cn(
                    "w-full border-b border-[var(--gray-a4)] page-header-scrollable",
                    "bg-[var(--gray-3)]",
                    header.className
                )}
                style={{
                    paddingLeft: 'var(--space-4)',
                    paddingRight: 'var(--space-4)',
                    minHeight: "var(--header-h)",
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    flexWrap: 'nowrap',
                    flexShrink: 0,
                    minWidth: 0,
                }}
            >
                {header.content}
            </Flex>

            {showLeftFade && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 1,
                        width: '32px',
                        pointerEvents: 'none',
                        zIndex: 40,
                        background: 'linear-gradient(to right, var(--gray-3), transparent)',
                    }}
                />
            )}
            {showRightFade && (
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 1,
                        width: '32px',
                        pointerEvents: 'none',
                        zIndex: 40,
                        background: 'linear-gradient(to left, var(--gray-3), transparent)',
                    }}
                />
            )}
        </Box>
    );
}
