import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    Container, Flex, Grid, Heading, Text,
    Card, Badge, Table, Separator, Link as RadixLink, Callout, IconButton,
} from "@radix-ui/themes";
import { ChevronLeftIcon, ExclamationTriangleIcon, DownloadIcon } from "@radix-ui/react-icons";
import DangerZone from "./DangerZone";
import EnterSpaceButton from "./EnterSpaceButton";
import ExtendTrialForm from "./ExtendTrialForm";
import RegenerateSuggestionsButton from "./RegenerateSuggestionsButton";
import {
    calculateMonthlyCreditsFromDb,
    calculateCreditPrognosis,
    getActiveModelCount,
    getTrialDays,
    DAYS_PER_MONTH,
    type PlanKey,
} from "@/lib/billing/plans";

export default async function SpaceDetailPage({
    params,
}: {
    params: Promise<{ spaceId: string }>;
}) {
    const { spaceId } = await params;

    const [space, entities, modelCount, activePromptCount, prompts, invoices, suggestionCounts] = await Promise.all([
        prisma.space.findUnique({
            where: { id: spaceId },
            include: {
                User: true,
                SpaceUsage: true,
                SpaceMember: {
                    include: { User_SpaceMember_userIdToUser: true },
                },
                SpaceInvitation: true,
                SpaceModelConfig: true,
            },
        }),
        prisma.entity.findMany({
            where: { spaceId },
            orderBy: { createdAt: "desc" },
        }),
        getActiveModelCount(),
        prisma.prompt.count({
            where: {
                status: 'Running',
                entity: { spaceId, isArchived: false },
            },
        }),
        prisma.prompt.findMany({
            where: { entity: { spaceId } },
            include: { entity: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.invoice.findMany({
            where: { spaceId },
            orderBy: { issuedAt: "desc" },
        }),
        prisma.suggestedCompetitor.groupBy({
            by: ['entityId', 'status'],
            where: { entity: { spaceId } },
            _count: { _all: true },
        }),
    ]);

    // entityId → { suggested, rejected, untracked, other, total }
    const suggestionMap = new Map<string, { suggested: number; rejected: number; untracked: number; other: number; total: number }>();
    for (const row of suggestionCounts) {
        const bucket = suggestionMap.get(row.entityId) ?? { suggested: 0, rejected: 0, untracked: 0, other: 0, total: 0 };
        const n = row._count._all;
        if (row.status === 'suggested') bucket.suggested += n;
        else if (row.status === 'rejected') bucket.rejected += n;
        else if (row.status === 'untracked') bucket.untracked += n;
        else bucket.other += n;
        bucket.total += n;
        suggestionMap.set(row.entityId, bucket);
    }

    if (!space) notFound();

    // Trial spaces use trial-period credit allocation; paid spaces use full monthly
    const isTrial = space.subscriptionStatus === 'TRIALING';
    const trialDays = isTrial ? await getTrialDays() : DAYS_PER_MONTH;
    const creditDays = isTrial ? trialDays : DAYS_PER_MONTH;
    const creditLimit = await calculateMonthlyCreditsFromDb(space.plan as PlanKey, modelCount, creditDays);
    const isUnlimited = creditLimit === -1;

    // Days remaining until credit reset (trial: days until trialEndsAt; paid: days until next reset)
    const now = new Date();
    const daysUntilReset = isTrial && space.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(space.trialEndsAt).getTime() - now.getTime()) / 86_400_000))
        : (() => {
            const resetDate = space.creditResetDate ? new Date(space.creditResetDate) : null;
            return resetDate
                ? Math.max(0, Math.ceil((resetDate.getTime() + DAYS_PER_MONTH * 86_400_000 - now.getTime()) / 86_400_000))
                : DAYS_PER_MONTH;
        })();
    const projectedUsage = calculateCreditPrognosis(activePromptCount, modelCount, daysUntilReset);
    const estimatedRemaining = isUnlimited ? -1 : Math.max(0, space.llmCreditsRemaining - projectedUsage);

    // Cancellation + data deletion dates (90-day grace period after access ends)
    const isCanceled = space.subscriptionStatus === 'CANCELED';
    const canceledAt = space.canceledAt ? new Date(space.canceledAt) : null;
    const accessEndsAt = space.currentPeriodEnd
        ? new Date(space.currentPeriodEnd)
        : space.trialEndsAt
            ? new Date(space.trialEndsAt)
            : canceledAt;
    const dataDeletionDate = accessEndsAt
        ? new Date(accessEndsAt.getTime() + 90 * 86_400_000)
        : null;

    const statusColor = (s: string) => {
        if (s === 'ACTIVE') return 'grass';
        if (s === 'TRIALING') return 'blue';
        if (s === 'CANCELED') return 'red';
        if (s === 'PAST_DUE') return 'orange';
        return 'gray';
    };

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">

                {/* Back + Title */}
                <Flex direction="column" gap="2">
                    <RadixLink asChild size="2" color="gray">
                        <Link href="/admin/spaces">
                            <Flex align="center" gap="1">
                                <ChevronLeftIcon /> Spaces
                            </Flex>
                        </Link>
                    </RadixLink>
                    <Flex align="center" justify="between" gap="4" wrap="wrap">
                        <Flex direction="column" gap="1">
                            <Heading size="6">{space.name}</Heading>
                            <Text size="3" color="gray">
                                {space.id}
                            </Text>
                        </Flex>
                        <EnterSpaceButton
                            spaceId={space.id}
                            firstEntityId={entities[0]?.id ?? null}
                        />
                    </Flex>
                </Flex>

                {/* Row 1: Plan | Owner | Billing */}
                <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Plan</Heading>
                            <Flex align="center" gap="2" wrap="wrap">
                                <Badge color="blue" variant="soft" size="2">{space.plan}</Badge>
                                <Badge color={statusColor(space.subscriptionStatus ?? '')} variant="soft" size="2">
                                    {space.subscriptionStatus ?? '—'}
                                </Badge>
                                {space.isLocked && (
                                    <Badge color="red" variant="solid" size="2">LOCKED</Badge>
                                )}
                            </Flex>
                            <Separator size="4" />
                            <ExtendTrialForm
                                spaceId={space.id}
                                currentTrialEndsAt={space.trialEndsAt?.toISOString() ?? null}
                                subscriptionStatus={space.subscriptionStatus}
                            />
                        </Flex>
                    </Card>

                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Owner</Heading>
                            <Flex direction="column" gap="1">
                                <Text size="2" weight="medium">{space.User?.name ?? '—'}</Text>
                                <Text size="1" color="gray">{space.User?.email ?? '—'}</Text>
                            </Flex>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">Created</Text>
                                <Text size="2">{new Date(space.createdAt).toLocaleDateString()}</Text>
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Billing</Heading>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">Mollie Customer</Text>
                                <Text size="1" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {space.mollieCustomerId ?? '—'}
                                </Text>
                            </Flex>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">Mollie Subscription</Text>
                                <Text size="1" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {space.mollieSubscriptionId ?? '—'}
                                </Text>
                            </Flex>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">Billing Start</Text>
                                <Text size="2">
                                    {space.creditResetDate
                                        ? new Date(space.createdAt).toLocaleDateString()
                                        : '—'}
                                </Text>
                            </Flex>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">Next Renewal</Text>
                                <Text size="2">
                                    {space.currentPeriodEnd
                                        ? new Date(space.currentPeriodEnd).toLocaleDateString()
                                        : space.trialEndsAt
                                            ? `Trial ends ${new Date(space.trialEndsAt).toLocaleDateString()}`
                                            : '—'}
                                </Text>
                            </Flex>
                            {space.SpaceModelConfig.length > 0 && (
                                <Flex direction="column" gap="2">
                                    <Text size="1" color="gray">Enabled Models</Text>
                                    <Flex wrap="wrap" gap="1">
                                        {space.SpaceModelConfig.map(c => (
                                            <Badge key={c.id} color="gray" variant="surface" size="1">
                                                {c.modelId}
                                            </Badge>
                                        ))}
                                    </Flex>
                                </Flex>
                            )}
                        </Flex>
                    </Card>
                </Grid>

                {/* Row 2: Credits | Usage */}
                <Grid columns={{ initial: "1", sm: "2" }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Credits</Heading>
                            {isUnlimited ? (
                                <Text size="5" weight="bold">∞</Text>
                            ) : (
                                <Grid columns="4" gap="3">
                                    <Flex direction="column" gap="1">
                                        <Text size="4" weight="bold">{creditLimit.toLocaleString()}</Text>
                                        <Text size="1" color="gray">Total</Text>
                                    </Flex>
                                    <Flex direction="column" gap="1">
                                        <Text size="4" weight="bold">{space.llmCreditsUsed.toLocaleString()}</Text>
                                        <Text size="1" color="gray">Used</Text>
                                    </Flex>
                                    <Flex direction="column" gap="1">
                                        <Text size="4" weight="bold">{space.llmCreditsRemaining.toLocaleString()}</Text>
                                        <Text size="1" color="gray">Remaining</Text>
                                    </Flex>
                                    <Flex direction="column" gap="1">
                                        <Text size="4" weight="bold" color={estimatedRemaining === 0 ? 'red' : undefined}>
                                            ~{estimatedRemaining.toLocaleString()}
                                        </Text>
                                        <Text size="1" color="gray">Est. at renewal</Text>
                                    </Flex>
                                </Grid>
                            )}
                            {!isUnlimited && (
                                <Text size="1" color="gray">
                                    {activePromptCount} prompts × {modelCount} models · {daysUntilReset}d until reset
                                </Text>
                            )}
                        </Flex>
                    </Card>

                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Usage</Heading>
                            <Grid columns="3" gap="3">
                                <Flex direction="column" gap="1">
                                    <Text size="4" weight="bold">{space.SpaceUsage?.memberCount ?? 0}</Text>
                                    <Text size="1" color="gray">Members</Text>
                                </Flex>
                                <Flex direction="column" gap="1">
                                    <Text size="4" weight="bold">{space.SpaceUsage?.entityCount ?? 0}</Text>
                                    <Text size="1" color="gray">Entities</Text>
                                </Flex>
                                <Flex direction="column" gap="1">
                                    <Text size="4" weight="bold">{activePromptCount}</Text>
                                    <Text size="1" color="gray">Prompts</Text>
                                </Flex>
                            </Grid>
                        </Flex>
                    </Card>
                </Grid>

                {/* Cancellation & Deletion Notice */}
                {isCanceled && canceledAt && (
                    <Callout.Root color="red" variant="surface">
                        <Callout.Icon>
                            <ExclamationTriangleIcon />
                        </Callout.Icon>
                        <Callout.Text>
                            <Flex direction="column" gap="1">
                                <Text size="2" weight="bold">
                                    Subscription canceled on {canceledAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                                {space.cancellationReason && (
                                    <Text size="1" color="gray">Reason: {space.cancellationReason}</Text>
                                )}
                                <Flex gap="4" mt="1">
                                    {accessEndsAt && (
                                        <Text size="2">
                                            Access until{' '}
                                            <Text weight="bold">
                                                {accessEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </Text>
                                    )}
                                    {dataDeletionDate && (
                                        <Text size="2">
                                            Data deletion on{' '}
                                            <Text weight="bold">
                                                {dataDeletionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </Text>
                                    )}
                                </Flex>
                            </Flex>
                        </Callout.Text>
                    </Callout.Root>
                )}

                <Separator size="4" />

                {/* Members */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Members</Heading>
                        <Text size="2" color="gray">{space.SpaceMember.length} member{space.SpaceMember.length !== 1 ? 's' : ''}</Text>
                    </Flex>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 100 }}>Role</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 100 }} justify="end">Joined</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {space.SpaceMember.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={4}>
                                        <Flex justify="center" py="4">
                                            <Text size="2" color="gray">No members</Text>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ) : space.SpaceMember.map(member => (
                                <Table.Row key={member.userId} align="center">
                                    <Table.Cell>
                                        <Text size="2" weight="medium">
                                            {member.User_SpaceMember_userIdToUser.name}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">
                                            {member.User_SpaceMember_userIdToUser.email}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge variant="soft" color="gray" size="1">
                                            {member.role.toLowerCase()}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell justify="end">
                                        <Text size="1" color="gray">
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                        </Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Entities */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Entities</Heading>
                        <Text size="2" color="gray">{entities.length} entit{entities.length !== 1 ? 'ies' : 'y'}</Text>
                    </Flex>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Website</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 240 }}>Suggested competitors</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 100 }} justify="end">Created</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {entities.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={4}>
                                        <Flex justify="center" py="4">
                                            <Text size="2" color="gray">No entities</Text>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ) : entities.map(entity => {
                                const s = suggestionMap.get(entity.id);
                                return (
                                    <Table.Row key={entity.id} align="center">
                                        <Table.Cell>
                                            <Text size="2" weight="medium">{entity.name}</Text>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Text size="2" color="gray">{entity.website ?? '—'}</Text>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Flex gap="2" align="center" wrap="wrap">
                                                {s && s.total > 0 ? (
                                                    <>
                                                        <Badge color="green" variant="soft" size="1" title="status=suggested (shown to user)">
                                                            {s.suggested} shown
                                                        </Badge>
                                                        {s.rejected > 0 && (
                                                            <Badge color="red" variant="soft" size="1">{s.rejected} rejected</Badge>
                                                        )}
                                                        {s.untracked > 0 && (
                                                            <Badge color="gray" variant="soft" size="1">{s.untracked} untracked</Badge>
                                                        )}
                                                        {s.other > 0 && (
                                                            <Badge color="gray" variant="soft" size="1">{s.other} other</Badge>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Text size="1" color="gray">0</Text>
                                                )}
                                                <RegenerateSuggestionsButton entityId={entity.id} />
                                            </Flex>
                                        </Table.Cell>
                                        <Table.Cell justify="end">
                                            <Text size="1" color="gray">
                                                {new Date(entity.createdAt).toLocaleDateString()}
                                            </Text>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Prompts */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Prompts</Heading>
                        <Text size="2" color="gray">
                            {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} · {activePromptCount} active
                        </Text>
                    </Flex>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Prompt</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 140 }}>Entity</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 80 }}>Status</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 100 }}>Frequency</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: 100 }} justify="end">Last Run</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {prompts.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={5}>
                                        <Flex justify="center" py="4">
                                            <Text size="2" color="gray">No prompts</Text>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ) : prompts.map(prompt => (
                                <Table.Row key={prompt.id} align="center">
                                    <Table.Cell>
                                        <Text size="2" weight="medium" truncate style={{ maxWidth: 400, display: 'block' }}>
                                            {prompt.text}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">{prompt.entity.name}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            variant="soft"
                                            color={prompt.status === 'Running' ? 'grass' : 'gray'}
                                            size="1"
                                        >
                                            {prompt.status === 'Running' ? 'active' : 'paused'}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="1" color="gray">{prompt.frequency}</Text>
                                    </Table.Cell>
                                    <Table.Cell justify="end">
                                        <Text size="1" color="gray">
                                            {prompt.lastRunAt
                                                ? new Date(prompt.lastRunAt).toLocaleDateString()
                                                : '—'}
                                        </Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Billing History */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Billing History</Heading>
                        <Text size="2" color="gray">
                            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                        </Text>
                    </Flex>

                    {invoices.length > 0 && (
                        <Flex gap="4" wrap="wrap">
                            <Badge size="2" variant="surface" color="green">
                                Net: €{invoices.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}
                            </Badge>
                            <Badge size="2" variant="surface" color="blue">
                                Tax: €{invoices.reduce((s, i) => s + i.taxAmount, 0).toFixed(2)}
                            </Badge>
                            <Badge size="2" variant="surface" color="gray">
                                Total: €{invoices.reduce((s, i) => s + i.total, 0).toFixed(2)}
                            </Badge>
                        </Flex>
                    )}

                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Period</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Subtotal</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Tax</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell />
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {invoices.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={7}>
                                        <Flex justify="center" py="4">
                                            <Text size="2" color="gray">No invoices yet</Text>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ) : invoices.map(invoice => (
                                <Table.Row key={invoice.id} align="center">
                                    <Table.Cell>
                                        <Text size="2" weight="medium">{invoice.number}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">
                                            {invoice.issuedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="1" color="gray">
                                            {invoice.periodStart && invoice.periodEnd
                                                ? `${invoice.periodStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — ${invoice.periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                                                : "—"}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2">€{invoice.subtotal.toFixed(2)}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            color={invoice.taxType === "STANDARD" ? "green" : invoice.taxType === "REVERSE_CHARGE" ? "blue" : "gray"}
                                            size="1"
                                            variant="soft"
                                        >
                                            {invoice.taxLabel}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" weight="medium">€{invoice.total.toFixed(2)}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <IconButton size="1" variant="ghost" color="gray" asChild>
                                            <a href={`/api/billing/invoices/${invoice.id}?format=pdf`} download>
                                                <DownloadIcon />
                                            </a>
                                        </IconButton>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Danger Zone */}
                <DangerZone
                    spaceId={space.id}
                    spaceName={space.name}
                    isLocked={space.isLocked}
                    lockedReason={space.lockedReason}
                />

            </Flex>
        </Container>
    );
}
