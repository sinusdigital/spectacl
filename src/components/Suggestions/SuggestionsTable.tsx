"use client";

import React, { useMemo, useState } from "react";
import {
    AlertDialog,
    Box,
    Card,
    Flex,
    Text,
    Badge,
    Checkbox,
    DropdownMenu,
    ContextMenu,
    IconButton,
    Button as RadixButton,
} from "@radix-ui/themes";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    Cross2Icon,
    DotsHorizontalIcon,
    DoubleArrowUpIcon,
    PlusIcon,
} from "@radix-ui/react-icons";
import RadixTable from "@/components/Shared/RadixTable";
import Button from "@/components/Shared/Button";
import { Suggestion, SuggestionStatus, AeoChannel, isNewSuggestion } from "./types";

type SortKey = "title" | "channel" | "category" | "impact" | "effort" | "createdAt";
type SortDir = "asc" | "desc";

interface SuggestionsTableProps {
    suggestions: Suggestion[];
    onRowClick: (s: Suggestion) => void;
    onStatusChange: (id: string, status: SuggestionStatus) => void;
    onBulkStatusChange?: (ids: string[], status: SuggestionStatus) => void;
    /** Permanent delete handler (one or many). When provided, Dismissed rows get a
     *  Delete row-action and the bulk bar gets a Delete button — both gated by a confirm modal. */
    onDelete?: (ids: string[]) => Promise<void> | void;
    /** When provided, an inline "+ Add a tactic" row is rendered at the bottom.
     *  Resolves once the backend has acknowledged the new row. */
    onAdd?: (title: string) => Promise<void>;
    /** Bulk action set — Backlog uses ["ToDo", "Dismiss"]; Dismissed uses ["Restore", "Delete"]. */
    bulkActions?: ("ToDo" | "Done" | "Dismiss" | "Restore" | "Delete")[];
    /** Status to send rows to on Restore. Dismissed → "Suggested" (back to backlog);
     *  Archived → "Done" (back to active board). Defaults to "Suggested". */
    restoreToStatus?: SuggestionStatus;
}

