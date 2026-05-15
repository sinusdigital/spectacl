import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    // Not logged in — send back to invite page to authenticate
    redirect(`/invite/${token}`);
  }

  try {
    const invitation = await prisma.spaceInvitation.findUnique({
      where: { token },
      include: { Space: true },
    });

    if (!invitation || new Date() > invitation.expiresAt || invitation.status !== 'PENDING') {
      // Invalid or expired — let the invite page show the error
      redirect(`/invite/${token}`);
    }

    // Check if already a member
    const existing = await prisma.spaceMember.findUnique({
      where: { userId_spaceId: { userId: session.user.id, spaceId: invitation.spaceId } },
    });

    if (!existing) {
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
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        }),
        prisma.spaceUsage.update({
          where: { spaceId: invitation.spaceId },
          data: { memberCount: { increment: 1 } },
        }),
      ]);
    }

    // Set the accepted space as current
    const cookieStore = await cookies();
    cookieStore.set('current-space-id', invitation.spaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // Find first entity in the joined space
    const entity = await prisma.entity.findFirst({
      where: { spaceId: invitation.spaceId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    redirect(entity ? `/${entity.id}` : '/onboarding');
  } catch (err) {
    // If redirect throws (which it does internally in Next.js), rethrow it
    throw err;
  }
}
