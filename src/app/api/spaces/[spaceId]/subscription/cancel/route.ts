import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getMollie } from '@/lib/mollie';
import { renderEmail, sendEmail } from '@/lib/send-email';
import { CancellationEmail } from '@/emails';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  // Self-hosted mode: subscriptions not available
  const { isSelfHosted } = await import('@/lib/mode');
  if (isSelfHosted()) {
    return NextResponse.json(
      { error: 'Subscriptions are not available in self-hosted mode' },
      { status: 400 },
    );
  }

  const { spaceId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate requester is OWNER or ADMIN
  const membership = await prisma.spaceMember.findUnique({
    where: { userId_spaceId: { userId: session.user.id, spaceId } },
    select: { role: true },
  });

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      plan: true,
      mollieCustomerId: true,
      mollieSubscriptionId: true,
      subscriptionStatus: true,
      createdById: true,
      currentPeriodEnd: true,
    },
  });

  if (!space) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 });
  }

  if (space.subscriptionStatus === 'CANCELED') {
    return NextResponse.json({ error: 'Subscription is already canceled' }, { status: 400 });
  }

  const body = await request.json() as { reason?: string };

  // Cancel in Mollie only if there is an active subscription
  if (space.mollieCustomerId && space.mollieSubscriptionId) {
    try {
      const mollie = getMollie();
      await mollie.customerSubscriptions.cancel(space.mollieSubscriptionId, {
        customerId: space.mollieCustomerId,
      });
    } catch (err) {
      console.error('[Cancel] Mollie cancellation failed for space', spaceId, err);
      return NextResponse.json({ error: 'Failed to cancel subscription with payment provider' }, { status: 502 });
    }
  }

  // Update DB — never touch currentPeriodEnd, access runs to end of paid period
  await prisma.space.update({
    where: { id: spaceId },
    data: {
      subscriptionStatus: 'CANCELED',
      canceledAt: new Date(),
      cancellationReason: body.reason ?? null,
    },
  });

  // Log to deletion log for admin visibility
  await prisma.spaceDeletionLog.create({
    data: {
      spaceId,
      spaceName: space.name,
      plan: space.plan,
      reason: body.reason ?? null,
      source: 'cancellation',
    },
  });

  // Send cancellation confirmation email
  const cancelledBySelf = membership.role === 'OWNER';
  // Note: space.createdById can be null if the original creator deleted their account
  // (Space.createdById is onDelete: SetNull). Fall back to the requester's email.
  const recipient = cancelledBySelf || !space.createdById
    ? { email: session.user.email, name: session.user.name }
    : await prisma.user.findUnique({
        where: { id: space.createdById },
        select: { email: true, name: true },
      });

  if (recipient?.email) {
    try {
      await sendEmail({
        from: 'Spectacl <hello@mail.spectacl.org>',
        to: recipient.email,
        subject: `Your Spectacl workspace "${space.name}" has been cancelled`,
        html: await renderEmail(CancellationEmail, {
          spaceName: space.name,
          cancelledBySelf,
          userName: recipient.name ?? undefined,
          periodEndDate: space.currentPeriodEnd?.toISOString() ?? undefined,
        }),
        label: 'cancellation',
      });
    } catch (emailErr) {
      // Non-fatal — sendEmail already logs internally
      console.error('[Cancel] Cancellation email exception:', emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
