import { SpaceRole } from '@prisma/client';
import { prisma } from './prisma';

export type SpaceAccess =
  | { kind: 'member'; role: SpaceRole }
  | { kind: 'admin-override' }
  | { kind: 'none' };

/**
 * Resolves a user's access to a space in a single query.
 *
 * - Regular space members get `{ kind: "member", role }`.
 * - App admins (`User.role === "ADMIN"`) without a membership get `{ kind: "admin-override" }`,
 *   letting support/consulting staff enter customer spaces without being invited.
 * - Everyone else gets `{ kind: "none" }`.
 *
 * Admin-override is never written to `SpaceMember`, so it stays invisible in the
 * member list and in `/spaces`.
 */
export async function resolveSpaceAccess(
  userId: string,
  spaceId: string
): Promise<SpaceAccess> {
  const [membership, user] = await Promise.all([
    prisma.spaceMember.findUnique({
      where: { userId_spaceId: { userId, spaceId } },
      select: { role: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  ]);

  if (membership) return { kind: 'member', role: membership.role };
  if (user?.role === 'ADMIN') return { kind: 'admin-override' };
  return { kind: 'none' };
}

export function isAppAdminOverride(access: SpaceAccess): boolean {
  return access.kind === 'admin-override';
}