const CHANNEL_LABEL: Record<AeoChannel, string> = {
    OnPage: "On-Page",
    OffPage: "Off-Page",
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

// Higher impact = better → green for High. Higher effort = worse → red for High.
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

interface CreatedAtSuggestion extends Suggestion {
    createdAt?: string;
}

type RowAction =
    | { type: "item"; label: string; onSelect: () => void; color?: "red" }
    | { type: "separator" };

function getRowActions(
    s: Suggestion,
    onRowClick: (s: Suggestion) => void,
    onStatusChange: (id: string, status: SuggestionStatus) => void,
    restoreToStatus: SuggestionStatus,
    onRequestDelete?: (s: Suggestion) => void,
): RowAction[] {
    // Dismissed / Archived rows live in the collapsible sections — Open / Restore / Delete.
    if (s.status === "Dismissed" || s.status === "Archived") {
        const actions: RowAction[] = [
            { type: "item", label: "Open", onSelect: () => onRowClick(s) },
            { type: "item", label: "Restore", onSelect: () => onStatusChange(s.id, restoreToStatus) },
        ];
        if (onRequestDelete) {
            actions.push({ type: "separator" });
            actions.push({ type: "item", label: "Delete", color: "red", onSelect: () => onRequestDelete(s) });
        }
        return actions;
    }
    // Backlog rows (Suggested). Doing/Done transitions happen on the Active Board, not from here.
    return [
        { type: "item", label: "Open", onSelect: () => onRowClick(s) },
        { type: "item", label: "Tackle", onSelect: () => onStatusChange(s.id, "ToDo") },
        { type: "separator" },
        { type: "item", label: "Dismiss", color: "red", onSelect: () => onStatusChange(s.id, "Dismissed") },
    ];
}

export default function SuggestionsTable({
    suggestions,
    onRowClick,
    onStatusChange,
    onBulkStatusChange,
    onDelete,
    onAdd,
    bulkActions = ["ToDo", "Done", "Dismiss"],
    restoreToStatus = "Suggested",
}: SuggestionsTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("impact");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState(false);
    const [addValue, setAddValue] = useState("");
    const [submittingAdd, setSubmittingAdd] = useState(false);
    // Confirm-modal state. Shape: array of suggestions to delete (1 or many),
    // plus a derived display title for the 1-item case. null = closed.
    const [deleteTarget, setDeleteTarget] = useState<Suggestion[] | null>(null);
    const [deleting, setDeleting] = useState(false);
    const addInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isAdding && !submittingAdd) {
            const t = setTimeout(() => addInputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [isAdding, submittingAdd]);

    const handleAddSubmit = async () => {
        const trimmed = addValue.trim();
        if (!trimmed || submittingAdd || !onAdd) return;
        setSubmittingAdd(true);
        try {
            await onAdd(trimmed);
            setAddValue("");
        } finally {
            setSubmittingAdd(false);
        }
    };

    const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddSubmit();
        } else if (e.key === "Escape") {
            setAddValue("");
            setIsAdding(false);
        }
    };

    const handleSort = (key: string) => {
        const k = key as SortKey;
        if (sortKey === k) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(k);
            setSortDir(k === "title" ? "asc" : "desc");
        }
    };

    const sorted = useMemo(() => {
        const dir = sortDir === "asc" ? 1 : -1;
        return [...suggestions].sort((a, b) => {
            switch (sortKey) {
                case "title":
                    return a.title.localeCompare(b.title) * dir;
                case "channel":
                    return a.channel.localeCompare(b.channel) * dir;
                case "category":
                    return a.category.localeCompare(b.category) * dir;
                case "impact":
                    return (a.impact - b.impact) * dir;
                case "effort":
                    return (a.effort - b.effort) * dir;
                case "createdAt": {
                    const aDate = (a as CreatedAtSuggestion).createdAt ? new Date((a as CreatedAtSuggestion).createdAt!).getTime() : 0;
                    const bDate = (b as CreatedAtSuggestion).createdAt ? new Date((b as CreatedAtSuggestion).createdAt!).getTime() : 0;
                    return (aDate - bDate) * dir;
                }
                default:
                    return 0;
            }
        });
    }, [suggestions, sortKey, sortDir]);

    const allSelected = sorted.length > 0 && sorted.every((s) => selected.has(s.id));
    const someSelected = !allSelected && sorted.some((s) => selected.has(s.id));

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(sorted.map((s) => s.id)));
        }
    };

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulk = (status: SuggestionStatus) => {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        if (onBulkStatusChange) {
            onBulkStatusChange(ids, status);
        } else {
            ids.forEach((id) => onStatusChange(id, status));
        }
        setSelected(new Set());
    };

    // Render even when empty if `onAdd` is provided — the inline row IS the empty state.
    if (suggestions.length === 0 && !onAdd) return null;

    return (
        <Box className="overflow-x-visible w-full">
            <RadixTable.Root variant="ghost">
                <RadixTable.Header>
                    <RadixTable.Row>
                        <RadixTable.Head variant="modal" width="36px">
                            <Checkbox
                                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                onCheckedChange={toggleAll}
                                aria-label="Select all"
                            />
                        </RadixTable.Head>
                        <RadixTable.SortableHead
                            sortKey="title"
                            label="Title"
                            currentSortKey={sortKey}
                            sortDirection={sortDir}
                            onSort={handleSort}
                        />
                        <RadixTable.SortableHead
                            sortKey="channel"
                            label="Channel"
                            currentSortKey={sortKey}
                            sortDirection={sortDir}
                            onSort={handleSort}
                            width="110px"
                        />
                        <RadixTable.SortableHead
                            sortKey="category"
                            label="Category"
                            currentSortKey={sortKey}
                            sortDirection={sortDir}
                            onSort={handleSort}
                            width="110px"
                        />
                        <RadixTable.SortableHead
                            sortKey="impact"
                            label="Impact"
                            currentSortKey={sortKey}
                            sortDirection={sortDir}
                            onSort={handleSort}
                            width="100px"
                        />
                        <RadixTable.SortableHead
                            sortKey="effort"
                            label="Effort"
                            currentSortKey={sortKey}
                            sortDirection={sortDir}
                            onSort={handleSort}
                            width="100px"
                        />
                        <RadixTable.Head variant="modal" width="44px" />
                    </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                    {sorted.map((s) => {
                        const isSelected = selected.has(s.id);
                        const isDismissed = s.status === "Dismissed";
                        const impactLevel = levelFor(s.impact);
                        const effortLevel = levelFor(s.effort);
                        const actions = getRowActions(
                            s,
                            onRowClick,
                            onStatusChange,
                            restoreToStatus,
                            onDelete ? (target) => setDeleteTarget([target]) : undefined,
                        );
                        return (
                            <ContextMenu.Root key={s.id}>
                                <ContextMenu.Trigger>
                                    <RadixTable.Row
                                        align="center"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest("button, [role=menuitem], input, [role=checkbox]")) return;
                                            onRowClick(s);
                                        }}
                                        className="group cursor-pointer hover:bg-[var(--gray-2)] transition-colors"
                                        style={{ opacity: isDismissed ? 0.55 : 1 }}
                                    >
                                        <RadixTable.Cell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleOne(s.id)}
                                                aria-label={`Select ${s.title}`}
                                            />
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Flex align="center" justify="between" gap="2">
                                                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                                                    {isNewSuggestion(s) && (
                                                        <span
                                                            aria-label="New suggestion"
                                                            title="New — you haven't opened this yet"
                                                            style={{
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: "50%",
                                                                background: "var(--accent-9)",
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    )}
                                                    <Text size="2" weight={isNewSuggestion(s) ? "bold" : "medium"} truncate>
                                                        {s.title}
                                                    </Text>
                                                </Flex>
                                                {s.status === "Suggested" && (
                                                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onStatusChange(s.id, "ToDo");
                                                            }}
                                                        >
                                                            Tackle
                                                        </Button>
                                                    </div>
                                                )}
                                                {(s.status === "Dismissed" || s.status === "Archived") && (
                                                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onStatusChange(s.id, restoreToStatus);
                                                            }}
                                                        >
                                                            Restore
                                                        </Button>
                                                    </div>
                                                )}
                                            </Flex>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Badge color="gray" variant="soft" size="1" radius="full">
                                                {CHANNEL_LABEL[s.channel]}
                                            </Badge>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Text size="2" color="gray">{s.category}</Text>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <LevelCell level={impactLevel} kind="impact" color={IMPACT_COLOR[impactLevel]} />
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <LevelCell level={effortLevel} kind="effort" color={EFFORT_COLOR[effortLevel]} />
                                        </RadixTable.Cell>
                                        <RadixTable.Cell onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger>
                                                    <IconButton size="1" variant="ghost" color="gray" aria-label="Row actions">
                                                        <DotsHorizontalIcon />
                                                    </IconButton>
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Content>
                                                    {actions.map((a, i) =>
                                                        a.type === "separator" ? (
                                                            <DropdownMenu.Separator key={`sep-${i}`} />
                                                        ) : (
                                                            <DropdownMenu.Item key={a.label} color={a.color} onSelect={a.onSelect}>
                                                                {a.label}
                                                            </DropdownMenu.Item>
                                                        ),
                                                    )}
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Root>
                                        </RadixTable.Cell>
                                    </RadixTable.Row>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    {actions.map((a, i) =>
                                        a.type === "separator" ? (
                                            <ContextMenu.Separator key={`sep-${i}`} />
                                        ) : (
                                            <ContextMenu.Item key={a.label} color={a.color} onSelect={a.onSelect}>
                                                {a.label}
                                            </ContextMenu.Item>
                                        ),
                                    )}
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        );
                    })}
                    {onAdd && (
                        <RadixTable.Row
                            className={!isAdding ? "group cursor-text hover:bg-[var(--gray-2)] transition-colors" : ""}
                            onClick={!isAdding ? () => setIsAdding(true) : undefined}
                        >
                            <RadixTable.Cell width="36px" style={{ verticalAlign: "middle" }}>
                                <Flex align="center" justify="center">
                                    <PlusIcon
                                        className={!isAdding
                                            ? "w-3.5 h-3.5 text-[var(--gray-9)] group-hover:text-[var(--gray-11)] transition-colors"
                                            : "w-3.5 h-3.5 text-[var(--gray-11)]"}
                                    />
                                </Flex>
                            </RadixTable.Cell>
                            <RadixTable.Cell colSpan={6}>
                                {!isAdding ? (
                                    <Text size="2" style={{ color: "var(--gray-9)" }} className="group-hover:text-[var(--gray-11)] transition-colors">
                                        Add a tactic…
                                    </Text>
                                ) : (
                                    <Flex align="center" gap="2">
                                        <input
                                            ref={addInputRef}
                                            type="text"
                                            value={addValue}
                                            onChange={(e) => setAddValue(e.target.value)}
                                            onKeyDown={handleAddKeyDown}
                                            onBlur={() => {
                                                // Cancel on blur if empty; keep open while user has content
                                                if (!addValue.trim() && !submittingAdd) {
                                                    setIsAdding(false);
                                                }
                                            }}
                                            disabled={submittingAdd}
                                            placeholder="Type a tactic title and press Enter…"
                                            className="text-sm bg-transparent text-[var(--gray-12)] placeholder-[var(--gray-8)] disabled:opacity-60 border-none outline-none focus:ring-0 p-0"
                                            style={{ width: "100%", boxShadow: "none" }}
                                        />
                                        {addValue.trim() && (
                                            <Text size="1" style={{ color: "var(--gray-9)", whiteSpace: "nowrap" }}>
                                                Enter ↵ · Esc to cancel
                                            </Text>
                                        )}
                                    </Flex>
                                )}
                            </RadixTable.Cell>
                        </RadixTable.Row>
                    )}
                </RadixTable.Body>
            </RadixTable.Root>

            {/* Bulk action bar — sticky bottom. Wording mirrors the row context menu
                (Tackle / Dismiss); clear-selection lives next to the count, not in the
                action group, so it doesn't read as a third action. Card variant="surface"
                gives a single thin border (no inset shadow) so the outer --shadow-3
                doesn't stack into a double-shadow. Tinted with --accent-2 to signal
                "selection mode" without inverting the theme. Slide-up entrance respects
                reduced-motion via the motion-safe: prefix. */}
            {selected.size > 0 && (
                <Box
                    mt="3"
                    style={{ position: "sticky", bottom: 0, zIndex: 5 }}
                    className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-150"
                >
                    <Card
                        variant="surface"
                        size="1"
                        style={{ background: "var(--accent-2)" }}
                    >
                        <Flex align="center" justify="between" gap="6" wrap="wrap" px="2" py="1">
                        <Flex align="center" gap="2">
                            <IconButton
                                size="1"
                                variant="ghost"
                                color="gray"
                                onClick={() => setSelected(new Set())}
                                aria-label="Clear selection"
                            >
                                <Cross2Icon />
                            </IconButton>
                            <Text size="2" weight="medium">
                                {selected.size} selected
                            </Text>
                        </Flex>
                        <Flex gap="2" wrap="wrap">
                            {bulkActions.includes("Restore") && (
                                <RadixButton variant="soft" color="gray" size="2" onClick={() => handleBulk(restoreToStatus)}>
                                    Restore
                                </RadixButton>
                            )}
                            {bulkActions.includes("ToDo") && (
                                <RadixButton variant="soft" color="gray" size="2" onClick={() => handleBulk("ToDo")}>
                                    Tackle
                                </RadixButton>
                            )}
                            {bulkActions.includes("Done") && (
                                <RadixButton variant="soft" size="2" onClick={() => handleBulk("Done")}>
                                    Mark Done
                                </RadixButton>
                            )}
                            {bulkActions.includes("Dismiss") && (
                                <RadixButton variant="soft" color="red" size="2" onClick={() => handleBulk("Dismissed")}>
                                    Dismiss
                                </RadixButton>
                            )}
                            {bulkActions.includes("Delete") && onDelete && (
                                <RadixButton
                                    variant="soft"
                                    color="red"
                                    size="2"
                                    onClick={() => {
                                        const targets = sorted.filter((s) => selected.has(s.id));
                                        if (targets.length > 0) setDeleteTarget(targets);
                                    }}
                                >
                                    Delete
                                </RadixButton>
                            )}
                        </Flex>
                    </Flex>
                    </Card>
                </Box>
            )}

            {/* Shared confirm modal for row + bulk deletes. */}
            <AlertDialog.Root
                open={deleteTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            >
                <AlertDialog.Content style={{ maxWidth: 440 }}>
                    <AlertDialog.Title>
                        {deleteTarget && deleteTarget.length === 1
                            ? "Delete this suggestion?"
                            : `Delete ${deleteTarget?.length ?? 0} suggestions?`}
                    </AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        {deleteTarget && deleteTarget.length === 1 ? (
                            <><strong>{deleteTarget[0].title}</strong> will be permanently removed. This cannot be undone, but if you generate new suggestions, it may reappear.</>
                        ) : (
                            <>The selected suggestions will be permanently removed. This cannot be undone, but if you generate new suggestions, they may reappear.</>
                        )}
                    </AlertDialog.Description>
                    <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                            <RadixButton variant="soft" color="gray" disabled={deleting}>Cancel</RadixButton>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                            <RadixButton
                                variant="solid"
                                color="red"
                                disabled={deleting}
                                onClick={async (e) => {
                                    if (!deleteTarget || !onDelete) return;
                                    e.preventDefault();
                                    setDeleting(true);
                                    try {
                                        await onDelete(deleteTarget.map((s) => s.id));
                                        setSelected(new Set());
                                        setDeleteTarget(null);
                                    } finally {
                                        setDeleting(false);
                                    }
                                }}
                            >
                                {deleting ? "Deleting…" : "Delete permanently"}
                            </RadixButton>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </Box>
    );
}

function LevelCell({ level, kind, color }: { level: Level; kind: "impact" | "effort"; color: string }) {
    const Icon = LEVEL_ICON[level];
    return (
        <Flex align="center" style={{ color }} aria-label={`${level} ${kind}`}>
            <Icon width={16} height={16} />
        </Flex>
    );
}
