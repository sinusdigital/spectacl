"use client";

import { useMemo } from 'react';
import { Flex, Text, IconButton, Button } from '@radix-ui/themes';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';

interface MonthCyclerProps {
    /** Sorted ascending array of YYYY-MM strings, e.g. ['2025-11', '2025-12', '2026-01'] */
    periods: string[];
    selected: string;
    onChange: (period: string) => void;
}

function formatPeriod(yyyyMM: string): string {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthCycler({ periods, selected, onChange }: MonthCyclerProps) {
    const currentIndex = useMemo(
        () => periods.indexOf(selected),
        [periods, selected]
    );

    const latestIndex = periods.length - 1;
    const isLatest = currentIndex === latestIndex;
    const isOldest = currentIndex === 0;

    const canGoPrev = !isOldest;
    const canGoNext = !isLatest;

    function prev() {
        if (canGoPrev) onChange(periods[currentIndex - 1]);
    }

    function next() {
        if (canGoNext) onChange(periods[currentIndex + 1]);
    }

    function goLatest() {
        onChange(periods[latestIndex]);
    }

    // Previous neighbour: exists in data — clickable
    const prevPeriod = currentIndex > 0 ? periods[currentIndex - 1] : null;
    // Next neighbour: either next data period, or one calendar month ahead (future, not clickable)
    const nextPeriod = currentIndex < latestIndex ? periods[currentIndex + 1] : null;
    const futurePeriod = useMemo(() => {
        if (nextPeriod) return null; // already have a real next period
        const [year, month] = selected.split('-').map(Number);
        const next = new Date(year, month, 1); // month is 0-indexed, so month = next month
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    }, [selected, nextPeriod]);

    if (periods.length === 0) return null;

    return (
        <Flex align="center" gap="2">
            {/* Prev arrow */}
            <IconButton
                variant="ghost"
                color="gray"
                size="1"
                disabled={!canGoPrev}
                onClick={prev}
                aria-label="Previous month"
            >
                <ChevronLeftIcon />
            </IconButton>

            {/* Previous neighbour */}
            {prevPeriod && (
                <Button
                    variant="ghost"
                    color="gray"
                    size="1"
                    onClick={() => onChange(prevPeriod)}
                    style={{ color: 'var(--gray-9)', fontWeight: 400 }}
                >
                    {formatPeriod(prevPeriod)}
                </Button>
            )}

            {/* Selected month */}
            <Button
                variant="soft"
                color="gray"
                size="1"
                highContrast
                style={{ cursor: 'default', fontWeight: 600, minWidth: 110, justifyContent: 'center' }}
                tabIndex={-1}
            >
                {formatPeriod(selected)}
            </Button>

            {/* Next neighbour — real data period, clickable */}
            {nextPeriod && (
                <Button
                    variant="ghost"
                    color="gray"
                    size="1"
                    onClick={() => onChange(nextPeriod)}
                    style={{ color: 'var(--gray-9)', fontWeight: 400 }}
                >
                    {formatPeriod(nextPeriod)}
                </Button>
            )}

            {/* Future period — no data yet, not clickable */}
            {futurePeriod && (
                <Text
                    size="1"
                    style={{ color: 'var(--gray-7)', paddingInline: 'var(--space-2)', userSelect: 'none' }}
                >
                    {formatPeriod(futurePeriod)}
                </Text>
            )}

            {/* Next arrow */}
            <IconButton
                variant="ghost"
                color="gray"
                size="1"
                disabled={!canGoNext}
                onClick={next}
                aria-label="Next month"
            >
                <ChevronRightIcon />
            </IconButton>

            {/* Latest shortcut — only visible when not on latest */}
            {!isLatest && (
                <Button
                    variant="surface"
                    color="grass"
                    size="1"
                    onClick={goLatest}
                    ml="1"
                >
                    Latest
                </Button>
            )}
        </Flex>
    );
}
