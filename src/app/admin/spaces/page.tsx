import { prisma } from "@/lib/prisma";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import SpacesTable from "@/components/Admin/SpacesTable";
import { getActiveModelCount, getTrialDays } from "@/lib/billing/plans";
import type { Space as PrismaSpace } from "@prisma/client";

type Space = PrismaSpace & {
    SpaceUsage?: { memberCount: number; entityCount: number } | null;
};

export default async function SpacesPage() {
    // Fetch spaces, active model count, and per-space active prompt counts in parallel
    const [spaces, modelCount, trialDays, promptCountsBySpace] = await Promise.all([
        prisma.space.findMany({
            orderBy: { createdAt: "desc" },
            include: { SpaceUsage: true },
        }),
        getActiveModelCount(),
        getTrialDays(),
        // Count active (Running) prompts grouped by space (via entity relation)
        prisma.prompt.groupBy({
            by: ['entityId'],
            where: { status: 'Running' },
            _count: true,
        }).then(async (promptsByEntity) => {
            // Map entityId → spaceId, then aggregate per space
            const entityIds = promptsByEntity.map(p => p.entityId);
            const entities = await prisma.entity.findMany({
                where: { id: { in: entityIds }, isArchived: false },
                select: { id: true, spaceId: true },
            });
            const entityToSpace = new Map(entities.map(e => [e.id, e.spaceId]));
            const spaceCounts: Record<string, number> = {};
            for (const row of promptsByEntity) {
                const spaceId = entityToSpace.get(row.entityId);
                if (spaceId) {
                    spaceCounts[spaceId] = (spaceCounts[spaceId] || 0) + row._count;
                }
            }
            return spaceCounts;
        }),
    ]);

    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">
                <Flex direction="column" gap="2">
                    <Heading size="6">Spaces</Heading>
                    <Text size="3" color="gray">
                        Manage workspaces, plans, LLM providers, and credit limits.
                    </Text>
                </Flex>

                <SpacesTable
                    spaces={spaces as unknown as Space[]}
                    modelCount={modelCount}
                    trialDays={trialDays}
                    promptCountsBySpace={promptCountsBySpace}
                />
            </Flex>
        </Container>
    );
}
