/**
 * confirm-payment route tests — client-side return verification.
 *
 * Contract: fetches the specific Mollie payment to verify status=paid.
 * MUST NOT set lastProcessedWebhookId — webhook still runs its full flow.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));

// Auth session — override per-test via getSessionMock.mockResolvedValueOnce
const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock('next/headers', () => ({ headers: async () => new Map() }));

import { POST } from './route';

function jsonRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  mockReset();
  mollieMockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({ user: { id: 'user-1', email: 'user@example.com', name: 'Tester' } });
  vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-15T10:00:00Z'));
});

describe('POST /api/mollie/confirm-payment', () => {
  it('returns 400 in self-hosted mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(400);
  });

  it('returns 401 without session', async () => {
    getSessionMock.mockResolvedValue(null);

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(401);
  });

  it('rejects invalid plan (ENTERPRISE/FOUNDER not allowed)', async () => {
    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'ENTERPRISE' }));

    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is not owner/admin', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue(null);

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(403);
  });

  it('returns 400 when no molliePaymentId on space (checkout never started)', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      plan: 'STARTER', subscriptionStatus: 'INCOMPLETE', currentPeriodEnd: null,
      mollieCustomerId: 'cst_1', molliePaymentId: null, lastProcessedWebhookId: null,
    });

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(400);
  });

  it('fast path: webhook already processed — returns 200 without Mollie fetch', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      currentPeriodEnd: new Date('2026-05-15'),
      mollieCustomerId: 'cst_1',
      molliePaymentId: 'tr_paid',
      lastProcessedWebhookId: 'tr_paid',
    });

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.plan).toBe('PRO');
    expect(mockMollie.payments.get).not.toHaveBeenCalled();
    // Critically, no DB writes — webhook handled it
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('slow path: verifies paid payment via Mollie API then applies optimistic ACTIVE', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      plan: 'STARTER',
      subscriptionStatus: 'INCOMPLETE',
      currentPeriodEnd: null,
      mollieCustomerId: 'cst_1',
      molliePaymentId: 'tr_newpay',
      lastProcessedWebhookId: null,
    });
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_newpay',
      status: 'paid',
      metadata: { spaceId: 'space-1', plan: 'PRO' },
    });
    mockPrisma.space.update.mockResolvedValue({ plan: 'PRO' });

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(200);
    expect(mockMollie.payments.get).toHaveBeenCalledWith('tr_newpay');
    const updateCall = mockPrisma.space.update.mock.calls[0][0];
    expect(updateCall.data).toMatchObject({
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      canceledAt: null,
      cancellationReason: null,
    });
    // Contract: lastProcessedWebhookId MUST NOT be set — webhook must run its full flow
    expect(Object.keys(updateCall.data)).not.toContain('lastProcessedWebhookId');
  });

  it('rejects when Mollie payment status is not paid', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      plan: 'STARTER', subscriptionStatus: 'INCOMPLETE', currentPeriodEnd: null,
      mollieCustomerId: 'cst_1', molliePaymentId: 'tr_pending', lastProcessedWebhookId: null,
    });
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_pending', status: 'open',
      metadata: { spaceId: 'space-1', plan: 'PRO' },
    });

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(400);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('rejects metadata mismatch (URL-param forgery)', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      plan: 'STARTER', subscriptionStatus: 'INCOMPLETE', currentPeriodEnd: null,
      mollieCustomerId: 'cst_1', molliePaymentId: 'tr_real', lastProcessedWebhookId: null,
    });
    // Real payment was for STARTER, attacker claims PRO
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_real', status: 'paid',
      metadata: { spaceId: 'space-1', plan: 'STARTER' },
    });

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(400);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('handles Mollie API fetch failure gracefully', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
    mockPrisma.space.findUnique.mockResolvedValue({
      plan: 'STARTER', subscriptionStatus: 'INCOMPLETE', currentPeriodEnd: null,
      mollieCustomerId: 'cst_1', molliePaymentId: 'tr_down', lastProcessedWebhookId: null,
    });
    mockMollie.payments.get.mockRejectedValue(new Error('Mollie API down'));

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(400);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });
});
