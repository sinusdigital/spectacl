import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { setSupportSpaceId, setSupportWriteMode } from '@/lib/support-mode';
import { auditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { resolveSpaceAccess } from '@/lib/space-access';

/**
 * Admin-only support-mode controls.
 *
 * Body shapes:
 *   { spaceId: string, enter: true }            → start support mode for this space (read-only)
 *   { spaceId: string, writeEnabled: boolean }  → toggle write mode
 *   { spaceId: string, exit: true }             → clear support-mode cookies
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.spaceId !== 'string') {
    return NextResponse.json({ error: 'spaceId required' }, { status: 400 });
  }
  const { spaceId } = body as { spaceId: string };

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true },
  });
  if (!space) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 });
  }

  if (body.exit) {
    await setSupportSpaceId(null);
    // Clear current-space-id so the admin's sidebar falls back to their own
    // first membership on the next render.
    const store = await cookies();
    store.delete('current-space-id');
    void auditLog({
      userId: session.user.id,
      action: 'space.admin_override_exit',
      targetType: 'space',
      targetId: spaceId,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.enter) {
    // Skip support-mode cookies entirely if the admin is already a member —
    // they don't need override semantics for their own space. Just switch the
    // current-space cookie so the sidebar reflects the target space.
    const access = await resolveSpaceAccess(session.user.id, spaceId);
    const isMember = access.kind === 'member';

    if (!isMember) {
      await setSupportSpaceId(spaceId);
      // Reset write mode on entry — read-only default.
      await setSupportWriteMode(spaceId, false);
    } else {
      // Defensive: clear any stale support cookies left over from a previous
      // session so the admin isn't accidentally gated in their own space.
      await setSupportSpaceId(null);
    }

    // Overwrite the existing httpOnly current-space-id so the sidebar and
    // getCurrentSpace switch to the target space. document.cookie on the
    // client cannot overwrite httpOnly cookies, so it has to happen here.
    const store = await cookies();
    store.set('current-space-id', spaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    void auditLog({
      userId: session.user.id,
      action: isMember ? 'space.admin_switch_to_member_space' : 'space.admin_override_enter',
      targetType: 'space',
      targetId: spaceId,
    });
    return NextResponse.json({ ok: true, isMember });
  }

  if (typeof body.writeEnabled === 'boolean') {
    await setSupportWriteMode(spaceId, body.writeEnabled);
    void auditLog({
      userId: session.user.id,
      action: body.writeEnabled ? 'space.admin_write_enable' : 'space.admin_write_disable',
      targetType: 'space',
      targetId: spaceId,
    });
    return NextResponse.json({ ok: true, writeEnabled: body.writeEnabled });
  }

  return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
}
