import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { resolveSpaceAccess } from '@/lib/space-access';
import { isSupportWriteMode } from '@/lib/support-mode';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { spaceId } = await params;
  const access = await resolveSpaceAccess(session.user.id, spaceId);

  if (access.kind === 'member') {
    return NextResponse.json({ role: access.role });
  }

  if (access.kind === 'admin-override') {
    return NextResponse.json({
      role: 'ADMIN',
      isAdminOverride: true,
      writeEnabled: await isSupportWriteMode(spaceId),
    });
  }

  return NextResponse.json({ error: 'Not a member of this space' }, { status: 403 });
}
