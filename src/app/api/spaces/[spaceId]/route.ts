import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  requireSpaceAccess,
  requireSpaceMembership,
  canEditSpace,
  canDeleteSpace,
} from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    console.log('[GET /api/spaces/[spaceId]] Session:', session?.user?.id);

    if (!session?.user) {
      console.log('[GET /api/spaces/[spaceId]] No session - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spaceId } = await params;
    console.log('[GET /api/spaces/[spaceId]] Checking membership for userId:', session.user.id, 'spaceId:', spaceId);

    // Verify user has read access (member OR admin support mode)
    await requireSpaceAccess(session.user.id, spaceId, { intent: 'read' });

    console.log('[GET /api/spaces/[spaceId]] Membership verified, fetching space');

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        SpaceUsage: true,
        _count: {
          select: {
            SpaceMember: true,
          },
        },
      },
    });

    if (!space) {
      console.log('[GET /api/spaces/[spaceId]] Space not found');
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    // Get active prompts count (Running)
    const activePrompts = await prisma.prompt.count({
      where: {
        entity: { spaceId },
        status: 'Running'
      }
    });

    // Get active entities count (not archived)
    const activeEntities = await prisma.entity.count({
      where: {
        spaceId,
        isArchived: false
      }
    });

    console.log('[GET /api/spaces/[spaceId]] Returning space data');
    return NextResponse.json({
      id: space.id,
      name: space.name,
      slug: space.slug,
      plan: space.plan,
      subscriptionStatus: space.subscriptionStatus,
      trialEndsAt: space.trialEndsAt,
      currentPeriodEnd: space.currentPeriodEnd,
      canceledAt: space.canceledAt,
      mollieCustomerId: space.mollieCustomerId,
      mollieSubscriptionId: space.mollieSubscriptionId,
      createdAt: space.createdAt,
      llmProvider: space.llmProvider,
      memberCount: space._count.SpaceMember,
      usage: {
        ...space.SpaceUsage,
        promptCount: activePrompts,
        entityCount: activeEntities
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch space';
    console.error('[GET /api/spaces/[spaceId]] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: message.includes('member') ? 403 : 500 }
    );
  }
}

export async function PATCH(
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

    const { spaceId } = await params;

    // Verify user has permission to edit space
    const role = await requireSpaceMembership(session.user.id, spaceId, 'ADMIN');

    if (!canEditSpace(role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid space name' },
        { status: 400 }
      );
    }

    const updatedSpace = await prisma.space.update({
      where: { id: spaceId },
      data: { name: name.trim() },
    });

    return NextResponse.json({
      id: updatedSpace.id,
      name: updatedSpace.name,
      slug: updatedSpace.slug,
      plan: updatedSpace.plan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update space';
    console.error('Error updating space:', error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('permission') ? 403 : 500 }
    );
  }
}

export async function DELETE(
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

    const { spaceId } = await params;

    // Verify user is OWNER
    const role = await requireSpaceMembership(session.user.id, spaceId, 'OWNER');

    if (!canDeleteSpace(role)) {
      return NextResponse.json(
        { error: 'Only space owners can delete spaces' },
        { status: 403 }
      );
    }

    // Fetch space for billing data + deletion log
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: {
        name: true,
        plan: true,
        mollieCustomerId: true,
        mollieSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    // Read optional cancellation reason from body
    let cancellationReason: string | null = null;
    try {
      const body = await request.json();
      cancellationReason = body?.reason ?? null;
    } catch {
      // Body is optional
    }

    // Persist deletion log before the space record is removed
    await prisma.spaceDeletionLog.create({
      data: {
        spaceId,
        spaceName: space.name,
        plan: space.plan,
        reason: cancellationReason,
      },
    });

    // Cancel any active Mollie subscription before deleting
    if (
      space.mollieCustomerId &&
      space.mollieSubscriptionId &&
      space.subscriptionStatus !== 'CANCELED'
    ) {
      try {
        const { getMollie } = await import('@/lib/mollie');
        const mollie = getMollie();
        await mollie.customerSubscriptions.cancel(space.mollieSubscriptionId, {
          customerId: space.mollieCustomerId,
        });
        console.log(`[Delete Space] Cancelled Mollie subscription for space ${spaceId}`);
      } catch (err) {
        // Log but don't block deletion — subscription may already be cancelled on Mollie's side
        console.error(`[Delete Space] Mollie cancellation failed for space ${spaceId}:`, err);
      }
    }

    // Clean up queued BullMQ analysis jobs for this space's prompts
    try {
      const spacePrompts = await prisma.prompt.findMany({
        where: { entity: { spaceId } },
        select: { id: true },
      });
      const promptIds = new Set(spacePrompts.map(p => p.id));
      if (promptIds.size > 0) {
        const { analysisQueue } = await import('@/lib/queue/analysisQueue');
        const jobs = await analysisQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data?.promptId && promptIds.has(job.data.promptId)) {
            await job.remove().catch(() => {});
          }
        }
        console.log(`[Delete Space] Removed ${promptIds.size} prompt(s) worth of queued jobs for space ${spaceId}`);
      }
    } catch (err) {
      console.error(`[Delete Space] Queue cleanup failed for space ${spaceId}:`, err);
    }

    // Delete the space — cascade handles all related records (except invoices: SetNull)
    await prisma.space.delete({
      where: { id: spaceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete space';
    console.error('Error deleting space:', error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('permission') || message.includes('owner') ? 403 : 500 }
    );
  }
}
