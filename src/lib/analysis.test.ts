import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGenerate = vi.fn();
const mockSchedule = vi.fn((fn: () => unknown) => fn());

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/llm/factory', () => ({
  createLLMProvider: vi.fn(() => ({ generate: mockGenerate })),
}));

vi.mock('./spaces', () => ({
  getSpaceModelConfigs: vi.fn(),
}));

vi.mock('@/lib/parsers', () => ({
  runAnalysisParsers: vi.fn(),
}));

vi.mock('@/lib/parsers/positions', () => ({
  calculatePositions: vi.fn(),
}));

vi.mock('./suggestions', () => ({
  processBrandSuggestions: vi.fn(),
}));

vi.mock('./sourceStats', () => ({
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

vi.mock('@/lib/settings', () => ({
  SystemSettings: {
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/internal-models', () => ({
  getInternalTaskModel: vi.fn().mockResolvedValue({
    taskKey: 'ranking',
    provider: 'openai',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    maxOutputTokens: 4000,
    apiKey: 'sk-test-key',
  }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { createPendingAnalysisRecords, executeAnalysisJob, rescanEntityAnswers } from './analysis';
import { getSpaceModelConfigs } from './spaces';
import { runAnalysisParsers } from '@/lib/parsers';
import { calculatePositions } from '@/lib/parsers/positions';
import { processBrandSuggestions } from './suggestions';
import { updateEntityMetrics, updatePromptMetrics } from '@/lib/metrics';
import { SystemSettings } from '@/lib/settings';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MODEL_CONFIG = {
  id: 'config-1',
  modelId: 'gpt-4o',
  name: 'GPT-4o',
  provider: 'openai',
  isEnabled: true,
  hasApiKey: true,
  apiKey: 'sk-test-key',
};

const MODEL_CONFIG_2 = {
  id: 'config-2',
  modelId: 'claude-3-opus',
  name: 'Claude 3 Opus',
  provider: 'anthropic',
  isEnabled: true,
  hasApiKey: true,
  apiKey: 'sk-ant-test',
};

const DISABLED_CONFIG = {
  id: 'config-3',
  modelId: 'gemini-pro',
  name: 'Gemini Pro',
  provider: 'google',
  isEnabled: false,
  hasApiKey: true,
  apiKey: 'gcp-key',
};

const NO_KEY_CONFIG = {
  id: 'config-4',
  modelId: 'mistral-large',
  name: 'Mistral Large',
  provider: 'mistral',
  isEnabled: true,
  hasApiKey: false,
  apiKey: null,
};

function makePrompt(overrides = {}) {
  return {
    id: 'prompt-1',
    text: 'What is the best CRM?',
    llms: [],
    intent: 'General',
    language: null,
    entity: {
      id: 'entity-1',
      name: 'Salesforce',
      aliases: ['SFDC'],
      spaceId: 'space-1',
      competitors: [
        { id: 'comp-1', name: 'HubSpot', aliases: ['HS'] },
        { id: 'comp-2', name: 'Pipedrive', aliases: [] },
      ],
    },
    ...overrides,
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockReset();
  vi.clearAllMocks();
  (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
    configs: [MODEL_CONFIG, MODEL_CONFIG_2],
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// createPendingAnalysisRecords (Stage 1)
// ═════════════════════════════════════════════════════════════════════════════

describe('createPendingAnalysisRecords', () => {
  it('throws when prompt is not found', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(null);

    await expect(createPendingAnalysisRecords('bad-id')).rejects.toThrow('Prompt not found');
  });

  it('throws when entity has no space', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(
      makePrompt({ entity: { id: 'e-1', name: 'X', spaceId: null } })
    );

    await expect(createPendingAnalysisRecords('prompt-1')).rejects.toThrow(
      'Entity must belong to a space'
    );
  });

  it('creates pending records for each enabled model with an API key', async () => {
    const prompt = makePrompt();
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create
      .mockResolvedValueOnce({ id: 'result-1' })
      .mockResolvedValueOnce({ id: 'result-2' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toEqual(['result-1', 'result-2']);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          llmModel: 'GPT-4o',
          status: 'pending',
          checkRunId: 'check-1',
        }),
      })
    );
  });

  it('filters out disabled models and models without API keys', async () => {
    (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
      configs: [MODEL_CONFIG, DISABLED_CONFIG, NO_KEY_CONFIG],
    });

    const prompt = makePrompt();
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'result-1' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    // Only MODEL_CONFIG passes both isEnabled && hasApiKey
    expect(ids).toEqual(['result-1']);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledTimes(1);
  });

  it('uses existing checkRunId when provided', async () => {
    const prompt = makePrompt();
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.analysisResult.create
      .mockResolvedValueOnce({ id: 'r-1' })
      .mockResolvedValueOnce({ id: 'r-2' });

    await createPendingAnalysisRecords('prompt-1', 'existing-check-run');

    // Should NOT create a new checkRun
    expect(mockPrisma.checkRun.create).not.toHaveBeenCalled();
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ checkRunId: 'existing-check-run' }),
      })
    );
  });

  it('creates a new checkRun when none is provided', async () => {
    const prompt = makePrompt();
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'new-check' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'r-1' });

    await createPendingAnalysisRecords('prompt-1');

    expect(mockPrisma.checkRun.create).toHaveBeenCalledOnce();
  });

  // ── Model targeting (prompt.llms) ────────────────────────────────────────

  it('targets only models listed in prompt.llms by id', async () => {
    const prompt = makePrompt({ llms: ['config-1'] });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'r-1' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toHaveLength(1);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ llmModel: 'GPT-4o' }),
      })
    );
  });

  it('targets models by modelId', async () => {
    const prompt = makePrompt({ llms: ['claude-3-opus'] });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'r-1' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toHaveLength(1);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ llmModel: 'Claude 3 Opus' }),
      })
    );
  });

  it('targets models by display name', async () => {
    const prompt = makePrompt({ llms: ['GPT-4o'] });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'r-1' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toHaveLength(1);
  });

  it('falls back to all enabled configs when prompt.llms matches nothing', async () => {
    const prompt = makePrompt({ llms: ['nonexistent-model'] });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create
      .mockResolvedValueOnce({ id: 'r-1' })
      .mockResolvedValueOnce({ id: 'r-2' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    // Should fall back to both MODEL_CONFIG and MODEL_CONFIG_2
    expect(ids).toHaveLength(2);
  });

  it('MANAGED mode fans out across all enabled configs, ignoring stale prompt.llms', async () => {
    (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
      llmProvider: 'MANAGED',
      configs: [MODEL_CONFIG, MODEL_CONFIG_2],
    });

    // Prompt was created when only Mistral was enabled; llms is frozen to a now-missing id.
    const prompt = makePrompt({ llms: ['mistral-large'] });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create
      .mockResolvedValueOnce({ id: 'r-1' })
      .mockResolvedValueOnce({ id: 'r-2' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toHaveLength(2);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledTimes(2);
  });

  it('Competitor Analysis prompts pin to the configured internal ranking model regardless of prompt.llms', async () => {
    (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
      llmProvider: 'MANAGED',
      configs: [MODEL_CONFIG, MODEL_CONFIG_2],
    });

    // prompt.llms is stale — ranking branch should ignore it and pin to InternalTaskModel('ranking')
    // which the test mock resolves to GPT-4o.
    const prompt = makePrompt({ intent: 'Competitor Analysis', llms: ['claude-3-opus'] });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.prompt.update.mockResolvedValue({ ...prompt, llms: ['gpt-4o'] });
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'r-1' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toHaveLength(1);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ llmModel: 'GPT-4o', llmProvider: 'openai' }),
      })
    );
    // Pin update should overwrite stale prompt.llms with the internal ranking model id
    expect(mockPrisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prompt-1' },
        data: { llms: ['gpt-4o'] },
      })
    );
  });

  it('creates a failure record and returns empty array when no models available', async () => {
    (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
      configs: [DISABLED_CONFIG, NO_KEY_CONFIG],
    });

    const prompt = makePrompt();
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.analysisResult.create.mockResolvedValue({ id: 'fail-1' });

    const ids = await createPendingAnalysisRecords('prompt-1');

    expect(ids).toEqual([]);
    expect(mockPrisma.analysisResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          llmModel: 'System',
          errorMessage: 'No active models configured.',
        }),
      })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// executeAnalysisJob (Stage 2)
