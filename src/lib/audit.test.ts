/**
 * Audit log tests — best-effort, never-throws contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { auditLog } from './audit';

beforeEach(() => {
  mockReset();
  mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
});

describe('auditLog', () => {
  it('writes a row with the full payload', async () => {
    await auditLog({
      userId: 'user-1',
      action: 'space.lock',
      targetType: 'Space',
      targetId: 'space-1',
      detail: { reason: 'misuse' },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'space.lock',
        targetType: 'Space',
        targetId: 'space-1',
        detail: { reason: 'misuse' },
      },
    });
  });

  it('nulls targetId when omitted', async () => {
    await auditLog({
      userId: 'user-1',
      action: 'system.broadcast',
      targetType: 'System',
    });

    const call = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(call.data.targetId).toBeNull();
  });

  it('leaves detail undefined when omitted (not null)', async () => {
    await auditLog({
      userId: 'user-1',
      action: 'user.view',
      targetType: 'User',
      targetId: 'user-2',
    });

    const call = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(call.data.detail).toBeUndefined();
  });

  it('never throws when Prisma rejects (best-effort contract)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB down'));

    await expect(
      auditLog({
        userId: 'user-1',
        action: 'space.unlock',
        targetType: 'Space',
        targetId: 'space-1',
      }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('[Audit] Failed to write log'),
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('returns undefined on success (no meaningful return value)', async () => {
    const result = await auditLog({
      userId: 'user-1',
      action: 'model.create',
      targetType: 'GlobalModel',
      targetId: 'm-1',
    });
    expect(result).toBeUndefined();
  });

  it('accepts the resource.verb action format used across admin routes', async () => {
    for (const action of ['space.lock', 'space.unlock', 'model.create', 'user.delete', 'invoice.refund']) {
      await auditLog({ userId: 'u', action, targetType: 'X' });
    }
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(5);
  });
});
