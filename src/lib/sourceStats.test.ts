import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { updateSourceStats, backfillSourceStats } from './sourceStats';

beforeEach(() => {
  mockReset();
});

describe('updateSourceStats', () => {
  it('returns early when no result found', async () => {
    mockPrisma.analysisResult.findUnique.mockResolvedValue(null);

    await updateSourceStats('prompt-1', 'result-1');

    expect(mockPrisma.domainCitation.upsert).not.toHaveBeenCalled();
  });

  it('returns early when result has no links', async () => {
    mockPrisma.analysisResult.findUnique.mockResolvedValue({ links: [] });

    await updateSourceStats('prompt-1', 'result-1');

    expect(mockPrisma.domainCitation.upsert).not.toHaveBeenCalled();
  });

  it('upserts domain citations grouped by domain', async () => {
    mockPrisma.analysisResult.findUnique.mockResolvedValue({
      links: [
        { domain: 'example.com', url: 'https://example.com/a' },
        { domain: 'example.com', url: 'https://example.com/b' },
        { domain: 'other.com', url: 'https://other.com/x' },
      ],
    });
    mockPrisma.domainCitation.upsert.mockResolvedValue({});

    await updateSourceStats('prompt-1', 'result-1');

    expect(mockPrisma.domainCitation.upsert).toHaveBeenCalledTimes(2);

    // First call: example.com with count 2
    const firstCall = mockPrisma.domainCitation.upsert.mock.calls[0][0];
    expect(firstCall.where.promptId_domain).toEqual({ promptId: 'prompt-1', domain: 'example.com' });
    expect(firstCall.create.count).toBe(2);

    // Second call: other.com with count 1
    const secondCall = mockPrisma.domainCitation.upsert.mock.calls[1][0];
    expect(secondCall.create.count).toBe(1);
  });

  it('does not throw on error (non-critical)', async () => {
    mockPrisma.analysisResult.findUnique.mockRejectedValue(new Error('DB error'));

    // Should not throw
    await updateSourceStats('prompt-1', 'result-1');
  });
});

describe('backfillSourceStats', () => {
  it('processes all prompts and their results', async () => {
    mockPrisma.prompt.findMany.mockResolvedValue([{ id: 'prompt-1' }]);
    mockPrisma.analysisResult.findMany.mockResolvedValue([
      {
        id: 'result-1',
        links: [
          { domain: 'example.com', url: 'https://example.com/page' },
        ],
      },
    ]);
    mockPrisma.domainCitation.upsert.mockResolvedValue({});

    await backfillSourceStats();

    expect(mockPrisma.domainCitation.upsert).toHaveBeenCalledTimes(1);
  });

  it('aggregates presence correctly across multiple results', async () => {
    mockPrisma.prompt.findMany.mockResolvedValue([{ id: 'prompt-1' }]);
    mockPrisma.analysisResult.findMany.mockResolvedValue([
      { id: 'r1', links: [{ domain: 'example.com', url: 'https://example.com/a' }] },
      { id: 'r2', links: [{ domain: 'example.com', url: 'https://example.com/b' }] },
    ]);
    mockPrisma.domainCitation.upsert.mockResolvedValue({});

    await backfillSourceStats();

    const upsertCall = mockPrisma.domainCitation.upsert.mock.calls[0][0];
    expect(upsertCall.update.count).toBe(2);     // total link count
    expect(upsertCall.update.presence).toBe(2);   // appeared in 2 results
  });

  it('throws on error (backfill is critical)', async () => {
    mockPrisma.prompt.findMany.mockRejectedValue(new Error('DB error'));

    await expect(backfillSourceStats()).rejects.toThrow('DB error');
  });
});
