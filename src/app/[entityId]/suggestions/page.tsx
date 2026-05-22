"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    Box,
    Flex,
    Grid,
    Heading,
    Text,
    Card,
    Separator,
    Spinner,
    Button as RadixButton,
    Callout,
    SegmentedControl,
} from "@radix-ui/themes";
import { MagicWandIcon, RocketIcon, ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import PageContainer from "@/components/Shared/PageContainer";
import Header from "@/components/Shared/Header";
import TwoColumnPage from "@/components/Shared/TwoColumnPage";

import SuggestionCard from "@/components/Suggestions/SuggestionCard";
import DraggableSuggestionCard from "@/components/Suggestions/DraggableSuggestionCard";
import DroppableColumn from "@/components/Suggestions/DroppableColumn";
import SuggestionsSidebar from "@/components/Suggestions/SuggestionsSidebar";
import SuggestionsTable from "@/components/Suggestions/SuggestionsTable";
import SuggestionDetailDrawer from "@/components/Suggestions/SuggestionDetailDrawer";
import { Suggestion, SuggestionStatus, SuggestionCategory } from "@/components/Suggestions/types";
import { useToast } from "@/components/Shared/RadixToast";

type ChannelFilter = "all" | "OnPage" | "OffPage";

const BOARD_STATUSES = new Set<SuggestionStatus>(["ToDo", "In_Progress", "Done"]);

export default function SuggestionsPage() {
    return (
        <Suspense fallback={<Flex align="center" justify="center" style={{ minHeight: 400 }}><Spinner size="3" /></Flex>}>
            <SuggestionsPageInner />
        </Suspense>
    );
}

function SuggestionsPageInner() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const entityId = params.entityId as string;
    const toast = useToast();

    /* ─── URL-synced filter state ──────────────────────────────────── */

    const channel = (searchParams.get("channel") as ChannelFilter) || "all";
    const categoryParam = searchParams.get("category");
    const categories = useMemo<SuggestionCategory[]>(
        () => (categoryParam ? (categoryParam.split(",") as SuggestionCategory[]) : []),
        [categoryParam],
    );

    const updateParam = useCallback(
        (key: string, value: string | null) => {
            const next = new URLSearchParams(searchParams.toString());
            if (value === null || value === "" || value === "all") {
                next.delete(key);
            } else {
                next.set(key, value);
            }
            const qs = next.toString();
            router.replace(qs ? `?${qs}` : "?", { scroll: false });
        },
        [router, searchParams],
    );

    /* ─── Data ─────────────────────────────────────────────────────── */

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showDismissed, setShowDismissed] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // `distance: 5` means drag only activates after the pointer moves 5px from its
    // starting position — so a plain click on a Kanban card still propagates as a
    // click (opens the drawer) instead of being swallowed by drag activation.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const fetchSuggestions = useCallback(async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}/suggestions/aeo`);
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setSuggestions(data.suggestions ?? []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load suggestions.");
        } finally {
            setIsLoading(false);
        }
    }, [entityId, toast]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    // Mark a row viewed the first time the drawer opens it. Fire-and-forget +
    // optimistic local update so the dot disappears immediately. Server short-
    // circuits if viewedAt is already set, so retries / re-opens are safe.
    useEffect(() => {
        if (!selectedSuggestion) return;
        if (selectedSuggestion.viewedAt) return;
        const id = selectedSuggestion.id;
        const now = new Date().toISOString();
        setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, viewedAt: now } : s)));
        setSelectedSuggestion((curr) => (curr?.id === id ? { ...curr, viewedAt: now } : curr));
        fetch(`/api/entities/${entityId}/suggestions/aeo/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markViewed: true }),
        }).catch((err) => {
            // Non-blocking — the dot will re-appear on next fetch if the PATCH
            // failed, which is fine.
            console.warn("[AEO] markViewed failed:", err);
        });
    }, [selectedSuggestion, entityId]);

    const patchSuggestion = useCallback(
        async (id: string, patch: Partial<Suggestion>) => {
            setSuggestions((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...patch } as Suggestion) : s)));
            try {
                const res = await fetch(`/api/entities/${entityId}/suggestions/aeo/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patch),
                });
                if (!res.ok) throw new Error("Update failed");
                const data = await res.json();
                setSuggestions((prev) => prev.map((s) => (s.id === id ? data.suggestion : s)));
                setSelectedSuggestion((curr) => (curr?.id === id ? data.suggestion : curr));
            } catch (err) {
                console.error(err);
                toast.error("Failed to save change. Refreshing…");
                fetchSuggestions();
            }
        },
        [entityId, toast, fetchSuggestions],
    );

    const handleStatusChange = (id: string, newStatus: SuggestionStatus) => {
        patchSuggestion(id, { status: newStatus });
    };

    const handleBulkStatusChange = async (ids: string[], newStatus: SuggestionStatus) => {
        setSuggestions((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, status: newStatus } : s)));
        const results = await Promise.allSettled(
            ids.map((id) =>
                fetch(`/api/entities/${entityId}/suggestions/aeo/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                }),
            ),
        );
        const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
        if (failed.length > 0) {
            toast.error(`Failed to update ${failed.length} of ${ids.length}. Refreshing…`);
            fetchSuggestions();
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/entities/${entityId}/suggestions/aeo/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            setSuggestions((prev) => prev.filter((s) => s.id !== id));
            setSelectedSuggestion(null);
            toast.success("Suggestion deleted.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete.");
        }
    };

    const handleDeleteIds = async (ids: string[]) => {
        const results = await Promise.allSettled(
            ids.map((id) => fetch(`/api/entities/${entityId}/suggestions/aeo/${id}`, { method: "DELETE" })),
        );
        const okIds = ids.filter((_, i) => results[i].status === "fulfilled" && (results[i] as PromiseFulfilledResult<Response>).value.ok);
        const failedCount = ids.length - okIds.length;
        if (okIds.length > 0) {
            const okSet = new Set(okIds);
            setSuggestions((prev) => prev.filter((s) => !okSet.has(s.id)));
            if (selectedSuggestion && okSet.has(selectedSuggestion.id)) setSelectedSuggestion(null);
        }
        if (failedCount > 0) {
            toast.error(`Failed to delete ${failedCount} suggestion${failedCount === 1 ? "" : "s"}.`);
        } else {
            toast.success(`${okIds.length} suggestion${okIds.length === 1 ? "" : "s"} deleted.`);
        }
    };

    const handleAddSuggestion = async (title: string) => {
        try {
            const res = await fetch(`/api/entities/${entityId}/suggestions/aeo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to add tactic.");
                return;
            }
            setSuggestions((prev) => [...prev, data.suggestion]);
        } catch (err) {
            console.error(err);
            toast.error("Failed to add tactic.");
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch(`/api/entities/${entityId}/suggestions/analyze`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                // 429 cooldown: surface a friendlier message with next-available time.
                if (res.status === 429 && data?.code === "cooldown" && data?.nextAvailableAt) {
                    const next = new Date(data.nextAvailableAt);
                    toast.error(
                        `Generate is on cooldown for this entity. Available again ${formatRelativeFuture(next)}.`,
                    );
                    return;
                }
                toast.error(data.error || "Failed to generate suggestions.");
                return;
            }
            await fetchSuggestions();
        } catch (err) {
            console.error(err);
            toast.error("Unexpected error generating suggestions.");
        } finally {
            setIsGenerating(false);
        }
    };

    /* ─── Filtering ────────────────────────────────────────────────── */

    /** Apply channel + category filters (status filter handled per-section). */
    const applyFilters = useCallback(
        (s: Suggestion) => {
            if (channel !== "all" && s.channel !== channel) return false;
            if (categories.length > 0 && !categories.includes(s.category)) return false;
            return true;
        },
        [channel, categories],
    );

    const backlogItems = useMemo(
        () => suggestions.filter((s) => s.status === "Suggested" && applyFilters(s)),
        [suggestions, applyFilters],
    );

    const boardItems = useMemo(
        () => suggestions.filter((s) => BOARD_STATUSES.has(s.status) && applyFilters(s)),
        [suggestions, applyFilters],
    );

    const dismissedItems = useMemo(
        () => suggestions.filter((s) => s.status === "Dismissed" && applyFilters(s)),
        [suggestions, applyFilters],
    );

    const archivedItems = useMemo(
        () => suggestions.filter((s) => s.status === "Archived" && applyFilters(s)),
        [suggestions, applyFilters],
    );

    /* ─── Dnd ──────────────────────────────────────────────────────── */

    const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            return;
        }
        const localActiveId = active.id as string;
        const overId = over.id as string;
        const activeSuggestion = suggestions.find((s) => s.id === localActiveId);
        if (!activeSuggestion) {
            setActiveId(null);
            return;
        }

        let newStatus: SuggestionStatus | undefined;
        if (overId === "ToDo" || overId === "In_Progress" || overId === "Done") {
            newStatus = overId as SuggestionStatus;
        } else {
            const overSuggestion = suggestions.find((s) => s.id === overId);
            if (overSuggestion) newStatus = overSuggestion.status;
        }

        if (newStatus && newStatus !== activeSuggestion.status) {
            handleStatusChange(localActiveId, newStatus);
        }
        setActiveId(null);
    };

    const kanbanColumns: { id: SuggestionStatus; title: string }[] = [
        { id: "ToDo", title: "To Do" },
        { id: "In_Progress", title: "Doing" },
        { id: "Done", title: "Done" },
    ];

    /* ─── Header bar ───────────────────────────────────────────────── */

    const headerBar = (
        <Flex align="center" gap="3" width="100%">
            <Header.Title as="h1" size="4" weight="bold" style={{ flexShrink: 0 }}>AEO Suggestions</Header.Title>
            <Separator orientation="vertical" size="2" />
            <Text size="2" color="gray" truncate style={{ flex: 1, minWidth: 0 }}>
                Actionable tactics tailored to your brand. On-Page improves what you control; Off-Page builds the third-party validation that LLMs trust.
            </Text>

            <RadixButton
                size="2"
                variant="solid"
                onClick={handleGenerate}
                disabled={isGenerating}
                loading={isGenerating}
                style={{ flexShrink: 0 }}
            >
                <MagicWandIcon />
                {isGenerating ? "Analyzing…" : "Generate"}
            </RadixButton>
        </Flex>
    );

    /* ─── Render ───────────────────────────────────────────────────── */

    const noSuggestions = !isLoading && suggestions.length === 0;
    const showBoard = boardItems.length > 0;

    return (
        <PageContainer
            noContentPadding
            headers={[
                {
                    content: headerBar,
                    sticky: true,
                    zIndex: 25,
                },
            ]}
        >
            <TwoColumnPage
                asidePosition="left"
                aside={
                    !noSuggestions ? (
                        <SuggestionsSidebar
                            suggestions={suggestions}
                            channel={channel}
                            onChannelChange={(c) => updateParam("channel", c)}
                            categories={categories}
                            onCategoriesChange={(cats) =>
                                updateParam("category", cats.length > 0 ? cats.join(",") : null)
                            }
                        />
                    ) : null
                }
            >
                {/* Mobile-only channel chip strip — sidebar is hidden below md */}
                {!noSuggestions && (
                    <Box display={{ initial: "block", md: "none" }} px="4" pt="3">
                        <SegmentedControl.Root
                            value={channel}
                            onValueChange={(v) => updateParam("channel", v === "all" ? null : v)}
                            size="1"
                            variant="surface"
                            aria-label="Channel filter (mobile)"
                        >
                            <SegmentedControl.Item value="all">All</SegmentedControl.Item>
                            <SegmentedControl.Item value="OnPage">On-Page</SegmentedControl.Item>
                            <SegmentedControl.Item value="OffPage">Off-Page</SegmentedControl.Item>
                        </SegmentedControl.Root>
                    </Box>
                )}

                <Box p="4">
                    {isLoading ? (
                        <Flex align="center" justify="center" style={{ minHeight: 320 }}>
                            <Spinner size="3" />
                        </Flex>
                    ) : noSuggestions ? (
                        <EmptyState onGenerate={handleGenerate} isGenerating={isGenerating} />
                    ) : (
                        <Flex direction="column" gap="6">
                            {/* Active Board — only when there's work in flight */}
                            {showBoard && (
                                <ActiveBoard
                                    suggestions={boardItems}
                                    sensors={sensors}
                                    activeId={activeId}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onCardClick={setSelectedSuggestion}
                                    onStatusChange={handleStatusChange}
                                    kanbanColumns={kanbanColumns}
                                />
                            )}

                            {/* Backlog — always visible */}
                            <Flex direction="column" gap="3">
                                <Header.Root mb="0">
                                    <Header.Content>
                                        <Header.Title size="3" weight="bold">Backlog</Header.Title>
                                        <Header.Description>
                                            {showBoard
                                                ? "New tactics land here. Tackle one to promote it to the active board."
                                                : "New tactics land here. Tackle your first one to start an active board above."}
                                        </Header.Description>
                                    </Header.Content>
                                </Header.Root>

                                {/* Inline "+ Add a tactic" row disabled — without engine-grade
                                    suggestion logic, manual rows just turn this into a worse
                                    Trello. Re-enable by uncommenting `onAdd` below and restoring
                                    the truly-empty branch (see git history). */}
                                {backlogItems.length === 0 ? (
                                    <Callout.Root color="gray" variant="surface" size="1">
                                        <Callout.Text>
                                            {categories.length === 0 && channel === "all"
                                                ? "No backlog items yet. Click Generate to analyze your website."
                                                : "No backlog items match the current filters."}
                                        </Callout.Text>
                                    </Callout.Root>
                                ) : (
                                    <SuggestionsTable
                                        suggestions={backlogItems}
                                        onRowClick={setSelectedSuggestion}
                                        onStatusChange={handleStatusChange}
                                        onBulkStatusChange={handleBulkStatusChange}
                                        // onAdd={handleAddSuggestion}
                                        bulkActions={["ToDo", "Dismiss"]}
                                    />
                                )}
                            </Flex>

                            {/* Dismissed — collapsed by default */}
                            {dismissedItems.length > 0 && (
                                <Box>
                                    <RadixButton
                                        size="1"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => setShowDismissed((v) => !v)}
                                    >
                                        {showDismissed ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                        Dismissed ({dismissedItems.length})
                                    </RadixButton>
                                    {showDismissed && (
                                        <Box mt="2">
                                            <SuggestionsTable
                                                suggestions={dismissedItems}
                                                onRowClick={setSelectedSuggestion}
                                                onStatusChange={handleStatusChange}
                                                onBulkStatusChange={handleBulkStatusChange}
                                                onDelete={handleDeleteIds}
                                                bulkActions={["Restore", "Delete"]}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Archived — completed work the user has cleared off the
                                active board. Same collapse pattern as Dismissed; users
                                can restore (back to Done) or delete permanently. */}
                            {archivedItems.length > 0 && (
                                <Box>
                                    <RadixButton
                                        size="1"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => setShowArchived((v) => !v)}
                                    >
                                        {showArchived ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                        Archived ({archivedItems.length})
                                    </RadixButton>
                                    {showArchived && (
                                        <Box mt="2">
                                            <SuggestionsTable
                                                suggestions={archivedItems}
                                                onRowClick={setSelectedSuggestion}
                                                onStatusChange={handleStatusChange}
                                                onBulkStatusChange={handleBulkStatusChange}
                                                onDelete={handleDeleteIds}
                                                bulkActions={["Restore", "Delete"]}
                                                restoreToStatus="Done"
                                            />
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Flex>
                    )}
                </Box>
            </TwoColumnPage>

            <SuggestionDetailDrawer
                suggestion={selectedSuggestion}
                onClose={() => setSelectedSuggestion(null)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
            />
        </PageContainer>
    );
}

/* ─── EmptyState ───────────────────────────────────────────────────── */

function EmptyState({ onGenerate, isGenerating }: { onGenerate: () => void; isGenerating: boolean }) {
    return (
        <Card variant="surface" size="4">
            <Flex direction="column" align="center" gap="4" py="6">
                <Box
                    style={{
                        background: "var(--accent-3)",
                        color: "var(--accent-11)",
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <RocketIcon width={28} height={28} />
                </Box>
                <Flex direction="column" align="center" gap="1" style={{ maxWidth: 480, textAlign: "center" }}>
                    <Heading size="4" weight="bold">No suggestions yet</Heading>
                    <Text size="2" color="gray">
                        Click <Text weight="medium">Generate</Text> to analyze your website and surface AEO tactics
                        tailored to your brand. We&apos;ll suggest a balanced mix of On-Page and Off-Page work.
                    </Text>
                </Flex>
                <RadixButton size="2" variant="solid" onClick={onGenerate} disabled={isGenerating} loading={isGenerating}>
                    <MagicWandIcon />
                    {isGenerating ? "Analyzing…" : "Generate suggestions"}
                </RadixButton>
            </Flex>
        </Card>
    );
}

/* ─── Active Board (Kanban above the backlog) ─────────────────────── */

interface ActiveBoardProps {
    suggestions: Suggestion[];
    sensors: ReturnType<typeof useSensors>;
    activeId: string | null;
    onDragStart: (e: DragStartEvent) => void;
    onDragEnd: (e: DragEndEvent) => void;
    onCardClick: (s: Suggestion) => void;
    onStatusChange: (id: string, status: SuggestionStatus) => void;
    kanbanColumns: { id: SuggestionStatus; title: string }[];
}

function ActiveBoard({
    suggestions,
    sensors,
    activeId,
    onDragStart,
    onDragEnd,
    onCardClick,
    onStatusChange,
    kanbanColumns,
}: ActiveBoardProps) {
    return (
        <Flex direction="column" gap="3">
            <Header.Root mb="0">
                <Header.Content>
                    <Header.Title size="3" weight="bold">Active Board</Header.Title>
                    <Header.Description>
                        Drag cards across columns to track progress.
                    </Header.Description>
                </Header.Content>
            </Header.Root>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <Card variant="surface" size="3" className="overflow-hidden !p-0">
                    <Grid columns={{ initial: "1", md: "3" }}>
                        {kanbanColumns.map((column, idx) => {
                            const isDoneCol = column.id === "Done";
                            // Done column is sorted by most-recent-first; everything
                            // else keeps the order from the page's parent sort.
                            const columnSuggestions = suggestions
                                .filter((s) => s.status === column.id)
                                .sort((a, b) => {
                                    if (!isDoneCol) return 0;
                                    const ta = new Date(a.updatedAt ?? 0).getTime();
                                    const tb = new Date(b.updatedAt ?? 0).getTime();
                                    return tb - ta;
                                });
                            const isLast = idx === kanbanColumns.length - 1;
                            // Mirror OverviewCharts divider scheme — bottom border on mobile,
                            // right border on desktop, last column has neither.
                            const dividerClass = isLast
                                ? ""
                                : "border-b md:border-b-0 md:border-r border-[var(--gray-a6)]";
                            return (
                                <DroppableColumn
                                    key={column.id}
                                    id={column.id}
                                    className={`p-4 transition-colors flex flex-col gap-4 ${dividerClass}`}
                                    style={{ minHeight: 220 }}
                                >
                                    <Flex align="center" justify="between" px="1">
                                        <Heading size="2" weight="bold">{column.title}</Heading>
                                        <Box
                                            style={{
                                                background: "var(--gray-3)",
                                                borderRadius: 999,
                                                padding: "2px 8px",
                                            }}
                                        >
                                            <Text size="1" color="gray" weight="medium">
                                                {columnSuggestions.length}
                                            </Text>
                                        </Box>
                                    </Flex>
                                    <SortableContext
                                        id={column.id}
                                        items={columnSuggestions.map((s) => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <ColumnBody
                                            isDoneCol={isDoneCol}
                                            suggestions={columnSuggestions}
                                            onCardClick={onCardClick}
                                            onStatusChange={onStatusChange}
                                        />
                                    </SortableContext>
                                </DroppableColumn>
                            );
                        })}
                    </Grid>
                </Card>
                <DragOverlay>
                    {activeId ? (
                        <SuggestionCard
                            suggestion={suggestions.find((s) => s.id === activeId)!}
                            className="shadow-2xl rotate-2 cursor-grabbing"
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </Flex>
    );
}

const DONE_COLLAPSE_THRESHOLD = 5;

/** Column body. Renders all cards as-is for ToDo / Doing, but auto-collapses
 *  the Done column above DONE_COLLAPSE_THRESHOLD items behind a "Show N more"
 *  expander so the active board stays readable as completed work piles up. */
function ColumnBody({
    isDoneCol,
    suggestions,
    onCardClick,
    onStatusChange,
}: {
    isDoneCol: boolean;
    suggestions: Suggestion[];
    onCardClick: (s: Suggestion) => void;
    onStatusChange: (id: string, status: SuggestionStatus) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const shouldCollapse = isDoneCol && !expanded && suggestions.length > DONE_COLLAPSE_THRESHOLD;
    const visible = shouldCollapse ? suggestions.slice(0, DONE_COLLAPSE_THRESHOLD) : suggestions;
    const hiddenCount = suggestions.length - visible.length;

    return (
        <Flex direction="column" gap="3" style={{ minHeight: 50, flex: 1 }}>
            {visible.map((suggestion) => (
                <DraggableSuggestionCard
                    key={suggestion.id}
                    id={suggestion.id}
                    suggestion={suggestion}
                    onClick={() => onCardClick(suggestion)}
                    onStatusChange={onStatusChange}
                />
            ))}
            {isDoneCol && suggestions.length > DONE_COLLAPSE_THRESHOLD && (
                <RadixButton
                    variant="ghost"
                    color="gray"
                    size="1"
                    onClick={() => setExpanded((v) => !v)}
                >
                    {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
                </RadixButton>
            )}
        </Flex>
    );
}

/** Render a future Date as a relative phrase: "in 5 days", "in 3 hours",
 *  "in 12 minutes". Used by the Generate cooldown toast. */
function formatRelativeFuture(when: Date): string {
    const ms = when.getTime() - Date.now();
    if (ms <= 0) return "shortly";
    const mins = Math.round(ms / 60_000);
    if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.round(hours / 24);
    return `in ${days} day${days === 1 ? "" : "s"}`;
}
