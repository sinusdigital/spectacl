import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getDynamicMetrics, getLatestMetrics } from './dynamic';

beforeEach(() => {
  mockReset();
  mockPrisma.modelConfig.findMany.mockResolvedValue([]);
});

/**
 * Helper: stub the 13 queries made inside $transaction for getDynamicMetrics.
 * Order matches the destructuring array in dynamic.ts:
 *   [0]  totalCount
 *   [1]  mentionCount
 *   [2]  currentTotalMarketMentions
 *   [3]  currentEntityMentions
 *   [4]  entityAggregates
 *   [5]  competitors
 *   [6]  currentBrandRaw   (analysisResult.findMany — fed to computeBrandRows)
 *   [7]  prevTotalCount
 *   [8]  prevMentionCount
 *   [9]  prevTotalMarketMentions
 *   [10] prevEntityMentions
 *   [11] prevEntityAggregates
 *   [12] prevBrandRaw      (analysisResult.findMany — fed to computeBrandRows)
 *
 * Tests still express competitor stats in the legacy `{ competitorId, _count, _avg }`
 * shape — the helper transforms that into the new findMany-shaped mocks under the
 * hood. One mention per generated result, so deduped runsMentioned == _count.id.
 */
interface CompetitorStat {
  competitorId: string;
  _count: { id: number };
  _avg: { position: number | null };
}

interface Stubs {
  totalCount?: number;
  mentionCount?: number;
  currentTotalMarketMentions?: number;
  currentEntityMentions?: number;
  entityAvgPosition?: number | null;
  competitors?: Array<{ id: string; entityId: string; name?: string }>;
  competitorStats?: CompetitorStat[];
  prevTotalCount?: number;
  prevMentionCount?: number;
  prevTotalMarketMentions?: number;
  prevEntityMentions?: number;
  prevEntityAvgPosition?: number | null;
  prevCompetitorStats?: CompetitorStat[];
}

let synthIdCounter = 0;
function competitorStatsToFindMany(stats: CompetitorStat[], totalCount: number) {
  const baseDate = new Date('2026-04-26T00:00:00Z');
  const results: Array<{
    id: string;
    createdAt: Date;
    mentions: Array<{
      detectedName: string;
      position: number | null;
      competitorId: string | null;
      suggestedCompetitorId: string | null;
      isPrimaryEntity: boolean;
    }>;
  }> = [];

  for (const stat of stats) {
    for (let i = 0; i < stat._count.id; i++) {
      results.push({
        id: `r-${synthIdCounter++}`,
        createdAt: baseDate,
        mentions: [{
          detectedName: `brand-${stat.competitorId}`,
          position: stat._avg.position,
          competitorId: stat.competitorId,
          suggestedCompetitorId: null,
          isPrimaryEntity: false,
        }],
      });
    }
  }
  // Pad with empty results so totalRuns === totalCount.
  while (results.length < totalCount) {
    results.push({
      id: `r-${synthIdCounter++}`,
      createdAt: baseDate,
      mentions: [],
    });
  }
  return results;
}

function stubTransaction(s: Stubs = {}) {
  synthIdCounter = 0;
  const totalCount = s.totalCount ?? 0;
  const prevTotalCount = s.prevTotalCount ?? 0;

  const responses = [
    totalCount,
    s.mentionCount ?? 0,
    s.currentTotalMarketMentions ?? 0,
    s.currentEntityMentions ?? 0,
    { _avg: { position: s.entityAvgPosition ?? null } },
    s.competitors ?? [],
    competitorStatsToFindMany(s.competitorStats ?? [], totalCount),
    prevTotalCount,
    s.prevMentionCount ?? 0,
    s.prevTotalMarketMentions ?? 0,
    s.prevEntityMentions ?? 0,
    { _avg: { position: s.prevEntityAvgPosition ?? null } },
    competitorStatsToFindMany(s.prevCompetitorStats ?? [], prevTotalCount),
  ];

  mockPrisma.$transaction.mockImplementation((input: unknown) => {
    if (Array.isArray(input)) {
      // Resolve in the exact order they were passed.
      return Promise.resolve(responses.slice(0, input.length));
    }
    return Promise.resolve(input);
  });
}

