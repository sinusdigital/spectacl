"use client";

import React from "react";
import { Flex, Text, Checkbox, Separator, Button as RadixButton } from "@radix-ui/themes";
import SidePanel from "@/components/Shared/SidePanel";
import NavListItem from "@/components/Shared/NavListItem";
import { Suggestion, AeoChannel, SuggestionCategory } from "./types";

type ChannelFilter = "all" | "OnPage" | "OffPage";

interface SuggestionsSidebarProps {
    /** All suggestions (unfiltered) — sidebar computes its own per-row counts. */
    suggestions: Suggestion[];
    /** Currently selected channel filter. */
    channel: ChannelFilter;
    /** Called when a channel row is clicked. */
    onChannelChange: (filter: ChannelFilter) => void;
    /** Currently selected categories (multi). */
    categories: SuggestionCategory[];
    /** Called when a category checkbox is toggled. */
    onCategoriesChange: (categories: SuggestionCategory[]) => void;
}

interface ChannelRowDef {
    key: ChannelFilter;
    label: string;
    channel: AeoChannel | null;
}

const CHANNEL_ROWS: ChannelRowDef[] = [
    { key: "all", label: "All Suggestions", channel: null },
    { key: "OnPage", label: "On-Page · Owned", channel: "OnPage" },
    { key: "OffPage", label: "Off-Page · Earned", channel: "OffPage" },
];

const CATEGORIES: SuggestionCategory[] = ["Content", "Technical", "Authority", "UX", "Brand"];

/**
 * Jira-backlog-style filter rail. Two sections:
 *  1. Channels — single-select (All / On-Page / Off-Page).
 *  2. Categories — multi-select checkbox list with counts.
 */
export default function SuggestionsSidebar({
    suggestions,
    channel,
    onChannelChange,
    categories,
    onCategoriesChange,
}: SuggestionsSidebarProps) {
    // Category counts respect the active channel filter — the rail is a
    // coherent "what can I drill into from here" view.
    const channelScoped = channel === "all"
        ? suggestions
        : suggestions.filter((s) => s.channel === channel);

    const categoryCount = (cat: SuggestionCategory) =>
        channelScoped.filter((s) => s.category === cat && s.status !== "Dismissed").length;

    const toggleCategory = (cat: SuggestionCategory) => {
        if (categories.includes(cat)) {
            onCategoriesChange(categories.filter((c) => c !== cat));
        } else {
            onCategoriesChange([...categories, cat]);
        }
    };

    return (
        <SidePanel
            stateKey="aeo-suggestions-sidebar"
            position="left"
            collapsible={false}
            widths={{ panel: 256 }}
        >
            <Flex direction="column" gap="4">
                {/* ─── Channels ─── */}
                <Flex direction="column" gap="2">
                    <SectionLabel>Channels</SectionLabel>
                    <Flex direction="column" gap="0">
                        {CHANNEL_ROWS.map((row) => {
                            const scoped = row.channel
                                ? suggestions.filter((s) => s.channel === row.channel)
                                : suggestions;
                            // "Available todos" — items still actionable (not Done, not Dismissed)
                            const todos = scoped.filter(
                                (s) => s.status !== "Done" && s.status !== "Dismissed",
                            ).length;
                            const isSelected = channel === row.key;

                            return (
                                <ChannelRow
                                    key={row.key}
                                    label={row.label}
                                    count={todos}
                                    isSelected={isSelected}
                                    onClick={() => onChannelChange(row.key)}
                                />
                            );
                        })}
                    </Flex>
                </Flex>

                <Separator size="4" />

                {/* ─── Categories ─── */}
                <Flex direction="column" gap="2">
                    <Flex align="center" justify="between" pr="3">
                        <SectionLabel>Categories</SectionLabel>
                        {categories.length > 0 && (
                            <RadixButton
                                size="1"
                                variant="ghost"
                                color="gray"
                                onClick={() => onCategoriesChange([])}
                            >
                                Clear
                            </RadixButton>
                        )}
                    </Flex>
                    <Flex direction="column" gap="0">
                        {CATEGORIES.map((cat) => (
                            <CategoryRow
                                key={cat}
                                label={cat}
                                count={categoryCount(cat)}
                                isChecked={categories.includes(cat)}
                                onToggle={() => toggleCategory(cat)}
                            />
                        ))}
                    </Flex>
                </Flex>
            </Flex>
        </SidePanel>
    );
}

/* ─── Section label — matches the main sidebar's NavigationSection title style ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="text-[10.5px] font-semibold uppercase tracking-widest px-3 pb-1.5 select-none"
            style={{ color: "var(--gray-a9)" }}
        >
            {children}
        </div>
    );
}

/* ─── Channel row (epic-style with progress bar) ───────────────────── */

interface ChannelRowProps {
    label: string;
    count: number;
    isSelected: boolean;
    onClick: () => void;
}

/** Built on top of `<NavListItem>` so the channel rail visually matches the
 *  app's primary sidebar nav. No leading icon — pure label + trailing count. */
function ChannelRow({ label, count, isSelected, onClick }: ChannelRowProps) {
    return (
        <NavListItem
            name={label}
            isActive={isSelected}
            onClick={onClick}
            trailing={
                <span
                    className="tabular-nums"
                    style={{ fontSize: 10, color: "var(--gray-a10)", fontWeight: 500 }}
                >
                    {count}
                </span>
            }
        />
    );
}

/* ─── Category row (checkbox list — Radix canonical Text-as-label pattern) ──── */

interface CategoryRowProps {
    label: string;
    count: number;
    isChecked: boolean;
    onToggle: () => void;
}

function CategoryRow({ label, count, isChecked, onToggle }: CategoryRowProps) {
    return (
        <Text
            as="label"
            size="2"
            className="cursor-pointer rounded-[var(--radius-2)] px-[10px] py-[6px] hover:bg-[var(--gray-3)] transition-colors"
        >
            <Flex align="center" justify="between" gap="2">
                <Flex align="center" gap="2" minWidth="0">
                    <Checkbox
                        checked={isChecked}
                        onCheckedChange={onToggle}
                        aria-label={`Filter by ${label}`}
                    />
                    {label}
                </Flex>
                <Text size="1" color="gray" className="tabular-nums">
                    {count}
                </Text>
            </Flex>
        </Text>
    );
}
