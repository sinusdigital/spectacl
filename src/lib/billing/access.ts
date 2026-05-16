import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { SubscriptionStatus } from '@prisma/client';
import { isSelfHosted } from '@/lib/mode';
import { resolveSpaceAccess } from '@/lib/space-access';
import { isSupportWriteMode } from '@/lib/support-mode';

export type SpaceAccessStatus = 'ACTIVE' | 'READ_ONLY' | 'EXPIRED';

interface SpaceAccessFields {
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Computes the current access level for a space based on subscription state.
 * baseDate is currentPeriodEnd if set, falling back to trialEndsAt.
 */
export function getSpaceAccessStatus(space: SpaceAccessFields): SpaceAccessStatus {
  // Self-hosted mode: all spaces are fully active (no billing enforcement)
  if (isSelfHosted()) return 'ACTIVE';

  const { subscriptionStatus: status, currentPeriodEnd, trialEndsAt } = space;
  const baseDate = currentPeriodEnd ?? trialEndsAt;
  const now = new Date();

  // Fully active paid state with no expiry concern
  if (status === SubscriptionStatus.ACTIVE && (!baseDate || now < baseDate)) return 'ACTIVE';

  // Trial still running
  if (status === SubscriptionStatus.TRIALING && (!baseDate || now < baseDate)) return 'ACTIVE';

  // Cancelled but still within the paid period they've already paid for
  if (status === SubscriptionStatus.CANCELED && baseDate && now < baseDate) return 'ACTIVE';

  // Within 90-day grace window after expiry — read only
  if (baseDate && now >= baseDate && now < addDays(baseDate, 90)) return 'READ_ONLY';

  return 'EXPIRED';
}

/**
 * Ensures that a space is not in a 'halted' (EXPIRED) state.
 * Returns a NextResponse if expired/unauthorized, or null if allowed.
 *
 * App admins using support mode bypass this check so they can help customers
 * whose trial/subscription has expired.
 */
export async function ensureSpaceNotHalted(spaceId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await resolveSpaceAccess(session.user.id, spaceId);
  if (access.kind === 'admin-override') return null;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      subscriptionStatus: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
    },
  });

  if (!space) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 });
  }

  const accessStatus = getSpaceAccessStatus(space);

  if (accessStatus === 'EXPIRED') {
    return NextResponse.json({
      error: 'SUBSCRIPTION_EXPIRED',
      message: 'Your space access has expired. Please reactivate to continue.',
    }, { status: 403 });
  }

  return null;
}

/**
 * Ensures write-level access (mutation-safe).
 * Read-only spaces cannot run new scans, add entities, etc.
 *
 * App admins bypass billing read-only gates ONLY when support write mode is
 * enabled for this space. Default admin support is read-only.
 */
export async function ensureSpaceWriteAccess(spaceId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await resolveSpaceAccess(session.user.id, spaceId);
  if (access.kind === 'admin-override') {
    if (await isSupportWriteMode(spaceId)) return null;
    return NextResponse.json({
      error: 'SUPPORT_READ_ONLY',
      message: 'Support mode is read-only. Enable write mode to mutate.',
    }, { status: 403 });
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      subscriptionStatus: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
    },
  });

  if (!space) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 });
  }

  const accessStatus = getSpaceAccessStatus(space);

  if (accessStatus === 'EXPIRED') {
    return NextResponse.json({
      error: 'SUBSCRIPTION_EXPIRED',
      message: 'Your space access has expired. Please reactivate to continue.',
    }, { status: 403 });
  }

  if (accessStatus === 'READ_ONLY') {
    return NextResponse.json({
      error: 'SUBSCRIPTION_READ_ONLY',
      message: 'Your subscription has ended. You can view historical data but cannot run new scans.',
    }, { status: 403 });
  }

  return null;
}
