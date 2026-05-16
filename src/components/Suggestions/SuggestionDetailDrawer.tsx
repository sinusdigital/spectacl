"use client";

import React, { useState } from "react";
import {
    AlertDialog,
    Box,
    Callout,
    Flex,
    Text,
    TextArea,
    Button as RadixButton,
    Heading,
    Badge,
    Separator,
} from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon, DoubleArrowUpIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import DetailDrawer from "@/components/Shared/DetailDrawer";
import { Suggestion, SuggestionCategory, SuggestionStatus, AeoChannel } from "./types";

interface SuggestionDetailDrawerProps {
    suggestion: Suggestion | null;
    onClose: () => void;
    /** Status transitions from the drawer footer (Tackle / Dismiss on Suggested rows). */
    onStatusChange?: (id: string, status: SuggestionStatus) => void;
    onDelete?: (id: string) => void;
}

type RadixColor = React.ComponentProps<typeof Badge>["color"];

const CHANNEL_LABEL: Record<AeoChannel, string> = {
    OnPage: "On-Page",
    OffPage: "Off-Page",
};

const CATEGORY_COLOR: Record<SuggestionCategory, RadixColor> = {
    Content: "blue",
    Technical: "purple",
    Authority: "orange",
    UX: "green",
    Brand: "red",
};

type Level = "High" | "Medium" | "Low";

function levelFor(value: number): Level {
    if (value >= 7) return "High";
    if (value >= 4) return "Medium";
    return "Low";
}

const IMPACT_COLOR: Record<Level, string> = {
    High: "var(--green-11)",
    Medium: "var(--amber-11)",
    Low: "var(--gray-11)",
};

const EFFORT_COLOR: Record<Level, string> = {
    High: "var(--red-11)",
    Medium: "var(--amber-11)",
    Low: "var(--green-11)",
};

const LEVEL_ICON: Record<Level, React.ElementType> = {
    High: DoubleArrowUpIcon,
    Medium: ChevronUpIcon,
    Low: ChevronDownIcon,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider">
            {children}
        </Text>
    );
}

/**
 * Right-edge slide-in drawer for viewing/editing a single suggestion.
 * Title is shown read-only in the header; status changes happen on the
 * Kanban board / row context menu, not here. The drawer's only editable
 * field is the markdown description.
 */
