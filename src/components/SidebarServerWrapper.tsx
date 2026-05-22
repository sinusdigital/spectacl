import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentSpace } from '@/lib/spaces';
import { SystemSettings } from '@/lib/settings';
import { getNavigationSections, getGlobalSections } from './Sidebar/navigationConfig';
import Sidebar from './Sidebar';
import { Entity } from '@/types/entity';

import { Space } from '@prisma/client';

export default async function SidebarServerWrapper({ 
    currentSpace: providedSpace 
}: { 
    currentSpace?: Space | null
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return null;
    }

    // Reuse provided space or fetch if not available
    const currentSpace = providedSpace !== undefined 
        ? providedSpace 
        : await getCurrentSpace(session.user.id);

    const [spaceCount, featureFlags] = await Promise.all([
        prisma.spaceMember.count({
            where: { userId: session.user.id },
        }),
        SystemSettings.getMany(
            [
                ...getNavigationSections('dummy'),
                ...getGlobalSections()
            ]
                .flatMap(section => section.items)
                .map(item => `sidebar_flag_${item.id}`)
        )
    ]);

    let entities: Entity[] = [];
    if (currentSpace) {
        entities = await prisma.entity.findMany({
            where: {
                spaceId: currentSpace.id,
                isArchived: false,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    const isAdmin = session.user.role === 'ADMIN';

    return (
        <Sidebar 
            user={session.user}
            currentSpace={currentSpace}
            spaceCount={spaceCount}
            entities={entities}
            isAdmin={isAdmin}
            featureFlags={featureFlags as Record<string, string>}
        />
    );
}
