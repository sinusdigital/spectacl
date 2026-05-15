import { SpaceRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from './prisma';
import { auth } from './auth';
import { ensureSpaceNotHalted } from './billing/access';
import { resolveSpaceAccess, type SpaceAccess } from './space-access';
import { isSupportWriteMode } from './support-mode';
import { auditLog } from './audit';

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Role hierarchy: OWNER > ADMIN > MEMBER
 */
const ROLE_HIERARCHY: Record<SpaceRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

export type AccessIntent = 'read' | 'write';

export function hasMinRole(
  userRole: SpaceRole,
  requiredRole: SpaceRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageMembers(role: SpaceRole): boolean {
  return hasMinRole(role, 'ADMIN');
}

export function canEditSpace(role: SpaceRole): boolean {
  return hasMinRole(role, 'ADMIN');
}

export function canDeleteSpace(role: SpaceRole): boolean {
  return role === 'OWNER';
}

export function canManageInvitations(role: SpaceRole): boolean {
  return hasMinRole(role, 'ADMIN');
}

/**
 * Get user's role in a specific space.
 * Returns null if user is not a member (app-admin overrides are NOT reflected here —
 * callers that need override semantics should use `resolveSpaceAccess` instead).
 */
export async function getUserSpaceRole(
  userId: string,
  spaceId: string
): Promise<SpaceRole | null> {
  const member = await prisma.spaceMember.findUnique({
    where: { userId_spaceId: { userId, spaceId } },
    select: { role: true },
  });
  return member?.role || null;
}

export async function isSpaceMember(
  userId: string,
  spaceId: string
): Promise<boolean> {
  const role = await getUserSpaceRole(userId, spaceId);
  return role !== null;
}

/**
 * Require user to be a space member with minimum role, OR an app admin using
 * support-mode override. App admins pass reads automatically; writes require
 * the support-write cookie scoped to this spaceId.
 *
 * Returns the resolver result so callers can branch on `access.kind` if needed.
 */
export async function requireSpaceAccess(
  userId: string,
  spaceId: string,
  options: { minRole?: SpaceRole; intent?: AccessIntent } = {}
): Promise<SpaceAccess> {
  const { minRole = 'MEMBER', intent = 'write' } = options;
  const access = await resolveSpaceAccess(userId, spaceId);

  if (access.kind === 'member') {
    if (!hasMinRole(access.role, minRole)) {
      throw new Error(`Requires ${minRole} role or higher`);
    }
    return access;
  }

  if (access.kind === 'admin-override') {
    if (intent === 'write' && !(await isSupportWriteMode(spaceId))) {
      throw new Error('Admin support mode is read-only. Enable write mode to mutate.');
    }
    // Fire-and-forget audit on writes; reads are too chatty.
    if (intent === 'write') {
      void auditLog({
        userId,
        action: 'space.admin_override_write',
        targetType: 'space',
        targetId: spaceId,
        detail: { minRole },
      });
    }
    return access;
  }

  throw new Error('Not a member of this space');
}

/**
 * @deprecated Use `requireSpaceAccess` for new code. Kept as a thin wrapper
 * so existing call sites get admin-override behavior for free.
 */
export async function requireSpaceMembership(
  userId: string,
  spaceId: string,
  minRole: SpaceRole = 'MEMBER'
): Promise<SpaceRole> {
  const access = await requireSpaceAccess(userId, spaceId, { minRole, intent: 'write' });
  // Preserve old return shape for callers that still read the role directly.
  return access.kind === 'member' ? access.role : minRole;
}

export async function canSpaceBeDeleted(_spaceId: string): Promise<boolean> {
  return true;
}

export async function getUserSpaces(userId: string) {
  const memberships = await prisma.spaceMember.findMany({
    where: { userId },
    include: {
      Space: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((m) => ({
    ...m.Space,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

// ── Route-level auth helpers ──

export async function requireEntityAccess(
  entityId: string,
  userId: string,
  options: { minRole?: SpaceRole; intent?: AccessIntent } = {}
): Promise<{ entity: { id: string; spaceId: string }; spaceId: string; access: SpaceAccess }> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { id: true, spaceId: true },
  });
  if (!entity || !entity.spaceId) throw new Error('Entity not found');
  const access = await requireSpaceAccess(userId, entity.spaceId, options);
  return { entity: { id: entity.id, spaceId: entity.spaceId }, spaceId: entity.spaceId, access };
}

/**
 * Auth wrapper for entity-scoped API route handlers.
 * Returns { error } if unauthorized, or { session, spaceId } on success.
 */
export async function withEntityAuth(
  entityId: string,
  options?: { minRole?: SpaceRole; requireWrite?: boolean; intent?: AccessIntent }
): Promise<
  | { error: NextResponse; session?: never; spaceId?: never; access?: never }
  | { error?: never; session: NonNullable<AuthSession>; spaceId: string; access: SpaceAccess }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const intent: AccessIntent = options?.intent ?? (options?.requireWrite ? 'write' : 'read');
    const { spaceId, access } = await requireEntityAccess(entityId, session.user.id, {
      minRole: options?.minRole,
      intent,
    });
    if (options?.requireWrite && access.kind !== 'admin-override') {
      const halted = await ensureSpaceNotHalted(spaceId);
      if (halted) return { error: halted };
    }
    return { session, spaceId, access };
  } catch {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
}

/**
 * Auth wrapper for prompt-scoped API route handlers.
 */
export async function withPromptAuth(
  promptId: string,
  options?: { minRole?: SpaceRole; requireWrite?: boolean; intent?: AccessIntent }
): Promise<
  | { error: NextResponse; session?: never; spaceId?: never; prompt?: never; access?: never }
  | { error?: never; session: NonNullable<AuthSession>; spaceId: string; prompt: { id: string; entityId: string }; access: SpaceAccess }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: { id: true, entityId: true, entity: { select: { spaceId: true } } },
    });
    if (!prompt?.entity?.spaceId) {
      return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
    }
    const intent: AccessIntent = options?.intent ?? (options?.requireWrite ? 'write' : 'read');
    const access = await requireSpaceAccess(session.user.id, prompt.entity.spaceId, {
      minRole: options?.minRole,
      intent,
    });
    if (options?.requireWrite && access.kind !== 'admin-override') {
      const halted = await ensureSpaceNotHalted(prompt.entity.spaceId);
      if (halted) return { error: halted };
    }
    return { session, spaceId: prompt.entity.spaceId, prompt: { id: prompt.id, entityId: prompt.entityId }, access };
  } catch {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
}