describe('getDynamicMetrics', () => {
  it('calculates visibility as mentions / total × 100', async () => {
    stubTransaction({
      totalCount: 100,
      mentionCount: 30,
      currentTotalMarketMentions: 100,
      currentEntityMentions: 30,
      prevTotalCount: 100,
      prevMentionCount: 20,
      prevTotalMarketMentions: 100,
      prevEntityMentions: 20,
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.entity.visibility).toBe(30);
    expect(result.entity.totalCount).toBe(100);
    expect(result.entity.mentionCount).toBe(30);
  });

  it('returns visibilityChange as current - previous when prev has data', async () => {
    stubTransaction({
      totalCount: 100,
      mentionCount: 50,
      currentTotalMarketMentions: 100,
      currentEntityMentions: 50,
      prevTotalCount: 100,
      prevMentionCount: 40,
      prevTotalMarketMentions: 100,
      prevEntityMentions: 40,
    });

    const result = await getDynamicMetrics('entity-1', []);

    // 50% - 40% = 10
    expect(result.entity.visibilityChange).toBe(10);
  });

  it('returns null visibilityChange when no previous-period data', async () => {
    stubTransaction({
      totalCount: 10,
      mentionCount: 5,
      currentTotalMarketMentions: 5,
      currentEntityMentions: 5,
      // prevTotalCount defaults to 0 → hasPreviousData=false
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.entity.visibilityChange).toBeNull();
  });

  it('calculates share of voice from entity mentions / market mentions', async () => {
    stubTransaction({
      totalCount: 100,
      mentionCount: 60,
      currentTotalMarketMentions: 200, // total market mentions across all players
      currentEntityMentions: 60,
    });

    const result = await getDynamicMetrics('entity-1', []);

    // 60 / 200 = 30% share of voice
    expect(result.entity.shareOfVoice).toBe(30);
  });

  it('returns entity position from aggregate and respects null', async () => {
    stubTransaction({
      totalCount: 10,
      mentionCount: 10,
      entityAvgPosition: 2.7,
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.entity.position).toBe(2.7);
  });

  it('handles empty state (no results) without NaN', async () => {
    stubTransaction({});

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.entity.visibility).toBe(0);
    expect(result.entity.shareOfVoice).toBe(0);
    expect(result.entity.mentionCount).toBe(0);
    expect(result.entity.totalCount).toBe(0);
    expect(result.entity.visibilityChange).toBeNull();
    expect(result.entity.shareOfVoiceChange).toBeNull();
    expect(result.entity.positionChange).toBeNull();
    expect(Number.isNaN(result.entity.visibility)).toBe(false);
    expect(Number.isNaN(result.entity.shareOfVoice)).toBe(false);
  });

  it('returns empty competitors array when there are none', async () => {
    stubTransaction({
      totalCount: 50,
      mentionCount: 25,
      competitors: [],
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.competitors).toEqual([]);
  });

  it('maps competitor stats into metrics (visibility, position, share of voice)', async () => {
    stubTransaction({
      totalCount: 100,
      mentionCount: 40,
      currentTotalMarketMentions: 100,
      currentEntityMentions: 40,
      competitors: [
        { id: 'comp-1', entityId: 'entity-1' },
        { id: 'comp-2', entityId: 'entity-1' },
      ],
      competitorStats: [
        { competitorId: 'comp-1', _count: { id: 30 }, _avg: { position: 1.5 } },
        { competitorId: 'comp-2', _count: { id: 10 }, _avg: { position: 4.2 } },
      ],
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.competitors).toHaveLength(2);
    const c1 = result.competitors.find((c) => c.competitorId === 'comp-1')!;
    const c2 = result.competitors.find((c) => c.competitorId === 'comp-2')!;

    expect(c1.mentionCount).toBe(30);
    expect(c1.visibility).toBe(30); // 30/100
    expect(c1.position).toBe(1.5);

    expect(c2.mentionCount).toBe(10);
    expect(c2.visibility).toBe(10);
    // toBeCloseTo because position is averaged in JS now (was a SQL AVG before
    // the dedupe refactor) — small floating-point drift is expected.
    expect(c2.position).toBeCloseTo(4.2);
  });

  it('uses 0 mentions for competitors with no stats entry', async () => {
    stubTransaction({
      totalCount: 100,
      mentionCount: 40,
      competitors: [{ id: 'comp-ghost', entityId: 'entity-1' }],
      competitorStats: [], // no stats for this competitor
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.competitors[0].mentionCount).toBe(0);
    expect(result.competitors[0].visibility).toBe(0);
    expect(result.competitors[0].position).toBeNull();
  });

  it('returns null position when aggregate.position is null', async () => {
    stubTransaction({
      totalCount: 10,
      mentionCount: 0,
      entityAvgPosition: null,
    });

    const result = await getDynamicMetrics('entity-1', []);

    expect(result.entity.position).toBeNull();
  });

  it('computes previous-period time window spanning twice the timeframe', async () => {
    // Weekly = 7 days. Start = now-7. PrevStart = start-7 = now-14.
    // We can at least verify the queries fire without error.
    stubTransaction({ totalCount: 5, mentionCount: 2 });

    const result = await getDynamicMetrics('entity-1', [], 'weekly');

    expect(result.entity.totalCount).toBe(5);
    expect(result.entity.mentionCount).toBe(2);
  });

  it('resolves model IDs when modelIds filter is provided', async () => {
    mockPrisma.modelConfig.findMany.mockResolvedValue([
      { entityId: 'entity-1', modelId: 'gpt-4', name: 'GPT-4' },
    ]);
    stubTransaction({ totalCount: 10, mentionCount: 5 });

    const result = await getDynamicMetrics('entity-1', [], 'standard', ['gpt-4']);

    expect(mockPrisma.modelConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityId: 'entity-1' }),
      })
    );
    expect(result.entity.totalCount).toBe(10);
  });

  it('skips model resolution when modelIds is not provided', async () => {
    stubTransaction({ totalCount: 3, mentionCount: 1 });

    await getDynamicMetrics('entity-1', []);

    expect(mockPrisma.modelConfig.findMany).not.toHaveBeenCalled();
  });

  it('linkPercentage equals min(visibility * 0.8, 100) for entity', async () => {
    stubTransaction({ totalCount: 100, mentionCount: 50 });

    const result = await getDynamicMetrics('entity-1', []);

    // visibility = 50, factor 0.8 → 40
    expect(result.entity.linkPercentage).toBe(40);
  });

  it('linkPercentage uses 0.6 factor for competitors', async () => {
    stubTransaction({
      totalCount: 100,
      mentionCount: 10,
      competitors: [{ id: 'comp-1', entityId: 'entity-1' }],
      competitorStats: [
        { competitorId: 'comp-1', _count: { id: 50 }, _avg: { position: 2 } },
      ],
    });

    const result = await getDynamicMetrics('entity-1', []);

    // comp visibility = 50/100 = 50, factor 0.6 → 30
    expect(result.competitors[0].linkPercentage).toBe(30);
  });
});

describe('getLatestMetrics', () => {
  it('returns null-like entity when no snapshot exists', async () => {
    mockPrisma.metricSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.metricSnapshot.findMany.mockResolvedValue([]);

    const result = await getLatestMetrics('entity-1');

    expect(result.entity).toBeNull();
    expect(result.competitors).toEqual([]);
  });

  it('returns the latest entity snapshot', async () => {
    const snapshot = {
      id: 'snap-1',
      entityId: 'entity-1',
      timeframe: 'standard',
      visibility: 42,
      createdAt: new Date('2026-04-01'),
    };
    mockPrisma.metricSnapshot.findFirst.mockResolvedValue(snapshot);
    mockPrisma.metricSnapshot.findMany.mockResolvedValue([]);

    const result = await getLatestMetrics('entity-1');

    expect(result.entity).toEqual(snapshot);
    expect(mockPrisma.metricSnapshot.findFirst).toHaveBeenCalledWith({
      where: { entityId: 'entity-1', timeframe: 'standard' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deduplicates competitor snapshots keeping only latest per competitor', async () => {
    mockPrisma.metricSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.metricSnapshot.findMany.mockResolvedValue([
      // Already ordered desc by createdAt — first occurrence wins
      { id: 'a', competitorId: 'c1', createdAt: new Date('2026-04-10') },
      { id: 'b', competitorId: 'c2', createdAt: new Date('2026-04-09') },
      { id: 'c', competitorId: 'c1', createdAt: new Date('2026-04-08') }, // dup, should be dropped
      { id: 'd', competitorId: 'c2', createdAt: new Date('2026-04-07') }, // dup, should be dropped
    ]);

    const result = await getLatestMetrics('entity-1');

    expect(result.competitors).toHaveLength(2);
    expect(result.competitors.map((c) => (c as { id: string }).id)).toEqual(['a', 'b']);
  });

  it('accepts timeframe parameter', async () => {
    mockPrisma.metricSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.metricSnapshot.findMany.mockResolvedValue([]);

    await getLatestMetrics('entity-1', 'extended');

    expect(mockPrisma.metricSnapshot.findFirst).toHaveBeenCalledWith({
      where: { entityId: 'entity-1', timeframe: 'extended' },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.metricSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ timeframe: 'extended' }),
      })
    );
  });

  it('skips snapshots with no competitorId', async () => {
    mockPrisma.metricSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.metricSnapshot.findMany.mockResolvedValue([
      { id: 'a', competitorId: null, createdAt: new Date('2026-04-10') },
      { id: 'b', competitorId: 'c1', createdAt: new Date('2026-04-09') },
    ]);

    const result = await getLatestMetrics('entity-1');

    expect(result.competitors).toHaveLength(1);
    expect(result.competitors[0].id).toBe('b');
  });
});
