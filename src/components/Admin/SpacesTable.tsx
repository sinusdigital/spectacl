"use client";

import { useMemo, useState } from "react";
import { Space as PrismaSpace } from "@prisma/client";
import { Flex, Text, Badge, Tooltip, Table } from "@radix-ui/themes";
import { CubeIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import RadixTable from "@/components/Shared/RadixTable";
import { calculateMonthlyCredits, calculateCreditPrognosis, DAYS_PER_MONTH, type PlanKey } from "@/lib/billing/plans";

const PAGE_SIZE = 20;

interface Space extends PrismaSpace {
    SpaceUsage?: { memberCount: number; entityCount: number } | null;
}

interface SpacesTableProps {
    spaces: Space[];
    modelCount: number;
    trialDays: number;
    promptCountsBySpace: Record<string, number>;
}

export default function SpacesTable({ spaces, modelCount, trialDays, promptCountsBySpace }: SpacesTableProps) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [showAll, setShowAll] = useState(false);
    const [now] = useState(() => Date.now());

    const paginated = useMemo(() => {
        if (showAll) return spaces;
        const start = (currentPage - 1) * PAGE_SIZE;
        return spaces.slice(start, start + PAGE_SIZE);
    }, [spaces, currentPage, showAll]);

    return (
        <>
            <Flex direction="column" gap="4">
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 140 }}>Status</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 130 }}>Available</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 70 }}>Used</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 130 }}>Prognosis</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 80 }}>Members</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{ width: 100 }} justify="end">Created</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {paginated.length === 0 ? (
                            <Table.Row>
                                <Table.Cell colSpan={7}>
                                    <Flex justify="center" py="8">
                                        <Text size="2" color="gray">No spaces found.</Text>
                                    </Flex>
                                </Table.Cell>
                            </Table.Row>
                        ) : paginated.map((space) => {
                            const isTrial = space.subscriptionStatus === 'TRIALING';
                            const creditDays = isTrial ? trialDays : DAYS_PER_MONTH;
                            const creditLimit = calculateMonthlyCredits(space.plan as PlanKey, modelCount, creditDays);
                            const isUnlimited = creditLimit === -1;
                            const activePrompts = promptCountsBySpace[space.id] ?? 0;

                            // Days remaining until credit reset (trial: until trialEndsAt; paid: until next reset)
                            const daysUntilReset = isTrial && space.trialEndsAt
                                ? Math.max(0, Math.ceil((new Date(space.trialEndsAt).getTime() - now) / 86_400_000))
                                : (() => {
                                    const resetDate = space.creditResetDate ? new Date(space.creditResetDate) : null;
                                    return resetDate
                                        ? Math.max(0, Math.ceil((resetDate.getTime() + DAYS_PER_MONTH * 86_400_000 - now) / 86_400_000))
                                        : DAYS_PER_MONTH;
                                })();
                            const projectedUsage = calculateCreditPrognosis(activePrompts, modelCount, daysUntilReset);
                            const willExhaust = !isUnlimited && projectedUsage > space.llmCreditsRemaining;
                            const nearExhaust = !isUnlimited && !willExhaust && projectedUsage > space.llmCreditsRemaining * 0.8;

                            const isTrialing = space.subscriptionStatus === 'TRIALING';
                            const trialDaysLeft = space.trialEndsAt
                                ? Math.ceil((new Date(space.trialEndsAt).getTime() - now) / 86_400_000)
                                : 0;

                            return (
                                <Table.Row key={space.id} align="center">
                                    {/* Name */}
                                    <Table.Cell>
                                        <Flex
                                            align="center" gap="3"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => router.push(`/admin/spaces/${space.id}`)}
                                        >
                                            <Flex
                                                align="center" justify="center" p="1"
                                                style={{ background: 'var(--gray-3)', borderRadius: 'var(--radius-3)', flexShrink: 0 }}
                                            >
                                                <CubeIcon width={16} height={16} color="var(--gray-11)" />
                                            </Flex>
                                            <Text size="2" weight="bold" style={{ color: 'var(--accent-11)' }}>
                                                {space.name}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>

                                    {/* Status */}
                                    <Table.Cell>
                                        {space.subscriptionStatus === 'CANCELED' ? (
                                            <Tooltip content={
                                                space.cancellationReason
                                                    ? `"${space.cancellationReason}" — ${space.canceledAt ? new Date(space.canceledAt).toLocaleDateString() : ''}`
                                                    : space.canceledAt
                                                        ? `Canceled ${new Date(space.canceledAt).toLocaleDateString()}`
                                                        : 'Canceled'
                                            }>
                                                <Badge color="red" variant="soft" style={{ cursor: 'default' }}>Canceled</Badge>
                                            </Tooltip>
                                        ) : isTrialing ? (
                                            <Badge color={trialDaysLeft > 0 ? "blue" : "red"} variant="soft">
                                                Trial: {Math.max(0, trialDaysLeft)}d left
                                            </Badge>
                                        ) : space.subscriptionStatus === 'ACTIVE' ? (
                                            <Badge color="grass" variant="soft">Active</Badge>
                                        ) : (
                                            <Badge color="gray" variant="surface" size="1">
                                                {space.subscriptionStatus ?? '—'}
                                            </Badge>
                                        )}
                                    </Table.Cell>

                                    {/* Available */}
                                    <Table.Cell>
                                        <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono)' }}>
                                            {isUnlimited ? '∞' : `${space.llmCreditsRemaining} / ${creditLimit}`}
                                        </Text>
                                    </Table.Cell>

                                    {/* Used */}
                                    <Table.Cell>
                                        <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono)' }}>
                                            {isUnlimited ? '—' : space.llmCreditsUsed}
                                        </Text>
                                    </Table.Cell>

                                    {/* Prognosis */}
                                    <Table.Cell>
                                        {isUnlimited ? (
                                            <Text size="1" color="gray">—</Text>
                                        ) : (
                                            <Tooltip content={`${activePrompts} active prompts × ${modelCount} models × ${daysUntilReset}d remaining`}>
                                                <Flex align="center" gap="1">
                                                    <Text size="1" style={{ fontFamily: 'var(--font-mono)' }}>
                                                        ~{projectedUsage}
                                                    </Text>
                                                    {willExhaust && (
                                                        <Badge color="red" variant="soft" size="1">!</Badge>
                                                    )}
                                                    {nearExhaust && (
                                                        <Badge color="orange" variant="soft" size="1">⚠</Badge>
                                                    )}
                                                </Flex>
                                            </Tooltip>
                                        )}
                                    </Table.Cell>

                                    {/* Members */}
                                    <Table.Cell>
                                        <Text size="2">{space.SpaceUsage?.memberCount ?? 0}</Text>
                                    </Table.Cell>

                                    {/* Created */}
                                    <Table.Cell justify="end">
                                        <Text size="1" color="gray">
                                            {new Date(space.createdAt).toLocaleDateString()}
                                        </Text>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Root>

                <RadixTable.Pagination
                    currentPage={currentPage}
                    total={spaces.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                    label="spaces"
                    showAll={showAll}
                    onShowAllChange={(val) => { setShowAll(val); setCurrentPage(1); }}
                />
            </Flex>

        </>
    );
}