// ═════════════════════════════════════════════════════════════════════════════

describe('executeAnalysisJob', () => {
  function setupExecutionMocks(overrides: {
    credits?: number;
    allowNegative?: string | null;
    intent?: string;
    language?: string | null;
    llmResponse?: string;
    mentioned?: boolean;
  } = {}) {
    const {
      credits = 100,
      allowNegative = null,
      intent = 'General',
      language = null,
      llmResponse = 'Salesforce is a leading CRM platform. HubSpot is also popular.',
      mentioned = true,
    } = overrides;

    const prompt = makePrompt({ intent, language });
    mockPrisma.prompt.findUnique.mockResolvedValue(prompt);
    mockPrisma.space.findUnique.mockResolvedValue({ llmCreditsRemaining: credits });
    mockPrisma.globalModel.findMany.mockResolvedValue([
      { modelId: 'gpt-4o', maxOutputTokens: 2000 },
      { modelId: 'claude-3-opus', maxOutputTokens: 4000 },
    ]);
    mockPrisma.analysisResult.findMany.mockResolvedValue([
      { id: 'result-1', llmModel: 'GPT-4o' },
    ]);
    mockPrisma.analysisResult.update.mockResolvedValue({});
    mockPrisma.space.update.mockResolvedValue({});
    mockPrisma.space.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.prompt.update.mockResolvedValue({});

    // Re-wire getSpaceModelConfigs for Stage 2 (includes disabled)
    (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
      configs: [MODEL_CONFIG, MODEL_CONFIG_2, DISABLED_CONFIG],
    });

    mockGenerate.mockResolvedValue({ text: llmResponse });

    (runAnalysisParsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      mentioned,
      mentions: mentioned
        ? [{ isPrimaryEntity: true, detectedName: 'Salesforce', competitorId: null }]
        : [],
    });

    (calculatePositions as ReturnType<typeof vi.fn>).mockReturnValue(
      new Map([
        ['salesforce', 1],
        ['sfdc', 1],
        ['hubspot', 2],
      ])
    );

    (SystemSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(allowNegative);

    // Post-analysis: no successful results for suggestions by default
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'result-1', llmModel: 'GPT-4o' }])  // resultsToProcess
      .mockResolvedValueOnce([]);  // freshResults for suggestions
  }

  it('throws when prompt is not found', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(null);

    await expect(executeAnalysisJob('bad-id', ['r-1'])).rejects.toThrow(
      'Prompt not found during execution'
    );
  });

  it('throws when entity has no space', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(
      makePrompt({ entity: { id: 'e-1', name: 'X', spaceId: null, competitors: [] } })
    );

    await expect(executeAnalysisJob('prompt-1', ['r-1'])).rejects.toThrow(
      'Entity must belong to a space'
    );
  });

  it('throws when space is not found', async () => {
    mockPrisma.prompt.findUnique.mockResolvedValue(makePrompt());
    mockPrisma.space.findUnique.mockResolvedValue(null);

    await expect(executeAnalysisJob('prompt-1', ['r-1'])).rejects.toThrow(
      'Space space-1 not found'
    );
  });

  // ── Credit deduction ─────────────────────────────────────────────────────

  it('deducts 1 credit via atomic updateMany in strict mode', async () => {
    setupExecutionMocks({ credits: 10 });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockPrisma.space.updateMany).toHaveBeenCalledWith({
      where: { id: 'space-1', llmCreditsRemaining: { gt: 0 } },
      data: {
        llmCreditsRemaining: { decrement: 1 },
        llmCreditsUsed: { increment: 1 },
      },
    });
    // Should NOT use the non-atomic update
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('deducts via non-atomic update when allowNegativeCredits is enabled', async () => {
    setupExecutionMocks({ credits: 10, allowNegative: 'true' });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: {
        llmCreditsRemaining: { decrement: 1 },
        llmCreditsUsed: { increment: 1 },
      },
    });
    // Should NOT use the atomic updateMany
    expect(mockPrisma.space.updateMany).not.toHaveBeenCalled();
  });

  it('skips credit deduction for unlimited spaces (credits = -1)', async () => {
    setupExecutionMocks({ credits: -1 });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockPrisma.space.update).not.toHaveBeenCalled();
    expect(mockPrisma.space.updateMany).not.toHaveBeenCalled();
  });

  it('does not check allowNegativeCredits for unlimited spaces', async () => {
    setupExecutionMocks({ credits: -1 });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(SystemSettings.get).not.toHaveBeenCalledWith('allow_negative_credits');
  });

  // ── Credit exhaustion guard ──────────────────────────────────────────────

  it('fails the record when credits reach 0 before LLM call', async () => {
    setupExecutionMocks({ credits: 5 });
    // First findUnique returns 5 credits (setup), second returns 0 (exhaustion guard)
    mockPrisma.space.findUnique
      .mockResolvedValueOnce({ llmCreditsRemaining: 5 })
      .mockResolvedValueOnce({ llmCreditsRemaining: 0 });

    await executeAnalysisJob('prompt-1', ['result-1']);

    // The LLM should NOT have been called
    expect(mockGenerate).not.toHaveBeenCalled();
    // Should mark as failed
    expect(mockPrisma.analysisResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('Credit limit reached'),
        }),
      })
    );
  });

  it('skips credit exhaustion guard when allowNegativeCredits is true', async () => {
    setupExecutionMocks({ credits: 0, allowNegative: 'true' });
    // With allowNegative, no second credit check happens — LLM is called
    mockPrisma.space.findUnique.mockResolvedValue({ llmCreditsRemaining: 0 });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockGenerate).toHaveBeenCalled();
  });

  it('skips credit exhaustion guard for unlimited spaces', async () => {
    setupExecutionMocks({ credits: -1 });

    await executeAnalysisJob('prompt-1', ['result-1']);

    // Only the initial findUnique call — no guard check
    expect(mockPrisma.space.findUnique).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalled();
  });

  // ── LLM execution ───────────────────────────────────────────────────────

  it('appends language context to prompt text when language is set', async () => {
    setupExecutionMocks({ language: 'Dutch' });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockGenerate).toHaveBeenCalledWith(
      'What is the best CRM?\n\nContext: Answer from the perspective of the Dutch market.'
    );
  });

  it('sends raw prompt text when no language is set', async () => {
    setupExecutionMocks({ language: null });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockGenerate).toHaveBeenCalledWith('What is the best CRM?');
  });

  it('uses higher maxOutputTokens (4096) for Competitor Analysis intent', async () => {
    setupExecutionMocks({ intent: 'Competitor Analysis' });
    const { createLLMProvider } = await import('@/lib/llm/factory');

    await executeAnalysisJob('prompt-1', ['result-1']);

    // GPT-4o has 2000 base tokens, but Competitor Analysis bumps to max(2000, 4096) = 4096
    expect(createLLMProvider).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'GPT-4o' }),
      'sk-test-key',
      4096
    );
  });

  it('uses base maxOutputTokens for non-ranking intents', async () => {
    setupExecutionMocks({ intent: 'General' });
    const { createLLMProvider } = await import('@/lib/llm/factory');

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(createLLMProvider).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'GPT-4o' }),
      'sk-test-key',
      2000
    );
  });

  it('defaults to 1500 maxOutputTokens when model is not in GlobalModel registry', async () => {
    setupExecutionMocks();
    mockPrisma.globalModel.findMany.mockResolvedValue([]); // No global models found
    const { createLLMProvider } = await import('@/lib/llm/factory');

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(createLLMProvider).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      1500
    );
  });

  // ── Result saving ────────────────────────────────────────────────────────

  it('saves success result with mentions, positions, and links', async () => {
    setupExecutionMocks({
      llmResponse: 'Salesforce is great. Visit https://salesforce.com for more.',
    });

    await executeAnalysisJob('prompt-1', ['result-1']);

    // Find the final update call (status: 'success')
    const successCall = mockPrisma.analysisResult.update.mock.calls.find(
      (call: unknown[]) => (call[0] as { data: { status?: string } }).data.status === 'success'
    );
    expect(successCall).toBeDefined();

    const data = successCall![0].data;
    expect(data.status).toBe('success');
    expect(data.mentioned).toBe(true);
    expect(data.position).toBe(1); // Salesforce at position 1
    expect(data.progressStep).toBeNull();
    expect(data.mentions.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isPrimaryEntity: true, detectedName: 'Salesforce' }),
      ])
    );
    expect(data.links.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://salesforce.com', domain: 'salesforce.com' }),
      ])
    );
  });

  it('deduplicates links by URL', async () => {
    setupExecutionMocks({
      llmResponse: 'See https://example.com and also https://example.com for details.',
    });

    await executeAnalysisJob('prompt-1', ['result-1']);

    const successCall = mockPrisma.analysisResult.update.mock.calls.find(
      (call: unknown[]) => (call[0] as { data: { status?: string } }).data.status === 'success'
    );
    const links = successCall![0].data.links.create;
    expect(links).toHaveLength(1);
  });

  it('strips www. from link domains', async () => {
    setupExecutionMocks({
      llmResponse: 'Check https://www.hubspot.com for more info.',
    });

    await executeAnalysisJob('prompt-1', ['result-1']);

    const successCall = mockPrisma.analysisResult.update.mock.calls.find(
      (call: unknown[]) => (call[0] as { data: { status?: string } }).data.status === 'success'
    );
    const links = successCall![0].data.links.create;
    expect(links[0].domain).toBe('hubspot.com');
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it('marks record as failed when config is not found for model name', async () => {
    setupExecutionMocks();
    // Reset and re-wire findMany to return a result referencing a nonexistent model
    mockPrisma.analysisResult.findMany.mockReset();
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'result-1', llmModel: 'Nonexistent Model' }])
      .mockResolvedValueOnce([]);

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockPrisma.analysisResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'result-1' },
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('Configuration for "Nonexistent Model" not found'),
        }),
      })
    );
  });

  it('marks record as failed when config has no API key', async () => {
    setupExecutionMocks();
    // Override configs to include a model without an API key
    (getSpaceModelConfigs as ReturnType<typeof vi.fn>).mockResolvedValue({
      configs: [{ ...MODEL_CONFIG, apiKey: null }],
    });

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockPrisma.analysisResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('No API key'),
        }),
      })
    );
  });

  it('marks record as failed when LLM throws an error', async () => {
    setupExecutionMocks();
    mockGenerate.mockRejectedValue(new Error('API rate limit exceeded'));

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(mockPrisma.analysisResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'API rate limit exceeded',
        }),
      })
    );
  });

  it('still updates lastRunAt and metrics even when individual records fail', async () => {
    setupExecutionMocks();
    mockGenerate.mockRejectedValue(new Error('LLM down'));

    await executeAnalysisJob('prompt-1', ['result-1']);

    // Post-analysis tasks should still run
    expect(mockPrisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prompt-1' },
        data: expect.objectContaining({ lastRunAt: expect.any(Date) }),
      })
    );
    expect(updateEntityMetrics).toHaveBeenCalledWith('entity-1');
    expect(updatePromptMetrics).toHaveBeenCalledWith('prompt-1');
  });

  // ── Post-analysis: suggestions ───────────────────────────────────────────

  it('calls processBrandSuggestions when there are successful responses', async () => {
    setupExecutionMocks();
    // Reset and re-wire findMany to return successful results for suggestions
    mockPrisma.analysisResult.findMany.mockReset();
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'result-1', llmModel: 'GPT-4o' }])  // resultsToProcess
      .mockResolvedValueOnce([{ id: 'result-1', response: 'Salesforce is great', status: 'success' }]);

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(processBrandSuggestions).toHaveBeenCalledWith(
      'entity-1',
      'Salesforce',
      [{ analysisResultId: 'result-1', response: 'Salesforce is great' }]
    );
  });

  it('skips processBrandSuggestions when no successful results', async () => {
    setupExecutionMocks();
    mockGenerate.mockRejectedValue(new Error('fail'));
    // Reset and re-wire findMany for this specific scenario
    mockPrisma.analysisResult.findMany.mockReset();
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce([{ id: 'result-1', llmModel: 'GPT-4o' }])
      .mockResolvedValueOnce([]);  // No successful results

    await executeAnalysisJob('prompt-1', ['result-1']);

    expect(processBrandSuggestions).not.toHaveBeenCalled();
  });

  // ── Progress tracking ────────────────────────────────────────────────────

  it('updates progress steps through the lifecycle', async () => {
    setupExecutionMocks();

    await executeAnalysisJob('prompt-1', ['result-1']);

    const updateCalls = mockPrisma.analysisResult.update.mock.calls.map(
      (c: unknown[]) => (c[0] as { data: { progressStep?: string; status?: string } }).data
    );

    const progressSteps = updateCalls
      .filter((d: { progressStep?: string }) => d.progressStep !== undefined)
      .map((d: { progressStep?: string }) => d.progressStep);

    expect(progressSteps).toContain('Initializing...');
    expect(progressSteps).toContain('Waiting for GPT-4o...');
    expect(progressSteps).toContain('Analyzing response...');
    expect(progressSteps).toContain('Saving results...');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// rescanEntityAnswers
// ═════════════════════════════════════════════════════════════════════════════

describe('rescanEntityAnswers', () => {
  it('throws when entity is not found', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue(null);

    await expect(rescanEntityAnswers('bad-id')).rejects.toThrow('Entity not found');
  });

  it('re-parses all successful results and updates mentions in a transaction', async () => {
    const entity = {
      id: 'entity-1',
      name: 'Salesforce',
      aliases: ['SFDC'],
      competitors: [{ id: 'comp-1', name: 'HubSpot', aliases: [] }],
    };

    mockPrisma.entity.findUnique.mockResolvedValue(entity);
    mockPrisma.analysisResult.findMany.mockResolvedValue([
      { id: 'result-1', response: 'Salesforce and HubSpot are CRM leaders.', mentions: [] },
    ]);
    mockPrisma.prompt.findMany.mockResolvedValue([{ id: 'prompt-1' }]);

    (runAnalysisParsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      mentioned: true,
      mentions: [
        { isPrimaryEntity: true, detectedName: 'Salesforce', competitorId: null },
        { isPrimaryEntity: false, detectedName: 'HubSpot', competitorId: 'comp-1' },
      ],
    });

    (calculatePositions as ReturnType<typeof vi.fn>).mockReturnValue(
      new Map([
        ['salesforce', 1],
        ['sfdc', 1],
        ['hubspot', 2],
      ])
    );

    await rescanEntityAnswers('entity-1');

    // Transaction should delete old mentions and create new ones
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.analysisMention.deleteMany).toHaveBeenCalledWith({
      where: { analysisResultId: 'result-1', suggestedCompetitorId: null },
    });
    expect(mockPrisma.analysisResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'result-1' },
        data: expect.objectContaining({
          mentioned: true,
          position: 1,
          mentions: {
            create: expect.arrayContaining([
              expect.objectContaining({ isPrimaryEntity: true, detectedName: 'Salesforce', position: 1 }),
              expect.objectContaining({ isPrimaryEntity: false, detectedName: 'HubSpot', competitorId: 'comp-1', position: 2 }),
            ]),
          },
        }),
      })
    );
  });

  it('updates entity metrics and all prompt metrics after rescan', async () => {
    const entity = {
      id: 'entity-1',
      name: 'Salesforce',
      aliases: [],
      competitors: [],
    };

    mockPrisma.entity.findUnique.mockResolvedValue(entity);
    mockPrisma.analysisResult.findMany.mockResolvedValue([]);
    mockPrisma.prompt.findMany.mockResolvedValue([
      { id: 'prompt-1' },
      { id: 'prompt-2' },
    ]);

    await rescanEntityAnswers('entity-1');

    expect(updateEntityMetrics).toHaveBeenCalledWith('entity-1');
    expect(updatePromptMetrics).toHaveBeenCalledWith('prompt-1');
    expect(updatePromptMetrics).toHaveBeenCalledWith('prompt-2');
  });

  it('continues processing remaining results when one fails', async () => {
    const entity = {
      id: 'entity-1',
      name: 'Salesforce',
      aliases: [],
      competitors: [],
    };

    mockPrisma.entity.findUnique.mockResolvedValue(entity);
    mockPrisma.analysisResult.findMany.mockResolvedValue([
      { id: 'result-1', response: 'First response', mentions: [] },
      { id: 'result-2', response: 'Second response', mentions: [] },
    ]);
    mockPrisma.prompt.findMany.mockResolvedValue([]);

    (runAnalysisParsers as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Parser crashed'))
      .mockResolvedValueOnce({ mentioned: false, mentions: [] });

    (calculatePositions as ReturnType<typeof vi.fn>).mockReturnValue(new Map());

    await rescanEntityAnswers('entity-1');

    // Should still process result-2 and update metrics
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1); // Only for result-2
    expect(updateEntityMetrics).toHaveBeenCalled();
  });

  it('handles entity with no successful results gracefully', async () => {
    const entity = {
      id: 'entity-1',
      name: 'Salesforce',
      aliases: [],
      competitors: [],
    };

    mockPrisma.entity.findUnique.mockResolvedValue(entity);
    mockPrisma.analysisResult.findMany.mockResolvedValue([]);
    mockPrisma.prompt.findMany.mockResolvedValue([]);

    await rescanEntityAnswers('entity-1');

    // Should not throw, just update metrics
    expect(updateEntityMetrics).toHaveBeenCalledWith('entity-1');
  });
});
