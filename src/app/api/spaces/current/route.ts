import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { resolveSpaceAccess } from '@/lib/space-access';
import { canManageInvitations } from '@/lib/permissions';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current space from cookie
    const { getCurrentSpace } = await import('@/lib/spaces');
    const space = await getCurrentSpace(session.user.id);

    if (!space) {
      return NextResponse.json({ error: 'No space found' }, { status: 404 });
    }

    // Effective role for the viewer (members get their actual role; app-admin
    // support mode grants management privileges without a SpaceMember row).
    const access = await resolveSpaceAccess(session.user.id, space.id);
    const currentUserRole =
      access.kind === 'member' ? access.role : null;
    const canManageMembers =
      access.kind === 'admin-override' ||
      (access.kind === 'member' && canManageInvitations(access.role));

    return NextResponse.json({
      id: space.id,
      name: space.name,
      plan: space.plan,
      slug: space.slug,
      llmProvider: space.llmProvider,
      subscriptionStatus: space.subscriptionStatus,
      currentUserRole,
      canManageMembers,
    });
  } catch (error) {
    console.error('Error fetching current space:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space' },
      { status: 500 }
    );
  }
}
