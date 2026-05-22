import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.redirect(new URL(`/invite/${token}`, request.url));
  }

  const invitation = await prisma.spaceInvitation.findUnique({
    where: { token },
    select: { spaceId: true, expiresAt: true, status: true, role: true, invitedById: true },
  });

  if (!invitation) {
    return NextResponse.redirect(new URL(`/invite/${token}`, request.url));
  }

  // Idempotent: if the user is already a member (e.g. a previous attempt crashed
  // after the DB transaction but before the redirect), set the cookie and route
  // them in. Don't bounce back to /invite/[token] just because the invitation is
  // already ACCEPTED — they'd see "invitation is no longer valid" despite being
  // a member.
  const existingMember = await prisma.spaceMember.findUnique({
    where: {
      userId_spaceId: { userId: session.user.id, spaceId: invitation.spaceId },
    },
    select: { userId: true },
  });

  if (!existingMember) {
    if (new Date() > invitation.expiresAt || invitation.status !== 'PENDING') {
      return NextResponse.redirect(new URL(`/invite/${token}`, request.url));
    }

    await prisma.$transaction([
      prisma.spaceMember.create({
        data: {
          userId: session.user.id,
          spaceId: invitation.spaceId,
          role: invitation.role,
          invitedById: invitation.invitedById,
        },
      }),
      prisma.spaceInvitation.update({
        where: { token },
        data: { status: 'ACCEPTED' },
      }),
      prisma.spaceUsage.update({
        where: { spaceId: invitation.spaceId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);
  }

  const cookieStore = await cookies();
  cookieStore.set('current-space-id', invitation.spaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  const entity = await prisma.entity.findFirst({
    where: { spaceId: invitation.spaceId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return NextResponse.redirect(
    new URL(entity ? `/${entity.id}` : '/onboarding', request.url)
  );
}
