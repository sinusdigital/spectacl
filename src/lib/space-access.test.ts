import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { resolveSpaceAccess, isAppAdminOverride } from './space-access';

describe('resolveSpaceAccess', () => {
  beforeEach(() => {
    mockReset();
  });

  it('returns member role when user is a space member', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER' });

    const access = await resolveSpaceAccess('u1', 's1');

    expect(access).toEqual({ kind: 'member', role: 'OWNER' });
  });

  it('returns admin-override for app admin who is not a member', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

    const access = await resolveSpaceAccess('u1', 's1');

    expect(access).toEqual({ kind: 'admin-override' });
    expect(isAppAdminOverride(access)).toBe(true);
  });

  it('prefers member role over admin-override when user is both', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

    const access = await resolveSpaceAccess('u1', 's1');

    expect(access).toEqual({ kind: 'member', role: 'MEMBER' });
  });

  it('returns none for non-admin non-member', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER' });

    const access = await resolveSpaceAccess('u1', 's1');

    expect(access).toEqual({ kind: 'none' });
  });

  it('returns none when user does not exist and is not a member', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const access = await resolveSpaceAccess('u1', 's1');

    expect(access).toEqual({ kind: 'none' });
  });
});

describe('isAppAdminOverride', () => {
  it('is true only for admin-override', () => {
    expect(isAppAdminOverride({ kind: 'admin-override' })).toBe(true);
    expect(isAppAdminOverride({ kind: 'member', role: 'ADMIN' })).toBe(false);
    expect(isAppAdminOverride({ kind: 'none' })).toBe(false);
  });
});
