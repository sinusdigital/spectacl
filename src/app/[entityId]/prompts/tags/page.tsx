"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/components/Shared/PageContainer";
import { DotsHorizontalIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import Header from "@/components/Shared/Header";
import Button from "@/components/Shared/Button";
import RadixTable from "@/components/Shared/RadixTable";
import RadixDropdownMenu from "@/components/Shared/RadixDropdownMenu";
import RadixContextMenu from "@/components/Shared/RadixContextMenu";
import DeleteConfirmationModal from "@/components/Shared/DeleteConfirmationModal";
import TagModal from "@/components/Prompts/TagModal";
import InlineAddRow from "@/components/Shared/InlineAddRow";
import { Flex, Text, Separator } from "@radix-ui/themes";

interface Tag {
    id: string;
    name: string;
    color: string | null;
}

const PREDEFINED_COLORS = [
    "#EF4444", // red-500
    "#F97316", // orange-500
    "#F59E0B", // amber-500
    "#84CC16", // lime-500
    "#10B981", // emerald-500
    "#06B6D4", // cyan-500
    "#3B82F6", // blue-500
    "#6366F1", // indigo-500
    "#8B5CF6", // violet-500
    "#D946EF", // fuchsia-500
    "#EC4899", // pink-500
];

const getRandomColor = () => {
    return PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
};



export default function TagsPage() {
    const params = useParams();
    const entityId = params.entityId as string;
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTags = useCallback(async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}/tags`);
            if (res.ok) {
                const data = await res.json();
                setTags(data);
            }
        } catch (error) {
            console.error("Error fetching tags:", error);
        } finally {
            setLoading(false);
        }
    }, [entityId]);

    useEffect(() => {
        if (entityId) {
            fetchTags();
        }
    }, [entityId, fetchTags]);

    const handleCreateTag = async (name: string, color?: string) => {
        try {
            const finalColor = color || getRandomColor();
            const res = await fetch(`/api/entities/${entityId}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, color: finalColor }),
            });

            if (res.ok) {
                fetchTags();
            }
        } catch (error) {
            console.error("Error creating tag:", error);
        }
    };

    const handleUpdateTag = async (name: string, color: string) => {
        if (!editingTag) return;

        try {
            const res = await fetch(`/api/tags/${editingTag.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, color }),
            });

            if (res.ok) {
                fetchTags();
            }
        } catch (error) {
            console.error("Error updating tag:", error);
            throw error;
        }
    };

    const handleDeleteTag = async () => {
        if (!tagToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/tags/${tagToDelete.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setTagToDelete(null);
                fetchTags();
            }
        } catch (error) {
            console.error("Error deleting tag:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex justify="between" align="center" width="100%">
                            <Flex align="center" gap="4">
                                <Header.Title as="h1" size="4" weight="bold">Tags</Header.Title>
                                <Separator orientation="vertical" size="2" />
                                <Text size="2" color="gray">
                                    Group and organise your prompts by topic, funnel stage, or any category that fits your workflow.
                                </Text>
                            </Flex>
                            <Header.Actions>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    Add Tag
                                </Button>
                            </Header.Actions>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 20
                }
            ]}
        >
            <div>

            {loading ? (
                <div className="text-center py-8 text-[var(--gray-9)]">Loading tags...</div>
            ) : (
                <RadixTable.Root variant="ghost">
                    <RadixTable.Header>
                        <RadixTable.Row>
                            <RadixTable.Head width="30px">#</RadixTable.Head>
                            <RadixTable.Head>Tag Name</RadixTable.Head>
                            <RadixTable.Head>Color</RadixTable.Head>
                            <RadixTable.Head width="60px"></RadixTable.Head>
                        </RadixTable.Row>
                    </RadixTable.Header>
                    <RadixTable.Body>
                        {tags.map((tag, index) => (
                            <RadixContextMenu.Root key={tag.id}>
                                <RadixContextMenu.Trigger>
                                    <RadixTable.Row
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setEditingTag(tag)}
                                    >
                                        <RadixTable.Cell>
                                            <Text size="2" color="gray">{index + 1}</Text>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Flex align="center" gap="2">
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: tag.color || "#3b82f6" }}
                                                />
                                                <Text weight="medium">{tag.name}</Text>
                                            </Flex>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell>
                                            <Text size="2" color="gray" className="uppercase tracking-wider">
                                                {tag.color || "Blue"}
                                            </Text>
                                        </RadixTable.Cell>
                                        <RadixTable.Cell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                            <Flex justify="end">
                                                <RadixDropdownMenu.Root>
                                                    <RadixDropdownMenu.Trigger>
                                                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors outline-none">
                                                            <DotsHorizontalIcon className="w-4 h-4" />
                                                        </button>
                                                    </RadixDropdownMenu.Trigger>
                                                    <RadixDropdownMenu.Content align="end">
                                                        <RadixDropdownMenu.Item onSelect={() => {
                                                            setEditingTag(tag);
                                                        }}>
                                                            <Pencil1Icon className="mr-2 w-3.5 h-3.5 text-gray-400" /> Edit Tag
                                                        </RadixDropdownMenu.Item>
                                                        <RadixDropdownMenu.Separator />
                                                        <RadixDropdownMenu.Item 
                                                            onSelect={() => setTagToDelete(tag)}
                                                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                        >
                                                            <TrashIcon className="mr-2 w-3.5 h-3.5" /> Delete Tag
                                                        </RadixDropdownMenu.Item>
                                                    </RadixDropdownMenu.Content>
                                                </RadixDropdownMenu.Root>
                                            </Flex>
                                        </RadixTable.Cell>
                                    </RadixTable.Row>
                                </RadixContextMenu.Trigger>
                                <RadixContextMenu.Content>
                                    <RadixContextMenu.Item onSelect={() => {
                                        setEditingTag(tag);
                                    }}>
                                        <Pencil1Icon className="mr-2 w-3.5 h-3.5 text-gray-400" /> Edit Tag
                                    </RadixContextMenu.Item>
                                    <RadixContextMenu.Separator />
                                    <RadixContextMenu.Item 
                                        onSelect={() => setTagToDelete(tag)}
                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                    >
                                        <TrashIcon className="mr-2 w-3.5 h-3.5" /> Delete Tag
                                    </RadixContextMenu.Item>
                                </RadixContextMenu.Content>
                            </RadixContextMenu.Root>
                        ))}
                        <InlineAddRow 
                            key="inline-add-row"
                            onAdd={(name) => handleCreateTag(name)} 
                            colCount={4} 
                            label="Add a tag"
                            placeholder="Type a tag name and press Enter…"
                        />
                    </RadixTable.Body>
                </RadixTable.Root>
            )}

            {/* Add Modal */}
            <TagModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleCreateTag}
                mode="create"
                predefinedColors={PREDEFINED_COLORS}
                initialColor={getRandomColor()}
            />

            {/* Edit Modal */}
            {editingTag && (
                <TagModal
                    isOpen={!!editingTag}
                    onClose={() => setEditingTag(null)}
                    onSubmit={handleUpdateTag}
                    mode="edit"
                    tag={editingTag}
                    predefinedColors={PREDEFINED_COLORS}
                />
            )}

            <DeleteConfirmationModal
                isOpen={!!tagToDelete}
                onClose={() => !isDeleting && setTagToDelete(null)}
                onConfirm={handleDeleteTag}
                title="Delete Tag"
                message={`Are you sure you want to delete the tag "${tagToDelete?.name}"? This will not delete any prompts, but will remove this tag from them.`}
                isDeleting={isDeleting}
            />
            </div>
        </PageContainer>
    );
}
