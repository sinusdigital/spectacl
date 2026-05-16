import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlanLimitsFromDb } from '@/lib/billing/plans';

export async function GET() {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all spaces the user is a member of
    const spaceMembers = await prisma.spaceMember.findMany({
      where: {
        userId: userId,
      },
      include: {
        Space: {
          include: {
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

        // Pre-fetch plan limits from DB (with overrides) for each unique plan
        const uniqueSpacePlans = [...new Set(spaceMembers.map(m => m.Space.plan))];
        const planLimitsMap: Record<string, Awaited<ReturnType<typeof getPlanLimitsFromDb>>> = {};
        await Promise.all(uniqueSpacePlans.map(async plan => {
          planLimitsMap[plan] = await getPlanLimitsFromDb(plan);
        }));

        const spacesWithEntities = await Promise.all(
          spaceMembers.map(async (member) => {
            const spaceId = member.spaceId;

            const [entities, memberCount, activePromptCount] = await Promise.all([
              prisma.entity.findMany({
                where: { spaceId },
                select: { id: true, name: true, website: true, logoUrl: true, isArchived: true },
                orderBy: { name: 'asc' },
              }),
              prisma.spaceMember.count({ where: { spaceId } }),
              prisma.prompt.count({
                where: {
                  entity: { spaceId, isArchived: false },
                  status: 'Running',
                },
              }),
            ]);

            const limits = planLimitsMap[member.Space.plan];
            return {
              id: member.Space.id,
              name: member.Space.name,
              slug: member.Space.slug,
              plan: member.Space.plan,
              role: member.role,
              llmProvider: member.Space.llmProvider,
              joinedAt: member.joinedAt.toISOString(),
              isOwner: member.role === 'OWNER',
              memberCount,
              entityCount: entities.filter(e => !e.isArchived).length,
              entities: entities,
              promptCount: activePromptCount,
              promptLimit: limits.maxActivePrompts,
              memberLimit: limits.maxMembers,
              entityLimit: limits.maxEntities,
              subscriptionStatus: member.Space.subscriptionStatus,
              trialEndsAt: member.Space.trialEndsAt?.toISOString() ?? null,
            };
          })
        );

    // Get pending invitations
    const pendingInvitations = await prisma.spaceInvitation.findMany({
      where: {
        email: session.user.email,
        status: 'PENDING',
      },
      include: {
        Space: {
          include: {
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

        // Pre-fetch plan limits for invitations
        const uniqueInvitationPlans = [...new Set(pendingInvitations.map(i => i.Space.plan))];
        await Promise.all(uniqueInvitationPlans.filter(p => !planLimitsMap[p]).map(async plan => {
          planLimitsMap[plan] = await getPlanLimitsFromDb(plan);
        }));

        const invitationsWithEntities = await Promise.all(
          pendingInvitations.map(async (invitation) => {
            const invSpaceId = invitation.Space.id;

            const [entities, memberCount, activePromptCount] = await Promise.all([
              prisma.entity.findMany({
                where: { spaceId: invSpaceId },
                select: { id: true, name: true, logoUrl: true, isArchived: true },
                orderBy: { name: 'asc' },
                take: 5,
              }),
              prisma.spaceMember.count({ where: { spaceId: invSpaceId } }),
              prisma.prompt.count({
                where: {
                  entity: { spaceId: invSpaceId, isArchived: false },
                  status: 'Running',
                },
              }),
            ]);

            const limits = planLimitsMap[invitation.Space.plan];
            return {
              id: invitation.id,
              token: invitation.token,
              role: invitation.role,
              space: {
                id: invitation.Space.id,
                name: invitation.Space.name,
                slug: invitation.Space.slug,
                plan: invitation.Space.plan,
                llmProvider: invitation.Space.llmProvider,
              },
              inviter: {
                name: invitation.User.name,
                email: invitation.User.email,
              },
              memberCount,
              entityCount: entities.filter(e => !e.isArchived).length,
              entities: entities,
              promptCount: activePromptCount,
              promptLimit: limits.maxActivePrompts,
              memberLimit: limits.maxMembers,
              entityLimit: limits.maxEntities,
              createdAt: invitation.createdAt.toISOString(),
            };
          })
        );

    return NextResponse.json({ 
      spaces: spacesWithEntities,
      invitations: invitationsWithEntities,
    });
  } catch (error) {
    console.error('Error fetching user spaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spaces' },
      { status: 500 }
    );
  }
}
