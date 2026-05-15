'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Flex, Text, Switch, Box, TextField, Select, Checkbox, Button } from '@radix-ui/themes';
import { MagnifyingGlassIcon, EyeOpenIcon, EyeNoneIcon, ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useToast } from '@/components/Shared/RadixToast';
import InlineTypeSelect from '@/components/Shared/InlineTypeSelect';
import CompanyLogo from '@/components/CompanyLogo';

interface DomainTypeRecord {
    id: string;
    name: string;
    color: string | null;
}

interface DomainRecord {
    id: string;
    domain: string;
    isAllowlisted: boolean;
    logoUrl: string | null;
    typeId: string | null;
    domainType: DomainTypeRecord | null;
    lastChecked: string;
    createdAt: string;
    updatedAt: string;
}

export function DomainRegistryTable() {
    const [domains, setDomains] = useState<DomainRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTypeId, setSelectedTypeId] = useState('all');
    const [allowlistFilter, setAllowlistFilter] = useState<'all' | 'shown' | 'hidden'>('all');
    const [search, setSearch] = useState('');
    const [domainTypes, setDomainTypes] = useState<DomainTypeRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchLoading, setBatchLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAll, setShowAll] = useState(false);
    const PAGE_SIZE = 50;
    const { toast } = useToast();

    useEffect(() => {
        fetch('/api/domain-types')
            .then(res => res.ok ? res.json() : [])
            .then((types: DomainTypeRecord[]) => setDomainTypes(types))
            .catch(() => {});
    }, []);

    const fetchDomains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/domains');
            if (!res.ok) throw new Error('Failed to fetch');
            setDomains(await res.json());
        } catch {
            toast({ title: 'Error', description: 'Failed to load domains.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchDomains(); }, [fetchDomains]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [selectedTypeId, allowlistFilter, search]);

    // Build filter options from the types actually present on domains
    const usedTypeIds = useMemo(() => {
        const ids = Array.from(new Set(domains.map(d => d.typeId).filter(Boolean))) as string[];
        return ids;
    }, [domains]);

    const filtered = useMemo(() => {
        return domains.filter(d => {
            const matchesType = selectedTypeId === 'all' || (selectedTypeId === '__none__' ? !d.typeId : d.typeId === selectedTypeId);
            const matchesAllowlist = allowlistFilter === 'all' || (allowlistFilter === 'shown' ? d.isAllowlisted : !d.isAllowlisted);
            const matchesSearch = !search || d.domain.includes(search.toLowerCase());
            return matchesType && matchesAllowlist && matchesSearch;
        });
    }, [domains, selectedTypeId, allowlistFilter, search]);

    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        domains.forEach(d => {
            if (d.typeId) counts[d.typeId] = (counts[d.typeId] || 0) + 1;
        });
        return counts;
    }, [domains]);

    const allowlistedCount = useMemo(() => domains.filter(d => d.isAllowlisted).length, [domains]);

    const paginated = useMemo(() => {
        if (showAll) return filtered;
        const start = (currentPage - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, currentPage, showAll]);

    const allFilteredSelected = filtered.length > 0 && filtered.every(d => selectedIds.has(d.id));
    const someFilteredSelected = filtered.some(d => selectedIds.has(d.id)) && !allFilteredSelected;
    const selectAllState: boolean | 'indeterminate' = allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false;

    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filtered.forEach(d => next.delete(d.id));
            } else {
                filtered.forEach(d => next.add(d.id));
            }
            return next;
        });
    };

    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleAllowlist = async (domain: DomainRecord) => {
        const newVal = !domain.isAllowlisted;
        setDomains(prev => prev.map(d => d.id === domain.id ? { ...d, isAllowlisted: newVal } : d));
        try {
            const res = await fetch(`/api/admin/domains/${domain.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAllowlisted: newVal }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch {
            setDomains(prev => prev.map(d => d.id === domain.id ? { ...d, isAllowlisted: domain.isAllowlisted } : d));
            toast({ title: 'Error', description: 'Failed to update domain.', type: 'error' });
        }
    };

    const handleTypeChange = async (domain: DomainRecord, newTypeId: string | null) => {
        const prevTypeId = domain.typeId;
        const newType = newTypeId ? domainTypes.find(t => t.id === newTypeId) ?? null : null;
        setDomains(ds => ds.map(d => d.id === domain.id ? { ...d, typeId: newTypeId, domainType: newType } : d));
        try {
            const res = await fetch(`/api/admin/domains/${domain.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ typeId: newTypeId }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch {
            const prevType = prevTypeId ? domainTypes.find(t => t.id === prevTypeId) ?? null : null;
            setDomains(ds => ds.map(d => d.id === domain.id ? { ...d, typeId: prevTypeId, domainType: prevType } : d));
            toast({ title: 'Error', description: 'Failed to update type.', type: 'error' });
        }
    };

    const handleBatchAllowlist = async (value: boolean) => {
        const ids = Array.from(selectedIds);
        setBatchLoading(true);
        setDomains(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, isAllowlisted: value } : d));
        try {
            await Promise.all(ids.map(id =>
                fetch(`/api/admin/domains/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isAllowlisted: value }),
                })
            ));
            toast({
                title: 'Updated',
                description: `${ids.length} domain${ids.length !== 1 ? 's' : ''} ${value ? 'shown in' : 'hidden from'} Global Insights.`,
                type: 'success',
            });
            setSelectedIds(new Set());
        } catch {
            fetchDomains();
            toast({ title: 'Error', description: 'Batch update failed.', type: 'error' });
        } finally {
            setBatchLoading(false);
        }
    };

    // Helper to resolve typeId to name for display
    const typeNameById = (id: string) => domainTypes.find(t => t.id === id)?.name ?? 'Unknown';

    return (
        <Flex direction="column" gap="4">
            {/* Toolbar */}
            <Flex justify="between" align="center" wrap="wrap" gap="3">
                <Flex align="center" gap="3">
                    <Select.Root value={selectedTypeId} onValueChange={setSelectedTypeId}>
                        <Select.Trigger style={{ minWidth: 200 }} />
                        <Select.Content>
                            <Select.Item value="all">All types ({domains.length})</Select.Item>
                            <Select.Item value="__none__">No type ({domains.filter(d => !d.typeId).length})</Select.Item>
                            <Select.Separator />
                            {usedTypeIds.map(id => (
                                <Select.Item key={id} value={id}>
                                    {typeNameById(id)} ({typeCounts[id] ?? 0})
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root value={allowlistFilter} onValueChange={v => setAllowlistFilter(v as 'all' | 'shown' | 'hidden')}>
                        <Select.Trigger />
                        <Select.Content>
                            <Select.Item value="all">All</Select.Item>
                            <Select.Item value="shown">Shown in Global Insights</Select.Item>
                            <Select.Item value="hidden">Hidden from Global Insights</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <TextField.Root
                        placeholder="Search domain..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 220 }}
                    >
                        <TextField.Slot>
                            <MagnifyingGlassIcon />
                        </TextField.Slot>
                    </TextField.Root>
                </Flex>
            </Flex>

            {/* Batch action bar */}
            {selectedIds.size > 0 && (
                <Flex
                    align="center"
                    justify="between"
                    px="4"
                    py="3"
                    style={{
                        backgroundColor: 'var(--blue-3)',
                        borderRadius: 'var(--radius-3)',
                        border: '1px solid var(--blue-6)',
                    }}
                >
                    <Text size="2" weight="medium" color="blue">
                        {selectedIds.size} domain{selectedIds.size !== 1 ? 's' : ''} selected
                    </Text>
                    <Flex gap="2" align="center">
                        <Button size="2" variant="soft" color="green" loading={batchLoading} onClick={() => handleBatchAllowlist(true)}>
                            <EyeOpenIcon /> Show in Global Insights
                        </Button>
                        <Button size="2" variant="soft" color="gray" loading={batchLoading} onClick={() => handleBatchAllowlist(false)}>
                            <EyeNoneIcon /> Hide from Global Insights
                        </Button>
                        <Button size="2" variant="ghost" color="gray" onClick={() => setSelectedIds(new Set())}>
                            Clear
                        </Button>
                    </Flex>
                </Flex>
            )}

            {/* Table */}
            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell style={{ width: 40 }}>
                            <Box onClick={e => e.stopPropagation()}>
                                <Checkbox size="1" checked={selectAllState} onCheckedChange={toggleSelectAll} />
                            </Box>
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Domain</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell align="right">Shown in Global Insights ({allowlistedCount})</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {loading ? (
                        <Table.Row>
                            <Table.Cell colSpan={4}>
                                <Flex justify="center" p="4"><Text color="gray">Loading domains...</Text></Flex>
                            </Table.Cell>
                        </Table.Row>
                    ) : filtered.length === 0 ? (
                        <Table.Row>
                            <Table.Cell colSpan={4}>
                                <Flex justify="center" p="4"><Text color="gray">No domains found.</Text></Flex>
                            </Table.Cell>
                        </Table.Row>
                    ) : paginated.map(domain => (
                        <Table.Row
                            key={domain.id}
                            align="center"
                            style={selectedIds.has(domain.id) ? { backgroundColor: 'var(--blue-2)' } : undefined}
                        >
                            <Table.Cell>
                                <Box onClick={e => e.stopPropagation()}>
                                    <Checkbox size="1" checked={selectedIds.has(domain.id)} onCheckedChange={() => toggleRow(domain.id)} />
                                </Box>
                            </Table.Cell>
                            <Table.Cell>
                                <Flex align="center" gap="2">
                                    <CompanyLogo domain={domain.domain} logoUrl={domain.logoUrl} size={20} radius="full" />
                                    <Text size="2" weight="medium">{domain.domain}</Text>
                                </Flex>
                            </Table.Cell>
                            <Table.Cell>
                                <InlineTypeSelect
                                    value={domain.typeId}
                                    onChange={val => handleTypeChange(domain, val)}
                                    types={domainTypes}
                                />
                            </Table.Cell>
                            <Table.Cell align="right">
                                <Box onClick={e => e.stopPropagation()}>
                                    <Switch checked={domain.isAllowlisted} onCheckedChange={() => handleToggleAllowlist(domain)} size="1" />
                                </Box>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            {/* Pagination */}
            {filtered.length > 0 && (
                <Flex align="center" justify="between" pt="3" px="1" style={{ borderTop: '1px solid var(--gray-a4)' }}>
                    <Text size="1" color="gray">
                        {showAll
                            ? `Showing all ${filtered.length} domains`
                            : `Showing ${Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} domains`
                        }
                    </Text>
                    <Flex align="center" gap="3">
                        {!showAll && (
                            <Flex align="center" gap="1">
                                <Button variant="soft" color="gray" size="1" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                    <ChevronLeftIcon /> Previous
                                </Button>
                                <Button variant="soft" color="gray" size="1" disabled={currentPage === Math.ceil(filtered.length / PAGE_SIZE)} onClick={() => setCurrentPage(p => p + 1)}>
                                    Next <ChevronRightIcon />
                                </Button>
                            </Flex>
                        )}
                        <Button variant="ghost" color="gray" size="1" onClick={() => { setShowAll(v => !v); setCurrentPage(1); }}>
                            {showAll ? 'Paginate' : 'Show all'}
                        </Button>
                    </Flex>
                </Flex>
            )}
        </Flex>
    );
}
