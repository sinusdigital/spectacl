import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Props {
  searchParams: Promise<{ from?: string; error?: string }>;
}

export default async function AuthCallbackPage({ searchParams }: Props) {
  const { from, error } = await searchParams;

  // better-auth redirects here with ?error=... when magic link verification fails
  if (error) {
    console.error(`[auth/callback] verification failed: ${error}`);
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    loginUrl.searchParams.set('error', error);
    redirect(loginUrl.pathname + loginUrl.search);
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    console.error('[auth/callback] no session after verification — possible stale cookie or token issue');
    redirect('/login?error=no_session');
  }

  // Find the user's first entity via their space memberships
  const membership = await prisma.spaceMember.findFirst({
    where: { userId: session.user.id },
    select: { spaceId: true },
    orderBy: { joinedAt: 'asc' },
  });

  const entity = membership
    ? await prisma.entity.findFirst({
        where: { spaceId: membership.spaceId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
    : null;

  if (!entity) {
    redirect('/onboarding');
  }

  // If there's a valid `from` redirect (e.g. session expired mid-session), honour it
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    redirect(from);
  }

  redirect(`/${entity.id}`);
}
