import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { updatePromptMetrics } from './promptMetrics';

beforeEach(() => {
  mockReset();
});

describe('updatePromptMetrics', () => {
  it('nulls out last-run metrics when no completed results exist', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue(null);
    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    expect(mockPrisma.prompt.update).toHaveBeenCalledWith({
      where: { id: 'prompt-1' },
      data: {
        lastMentionRate: null,
        lastAvgPosition: null,
        lastShareOfVoice: null,
      },
    });
  });

  it('returns early (no update) when no results in latest checkRun', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue({
      checkRunId: 'check-1',
      createdAt: new Date(),
    });
    // Latest-run results empty AND period windows empty
    mockPrisma.analysisResult.findMany.mockResolvedValue([]);
    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    expect(mockPrisma.prompt.update).not.toHaveBeenCalled();
  });

  it('writes denormalized metrics for the latest run', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue({
      checkRunId: 'check-1',
      createdAt: new Date(),
    });

    // First findMany = latest-run results.
    // Subsequent findManys = 7d, 30d, 90d windows.
    // Non-primary mentions carry competitorId to represent TRACKED competitor mentions.
    // (Suggested-brand mentions — competitorId null + suggestedCompetitorId set — are
    // excluded from market-share math by design.)
    const latestRunResults = [
      { id: 'r1', mentioned: true, position: 1, mentions: [{ isPrimaryEntity: true }, { isPrimaryEntity: false, competitorId: 'c1' }] },
      { id: 'r2', mentioned: true, position: 2, mentions: [{ isPrimaryEntity: true }] },
      { id: 'r3', mentioned: false, position: null, mentions: [] },
      { id: 'r4', mentioned: true, position: 3, mentions: [{ isPrimaryEntity: false, competitorId: 'c2' }] },
    ];
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce(latestRunResults)  // latest run
      .mockResolvedValue(latestRunResults);     // 7d/30d/90d windows

    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    expect(mockPrisma.prompt.update).toHaveBeenCalledTimes(1);
    const data = mockPrisma.prompt.update.mock.calls[0][0].data;

    // 3 of 4 mentioned = 75%
    expect(data.lastMentionRate).toBe(75);
    // Average of positions 1, 2, 3 = 2
    expect(data.lastAvgPosition).toBe(2);
    // Share of voice = primaryEntityMentions (2) / totalMarketMentions (4) = 50
    expect(data.lastShareOfVoice).toBe(50);

    // Period windows exist
    expect(data.mentionRate7d).toBeDefined();
    expect(data.mentionRate30d).toBeDefined();
    expect(data.mentionRate90d).toBeDefined();
  });

  it('returns null avg position when no valid positions exist', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue({
      checkRunId: 'c1',
      createdAt: new Date(),
    });

    const results = [
      { id: 'r1', mentioned: true, position: null, mentions: [{ isPrimaryEntity: true }] },
      { id: 'r2', mentioned: true, position: 0, mentions: [{ isPrimaryEntity: true }] },
    ];
    mockPrisma.analysisResult.findMany.mockResolvedValue(results);
    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    const data = mockPrisma.prompt.update.mock.calls[0][0].data;
    expect(data.lastAvgPosition).toBeNull();
  });

  it('returns nulls for a period window with no results', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue({
      checkRunId: 'c1',
      createdAt: new Date(),
    });

    const latest = [
      { id: 'r1', mentioned: true, position: 1, mentions: [{ isPrimaryEntity: true }] },
    ];
    mockPrisma.analysisResult.findMany
      .mockResolvedValueOnce(latest) // latest run
      .mockResolvedValueOnce([])      // 7d empty
      .mockResolvedValueOnce(latest)  // 30d has data
      .mockResolvedValueOnce([]);     // 90d empty (unusual but valid as test)

    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    const data = mockPrisma.prompt.update.mock.calls[0][0].data;
    expect(data.mentionRate7d).toBeNull();
    expect(data.avgPosition7d).toBeNull();
    expect(data.shareOfVoice7d).toBeNull();
    expect(data.mentionRate30d).toBeDefined();
    expect(data.mentionRate30d).not.toBeNull();
    expect(data.mentionRate90d).toBeNull();
  });

  it('handles results with empty mentions array without NaN', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue({
      checkRunId: 'c1',
      createdAt: new Date(),
    });

    const results = [
      { id: 'r1', mentioned: false, position: null, mentions: [] },
      { id: 'r2', mentioned: false, position: null, mentions: [] },
    ];
    mockPrisma.analysisResult.findMany.mockResolvedValue(results);
    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    const data = mockPrisma.prompt.update.mock.calls[0][0].data;
    expect(data.lastMentionRate).toBe(0);
    expect(data.lastShareOfVoice).toBe(0);
    expect(data.lastAvgPosition).toBeNull();
    expect(Number.isNaN(data.lastMentionRate)).toBe(false);
    expect(Number.isNaN(data.lastShareOfVoice)).toBe(false);
  });

  it('rounds metrics to 1 decimal place', async () => {
    mockPrisma.analysisResult.findFirst.mockResolvedValue({
      checkRunId: 'c1',
      createdAt: new Date(),
    });

    // 1 of 3 mentioned = 33.333...%
    const results = [
      { id: 'r1', mentioned: true, position: 1.7, mentions: [{ isPrimaryEntity: true }] },
      { id: 'r2', mentioned: false, position: null, mentions: [] },
      { id: 'r3', mentioned: false, position: null, mentions: [] },
    ];
    mockPrisma.analysisResult.findMany.mockResolvedValue(results);
    mockPrisma.prompt.update.mockResolvedValue({});

    await updatePromptMetrics('prompt-1');

    const data = mockPrisma.prompt.update.mock.calls[0][0].data;
    // 33.333... rounded to 1dp = 33.3
    expect(data.lastMentionRate).toBe(33.3);
    expect(data.lastAvgPosition).toBe(1.7);
  });
});
