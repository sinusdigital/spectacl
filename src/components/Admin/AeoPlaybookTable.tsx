"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Table,
    Flex,
    Text,
    Badge,
    Button,
    IconButton,
    Skeleton,
    Switch,
    TextField,
    Select,
} from "@radix-ui/themes";
import { Pencil1Icon, PlusIcon, MagnifyingGlassIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { useToast } from "@/components/Shared/RadixToast";
import { AeoPlaybookEditDialog, type AeoPlaybookFormValue } from "./AeoPlaybookEditDialog";
import { AeoPlaybookPreviewDialog } from "./AeoPlaybookPreviewDialog";

export interface AeoPlaybookItemRow {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: "Content" | "Technical" | "Authority" | "UX" | "Brand";
    channel: "OnPage" | "OffPage";
    defaultImpact: number;
    defaultEffort: number;
    tags: string[];
    isActive: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
}

const CHANNEL_LABEL: Record<AeoPlaybookItemRow["channel"], string> = {
    OnPage: "On-Page",
    OffPage: "Off-Page",
};

const CATEGORY_COLOR: Record<AeoPlaybookItemRow["category"], React.ComponentProps<typeof Badge>["color"]> = {
    Content: "blue",
    Technical: "purple",
    Authority: "orange",
    UX: "green",
    Brand: "red",
};

export function AeoPlaybookTable() {
    const [items, setItems] = useState<AeoPlaybookItemRow[] | null>(null);
    const [search, setSearch] = useState("");
    const [channelFilter, setChannelFilter] = useState<"all" | "OnPage" | "OffPage">("all");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
    const [editTarget, setEditTarget] = useState<AeoPlaybookItemRow | "new" | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const { toast } = useToast();

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/aeo-playbook");
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setItems(data.items);
        } catch {
            toast({ title: "Error", description: "Failed to load AEO playbook.", type: "error" });
        }
    }, [toast]);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        if (!items) return [];
        const q = search.trim().toLowerCase();
        return items.filter(item => {
            if (channelFilter !== "all" && item.channel !== channelFilter) return false;
            if (activeFilter === "active" && !item.isActive) return false;
            if (activeFilter === "inactive" && item.isActive) return false;
            if (q && !(item.title.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [items, search, channelFilter, activeFilter]);

    const counts = useMemo(() => {
        if (!items) return { total: 0, onPage: 0, offPage: 0, active: 0 };
        return {
            total: items.length,
            onPage: items.filter(i => i.channel === "OnPage").length,
            offPage: items.filter(i => i.channel === "OffPage").length,
            active: items.filter(i => i.isActive).length,
        };
    }, [items]);

    const handleSubmit = async (slug: string | null, value: AeoPlaybookFormValue) => {
        const isCreate = slug === null;
        const url = isCreate ? "/api/admin/aeo-playbook" : `/api/admin/aeo-playbook/${encodeURIComponent(slug)}`;
        const res = await fetch(url, {
            method: isCreate ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(value),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Save failed");
        }
        toast({ title: "Saved", description: isCreate ? "Tactic created." : "Tactic updated.", type: "success" });
        setEditTarget(null);
        await load();
    };

    const handleDelete = async (slug: string) => {
        if (!window.confirm(`Delete tactic "${slug}"? This cannot be undone. Existing EntitySuggestion rows will keep their data but lose the link to this playbook entry.`)) {
            return;
        }
        const res = await fetch(`/api/admin/aeo-playbook/${encodeURIComponent(slug)}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast({ title: "Error", description: err.error || "Delete failed", type: "error" });
            return;
        }
        toast({ title: "Deleted", description: `Tactic ${slug} removed.`, type: "success" });
        setEditTarget(null);
        await load();
    };

    if (items === null) {
        return (
            <Flex direction="column" gap="3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="48px" />)}
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap="4">
            <Flex justify="between" align="center" gap="3" wrap="wrap">
                <Flex gap="2" align="center" wrap="wrap">
                    <TextField.Root
                        placeholder="Search by title or slug…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ minWidth: 240 }}
                    >
                        <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
                    </TextField.Root>
                    <Select.Root value={channelFilter} onValueChange={(v) => setChannelFilter(v as typeof channelFilter)}>
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="all">All channels</Select.Item>
                            <Select.Item value="OnPage">On-Page only</Select.Item>
                            <Select.Item value="OffPage">Off-Page only</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <Select.Root value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="active">Active</Select.Item>
                            <Select.Item value="inactive">Inactive</Select.Item>
                            <Select.Item value="all">All</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <Text size="2" color="gray">
                        {counts.total} total · {counts.onPage} On-Page · {counts.offPage} Off-Page · {counts.active} active
                    </Text>
                </Flex>
                <Flex gap="2">
                    <Button variant="soft" onClick={() => setPreviewOpen(true)}>
                        <EyeOpenIcon /> Preview against entity
                    </Button>
                    <Button onClick={() => setEditTarget("new")}>
                        <PlusIcon /> New tactic
                    </Button>
                </Flex>
            </Flex>

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Slug</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Channel</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Impact</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Effort</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Active</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {filtered.length === 0 ? (
                        <Table.Row>
                            <Table.Cell colSpan={9}>
                                <Text size="2" color="gray">No tactics match the current filters.</Text>
                            </Table.Cell>
                        </Table.Row>
                    ) : filtered.map(item => (
                        <Table.Row key={item.id}>
                            <Table.Cell><Text size="2" weight="medium">{item.title}</Text></Table.Cell>
                            <Table.Cell><Text size="1" color="gray" style={{ fontFamily: "var(--code-font-family, monospace)" }}>{item.slug}</Text></Table.Cell>
                            <Table.Cell><Badge color="gray" variant="soft" radius="full">{CHANNEL_LABEL[item.channel]}</Badge></Table.Cell>
                            <Table.Cell><Badge color={CATEGORY_COLOR[item.category]} variant="soft" radius="full">{item.category}</Badge></Table.Cell>
                            <Table.Cell><Text size="2">{item.defaultImpact}</Text></Table.Cell>
                            <Table.Cell><Text size="2">{item.defaultEffort}</Text></Table.Cell>
                            <Table.Cell>
                                <Switch
                                    checked={item.isActive}
                                    onCheckedChange={async (next) => {
                                        try {
                                            await handleSubmit(item.slug, {
                                                title: item.title,
                                                description: item.description,
                                                category: item.category,
                                                channel: item.channel,
                                                defaultImpact: item.defaultImpact,
                                                defaultEffort: item.defaultEffort,
                                                tags: item.tags,
                                                isActive: next,
                                            });
                                        } catch (e) {
                                            toast({ title: "Error", description: e instanceof Error ? e.message : "Update failed", type: "error" });
                                        }
                                    }}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Text size="1" color="gray">
                                    {new Date(item.updatedAt).toLocaleDateString()}
                                </Text>
                            </Table.Cell>
                            <Table.Cell>
                                <IconButton variant="ghost" size="1" onClick={() => setEditTarget(item)}>
                                    <Pencil1Icon />
                                </IconButton>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            {editTarget !== null && (
                <AeoPlaybookEditDialog
                    open={true}
                    onClose={() => setEditTarget(null)}
                    initial={editTarget === "new" ? null : editTarget}
                    onSubmit={async (value) => handleSubmit(editTarget === "new" ? null : editTarget.slug, value)}
                    onDelete={editTarget === "new" ? undefined : () => handleDelete(editTarget.slug)}
                />
            )}

            <AeoPlaybookPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} />
        </Flex>
    );
}
