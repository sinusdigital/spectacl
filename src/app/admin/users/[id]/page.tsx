import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    Container, Flex, Grid, Heading, Text,
    Card, Badge, Table, Separator, Link as RadixLink,
} from "@radix-ui/themes";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { UserAvatar } from "@/components/Shared/UserAvatar";
import UserDangerZone from "./DangerZone";

function formatDate(d: Date | string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(d: Date | null): string {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 5) return "Online";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default async function UserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const [user, memberships, entities, sessionCount] = await Promise.all([
        prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                lastSeenAt: true,
                hasUsedTrial: true,
                isLocked: true,
                lockedReason: true,
            },
        }),
        prisma.spaceMember.findMany({
            where: { userId: id },
            include: { Space: { select: { id: true, name: true, plan: true } } },
            orderBy: { joinedAt: "asc" },
        }),
        prisma.entity.findMany({
            where: { userId: id },
            select: {
                id: true,
                name: true,
                website: true,
                createdAt: true,
                isArchived: true,
                space: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.session.count({ where: { userId: id } }),
    ]);

    if (!user) notFound();

    // Derive online status from lastSeenAt relative to server request time
    // (5-minute threshold matches the heartbeat interval)
    const lastSeenMs = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
    const requestTime = Date.now(); // eslint-disable-line react-hooks/purity
    const isOnline = lastSeenMs > 0 && (requestTime - lastSeenMs) < 300_000;
    const ownsSpaces = memberships.some((m) => m.role === "OWNER");

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">

                {/* Back + Title */}
                <Flex direction="column" gap="2">
                    <RadixLink asChild size="2" color="gray">
                        <Link href="/admin/users">
                            <Flex align="center" gap="1">
                                <ChevronLeftIcon /> Users
                            </Flex>
                        </Link>
                    </RadixLink>
                    <Flex align="center" gap="3">
                        <UserAvatar name={user.name} email={user.email} image={user.image} size="lg" />
                        <Flex direction="column" gap="1">
                            <Heading size="6">{user.name}</Heading>
                            <Text size="3" color="gray">{user.email}</Text>
                        </Flex>
                    </Flex>
                    <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono)" }}>{user.id}</Text>
                </Flex>

                {/* Row 1: Account | Activity | Status */}
                <Grid columns={{ initial: "1", sm: "3" }} gap="4">
                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Account</Heading>
                            <Flex align="center" gap="2" wrap="wrap">
                                <Badge color={user.role === "ADMIN" ? "blue" : "gray"} variant="soft" size="2">
                                    {user.role}
                                </Badge>
                                <Badge color={user.emailVerified ? "green" : "orange"} variant="soft" size="2">
                                    {user.emailVerified ? "Verified" : "Unverified"}
                                </Badge>
                            </Flex>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">
                                    Created: <Text weight="medium">{formatDate(user.createdAt)}</Text>
                                </Text>
                                <Text size="1" color="gray">
                                    Trial used: <Text weight="medium">{user.hasUsedTrial ? "Yes" : "No"}</Text>
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Activity</Heading>
                            <Flex align="center" gap="2">
                                <Badge color={isOnline ? "green" : "gray"} variant="soft" size="2">
                                    {isOnline ? "Online" : timeAgo(user.lastSeenAt)}
                                </Badge>
                            </Flex>
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">
                                    Last seen: <Text weight="medium">{user.lastSeenAt ? formatDate(user.lastSeenAt) : "Never"}</Text>
                                </Text>
                                <Text size="1" color="gray">
                                    Active sessions: <Text weight="medium">{sessionCount}</Text>
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="2">
                        <Flex direction="column" gap="3">
                            <Heading size="2" color="gray">Status</Heading>
                            <Flex align="center" gap="2">
                                {user.isLocked ? (
                                    <Badge color="red" variant="soft" size="2">Locked</Badge>
                                ) : (
                                    <Badge color="green" variant="soft" size="2">Active</Badge>
                                )}
                            </Flex>
                            {user.isLocked && user.lockedReason && (
                                <Text size="1" color="gray">Reason: {user.lockedReason}</Text>
                            )}
                            <Flex direction="column" gap="1">
                                <Text size="1" color="gray">
                                    Spaces: <Text weight="medium">{memberships.length}</Text>
                                </Text>
                                <Text size="1" color="gray">
                                    Entities created: <Text weight="medium">{entities.length}</Text>
                                </Text>
                            </Flex>
                        </Flex>
                    </Card>
                </Grid>

                <Separator size="4" />

                {/* Spaces */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Spaces</Heading>
                        <Text size="2" color="gray">
                            {memberships.length} membership{memberships.length !== 1 ? "s" : ""}
                        </Text>
                    </Flex>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Space</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Joined</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {memberships.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={4}>
                                        <Flex justify="center" py="4">
                                            <Text size="2" color="gray">No space memberships</Text>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ) : memberships.map((m) => (
                                <Table.Row key={m.spaceId} align="center">
                                    <Table.Cell>
                                        <RadixLink asChild>
                                            <Link href={`/admin/spaces/${m.spaceId}`}>
                                                <Text size="2" weight="medium">{m.Space.name}</Text>
                                            </Link>
                                        </RadixLink>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge color="blue" variant="soft" size="1">{m.Space.plan}</Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            color={m.role === "OWNER" ? "purple" : m.role === "ADMIN" ? "blue" : "gray"}
                                            variant="soft"
                                            size="1"
                                        >
                                            {m.role}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell justify="end">
                                        <Text size="1" color="gray">{formatDate(m.joinedAt)}</Text>
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
                        <Text size="2" color="gray">
                            {entities.length} entit{entities.length !== 1 ? "ies" : "y"} created by this user
                        </Text>
                    </Flex>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Space</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Created</Table.ColumnHeaderCell>
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
                            ) : entities.map((e) => (
                                <Table.Row key={e.id} align="center">
                                    <Table.Cell>
                                        <Flex direction="column">
                                            <Text size="2" weight="medium">{e.name}</Text>
                                            {e.website && <Text size="1" color="gray">{e.website}</Text>}
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">{e.space?.name ?? "—"}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            color={e.isArchived ? "gray" : "green"}
                                            variant="soft"
                                            size="1"
                                        >
                                            {e.isArchived ? "Archived" : "Active"}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell justify="end">
                                        <Text size="1" color="gray">{formatDate(e.createdAt)}</Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Danger Zone */}
                <UserDangerZone
                    userId={user.id}
                    userName={user.name}
                    userEmail={user.email}
                    isLocked={user.isLocked}
                    lockedReason={user.lockedReason}
                    ownsSpaces={ownsSpaces}
                />

            </Flex>
        </Container>
    );
}
