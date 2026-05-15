/**
 * Mollie checkout route tests.
 *
 * Covers: BILLING_PROFILE_REQUIRED gate, plan validation, tax-adjusted
 * gross amount, metadata payload, self-hosted short-circuit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock('next/headers', () => ({ headers: async () => new Map() }));

// getPlanLimitsFromDb — PRO = 99 EUR net
vi.mock('@/lib/billing/plans', async () => {
  const actual = await vi.importActual<typeof import('@/lib/billing/plans')>('@/lib/billing/plans');
  return {
    ...actual,
    getPlanLimitsFromDb: vi.fn().mockResolvedValue({
      maxMembers: 3,
      maxEntities: 3,
      maxActivePrompts: 75,
      dataRetentionDays: 180,
      prices: { MANAGED: 99, BYOK: 99 },
      features: [],
      priceManaged: 99,
    }),
  };
});

import { POST } from './route';

function jsonRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  mockReset();
  mollieMockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
  });
  vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.spectacl.org');
  vi.stubEnv('MOLLIE_WEBHOOK_URL', 'https://app.spectacl.org/api/webhooks/mollie');

  // Default: owner found, space exists, billing profile is NL domestic
  mockPrisma.spaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' });
  mockPrisma.space.findFirst.mockResolvedValue({
    id: 'space-1', name: 'Acme Space', mollieCustomerId: 'cst_1',
  });
  mockPrisma.billingProfile.findUnique.mockResolvedValue({
    spaceId: 'space-1', country: 'NL', vatIdValid: false, vatId: null,
  });
  mockPrisma.space.update.mockResolvedValue({ id: 'space-1' });
  mockMollie.payments.create.mockResolvedValue({
    id: 'tr_created',
    getCheckoutUrl: () => 'https://checkout.mollie.test/tr_created',
  });
});

describe('POST /api/mollie/checkout', () => {
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

  it('rejects ENTERPRISE plan (contact-us only)', async () => {
    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'ENTERPRISE' }));

    expect(res.status).toBe(400);
  });

  it('rejects FOUNDER plan', async () => {
    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'FOUNDER' }));

    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is not owner/admin', async () => {
    mockPrisma.spaceMember.findFirst.mockResolvedValue(null);

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(res.status).toBe(403);
  });

  it('returns BILLING_PROFILE_REQUIRED when no profile exists', async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue(null);

    const res = await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('BILLING_PROFILE_REQUIRED');
  });

  it('NL domestic: charges 21% BTW gross on net 99 EUR', async () => {
    await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    const createCall = mockMollie.payments.create.mock.calls[0][0];
    // 99 * 1.21 = 119.79
    expect(createCall.amount).toEqual({ currency: 'EUR', value: '119.79' });
    expect(createCall.metadata).toMatchObject({
      spaceId: 'space-1',
      plan: 'PRO',
      price: '119.79',
      netPrice: '99.00',
      taxType: 'standard',
      taxRate: '0.21',
    });
  });

  it('EU with valid VAT ID: 0% reverse charge (gross = net)', async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      spaceId: 'space-1', country: 'DE', vatIdValid: true, vatId: 'DE123456789',
    });

    await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    const createCall = mockMollie.payments.create.mock.calls[0][0];
    expect(createCall.amount).toEqual({ currency: 'EUR', value: '99.00' });
    expect(createCall.metadata.taxType).toBe('reverse_charge');
    expect(createCall.metadata.taxRate).toBe('0');
  });

  it('non-EU: 0% exempt (gross = net)', async () => {
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      spaceId: 'space-1', country: 'US', vatIdValid: false, vatId: null,
    });

    await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    const createCall = mockMollie.payments.create.mock.calls[0][0];
    expect(createCall.amount).toEqual({ currency: 'EUR', value: '99.00' });
    expect(createCall.metadata.taxType).toBe('exempt');
  });

  it('creates payment with sequenceType=first and stores payment id on space', async () => {
    await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    const createCall = mockMollie.payments.create.mock.calls[0][0];
    expect(createCall.sequenceType).toBe('first');
    expect(createCall.customerId).toBe('cst_1');

    // Stored the resulting payment id back on the space
    const updateCalls = mockPrisma.space.update.mock.calls;
    const paymentIdUpdate = updateCalls.find(
      (c) => (c[0].data as { molliePaymentId?: string }).molliePaymentId === 'tr_created'
    );
    expect(paymentIdUpdate).toBeDefined();
  });

  it('plan upgrade path: creates first payment (webhook cancels old sub, not here)', async () => {
    // Existing paid plan with active subscription
    mockPrisma.space.findFirst.mockResolvedValue({
      id: 'space-1', name: 'Acme',
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: 'sub_old',
    });

    await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    // Checkout never touches old subscription; it just creates the new first-payment
    expect(mockMollie.customerSubscriptions.cancel).not.toHaveBeenCalled();
    expect(mockMollie.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ sequenceType: 'first' })
    );
  });

  it('creates Mollie customer on first checkout (no existing mollieCustomerId)', async () => {
    mockPrisma.space.findFirst.mockResolvedValue({
      id: 'space-1', name: 'Acme', mollieCustomerId: null,
    });
    mockMollie.customers.create.mockResolvedValue({ id: 'cst_new', email: 'owner@example.com' });

    await POST(jsonRequest({ spaceId: 'space-1', plan: 'PRO' }));

    expect(mockMollie.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        metadata: { spaceId: 'space-1', userId: 'user-1' },
      })
    );
    // Persists customer id to space
    const customerUpdate = mockPrisma.space.update.mock.calls.find(
      (c) => (c[0].data as { mollieCustomerId?: string }).mollieCustomerId === 'cst_new'
    );
    expect(customerUpdate).toBeDefined();
  });
});
