import { prisma } from "@/lib/prisma";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import UsersTable from "@/components/Admin/UsersTable";
import PageContainer from "@/components/Shared/PageContainer";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        lastSeenAt: true,
        entities: {
          select: {
            id: true,
            name: true,
            spaceId: true,
            isArchived: true,
          }
        },
        SpaceMember_SpaceMember_userIdToUser: {
          select: {
            role: true,
            joinedAt: true,
            Space: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
              }
            }
          }
        }
      },
    }),
    prisma.user.count(),
  ]);

  // Fetch most recent session per user on this page to determine last-login status
  const userIds = users.map((u) => u.id);
  const recentSessions = await prisma.session.findMany({
    where: { userId: { in: userIds } },
    orderBy: { updatedAt: "desc" },
    select: { userId: true, updatedAt: true },
  });

  // Keep only the most recent session per user
  const lastSeenMap: Record<string, Date> = {};
  for (const s of recentSessions) {
    if (!lastSeenMap[s.userId] || s.updatedAt > lastSeenMap[s.userId]) {
      lastSeenMap[s.userId] = s.updatedAt;
    }
  }

  // Build lastSeenAt map from user field (heartbeat)
  const lastSeenAtMap: Record<string, string> = {};
  for (const u of users) {
    if (u.lastSeenAt) lastSeenAtMap[u.id] = u.lastSeenAt.toISOString();
  }

  // Compute reference time for online badge calculation
  const nowMs = new Date().getTime();

  return (
    <PageContainer>
      <Container size="4">
        <Flex direction="column" gap="6" py="8">
          <Flex direction="column" gap="2">
            <Heading size="8">Users</Heading>
            <Text color="gray" size="2">
              Manage all registered users and their system roles.
            </Text>
          </Flex>

          <UsersTable 
            users={users as any} 
            totalUsers={totalUsers} 
            currentPage={page} 
            pageSize={pageSize}
            nowMs={nowMs}
            lastSeenMap={Object.fromEntries(
              Object.entries(lastSeenMap).map(([k, v]) => [k, v.toISOString()])
            )}
            lastSeenAtMap={lastSeenAtMap}
          />
        </Flex>
      </Container>
    </PageContainer>
  );
}
