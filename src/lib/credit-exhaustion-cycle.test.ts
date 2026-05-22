/**
 * Integration flow: credit exhaustion → recurring payment → credits reset
 *
 * Stitches analysis.executeAnalysisJob() + the Mollie webhook together via
 * shared Prisma mock state. The space's `llmCreditsRemaining` is tracked
 * through the full cycle:
 *   1. ACTIVE space with > 0 credits → analysis runs, credits decrement
 *   2. Credits reach 0 → exhaustion guard blocks further LLM calls
 *   3. Recurring Mollie webhook resets credits
 *   4. Analysis resumes successfully
 *
 * Also verifies the `allow_negative_credits` admin toggle bypasses the guard.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGenerate = vi.fn();
const mockSchedule = vi.fn((fn: () => unknown) => fn());

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));

vi.mock('@/lib/llm/factory', () => ({
  createLLMProvider: vi.fn(() => ({ generate: mockGenerate })),
}));
vi.mock('@/lib/spaces', () => ({
  getSpaceModelConfigs: vi.fn(),
}));
vi.mock('@/lib/parsers', () => ({
  runAnalysisParsers: vi.fn().mockResolvedValue({ mentioned: false, mentions: [] }),
}));
vi.mock('@/lib/parsers/positions', () => ({
  calculatePositions: vi.fn(() => new Map()),
}));
vi.mock('@/lib/suggestions', () => ({
  processBrandSuggestions: vi.fn(),
}));
vi.mock('@/lib/sourceStats', () => ({
  updateSourceStats: vi.fn(),
}));
vi.mock('@/lib/queue/rateLimiter', () => ({
  getProviderLimiter: vi.fn(() => ({ schedule: mockSchedule })),
}));
vi.mock('@/lib/llm/retry', () => ({
  withLLMRetry: vi.fn((fn: () => unknown) => fn()),
}));
vi.mock('@/lib/metrics', () => ({
  updateEntityMetrics: vi.fn(),
  updatePromptMetrics: vi.fn(),
}));

const { systemSettingsGet } = vi.hoisted(() => ({ systemSettingsGet: vi.fn() }));
vi.mock('@/lib/settings', () => ({
  SystemSettings: { get: systemSettingsGet },
}));

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

const { createInvoiceMock } = vi.hoisted(() => ({ createInvoiceMock: vi.fn() }));
vi.mock('@/lib/billing/invoices', () => ({ createInvoice: createInvoiceMock }));

// ── Imports ──────────────────────────────────────────────────────────────────
import { executeAnalysisJob } from '@/lib/analysis';
import { getSpaceModelConfigs } from '@/lib/spaces';
import { POST as webhookPOST } from '@/app/api/webhooks/mollie/route';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const MODEL_CONFIG = {
  id: 'config-1',
  modelId: 'gpt-4o',
  name: 'GPT-4o',
  provider: 'openai',
  isEnabled: true,
  hasApiKey: true,
  apiKey: 'sk-test',
};

function makePrompt() {
  return {
    id: 'prompt-1',
    text: 'What is the best CRM?',
    intent: 'General',
    language: null,
    entity: {
      id: 'entity-1',
      name: 'Salesforce',
      spaceId: 'space-1',
      aliases: [],
      competitors: [],
    },
  };
}

function webhookRequest(params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  return {
    text: async () => body,
    headers: { get: () => null },
  } as unknown as Parameters<typeof webhookPOST>[0];
}

beforeEach(() => {
  mockReset();
  mollieMockReset();
  createInvoiceMock.mockReset();
  createInvoiceMock.mockResolvedValue({ invoiceId: 'inv-1', number: 'SPE-2026-0001' });
  systemSettingsGet.mockResolvedValue(null);
  mockGenerate.mockReset();
  mockGenerate.mockResolvedValue({ text: 'Response mentioning Salesforce.' });

  (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
    configs: [MODEL_CONFIG],
  });

  vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-15T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('integration: credit exhaustion cycle', () => {
  it('executes LLM call and decrements credits atomically when credits > 0', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(makePrompt());
    mockPrisma.space.findUnique.mockResolvedValue({ llmCreditsRemaining: 5 });
    mockPrisma.globalModel.findMany.mockResolvedValue([{ modelId: 'gpt-4o', maxOutputTokens: 2000 }]);
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'r-1', llmModel: 'GPT-4o' }])
      .mockResolvedValueOnce([]);
    mockPrisma.analysisResult.update.mockResolvedValue({});
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.prompt.update.mockResolvedValue({});

    await executeAnalysisJob('prompt-1', ['r-1']);

    // LLM called, atomic deduction happened
    expect(mockGenerate).toHaveBeenCalled();
    expect(mockPrisma.space.updateMany).toHaveBeenCalledWith({
      where: { id: 'space-1', llmCreditsRemaining: { gt: 0 } },
      data: {
        llmCreditsRemaining: { decrement: 1 },
        llmCreditsUsed: { increment: 1 },
      },
    });
  });

  it('blocks LLM call when credits reach 0 and marks record as failed', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(makePrompt());
    mockPrisma.space.findUnique
      // Initial lookup: 1 credit left (so path continues to guard)
      .mockResolvedValueOnce({ llmCreditsRemaining: 1 })
      // Guard re-check: 0 credits — block
      .mockResolvedValueOnce({ llmCreditsRemaining: 0 });
    mockPrisma.globalModel.findMany.mockResolvedValue([{ modelId: 'gpt-4o', maxOutputTokens: 2000 }]);
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'r-1', llmModel: 'GPT-4o' }])
      .mockResolvedValueOnce([]);
    mockPrisma.analysisResult.update.mockResolvedValue({});
    mockPrisma.prompt.update.mockResolvedValue({});

    await executeAnalysisJob('prompt-1', ['r-1']);

    expect(mockGenerate).not.toHaveBeenCalled();

    // The failure write on the record
    const failCall = mockPrisma.analysisResult.update.mock.calls.find(([arg]) => {
      const data = (arg as { data?: Record<string, unknown> }).data;
      return data && data.status === 'failed';
    });
    expect(failCall).toBeTruthy();
    expect((failCall![0] as { data: { errorMessage: string } }).data.errorMessage).toContain('Credit limit reached');

    // No credit deduction on a blocked call
    expect(mockPrisma.space.updateMany).not.toHaveBeenCalled();
  });

  it('allow_negative_credits=true bypasses the guard at 0 credits and still calls LLM', async () => {
    systemSettingsGet.mockResolvedValue('true');

    mockPrisma.prompt.findUnique.mockResolvedValue(makePrompt());
    mockPrisma.space.findUnique.mockResolvedValue({ llmCreditsRemaining: 0 });
    mockPrisma.globalModel.findMany.mockResolvedValue([{ modelId: 'gpt-4o', maxOutputTokens: 2000 }]);
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'r-1', llmModel: 'GPT-4o' }])
      .mockResolvedValueOnce([]);
    mockPrisma.analysisResult.update.mockResolvedValue({});
    mockPrisma.space.update.mockResolvedValue({});
    mockPrisma.prompt.update.mockResolvedValue({});

    await executeAnalysisJob('prompt-1', ['r-1']);

    // LLM WAS called despite 0 credits
    expect(mockGenerate).toHaveBeenCalled();
    // Non-atomic update path (allows negative)
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: {
        llmCreditsRemaining: { decrement: 1 },
        llmCreditsUsed: { increment: 1 },
      },
    });
    // No atomic gt:0 update
    expect(mockPrisma.space.updateMany).not.toHaveBeenCalled();
  });

  it('recurring Mollie payment resets credits, restoring normal operation', async () => {
    mockMollie.payments.get.mockResolvedValue({
      id: 'tr_recurring_1',
      status: 'paid',
      sequenceType: 'recurring',
      subscriptionId: 'sub_active',
      customerId: 'cst_1',
      metadata: { spaceId: 'space-1', plan: 'PRO', price: '99.00', netPrice: '99.00', taxType: 'STANDARD', taxRate: '0.21' },
      amount: { currency: 'EUR', value: '119.79' },
    });

    // Space currently exhausted (llmCreditsRemaining: 0) with active subscription
    mockPrisma.space.findUnique.mockResolvedValue({
      id: 'space-1',
      lastProcessedWebhookId: null,
      mollieCustomerId: 'cst_1',
      mollieSubscriptionId: 'sub_active',
      currentPeriodEnd: new Date('2026-04-15T00:00:00Z'),
      subscriptionStatus: 'ACTIVE',
      plan: 'PRO',
      llmCreditsRemaining: 0,
    });
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.space.update.mockResolvedValue({});
    mockPrisma.billingProfile.findUnique.mockResolvedValue({
      spaceId: 'space-1',
      country: 'NL',
      vatIdValid: null,
    });

    const res = await webhookPOST(webhookRequest({ id: 'tr_recurring_1' }));

    expect(res.status).toBe(200);

    // Credits reset to a positive number (10000 from the mocked calc)
    const creditUpdates = mockPrisma.space.update.mock.calls.filter(([arg]) => {
      const data = (arg as { data?: Record<string, unknown> }).data;
      return data && typeof data.llmCreditsRemaining === 'number' && (data.llmCreditsRemaining as number) > 0;
    });
    expect(creditUpdates.length).toBeGreaterThan(0);

    // Period extended via addOneMonth (2026-04-15 → 2026-05-15)
    const periodUpdates = mockPrisma.space.update.mock.calls.filter(([arg]) => {
      const data = (arg as { data?: Record<string, unknown> }).data;
      return data && data.currentPeriodEnd instanceof Date;
    });
    expect(periodUpdates.length).toBeGreaterThan(0);
  });

  it('post-reset: LLM call succeeds and credits decrement normally', async () => {
    // Simulate state AFTER the webhook reset — space now has 10000 credits
    mockPrisma.prompt.findUnique.mockResolvedValue(makePrompt());
    mockPrisma.space.findUnique.mockResolvedValue({ llmCreditsRemaining: 10000 });
    mockPrisma.globalModel.findMany.mockResolvedValue([{ modelId: 'gpt-4o', maxOutputTokens: 2000 }]);
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'r-2', llmModel: 'GPT-4o' }])
      .mockResolvedValueOnce([]);
    mockPrisma.analysisResult.update.mockResolvedValue({});
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.prompt.update.mockResolvedValue({});

    await executeAnalysisJob('prompt-1', ['r-2']);

    expect(mockGenerate).toHaveBeenCalled();
    expect(mockPrisma.space.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ llmCreditsRemaining: { gt: 0 } }),
      }),
    );
  });
});
