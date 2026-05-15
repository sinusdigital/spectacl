import React from "react";
import { Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon, DoubleArrowUpIcon } from "@radix-ui/react-icons";
import { clsx as classNames } from "clsx";
import { Suggestion, AeoChannel, SuggestionStatus } from "./types";

export interface SuggestionCardProps {
    suggestion: Suggestion;
    onClick?: () => void;
    /** Forwarded to DraggableSuggestionCard's ContextMenu wrapper.
     *  Plain SuggestionCard renders no menu — only DraggableSuggestionCard does. */
    onStatusChange?: (id: string, status: SuggestionStatus) => void;
    actions?: React.ReactNode;
    className?: string;
}

type RadixColor = React.ComponentProps<typeof Badge>["color"];

const CHANNEL_LABEL: Record<AeoChannel, string> = {
    OnPage: "On-Page",
    OffPage: "Off-Page",
};

// Both neutral gray — the channel label carries the meaning, color stays
// quiet so category badges (which DO encode meaning by hue) aren't drowned out.
const CHANNEL_COLOR: Record<AeoChannel, RadixColor> = {
    OnPage: "gray",
    OffPage: "gray",
};

type Level = "High" | "Medium" | "Low";

function levelFor(value: number): Level {
    if (value >= 7) return "High";
    if (value >= 4) return "Medium";
    return "Low";
}

const LEVEL_ICON: Record<Level, React.ElementType> = {
    High: DoubleArrowUpIcon,
    Medium: ChevronUpIcon,
    Low: ChevronDownIcon,
};

const IMPACT_COLOR: Record<Level, string> = {
    High: "var(--green-11)",
    Medium: "var(--amber-11)",
    Low: "var(--gray-11)",
};

/**
 * Compact Kanban card. Shows the minimum needed to scan a board:
 * title + surface + impact level. Description, effort, and category live
 * in the drawer (one click away on row click).
 */
export default function SuggestionCard({ suggestion, onClick, actions, className }: SuggestionCardProps) {
    const impactLevel = levelFor(suggestion.impact);
    const ImpactIcon = LEVEL_ICON[impactLevel];
    // "Done X ago" subscript on completed cards — the closest proxy for completion
    // time is updatedAt at the moment status flipped to Done. Good enough.
    const doneAgo = suggestion.status === "Done" && suggestion.updatedAt
        ? formatAgo(suggestion.updatedAt)
        : null;

    return (
        <Card
            size="1"
            variant="surface"
            onClick={onClick}
            className={classNames(
                "transition-colors hover:border-[var(--accent-7)]",
                onClick && "cursor-pointer",
                className,
            )}
        >
            <Flex direction="column" gap="2">
                <Text size="2" weight="medium" style={{ color: "var(--gray-12)", lineHeight: 1.35 }} className="line-clamp-2">
                    {suggestion.title}
                </Text>

                <Flex align="center" justify="between" gap="2">
                    <Badge color={CHANNEL_COLOR[suggestion.channel]} variant="soft" radius="full" size="1">
                        {CHANNEL_LABEL[suggestion.channel]}
                    </Badge>
                    <Flex align="center" gap="2">
                        {doneAgo && (
                            <Text size="1" color="gray" style={{ lineHeight: 1 }}>
                                Done {doneAgo}
                            </Text>
                        )}
                        <Flex align="center" style={{ color: IMPACT_COLOR[impactLevel] }} aria-label={`${impactLevel} impact`}>
                            <ImpactIcon width={14} height={14} />
                        </Flex>
                    </Flex>
                </Flex>

                {actions && <Box mt="1">{actions}</Box>}
            </Flex>
        </Card>
    );
}

/** Compact relative-time formatter ("3d ago", "2w ago"). Inline-defined to keep
 *  the card self-contained — matches the pattern used in src/components/Admin/UsersTable.tsx. */
function formatAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return "just now";
    const mins = Math.round(ms / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.round(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.round(days / 30);
    return `${months}mo ago`;
}
