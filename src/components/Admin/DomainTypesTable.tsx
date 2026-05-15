'use client';

import { useState, useEffect } from 'react';
import { Table, Flex, Text, Badge, Code, IconButton, Tooltip, AlertDialog, Button, Dialog, TextField, Box, Switch } from '@radix-ui/themes';
import { PlusIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { DomainType } from '@prisma/client';
import { useToast } from '@/components/Shared/RadixToast';

function ColorSwatch({ color }: { color: string | null }) {
    return (
        <Box
            style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: color || '#9CA3AF',
                border: '1px solid var(--gray-5)',
                flexShrink: 0,
            }}
        />
    );
}

interface TypeDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSubmit: (data: { name: string; slug: string; color: string; description: string }) => void;
    initial?: DomainType;
    mode: 'create' | 'edit';
}

function TypeDialog({ open, onOpenChange, onSubmit, initial, mode }: TypeDialogProps) {
    const [name, setName] = useState(initial?.name ?? '');
    const [slug, setSlug] = useState(initial?.slug ?? '');
    const [color, setColor] = useState(initial?.color ?? '#6B7280');
    const [description, setDescription] = useState(initial?.description ?? '');

    useEffect(() => {
        setName(initial?.name ?? '');
        setSlug(initial?.slug ?? '');
        setColor(initial?.color ?? '#6B7280');
        setDescription(initial?.description ?? '');
    }, [initial, open]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 420 }}>
                <Dialog.Title>{mode === 'create' ? 'Add Domain Type' : 'Edit Domain Type'}</Dialog.Title>
                <Flex direction="column" gap="4" mt="3">
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Name</Text>
                        <TextField.Root
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Social & community"
                        />
                    </Flex>
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Slug</Text>
                        <TextField.Root
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="e.g. social-community"
                        />
                    </Flex>
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Color</Text>
                        <Flex align="center" gap="2">
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                style={{ width: 36, height: 36, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            />
                            <TextField.Root
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                placeholder="#6B7280"
                                style={{ width: 120 }}
                            />
                        </Flex>
                    </Flex>
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Description</Text>
                        <TextField.Root
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description"
                        />
                    </Flex>
                    <Flex justify="end" gap="2" mt="2">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Cancel</Button>
                        </Dialog.Close>
                        <Button onClick={() => { onSubmit({ name, slug, color, description }); onOpenChange(false); }} disabled={!name.trim() || !slug.trim()}>
                            {mode === 'create' ? 'Create' : 'Save'}
                        </Button>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}

export function DomainTypesTable() {
    const [types, setTypes] = useState<DomainType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selected, setSelected] = useState<DomainType | undefined>();
    const [deleteTarget, setDeleteTarget] = useState<DomainType | null>(null);
    const { toast } = useToast();

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/domain-types');
            if (!res.ok) throw new Error('Failed');
            setTypes(await res.json());
        } catch {
            toast({ title: 'Error', description: 'Failed to load domain types.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTypes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (data: { name: string; slug: string; color: string; description: string }) => {
        try {
            const isEditing = dialogMode === 'edit' && selected;
            const url = isEditing ? `/api/admin/domain-types/${selected.id}` : '/api/admin/domain-types';
            const res = await fetch(url, {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            toast({ title: 'Success', description: `Type ${isEditing ? 'updated' : 'created'}.`, type: 'success' });
            fetchTypes();
        } catch (err: unknown) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save.', type: 'error' });
        }
    };

    const handleToggleFlag = async (id: string, field: 'isOwned' | 'isEarned', value: boolean) => {
        setTypes(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
        try {
            const res = await fetch(`/api/admin/domain-types/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch {
            setTypes(prev => prev.map(t => t.id === id ? { ...t, [field]: !value } : t));
            toast({ title: 'Error', description: `Failed to update ${field === 'isOwned' ? 'owned' : 'earned'} status.`, type: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/domain-types/${deleteTarget.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            toast({ title: 'Success', description: 'Type deleted.', type: 'success' });
            fetchTypes();
        } catch (err: unknown) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete.', type: 'error' });
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
                <Text size="2" color="gray">{types.length} types defined</Text>
                <Button size="2" onClick={() => { setDialogMode('create'); setSelected(undefined); setDialogOpen(true); }}>
                    <PlusIcon /> Add Type
                </Button>
            </Flex>

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>Color</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Slug</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Owned</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Earned</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {loading ? (
                        <Table.Row>
                            <Table.Cell colSpan={7}>
                                <Flex justify="center" p="4"><Text color="gray">Loading types...</Text></Flex>
                            </Table.Cell>
                        </Table.Row>
                    ) : types.map(t => (
                        <Table.Row key={t.id} align="center">
                            <Table.Cell>
                                <Flex align="center" gap="2">
                                    <ColorSwatch color={t.color} />
                                    <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono)' }}>{t.color ?? '—'}</Text>
                                </Flex>
                            </Table.Cell>
                            <Table.Cell>
                                <Code size="1" color="gray">{t.slug ?? '—'}</Code>
                            </Table.Cell>
                            <Table.Cell>
                                <Badge variant="soft" style={{ backgroundColor: t.color ? `${t.color}20` : undefined, color: t.color ?? undefined }}>
                                    {t.name}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell>
                                <Text size="2" color="gray">{t.description ?? '—'}</Text>
                            </Table.Cell>
                            <Table.Cell>
                                <Switch
                                    size="1"
                                    checked={t.isOwned}
                                    onCheckedChange={(checked) => handleToggleFlag(t.id, 'isOwned', checked)}
                                />
                            </Table.Cell>
                            <Table.Cell>
                                <Switch
                                    size="1"
                                    checked={t.isEarned}
                                    onCheckedChange={(checked) => handleToggleFlag(t.id, 'isEarned', checked)}
                                />
                            </Table.Cell>
                            <Table.Cell align="right">
                                <Flex gap="2" justify="end">
                                    <Tooltip content="Edit">
                                        <IconButton variant="ghost" color="gray" onClick={() => { setDialogMode('edit'); setSelected(t); setDialogOpen(true); }}>
                                            <Pencil1Icon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip content="Delete">
                                        <IconButton variant="ghost" color="red" onClick={() => setDeleteTarget(t)}>
                                            <TrashIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Flex>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            <TypeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                initial={selected}
                mode={dialogMode}
            />

            <AlertDialog.Root open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
                <AlertDialog.Content style={{ maxWidth: 440 }}>
                    <AlertDialog.Title>Delete Type</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        Delete <strong>{deleteTarget?.name}</strong>? Domains using this type will become untyped.
                        This will be blocked if any domains currently use this type.
                    </AlertDialog.Description>
                    <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                            <Button variant="soft" color="gray">Cancel</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                            <Button variant="solid" color="red" onClick={handleDelete}>Delete</Button>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </Flex>
    );
}
