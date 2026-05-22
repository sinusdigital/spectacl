import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { auditLog } from '@/lib/audit';
import {
  calculateMonthlyCreditsFromDb,
  getActiveModelCount,
  type PlanKey,
} from '@/lib/billing/plans';

/**
 * Admin-only: extend (or set) a space's trial end date.
 *
 * Body: { trialEndsAt: ISO string }
 *
 * Behavior:
 * - Refuses if space is ACTIVE (paid subscription) or CANCELED.
 * - Allows TRIALING, INCOMPLETE, PAST_DUE → flips to TRIALING with new end date.
 * - Recalculates credits based on the extended number of days from today and
 *   resets usage so the extension is immediately usable.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const raw = body?.trialEndsAt;

  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'trialEndsAt (ISO string) required' }, { status: 400 });
  }

  const trialEndsAt = new Date(raw);
  if (Number.isNaN(trialEndsAt.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (trialEndsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'trialEndsAt must be in the future' }, { status: 400 });
  }

  const space = await prisma.space.findUnique({
    where: { id },
    select: { id: true, plan: true, subscriptionStatus: true, trialEndsAt: true },
  });
  if (!space) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 });
  }

  if (space.subscriptionStatus === 'ACTIVE') {
    return NextResponse.json(
      { error: 'Space has an active paid subscription — nothing to extend' },
      { status: 409 }
    );
  }
  if (space.subscriptionStatus === 'CANCELED') {
    return NextResponse.json(
      { error: 'Space is canceled — use the resubscribe flow instead' },
      { status: 409 }
    );
  }

  // Recalculate credits for the new trial window.
  const now = new Date();
  const daysFromNow = Math.max(
    1,
    Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000)
  );
  const modelCount = await getActiveModelCount();
  const credits = await calculateMonthlyCreditsFromDb(
    space.plan as PlanKey,
    modelCount,
    daysFromNow
  );

  const updated = await prisma.space.update({
    where: { id },
    data: {
      trialEndsAt,
      subscriptionStatus: 'TRIALING',
      llmCreditsRemaining: credits,
      llmCreditsUsed: 0,
      creditResetDate: now,
    },
  });

  await auditLog({
    userId: session.user.id,
    action: 'space.trial.extend',
    targetType: 'Space',
    targetId: id,
    detail: {
      previousTrialEndsAt: space.trialEndsAt?.toISOString() ?? null,
      previousStatus: space.subscriptionStatus,
      trialEndsAt: trialEndsAt.toISOString(),
      daysFromNow,
      credits,
    },
  });

  return NextResponse.json({
    success: true,
    trialEndsAt: updated.trialEndsAt,
    subscriptionStatus: updated.subscriptionStatus,
    llmCreditsRemaining: updated.llmCreditsRemaining,
  });
}
