'use client';

import { useState, useEffect } from 'react';
import { Table, Flex, Text, Badge, IconButton, Tooltip, AlertDialog, Button, Dialog, TextField, Switch, Select } from '@radix-ui/themes';
import { PlusIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { useToast } from '@/components/Shared/RadixToast';

interface Language {
    id: string;
    name: string;
    group: string;
    order: number;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

const GROUPS = ['Global', 'Europe', 'Americas', 'Asia Pacific', 'Middle East & Africa'];

function LanguageDialog({
    open,
    onOpenChange,
    onSubmit,
    initial,
    mode,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSubmit: (data: { name: string; group: string; order: number }) => void;
    initial?: Language;
    mode: 'create' | 'edit';
}) {
    const [name, setName] = useState(initial?.name ?? '');
    const [group, setGroup] = useState(initial?.group ?? 'Europe');
    const [order, setOrder] = useState(initial?.order ?? 0);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setName(initial?.name ?? ''); setGroup(initial?.group ?? 'Europe'); setOrder(initial?.order ?? 0); }, [initial, open]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 420 }}>
                <Dialog.Title>{mode === 'create' ? 'Add Language' : 'Edit Language'}</Dialog.Title>
                <Flex direction="column" gap="4" mt="3">
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Name</Text>
                        <TextField.Root
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Germany"
                        />
                    </Flex>
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Group</Text>
                        <Select.Root value={group} onValueChange={setGroup}>
                            <Select.Trigger />
                            <Select.Content>
                                {GROUPS.map(g => (
                                    <Select.Item key={g} value={g}>{g}</Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Flex>
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase' }}>Order</Text>
                        <TextField.Root
                            type="number"
                            value={String(order)}
                            onChange={e => setOrder(parseInt(e.target.value) || 0)}
                            placeholder="0"
                        />
                    </Flex>
                    <Flex justify="end" gap="2" mt="2">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Cancel</Button>
                        </Dialog.Close>
                        <Button
                            onClick={() => { onSubmit({ name, group, order }); onOpenChange(false); }}
                            disabled={!name.trim() || !group.trim()}
                        >
                            {mode === 'create' ? 'Create' : 'Save'}
                        </Button>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}

export function LanguagesTable() {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selected, setSelected] = useState<Language | undefined>();
    const [deleteTarget, setDeleteTarget] = useState<Language | null>(null);
    const { toast } = useToast();

    const fetchLanguages = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/languages');
            if (!res.ok) throw new Error('Failed');
            setLanguages(await res.json());
        } catch {
            toast({ title: 'Error', description: 'Failed to load languages.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLanguages(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (data: { name: string; group: string; order: number }) => {
        try {
            const isEditing = dialogMode === 'edit' && selected;
            const url = isEditing ? `/api/admin/languages/${selected.id}` : '/api/admin/languages';
            const res = await fetch(url, {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            toast({ title: 'Success', description: `Language ${isEditing ? 'updated' : 'created'}.`, type: 'success' });
            fetchLanguages();
        } catch (err: unknown) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save.', type: 'error' });
        }
    };

    const handleToggleEnabled = async (id: string, isEnabled: boolean) => {
        setLanguages(prev => prev.map(l => l.id === id ? { ...l, isEnabled } : l));
        try {
            const res = await fetch(`/api/admin/languages/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch {
            setLanguages(prev => prev.map(l => l.id === id ? { ...l, isEnabled: !isEnabled } : l));
            toast({ title: 'Error', description: 'Failed to update status.', type: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/languages/${deleteTarget.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            toast({ title: 'Success', description: 'Language deleted.', type: 'success' });
            fetchLanguages();
        } catch (err: unknown) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete.', type: 'error' });
        } finally {
            setDeleteTarget(null);
        }
    };

    // Group languages for display
    const grouped = languages.reduce<Record<string, Language[]>>((acc, lang) => {
        if (!acc[lang.group]) acc[lang.group] = [];
        acc[lang.group].push(lang);
        return acc;
    }, {});

    return (
        <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
                <Text size="2" color="gray">{languages.length} markets configured</Text>
                <Flex gap="2">
                    {languages.length === 0 && (
                        <Button
                            size="2"
                            variant="soft"
                            color="blue"
                            disabled={seeding}
                            onClick={async () => {
                                setSeeding(true);
                                try {
                                    const res = await fetch('/api/admin/languages/seed', { method: 'POST' });
                                    const data = await res.json();
                                    if (res.ok) {
                                        toast({ title: 'Markets Seeded', description: `Created ${data.created} markets (${data.skipped} skipped).`, type: 'success' });
                                        fetchLanguages();
                                    } else {
                                        toast({ title: 'Error', description: data.error || 'Failed to seed', type: 'error' });
                                    }
                                } catch {
                                    toast({ title: 'Error', description: 'Failed to seed markets.', type: 'error' });
                                } finally {
                                    setSeeding(false);
                                }
                            }}
                        >
                            {seeding ? 'Seeding...' : 'Seed Default Markets'}
                        </Button>
                    )}
                    <Button size="2" onClick={() => { setDialogMode('create'); setSelected(undefined); setDialogOpen(true); }}>
                        <PlusIcon /> Add Market
                    </Button>
                </Flex>
            </Flex>

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Group</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Order</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Enabled</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {loading ? (
                        <Table.Row>
                            <Table.Cell colSpan={5}>
                                <Flex justify="center" p="4"><Text color="gray">Loading languages...</Text></Flex>
                            </Table.Cell>
                        </Table.Row>
                    ) : Object.entries(grouped).map(([group, langs]) => (
                        langs.map((lang, idx) => (
                            <Table.Row key={lang.id} align="center">
                                <Table.Cell>
                                    <Text size="2" weight="medium">{lang.name}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    {idx === 0 ? (
                                        <Badge variant="soft" color="gray">{group}</Badge>
                                    ) : null}
                                </Table.Cell>
                                <Table.Cell>
                                    <Text size="2" color="gray">{lang.order}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Switch
                                        size="1"
                                        checked={lang.isEnabled}
                                        onCheckedChange={(checked) => handleToggleEnabled(lang.id, checked)}
                                    />
                                </Table.Cell>
                                <Table.Cell align="right">
                                    <Flex gap="2" justify="end">
                                        <Tooltip content="Edit">
                                            <IconButton variant="ghost" color="gray" onClick={() => { setDialogMode('edit'); setSelected(lang); setDialogOpen(true); }}>
                                                <Pencil1Icon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip content="Delete">
                                            <IconButton variant="ghost" color="red" onClick={() => setDeleteTarget(lang)}>
                                                <TrashIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Flex>
                                </Table.Cell>
                            </Table.Row>
                        ))
                    ))}
                </Table.Body>
            </Table.Root>

            <LanguageDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                initial={selected}
                mode={dialogMode}
            />

            <AlertDialog.Root open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
                <AlertDialog.Content style={{ maxWidth: 440 }}>
                    <AlertDialog.Title>Delete Language</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        Delete <strong>{deleteTarget?.name}</strong>? This will be blocked if any prompts currently use this language.
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
