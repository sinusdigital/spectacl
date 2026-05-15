/**
 * Subscription cancellation tests.
 *
 * Regression coverage for the null-createdById path (original owner deleted
 * their account → falls back to requester's email). Confirms:
 * - OWNER/ADMIN gate
 * - Already-CANCELED → 400
 * - Mollie failure → 502, no DB write, no email
 * - DB updates, deletion log written, email sent via sendEmail wrapper
 * - Self-hosted short-circuit
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));

const { getSessionMock, sendEmailMock, renderEmailMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  sendEmailMock: vi.fn(),
  renderEmailMock: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock('next/headers', () => ({ headers: async () => new Map() }));
vi.mock('@/lib/send-email', () => ({
  sendEmail: sendEmailMock,
  renderEmail: renderEmailMock,
}));
vi.mock('@/emails', () => ({
  CancellationEmail: () => null,
}));

import { POST } from './route';

function jsonRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const paramsFor = (spaceId: string) => ({
  params: Promise.resolve({ spaceId }),
});

beforeEach(() => {
  mockReset();
  mollieMockReset();
  getSessionMock.mockReset();
  sendEmailMock.mockReset();
  renderEmailMock.mockReset();

  getSessionMock.mockResolvedValue({
    user: { id: 'user-owner', email: 'owner@example.com', name: 'Owner' },
  });
  sendEmailMock.mockResolvedValue({ success: true, id: 'email-1' });
  renderEmailMock.mockResolvedValue('<html>ok</html>');

  vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
});

describe('POST /api/spaces/[spaceId]/subscription/cancel', () => {
  it('returns 400 in self-hosted mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(400);
  });

  it('returns 401 without session', async () => {
    getSessionMock.mockResolvedValue(null);

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for MEMBER role (only OWNER/ADMIN can cancel)', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'MEMBER' });

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(403);
  });

  it('returns 404 when space not found', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue(null);

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(404);
  });

  it('returns 400 when subscription already CANCELED (idempotent guard)', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Acme', plan: 'PRO',
      mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1',
      subscriptionStatus: 'CANCELED', createdById: 'user-owner',
      currentPeriodEnd: new Date(),
    });

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(400);
    expect(mockMollie.customerSubscriptions.cancel).not.toHaveBeenCalled();
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('cancels Mollie subscription, updates DB, writes deletion log, sends email', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Acme', plan: 'PRO',
      mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1',
      subscriptionStatus: 'ACTIVE', createdById: 'user-owner',
      currentPeriodEnd: new Date('2026-06-01'),
    });

    const res = await POST(jsonRequest({ reason: 'Too expensive' }), paramsFor('space-1'));

    expect(res.status).toBe(200);
    expect(mockMollie.customerSubscriptions.cancel).toHaveBeenCalledWith('sub_1', { customerId: 'cst_1' });
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: expect.objectContaining({
        subscriptionStatus: 'CANCELED',
        cancellationReason: 'Too expensive',
      }),
    });
    expect(mockPrisma.spaceDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        spaceId: 'space-1',
        spaceName: 'Acme',
        plan: 'PRO',
        reason: 'Too expensive',
        source: 'cancellation',
      }),
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        label: 'cancellation',
      })
    );
  });

  it('returns 502 and skips DB write + email when Mollie cancellation fails', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Acme', plan: 'PRO',
      mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1',
      subscriptionStatus: 'ACTIVE', createdById: 'user-owner',
      currentPeriodEnd: new Date(),
    });
    mockMollie.customerSubscriptions.cancel.mockRejectedValue(new Error('Mollie down'));

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(502);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
    expect(mockPrisma.spaceDeletionLog.create).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('proceeds with DB cancellation even when space has no Mollie subscription', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Trial Space', plan: 'STARTER',
      mollieCustomerId: null, mollieSubscriptionId: null,
      subscriptionStatus: 'TRIALING', createdById: 'user-owner',
      currentPeriodEnd: null,
    });

    const res = await POST(jsonRequest({ reason: null }), paramsFor('space-1'));

    expect(res.status).toBe(200);
    expect(mockMollie.customerSubscriptions.cancel).not.toHaveBeenCalled();
    expect(mockPrisma.space.update).toHaveBeenCalled();
  });

  it('regression: null createdById (original owner deleted account) falls back to session user email', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Orphan', plan: 'PRO',
      mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1',
      subscriptionStatus: 'ACTIVE',
      createdById: null, // ← the bug — previous code crashed with Prisma validation error
      currentPeriodEnd: new Date(),
    });

    const res = await POST(jsonRequest({ reason: 'admin cancel' }), paramsFor('space-1'));

    expect(res.status).toBe(200);
    // Must not attempt to look up null user
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    // Email falls back to the requester
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com' })
    );
  });

  it('admin canceller (not OWNER) emails the OWNER instead of the admin', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Acme', plan: 'PRO',
      mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1',
      subscriptionStatus: 'ACTIVE',
      createdById: 'user-creator',
      currentPeriodEnd: new Date(),
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'creator@example.com', name: 'Creator' });

    await POST(jsonRequest({ reason: 'support action' }), paramsFor('space-1'));

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-creator' },
      select: { email: true, name: true },
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'creator@example.com' })
    );
  });

  it('email send failure does not block the cancellation response', async () => {
    mockPrisma.spaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', name: 'Acme', plan: 'PRO',
      mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1',
      subscriptionStatus: 'ACTIVE', createdById: 'user-owner',
      currentPeriodEnd: new Date(),
    });
    sendEmailMock.mockRejectedValue(new Error('Resend exception'));

    const res = await POST(jsonRequest({ reason: 'test' }), paramsFor('space-1'));

    expect(res.status).toBe(200);
    expect(mockPrisma.space.update).toHaveBeenCalled();
  });
});
