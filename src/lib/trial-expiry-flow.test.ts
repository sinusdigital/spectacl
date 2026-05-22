/**
 * Integration flow: trial expiry → lockdown → upgrade
 *
 * Simulates the full lifecycle of a trial space:
 *   1. Space is TRIALING with running prompts
 *   2. trialEndsAt passes (fake timers)
 *   3. scheduler.processExpiredTrials() locks the space + pauses prompts
 *   4. processDuePrompts() skips prompts for the now-INCOMPLETE space
 *   5. Mollie webhook (paid first payment) flips space to ACTIVE + resets credits
 *
 * Mocks the boundary modules (Prisma, Mollie, queue) and stitches the real
 * scheduler + webhook handlers together via Prisma's mock state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));
vi.mock('@/lib/analysis', () => ({
  createPendingAnalysisRecords: vi.fn().mockResolvedValue(['r1']),
}));
vi.mock('@/lib/queue/analysisQueue', () => ({
  analysisQueue: { add: vi.fn().mockResolvedValue({}) },
}));

// Plan limits + credit calc resolved directly so we can assert on them
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

// Invoice generation is fire-and-forget
const { createInvoiceMock } = vi.hoisted(() => ({ createInvoiceMock: vi.fn() }));
vi.mock('@/lib/billing/invoices', () => ({ createInvoice: createInvoiceMock }));

import { processExpiredTrials, processDuePrompts } from '@/lib/scheduler-job';
import { POST as webhookPOST } from '@/app/api/webhooks/mollie/route';

function webhookRequest(params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  return {
    text: async () => body,
    headers: { get: () => null },
  } as unknown as Parameters<typeof webhookPOST>[0];
}

describe('integration: trial expiry → lockdown → upgrade', () => {
  beforeEach(() => {
    mockReset();
    mollieMockReset();
    createInvoiceMock.mockReset();
    createInvoiceMock.mockResolvedValue({ invoiceId: 'inv-1', number: 'SPE-2026-0001' });
    vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
    vi.useFakeTimers();
    // T0: trial starts
    vi.setSystemTime(new Date('2026-04-01T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('expired trial is locked by processExpiredTrials and its prompts are paused', async () => {
    // T1: trial has ended
    vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));

    mockPrisma.space.findMany.mockResolvedValueOnce([{ id: 'space-1' }]);
    mockPrisma.space.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.prompt.updateMany.mockResolvedValueOnce({ count: 3 });

    const result = await processExpiredTrials();

    expect(result.locked).toBe(1);

    // Space locked (subscriptionStatus → INCOMPLETE)
    expect(mockPrisma.space.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['space-1'] } },
      data: { subscriptionStatus: 'INCOMPLETE' },
    });
    // All Running prompts paused
    expect(mockPrisma.prompt.updateMany).toHaveBeenCalledWith({
      where: { status: 'Running', entity: { spaceId: { in: ['space-1'] } } },
      data: { status: 'Paused' },
    });
  });

  it('scheduler skips prompts belonging to an expired trial space (auto-lock at tick time)', async () => {
    // T1: a scheduler tick hits an old TRIALING space whose trialEndsAt has passed
    vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));

    mockPrisma.prompt.findMany.mockResolvedValueOnce([
      {
        id: 'prompt-1',
        status: 'Running',
        frequency: 'Every24Hours',
        entity: { id: 'entity-1', spaceId: 'space-1' },
      },
    ]);
    mockPrisma.space.findMany.mockResolvedValueOnce([
      {
        id: 'space-1',
        subscriptionStatus: 'TRIALING',
        trialEndsAt: new Date('2026-04-15T00:00:00Z'), // Trial ended 5 days ago
        plan: 'STARTER',
        isLocked: false,
      },
    ]);
    mockPrisma.checkRun.create.mockResolvedValueOnce({ id: 'check-1' });
    mockPrisma.space.update.mockResolvedValueOnce({});
    mockPrisma.checkRun.update.mockResolvedValueOnce({});

    const result = await processDuePrompts();

    expect(result.success).toBe(true);
    expect(result.results[0]).toEqual({
      promptId: 'prompt-1',
      status: 'skipped',
      reason: 'trial_expired',
    });

    // Auto-lock triggered — subscriptionStatus set to INCOMPLETE
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: { subscriptionStatus: 'INCOMPLETE' },
    });
  });

  it('scheduler skips prompts for INCOMPLETE spaces (post-lock state)', async () => {
    vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));

    mockPrisma.prompt.findMany.mockResolvedValueOnce([
      {
        id: 'prompt-1',
        status: 'Running',
        frequency: 'Every24Hours',
        entity: { id: 'entity-1', spaceId: 'space-1' },
      },
    ]);
    mockPrisma.space.findMany.mockResolvedValueOnce([
      {
        id: 'space-1',
        subscriptionStatus: 'INCOMPLETE',
        trialEndsAt: new Date('2026-04-15T00:00:00Z'),
        plan: 'STARTER',
        isLocked: false,
      },
    ]);
    mockPrisma.checkRun.create.mockResolvedValueOnce({ id: 'check-1' });
    mockPrisma.checkRun.update.mockResolvedValueOnce({});

    const result = await processDuePrompts();

    expect(result.results[0]).toEqual({
      promptId: 'prompt-1',
      status: 'skipped',
      reason: 'space_locked',
    });
  });

  it('Mollie webhook upgrade path: INCOMPLETE → ACTIVE with credits reset after successful payment', async () => {
    vi.setSystemTime(new Date('2026-04-22T10:00:00Z'));

    // Mollie confirms the first payment
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_upgrade_1',
      status: 'paid',
      sequenceType: 'first',
      customerId: 'cst_1',
      subscriptionId: null,
      metadata: { spaceId: 'space-1', plan: 'PRO', userId: 'user-1', price: '99.00', netPrice: '99.00', taxType: 'STANDARD', taxRate: '0.21' },
      amount: { currency: 'EUR', value: '119.79' },
    });

    // Space was INCOMPLETE from the trial expiry sweep
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: null,
      mollieCustomerId: null,
      mollieSubscriptionId: null,
      subscriptionStatus: 'INCOMPLETE',
      currentPeriodEnd: null,
      plan: 'PRO',
    });
    // Idempotency claim succeeds
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.space.update.mockResolvedValue({});
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      spaceId: 'space-1',
      country: 'NL',
      vatIdValid: null,
    });

    // Mollie subscription creation succeeds
    mockMollie.customerSubscriptions.create.mockResolvedValue({
      id: 'sub_new_1',
      status: 'active',
    });

    const res = await webhookPOST(webhookRequest({ id: 'tr_upgrade_1' }));

    expect(res.status).toBe(200);

    // Subscription created
    expect(mockMollie.customerSubscriptions.create).toHaveBeenCalled();

    // Space status flipped to ACTIVE (in one of the updates)
    const updateCalls = mockPrisma.space.update.mock.calls;
    const statusUpdates = updateCalls.filter(([arg]) => {
      const data = (arg as { data?: Record<string, unknown> }).data;
      return data && data.subscriptionStatus === 'ACTIVE';
    });
    expect(statusUpdates.length).toBeGreaterThan(0);

    // Credits reset (llmCreditsRemaining set to a positive number)
    const creditUpdates = updateCalls.filter(([arg]) => {
      const data = (arg as { data?: Record<string, unknown> }).data;
      return data && typeof data.llmCreditsRemaining === 'number' && (data.llmCreditsRemaining as number) > 0;
    });
    expect(creditUpdates.length).toBeGreaterThan(0);
  });
});
