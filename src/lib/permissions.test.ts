import { describe, it, expect, vi } from 'vitest';

// Mock transitive deps that throw without env vars in CI
vi.mock('@/lib/email', () => ({ resend: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  hasMinRole,
  canManageMembers,
  canEditSpace,
  canDeleteSpace,
  canManageInvitations,
} from './permissions';

describe('hasMinRole', () => {
  it('OWNER meets OWNER requirement', () => {
    expect(hasMinRole('OWNER', 'OWNER')).toBe(true);
  });

  it('OWNER meets ADMIN requirement', () => {
    expect(hasMinRole('OWNER', 'ADMIN')).toBe(true);
  });

  it('OWNER meets MEMBER requirement', () => {
    expect(hasMinRole('OWNER', 'MEMBER')).toBe(true);
  });

  it('ADMIN meets ADMIN requirement', () => {
    expect(hasMinRole('ADMIN', 'ADMIN')).toBe(true);
  });

  it('ADMIN meets MEMBER requirement', () => {
    expect(hasMinRole('ADMIN', 'MEMBER')).toBe(true);
  });

  it('ADMIN does not meet OWNER requirement', () => {
    expect(hasMinRole('ADMIN', 'OWNER')).toBe(false);
  });

  it('MEMBER meets MEMBER requirement', () => {
    expect(hasMinRole('MEMBER', 'MEMBER')).toBe(true);
  });

  it('MEMBER does not meet ADMIN requirement', () => {
    expect(hasMinRole('MEMBER', 'ADMIN')).toBe(false);
  });

  it('MEMBER does not meet OWNER requirement', () => {
    expect(hasMinRole('MEMBER', 'OWNER')).toBe(false);
  });
});

describe('canManageMembers', () => {
  it('OWNER can manage members', () => {
    expect(canManageMembers('OWNER')).toBe(true);
  });

  it('ADMIN can manage members', () => {
    expect(canManageMembers('ADMIN')).toBe(true);
  });

  it('MEMBER cannot manage members', () => {
    expect(canManageMembers('MEMBER')).toBe(false);
  });
});

describe('canEditSpace', () => {
  it('OWNER can edit space', () => {
    expect(canEditSpace('OWNER')).toBe(true);
  });

  it('ADMIN can edit space', () => {
    expect(canEditSpace('ADMIN')).toBe(true);
  });

  it('MEMBER cannot edit space', () => {
    expect(canEditSpace('MEMBER')).toBe(false);
  });
});

describe('canDeleteSpace', () => {
  it('OWNER can delete space', () => {
    expect(canDeleteSpace('OWNER')).toBe(true);
  });

  it('ADMIN cannot delete space', () => {
    expect(canDeleteSpace('ADMIN')).toBe(false);
  });

  it('MEMBER cannot delete space', () => {
    expect(canDeleteSpace('MEMBER')).toBe(false);
  });
});

describe('canManageInvitations', () => {
  it('OWNER can manage invitations', () => {
    expect(canManageInvitations('OWNER')).toBe(true);
  });

  it('ADMIN can manage invitations', () => {
    expect(canManageInvitations('ADMIN')).toBe(true);
  });

  it('MEMBER cannot manage invitations', () => {
    expect(canManageInvitations('MEMBER')).toBe(false);
  });
});
