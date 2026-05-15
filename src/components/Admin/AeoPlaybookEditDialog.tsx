"use client";

import { useState } from "react";
import {
    Dialog,
    Flex,
    Text,
    TextField,
    TextArea,
    Select,
    Button,
    Switch,
    Tabs,
    Box,
    Callout,
} from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";

export interface AeoPlaybookFormValue {
    slug?: string;
    title: string;
    description: string;
    category: "Content" | "Technical" | "Authority" | "UX" | "Brand";
    channel: "OnPage" | "OffPage";
    defaultImpact: number;
    defaultEffort: number;
    tags: string[];
    isActive: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    initial: (AeoPlaybookFormValue & { slug: string }) | null;
    onSubmit: (value: AeoPlaybookFormValue) => Promise<void>;
    onDelete?: () => void | Promise<void>;
}

const CATEGORIES: AeoPlaybookFormValue["category"][] = ["Content", "Technical", "Authority", "UX", "Brand"];
const CHANNELS: { value: AeoPlaybookFormValue["channel"]; label: string }[] = [
    { value: "OnPage", label: "On-Page (owned)" },
    { value: "OffPage", label: "Off-Page (earned)" },
];

export function AeoPlaybookEditDialog({ open, onClose, initial, onSubmit, onDelete }: Props) {
    const isCreate = initial === null;
    const [slug, setSlug] = useState(initial?.slug ?? "");
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [category, setCategory] = useState<AeoPlaybookFormValue["category"]>(initial?.category ?? "Content");
    const [channel, setChannel] = useState<AeoPlaybookFormValue["channel"]>(initial?.channel ?? "OnPage");
    const [impact, setImpact] = useState(initial?.defaultImpact ?? 5);
    const [effort, setEffort] = useState(initial?.defaultEffort ?? 5);
    const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
    const [isActive, setIsActive] = useState(initial?.isActive ?? true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const tags = tagsInput
                .split(",")
                .map(t => t.trim())
                .filter(Boolean);
            await onSubmit({
                ...(isCreate ? { slug: slug.trim() } : {}),
                title: title.trim(),
                description: description.trim(),
                category,
                channel,
                defaultImpact: impact,
                defaultEffort: effort,
                tags,
                isActive,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Dialog.Content style={{ maxWidth: 720 }}>
                <Dialog.Title>{isCreate ? "Create AEO Tactic" : `Edit ${initial?.slug}`}</Dialog.Title>
                <Dialog.Description size="2" mb="4" color="gray">
                    {isCreate
                        ? "Add a new tactic to the AEO playbook. Becomes available to the engine immediately."
                        : "Updates apply to the next /analyze run. Existing EntitySuggestion rows are not retroactively modified — they refresh on the next analysis."}
                </Dialog.Description>

                <form onSubmit={handleSubmit}>
                    <Flex direction="column" gap="4">
                        {error && (
                            <Callout.Root color="red" size="1">
                                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                                <Callout.Text>{error}</Callout.Text>
                            </Callout.Root>
                        )}

                        {isCreate && (
                            <Flex direction="column" gap="1">
                                <Text as="label" size="2" weight="bold">Slug</Text>
                                <TextField.Root
                                    placeholder="e.g. aeo_31_industry_directories"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    required
                                />
                                <Text size="1" color="gray">Lowercase letters, numbers, dashes, underscores. Stable join key on EntitySuggestion.tacticId — choose carefully.</Text>
                            </Flex>
                        )}

                        <Flex direction="column" gap="1">
                            <Text as="label" size="2" weight="bold">Title</Text>
                            <TextField.Root
                                placeholder="What this tactic is, in one line"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={200}
                                required
                            />
                        </Flex>

                        <Flex direction="column" gap="1">
                            <Text as="label" size="2" weight="bold">Description (markdown)</Text>
                            <Tabs.Root defaultValue="edit">
                                <Tabs.List size="1">
                                    <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
                                    <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
                                </Tabs.List>
                                <Box pt="2">
                                    <Tabs.Content value="edit">
                                        <TextArea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={10}
                                            placeholder="Describe the tactic. Markdown supported — use bullets, **bold**, and short paragraphs."
                                            required
                                        />
                                    </Tabs.Content>
                                    <Tabs.Content value="preview">
                                        <Box
                                            p="3"
                                            style={{
                                                minHeight: 220,
                                                border: "1px solid var(--gray-a4)",
                                                borderRadius: 6,
                                                background: "var(--gray-1)",
                                            }}
                                            className="prose prose-sm max-w-none"
                                        >
                                            {description ? (
                                                <ReactMarkdown>{description}</ReactMarkdown>
                                            ) : (
                                                <Text size="2" color="gray">Nothing to preview yet.</Text>
                                            )}
                                        </Box>
                                    </Tabs.Content>
                                </Box>
                            </Tabs.Root>
                        </Flex>

                        <Flex gap="3" wrap="wrap">
                            <Flex direction="column" gap="1" style={{ flex: "1 1 200px" }}>
                                <Text as="label" size="2" weight="bold">Channel</Text>
                                <Select.Root value={channel} onValueChange={(v) => setChannel(v as AeoPlaybookFormValue["channel"])}>
                                    <Select.Trigger />
                                    <Select.Content>
                                        {CHANNELS.map(c => <Select.Item key={c.value} value={c.value}>{c.label}</Select.Item>)}
                                    </Select.Content>
                                </Select.Root>
                            </Flex>
                            <Flex direction="column" gap="1" style={{ flex: "1 1 200px" }}>
                                <Text as="label" size="2" weight="bold">Category</Text>
                                <Select.Root value={category} onValueChange={(v) => setCategory(v as AeoPlaybookFormValue["category"])}>
                                    <Select.Trigger />
                                    <Select.Content>
                                        {CATEGORIES.map(c => <Select.Item key={c} value={c}>{c}</Select.Item>)}
                                    </Select.Content>
                                </Select.Root>
                            </Flex>
                        </Flex>

                        <Flex gap="3" wrap="wrap">
                            <Flex direction="column" gap="1" style={{ flex: "1 1 200px" }}>
                                <Text as="label" size="2" weight="bold">Default impact (1-10)</Text>
                                <TextField.Root
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={impact}
                                    onChange={(e) => setImpact(Math.max(1, Math.min(10, parseInt(e.target.value) || 0)))}
                                    required
                                />
                            </Flex>
                            <Flex direction="column" gap="1" style={{ flex: "1 1 200px" }}>
                                <Text as="label" size="2" weight="bold">Default effort (1-10)</Text>
                                <TextField.Root
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={effort}
                                    onChange={(e) => setEffort(Math.max(1, Math.min(10, parseInt(e.target.value) || 0)))}
                                    required
                                />
                            </Flex>
                        </Flex>

                        <Flex direction="column" gap="1">
                            <Text as="label" size="2" weight="bold">Tags (comma-separated)</Text>
                            <TextField.Root
                                placeholder="e.g. schema, faq, technical-seo"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                            />
                        </Flex>

                        <Flex align="center" gap="2">
                            <Switch checked={isActive} onCheckedChange={setIsActive} id="aeo-active" />
                            <Text as="label" size="2" htmlFor="aeo-active">
                                Active — included in /analyze runs
                            </Text>
                        </Flex>
                    </Flex>

                    <Flex justify="between" mt="5" align="center">
                        {onDelete ? (
                            <Button type="button" variant="ghost" color="red" onClick={onDelete}>
                                Delete
                            </Button>
                        ) : <Box />}
                        <Flex gap="2">
                            <Dialog.Close>
                                <Button type="button" variant="soft" color="gray">Cancel</Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving…" : isCreate ? "Create" : "Save changes"}
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
}
