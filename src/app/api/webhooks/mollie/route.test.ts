/**
 * Mollie webhook tests — highest blast radius.
 *
 * Covers idempotency, sequence types, status mapping, subscription creation,
 * invoice fire-and-forget, and the self-hosted short-circuit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));

// Stub getActiveModelCount + calculateMonthlyCreditsFromDb — these go through
// prisma under the hood but the assertion contract is easier with direct mocks.
vi.mock('@/lib/billing/plans', async () => {
  const actual = await vi.importActual<typeof import('@/lib/billing/plans')>('@/lib/billing/plans');
  return {
    ...actual,
    getActiveModelCount: vi.fn().mockResolvedValue(5),
    calculateMonthlyCreditsFromDb: vi.fn().mockResolvedValue(10000),
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

// Invoice creation should fire-and-forget without blocking.
// Declared via vi.hoisted so the reference is available to the mock factory.
const { createInvoiceMock } = vi.hoisted(() => ({
  createInvoiceMock: vi.fn(),
}));
vi.mock('@/lib/billing/invoices', () => ({
  createInvoice: createInvoiceMock,
}));

import { POST } from './route';

// Helpers to build fake NextRequests carrying urlencoded webhook bodies.
function webhookRequest(bodyParams: Record<string, string>) {
  const body = new URLSearchParams(bodyParams).toString();
  return {
    text: async () => body,
    headers: { get: () => null },
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  mockReset();
  mollieMockReset();
  createInvoiceMock.mockReset();
  createInvoiceMock.mockResolvedValue({ invoiceId: 'inv-1', number: 'SPE-2026-0001' });
  vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
  vi.stubEnv('MOLLIE_WEBHOOK_URL', 'https://test.local/api/webhooks/mollie');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-15T10:00:00Z'));
});

// ── Payment webhooks ─────────────────────────────────────────────────────────

describe('Mollie webhook — payment status handling', () => {
  it('ignores non-terminal "open" status without burning idempotency key', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_open1',
      status: 'open',
      sequenceType: 'first',
      customerId: 'cst_1',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: null,
      mollieCustomerId: null,
      mollieSubscriptionId: null,
      currentPeriodEnd: null,
    });

    const res = await POST(webhookRequest({ id: 'tr_open1' }));

    expect(res.status).toBe(200);
    // Must not claim the idempotency key for "open"
    expect(mockPrisma.space.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('ignores non-terminal "pending" status', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_pending1',
      status: 'pending',
      sequenceType: 'first',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', lastProcessedWebhookId: null, mollieCustomerId: null, mollieSubscriptionId: null, currentPeriodEnd: null,
    });

    const res = await POST(webhookRequest({ id: 'tr_pending1' }));

    expect(res.status).toBe(200);
    expect(mockPrisma.space.updateMany).not.toHaveBeenCalled();
  });

  it('idempotent: duplicate webhook with same id is a no-op', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_paid1',
      status: 'paid',
      sequenceType: 'first',
      customerId: 'cst_1',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: 'tr_paid1', // already processed
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: null,
      currentPeriodEnd: null,
    });
    // Claim attempt: WHERE has lastProcessedWebhookId != 'tr_paid1', so 0 rows updated
    mockPrisma.space.updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(webhookRequest({ id: 'tr_paid1' }));

    expect(res.status).toBe(200);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
    expect(mockMollie.customerSubscriptions.create).not.toHaveBeenCalled();
  });

  it('first payment (paid) creates Mollie subscription, resets credits, sets ACTIVE', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_first1',
      status: 'paid',
      sequenceType: 'first',
      customerId: 'cst_new',
      subscriptionId: null,
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00', netPrice: '99.00' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: null,
      mollieCustomerId: 'cst_new',
      mollieSubscriptionId: null,
      currentPeriodEnd: null,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockMollie.customerMandates.page.mockResolvedValue([{ status: 'valid', id: 'mdt_1' }]);
    mockMollie.customerSubscriptions.create.mockResolvedValue({ id: 'sub_new', status: 'active' });

    const res = await POST(webhookRequest({ id: 'tr_first1' }));

    expect(res.status).toBe(200);
    expect(mockMollie.customerSubscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cst_new',
        amount: { currency: 'EUR', value: '99.00' },
        interval: '1 month',
      })
    );
    const updateCall = mockPrisma.space.update.mock.calls.find(
      (c) => c[0].where.id === 'space-1'
    );
    expect(updateCall?.[0].data).toMatchObject({
      subscriptionStatus: 'ACTIVE',
      plan: 'PRO',
      mollieSubscriptionId: 'sub_new',
      llmCreditsRemaining: 10000,
      llmCreditsUsed: 0,
    });
  });

  it('first payment rolls back idempotency claim and returns 500 if subscription creation fails', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_failsub',
      status: 'paid',
      sequenceType: 'first',
      customerId: 'cst_new',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: 'tr_previous', // previous id captured for rollback
      mollieCustomerId: 'cst_new',
      mollieSubscriptionId: null,
      currentPeriodEnd: null,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockMollie.customerMandates.page.mockResolvedValue([{ status: 'valid', id: 'mdt_1' }]);
    mockMollie.customerSubscriptions.create.mockRejectedValue(new Error('Mollie API down'));

    const res = await POST(webhookRequest({ id: 'tr_failsub' }));

    expect(res.status).toBe(500);
    // Rollback: a space.update was called restoring the previous webhook id
    const rollback = mockPrisma.space.update.mock.calls.find(
      (c) => (c[0].data as { lastProcessedWebhookId?: string }).lastProcessedWebhookId === 'tr_previous'
    );
    expect(rollback).toBeDefined();
  });

  it('missing customerId on first paid payment sets INCOMPLETE without retry', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_nocust',
      status: 'paid',
      sequenceType: 'first',
      customerId: null,
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: null,
      mollieCustomerId: null,
      mollieSubscriptionId: null,
      currentPeriodEnd: null,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(webhookRequest({ id: 'tr_nocust' }));

    expect(res.status).toBe(200);
    expect(mockMollie.customerSubscriptions.create).not.toHaveBeenCalled();
    const statusUpdate = mockPrisma.space.update.mock.calls.find(
      (c) => (c[0].data as { subscriptionStatus?: string }).subscriptionStatus === 'INCOMPLETE'
    );
    expect(statusUpdate).toBeDefined();
  });

  it('recurring payment extends currentPeriodEnd via addOneMonth and resets credits', async () => {
    const existingEnd = new Date('2026-05-10T10:00:00Z'); // future relative to test time
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_recur1',
      status: 'paid',
      sequenceType: 'recurring',
      customerId: 'cst_1',
      subscriptionId: 'sub_1',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00', netPrice: '99.00' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: null,
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: 'sub_1',
      currentPeriodEnd: existingEnd,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(webhookRequest({ id: 'tr_recur1' }));

    expect(res.status).toBe(200);
    const call = mockPrisma.space.update.mock.calls.find((c) => c[0].where.id === 'space-1');
    const newEnd = (call?.[0].data as { currentPeriodEnd?: Date }).currentPeriodEnd;
    // addOneMonth(2026-05-10) = 2026-06-10
    expect(newEnd?.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(newEnd?.getUTCDate()).toBe(10);
    expect((call?.[0].data as { llmCreditsRemaining?: number }).llmCreditsRemaining).toBe(10000);
    expect((call?.[0].data as { llmCreditsUsed?: number }).llmCreditsUsed).toBe(0);
  });

  it('expired payment maps to CANCELED', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_exp',
      status: 'expired',
      sequenceType: 'first',
      metadata: { spaceId: 'space-1', plan: 'PRO' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', lastProcessedWebhookId: null, mollieCustomerId: null, mollieSubscriptionId: null, currentPeriodEnd: null,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });

    await POST(webhookRequest({ id: 'tr_exp' }));

    const call = mockPrisma.space.update.mock.calls.find((c) => c[0].where.id === 'space-1');
    expect((call?.[0].data as { subscriptionStatus?: string }).subscriptionStatus).toBe('CANCELED');
  });

  it('failed payment maps to PAST_DUE', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_fail',
      status: 'failed',
      sequenceType: 'recurring',
      subscriptionId: 'sub_1',
      metadata: { spaceId: 'space-1', plan: 'PRO' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', lastProcessedWebhookId: null, mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', currentPeriodEnd: new Date('2026-05-10'),
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });

    await POST(webhookRequest({ id: 'tr_fail' }));

    const call = mockPrisma.space.update.mock.calls.find((c) => c[0].where.id === 'space-1');
    expect((call?.[0].data as { subscriptionStatus?: string }).subscriptionStatus).toBe('PAST_DUE');
  });

  it('fetches payment from Mollie API — never trusts POST body alone', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_verified',
      status: 'paid',
      sequenceType: 'first',
      customerId: 'cst_1',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', lastProcessedWebhookId: null, mollieCustomerId: 'cst_1', mollieSubscriptionId: null, currentPeriodEnd: null,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockMollie.customerMandates.page.mockResolvedValue([{ status: 'valid' }]);
    mockMollie.customerSubscriptions.create.mockResolvedValue({ id: 'sub_new' });

    // Attacker sends plan=ENTERPRISE in the body — but the webhook only uses `id`
    // and pulls everything else from the authoritative Mollie fetch.
    await POST(webhookRequest({ id: 'tr_verified', plan: 'ENTERPRISE' }));

    expect(mockMollie.payments.get).toHaveBeenCalledWith('tr_verified');
  });

  it('fires invoice creation but does not block on failure', async () => {
    createInvoiceMock.mockRejectedValue(new Error('Invoice DB down'));
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_inv',
      status: 'paid',
      sequenceType: 'recurring',
      subscriptionId: 'sub_1',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00', netPrice: '99.00' },
    });
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1', lastProcessedWebhookId: null, mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', currentPeriodEnd: new Date('2026-05-10'),
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(webhookRequest({ id: 'tr_inv' }));

    expect(res.status).toBe(200);
    // Allow microtasks (catch handler) to flush
    await Promise.resolve();
    expect(createInvoiceMock).toHaveBeenCalled();
  });
});

// ── Subscription-cancellation webhook path ────────────────────────────────────

describe('Mollie webhook — subscription status change', () => {
  it('verifies cancellation via Mollie API before acting (never trusts body)', async () => {
    mockPrisma.space.findFirst.mockResolvedValue({
      id: 'space-1',
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: 'sub_cancel',
    });
    mockMollie.customerSubscriptions.get.mockResolvedValue({
      id: 'sub_cancel',
      status: 'canceled',
    });

    const res = await POST(webhookRequest({ id: 'sub_cancel', subscriptionId: 'sub_cancel' }));

    expect(res.status).toBe(200);
    expect(mockMollie.customerSubscriptions.get).toHaveBeenCalledWith('sub_cancel', { customerId: 'cst_1' });
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: { subscriptionStatus: 'CANCELED' },
    });
  });

  it('does not update DB when Mollie reports subscription still active', async () => {
    mockPrisma.space.findFirst.mockResolvedValue({
      id: 'space-1',
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: 'sub_active',
    });
    mockMollie.customerSubscriptions.get.mockResolvedValue({
      id: 'sub_active',
      status: 'active',
    });

    const res = await POST(webhookRequest({ id: 'sub_active', subscriptionId: 'sub_active' }));

    expect(res.status).toBe(200);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('returns 500 when Mollie verification fails so Mollie retries', async () => {
    mockPrisma.space.findFirst.mockResolvedValue({
      id: 'space-1',
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: 'sub_cancel',
    });
    mockMollie.customerSubscriptions.get.mockRejectedValue(new Error('Network error'));

    const res = await POST(webhookRequest({ id: 'sub_cancel', subscriptionId: 'sub_cancel' }));

    expect(res.status).toBe(500);
  });
});

// ── Self-hosted mode short-circuit ────────────────────────────────────────────

describe('Mollie webhook — self-hosted mode', () => {
  it('ignores webhook and returns 200 when mode is self-hosted', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

    const res = await POST(webhookRequest({ id: 'tr_anything' }));

    expect(res.status).toBe(200);
    expect(mockMollie.payments.get).not.toHaveBeenCalled();
    expect(mockPrisma.space.findUnique).not.toHaveBeenCalled();
  });
});
