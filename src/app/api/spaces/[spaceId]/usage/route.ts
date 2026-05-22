import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireSpaceMembership } from '@/lib/permissions';
import { getPlanLimitsFromDb, calculateMonthlyCreditsFromDb, getActiveModelCount, getTrialDays, DAYS_PER_MONTH, type PlanKey } from '@/lib/billing/plans';
import { SystemSettings } from '@/lib/settings';
import { isSelfHosted } from '@/lib/mode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { spaceId } = await params;
    
    // Handle 'current' space alias
    if (spaceId === 'current') {
      const { getCurrentSpace } = await import('@/lib/spaces');
      const currentSpace = await getCurrentSpace(session.user.id);
      
      if (!currentSpace) {
         return NextResponse.json({ error: 'No active space found' }, { status: 404 });
      }
      spaceId = currentSpace.id;
    }

    // Verify user is a member of this space
    await requireSpaceMembership(session.user.id, spaceId);

    // Get space with usage data
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        SpaceUsage: true,
      },
    });

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    // Self-hosted mode: everything unlimited, skip plan/credit calculations
    if (isSelfHosted()) {
      const usage = space.SpaceUsage;
      return NextResponse.json({
        plan: space.plan,
        isTrial: false,
        limits: {
          maxMembers: -1,
          maxEntities: -1,
          maxActivePrompts: -1,
          monthlyCreditLimit: -1,
        },
        current: {
          members: usage?.memberCount || 0,
          entities: usage?.entityCount || 0,
          prompts: usage?.promptCount || 0,
          activePrompts: 0,
        },
        features: ['Unlimited — self-hosted'],
      });
    }

    const planLimits = await getPlanLimitsFromDb(space.plan);
    const modelCount = await getActiveModelCount();
    // Trial spaces get credits proportional to trial period, not full month
    const isTrial = space.subscriptionStatus === 'TRIALING';
    const creditDays = isTrial ? await getTrialDays() : DAYS_PER_MONTH;
    const calculatedCreditLimit = await calculateMonthlyCreditsFromDb(space.plan as PlanKey, modelCount, creditDays);
    const usage = space.SpaceUsage;
    // Get dynamic active prompt count
    // 1. Get all entity IDs for this space
    const entities = await prisma.entity.findMany({
      where: { spaceId, isArchived: false },
      select: { id: true }
    });

    const entityIds = entities.map(e => e.id);

    // 2. Count active (Running) prompts across all these entities
    const activePromptsCount = await prisma.prompt.count({
      where: {
        entityId: { in: entityIds },
        status: 'Running'
      }
    });

    // Trial users are capped at a configurable prompt limit (default 10)
    const trialPromptSetting = isTrial
      ? await SystemSettings.get('trial_prompt_limit', '10')
      : null;
    const trialPromptLimit = trialPromptSetting ? parseInt(trialPromptSetting, 10) : 10;
    const effectiveMaxPrompts = isTrial
      ? Math.min(planLimits.maxActivePrompts, trialPromptLimit)
      : planLimits.maxActivePrompts;

    return NextResponse.json({
      plan: space.plan,
      isTrial,
      limits: {
        maxMembers: planLimits.maxMembers,
        maxEntities: planLimits.maxEntities,
        maxActivePrompts: effectiveMaxPrompts,
        monthlyCreditLimit: calculatedCreditLimit,
      },
      current: {
        members: usage?.memberCount || 0,
        entities: usage?.entityCount || 0,
        prompts: usage?.promptCount || 0, // Keep legacy count for now
        activePrompts: activePromptsCount,
      },
      features: planLimits.features,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch usage';
    return NextResponse.json(
      { error: message },
      { status: message.includes('member') ? 403 : 500 }
    );
  }
}