export default function SuggestionDetailDrawer({
    suggestion,
    onClose,
    onStatusChange,
    onDelete,
}: SuggestionDetailDrawerProps) {
    const [notes, setNotes] = useState("");
    // Reset form state when the drawer loads a different suggestion (React's
    // "Adjusting state during render" pattern — replaces useEffect-on-prop).
    const [syncedId, setSyncedId] = useState<string | null>(suggestion?.id ?? null);

    if (suggestion && suggestion.id !== syncedId) {
        setSyncedId(suggestion.id);
        setNotes("");
    }

    if (!suggestion) return null;

    const channel: AeoChannel = suggestion.channel;
    const category = suggestion.category;
    const impactLevel = levelFor(suggestion.impact);
    const effortLevel = levelFor(suggestion.effort);

    return (
        <DetailDrawer
            open={!!suggestion}
            onOpenChange={(open) => !open && onClose()}
            width={560}
            title={
                <Heading as="h2" size="4" weight="bold" trim="both">
                    {suggestion.title || "Untitled suggestion"}
                </Heading>
            }
            a11yDescription="AEO suggestion detail"
        >
            <Flex direction="column" gap="5">
                {/* Suggested because — fired-trigger explanations from the engine.
                    Hidden for manual rows and baseline-only engine rows. */}
                {suggestion.triggerContext && suggestion.triggerContext.fired.length > 0 && (
                    <Callout.Root color="blue" variant="soft" size="1">
                        <Callout.Icon><LightningBoltIcon /></Callout.Icon>
                        <Callout.Text>
                            <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider">
                                Suggested because
                            </Text>
                            <Box mt="1">
                                {suggestion.triggerContext.fired
                                    .map((f) => f.explanation)
                                    .filter((s): s is string => !!s)
                                    .map((reason, i) => (
                                        <Text key={i} size="2" as="p">
                                            {capitalize(reason)}.
                                        </Text>
                                    ))}
                            </Box>
                        </Callout.Text>
                    </Callout.Root>
                )}

                {/* Description — system-authored markdown, read-only for users. */}
                <Box className="prose prose-sm max-w-none">
                    {suggestion.description ? (
                        <ReactMarkdown>{suggestion.description}</ReactMarkdown>
                    ) : (
                        <Text size="2" color="gray">No description yet.</Text>
                    )}
                </Box>

                {/* Channel / Category / Impact / Effort — all deterministic, all on one row */}
                <Flex gap="4" wrap="wrap">
                    <Flex direction="column" gap="2" style={{ flex: "1 1 110px" }}>
                        <FieldLabel>Channel</FieldLabel>
                        <Box>
                            <Badge color="gray" variant="soft" size="2" radius="full">
                                {CHANNEL_LABEL[channel]}
                            </Badge>
                        </Box>
                    </Flex>
                    <Flex direction="column" gap="2" style={{ flex: "1 1 110px" }}>
                        <FieldLabel>Category</FieldLabel>
                        <Box>
                            <Badge color={CATEGORY_COLOR[category]} variant="soft" size="2" radius="full">
                                {category}
                            </Badge>
                        </Box>
                    </Flex>
                    <Flex direction="column" gap="2" style={{ flex: "1 1 110px" }}>
                        <FieldLabel>Impact</FieldLabel>
                        <LevelDisplay level={impactLevel} color={IMPACT_COLOR[impactLevel]} />
                    </Flex>
                    <Flex direction="column" gap="2" style={{ flex: "1 1 110px" }}>
                        <FieldLabel>Effort</FieldLabel>
                        <LevelDisplay level={effortLevel} color={EFFORT_COLOR[effortLevel]} />
                    </Flex>
                </Flex>

                <Separator size="4" />

                {/* Notes (placeholder for phase 3 — collected but not persisted yet) */}
                <Flex direction="column" gap="2">
                    <FieldLabel>Notes</FieldLabel>
                    <TextArea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Internal notes (not yet persisted — coming soon)"
                        disabled
                    />
                </Flex>
            </Flex>

            {/* Sticky footer — actions depend on status. Transition pairs follow the
                bulk-bar convention: gray-soft for forward / neutral moves, red-soft
                only for genuinely destructive (Dismiss / Delete). */}
            {(() => {
                const transitions = onStatusChange ? getFooterTransitions(suggestion.status) : null;
                const showDelete = !!onDelete && (suggestion.status === "Dismissed" || suggestion.status === "Archived");
                if (!transitions && !showDelete) return null;

                return (
                    <Box
                        style={{
                            position: "sticky",
                            bottom: -24,
                            marginLeft: -24,
                            marginRight: -24,
                            marginTop: 24,
                            marginBottom: -24,
                            padding: "16px 24px",
                            background: "var(--gray-1)",
                            borderTop: "1px solid var(--gray-a4)",
                        }}
                    >
                        {transitions && onStatusChange ? (
                            <Flex justify="end" gap="2">
                                <RadixButton
                                    variant="soft"
                                    color={transitions.left.color}
                                    onClick={() => {
                                        onStatusChange(suggestion.id, transitions.left.target);
                                        onClose();
                                    }}
                                >
                                    {transitions.left.label}
                                </RadixButton>
                                <RadixButton
                                    variant="soft"
                                    color={transitions.right.color}
                                    onClick={() => {
                                        onStatusChange(suggestion.id, transitions.right.target);
                                        onClose();
                                    }}
                                >
                                    {transitions.right.label}
                                </RadixButton>
                            </Flex>
                        ) : (
                            <Flex justify="end">
                                <AlertDialog.Root>
                                    <AlertDialog.Trigger>
                                        <RadixButton variant="soft" color="red">
                                            Delete permanently
                                        </RadixButton>
                                    </AlertDialog.Trigger>
                                    <AlertDialog.Content style={{ maxWidth: 440 }}>
                                        <AlertDialog.Title>Delete this suggestion?</AlertDialog.Title>
                                        <AlertDialog.Description size="2">
                                            <strong>{suggestion.title}</strong> will be permanently removed. This cannot be undone, but if you generate new suggestions, it may reappear.
                                        </AlertDialog.Description>
                                        <Flex gap="3" mt="4" justify="end">
                                            <AlertDialog.Cancel>
                                                <RadixButton variant="soft" color="gray">Cancel</RadixButton>
                                            </AlertDialog.Cancel>
                                            <AlertDialog.Action>
                                                <RadixButton variant="solid" color="red" onClick={() => onDelete?.(suggestion.id)}>
                                                    Delete permanently
                                                </RadixButton>
                                            </AlertDialog.Action>
                                        </Flex>
                                    </AlertDialog.Content>
                                </AlertDialog.Root>
                            </Flex>
                        )}
                    </Box>
                );
            })()}
        </DetailDrawer>
    );
}

type FooterButtonColor = "red" | "gray";
interface FooterButton {
    label: string;
    color: FooterButtonColor;
    target: SuggestionStatus;
}
interface FooterTransitions {
    left: FooterButton;
    right: FooterButton;
}

/** Returns the two-button transition pair for the drawer footer at a given
 *  status, or null if no in-drawer transitions apply (Dismissed / Archived use
 *  the Delete-permanently flow instead; other statuses get no footer).
 *
 *  Convention: red soft = destructive, gray soft = neutral forward/back.
 *  Right button is the "primary" forward action; left is the back-out path. */
function getFooterTransitions(status: SuggestionStatus): FooterTransitions | null {
    switch (status) {
        case "Suggested":
            return {
                left: { label: "Dismiss", color: "red", target: "Dismissed" },
                right: { label: "Tackle", color: "gray", target: "ToDo" },
            };
        case "ToDo":
            return {
                left: { label: "Dismiss", color: "red", target: "Dismissed" },
                right: { label: "Start", color: "gray", target: "In_Progress" },
            };
        case "In_Progress":
            return {
                left: { label: "Dismiss", color: "red", target: "Dismissed" },
                right: { label: "Mark Done", color: "gray", target: "Done" },
            };
        case "Done":
            return {
                left: { label: "Reopen", color: "gray", target: "In_Progress" },
                right: { label: "Archive", color: "gray", target: "Archived" },
            };
        default:
            return null;
    }
}

/** Capitalize the first character of a sentence. The trigger evaluator
 *  produces lowercase explanation fragments so they read naturally inside
 *  "Suggested because <fragment>"; here we surface them as standalone
 *  sentences. */
function capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Inline icon + level label for the drawer's Impact/Effort fields. */
function LevelDisplay({ level, color }: { level: Level; color: string }) {
    const Icon = LEVEL_ICON[level];
    return (
        <Flex align="center" gap="2" style={{ color }}>
            <Icon width={16} height={16} />
            <Text size="2" weight="medium" style={{ color: "inherit" }}>{level}</Text>
        </Flex>
    );
}
