import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

// Mock dependencies before importing the module under test
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/analysis', () => ({
  createPendingAnalysisRecords: vi.fn().mockResolvedValue(['result-1', 'result-2']),
}));
vi.mock('@/lib/queue/analysisQueue', () => ({
  analysisQueue: { add: vi.fn().mockResolvedValue({}) },
}));

import { processDuePrompts } from './scheduler-job';
import { createPendingAnalysisRecords } from '@/lib/analysis';
import { analysisQueue } from '@/lib/queue/analysisQueue';

beforeEach(() => {
  mockReset();
  vi.clearAllMocks();
});

describe('processDuePrompts', () => {
  it('returns early when no prompts are due', async () => {
    mockPrisma.prompt.findMany.mockResolvedValue([]);

    const result = await processDuePrompts();

    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('enqueues due prompts with batch priority', async () => {
    const duePrompt = {
      id: 'prompt-1',
      status: 'Running',
      frequency: 'Every24Hours',
      entity: { id: 'entity-1', spaceId: 'space-1' },
    };

    mockPrisma.prompt.findMany.mockResolvedValue([duePrompt]);
    mockPrisma.space.findMany.mockResolvedValue([{
      id: 'space-1',
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: null,
      plan: 'PRO',
      isLocked: false,
    }]);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.prompt.update.mockResolvedValue({});
    mockPrisma.checkRun.update.mockResolvedValue({});

    const result = await processDuePrompts();

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(createPendingAnalysisRecords).toHaveBeenCalledWith('prompt-1', 'check-1');
    expect(analysisQueue.add).toHaveBeenCalledWith(
      'analyze-prompt',
      { promptId: 'prompt-1', resultIds: ['result-1', 'result-2'] },
      expect.objectContaining({ priority: 10, jobId: expect.stringContaining('prompt-prompt-1-') }),
    );
  });

  it('skips prompts when space is locked (INCOMPLETE)', async () => {
    const duePrompt = {
      id: 'prompt-2',
      status: 'Running',
      frequency: 'Every24Hours',
      entity: { id: 'entity-1', spaceId: 'space-1' },
    };

    mockPrisma.prompt.findMany.mockResolvedValue([duePrompt]);
    mockPrisma.space.findMany.mockResolvedValue([{
      id: 'space-1',
      subscriptionStatus: 'INCOMPLETE',
      trialEndsAt: null,
      plan: 'STARTER',
      isLocked: false,
    }]);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.checkRun.update.mockResolvedValue({});

    const result = await processDuePrompts();

    expect(result.results[0].status).toBe('skipped');
    expect(result.results[0].reason).toBe('space_locked');
    expect(createPendingAnalysisRecords).not.toHaveBeenCalled();
  });

  it('auto-locks expired trials and skips', async () => {
    const duePrompt = {
      id: 'prompt-3',
      status: 'Running',
      frequency: 'Every6Hours',
      entity: { id: 'entity-1', spaceId: 'space-1' },
    };

    mockPrisma.prompt.findMany.mockResolvedValue([duePrompt]);
    mockPrisma.space.findMany.mockResolvedValue([{
      id: 'space-1',
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date('2020-01-01'), // Far in the past
      plan: 'STARTER',
      isLocked: false,
    }]);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.space.update.mockResolvedValue({});
    mockPrisma.checkRun.update.mockResolvedValue({});

    const result = await processDuePrompts();

    expect(result.results[0].status).toBe('skipped');
    expect(result.results[0].reason).toBe('trial_expired');
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: { subscriptionStatus: 'INCOMPLETE' },
    });
  });

  it('updates nextRunAt after enqueuing', async () => {
    const duePrompt = {
      id: 'prompt-4',
      status: 'Running',
      frequency: 'Every7Days',
      entity: { id: 'entity-1', spaceId: 'space-1' },
    };

    mockPrisma.prompt.findMany.mockResolvedValue([duePrompt]);
    mockPrisma.space.findMany.mockResolvedValue([{
      id: 'space-1',
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: null,
      plan: 'PRO',
      isLocked: false,
    }]);
    mockPrisma.checkRun.create.mockResolvedValue({ id: 'check-1' });
    mockPrisma.prompt.update.mockResolvedValue({});
    mockPrisma.checkRun.update.mockResolvedValue({});

    await processDuePrompts();

    expect(mockPrisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prompt-4' },
        data: expect.objectContaining({
          lastRunAt: expect.any(Date),
          nextRunAt: expect.any(Date),
        }),
      }),
    );
  });

  it('handles errors gracefully and returns error status', async () => {
    const duePrompt = {
      id: 'prompt-5',
      status: 'Running',
      frequency: 'Every24Hours',
      entity: { id: 'entity-1', spaceId: 'space-1' },
    };

    mockPrisma.prompt.findMany.mockResolvedValue([duePrompt]);
    mockPrisma.space.findMany.mockRejectedValue(new Error('DB connection lost'));

    const result = await processDuePrompts();

    // Batch space fetch fails before per-prompt processing — top-level error
    expect(result.success).toBe(false);
  });
});
