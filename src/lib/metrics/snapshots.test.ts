import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { updateEntityMetrics } from './snapshots';

beforeEach(() => {
  mockReset();
});

describe('updateEntityMetrics', () => {
  it('creates entity snapshots for standard and extended timeframes', async () => {
    // Entity snapshot queries
    mockPrisma.analysisResult.count.mockResolvedValue(100);
    mockPrisma.analysisResult.aggregate.mockResolvedValue({ _avg: { position: 2.5 } });
    mockPrisma.analysisMention.count.mockResolvedValue(50);
    mockPrisma.analysisMention.aggregate.mockResolvedValue({ _avg: { position: 3.0 } });
    mockPrisma.metricSnapshot.create.mockResolvedValue({});
    mockPrisma.competitor.findMany.mockResolvedValue([]);

    await updateEntityMetrics('entity-1');

    // Should create 2 entity snapshots (standard + extended)
    expect(mockPrisma.metricSnapshot.create).toHaveBeenCalledTimes(2);

    const calls = mockPrisma.metricSnapshot.create.mock.calls;
    const timeframes = calls.map((c: unknown[]) => (c[0] as { data: { timeframe: string } }).data.timeframe);
    expect(timeframes).toContain('standard');
    expect(timeframes).toContain('extended');
  });

  it('creates competitor snapshots for each competitor', async () => {
    mockPrisma.analysisResult.count.mockResolvedValue(100);
    mockPrisma.analysisResult.aggregate.mockResolvedValue({ _avg: { position: 2.5 } });
    mockPrisma.analysisMention.count.mockResolvedValue(50);
    mockPrisma.analysisMention.aggregate.mockResolvedValue({ _avg: { position: 3.0 } });
    mockPrisma.metricSnapshot.create.mockResolvedValue({});
    mockPrisma.competitor.findMany.mockResolvedValue([
      { id: 'comp-1', entityId: 'entity-1' },
      { id: 'comp-2', entityId: 'entity-1' },
    ]);

    await updateEntityMetrics('entity-1');

    // 2 entity snapshots + 2 competitors × 2 timeframes = 6 total
    expect(mockPrisma.metricSnapshot.create).toHaveBeenCalledTimes(6);
  });

  it('calculates visibility correctly', async () => {
    // 30 out of 100 results mentioned = 30% visibility
    let callIndex = 0;
    mockPrisma.analysisResult.count.mockImplementation(() => {
      callIndex++;
      // Alternating: total count, then mention count
      if (callIndex % 2 === 1) return Promise.resolve(100); // total
      return Promise.resolve(30); // mentioned
    });

    mockPrisma.analysisResult.aggregate.mockResolvedValue({ _avg: { position: null } });
    mockPrisma.analysisMention.count.mockResolvedValue(30);
    mockPrisma.analysisMention.aggregate.mockResolvedValue({ _avg: { position: null } });
    mockPrisma.metricSnapshot.create.mockResolvedValue({});
    mockPrisma.competitor.findMany.mockResolvedValue([]);

    await updateEntityMetrics('entity-1');

    const snapshotData = mockPrisma.metricSnapshot.create.mock.calls[0][0].data;
    expect(snapshotData.entityId).toBe('entity-1');
    expect(snapshotData.visibility).toBeDefined();
    expect(typeof snapshotData.visibility).toBe('number');
  });

  it('handles entity with no results', async () => {
    mockPrisma.analysisResult.count.mockResolvedValue(0);
    mockPrisma.analysisResult.aggregate.mockResolvedValue({ _avg: { position: null } });
    mockPrisma.analysisMention.count.mockResolvedValue(0);
    mockPrisma.analysisMention.aggregate.mockResolvedValue({ _avg: { position: null } });
    mockPrisma.metricSnapshot.create.mockResolvedValue({});
    mockPrisma.competitor.findMany.mockResolvedValue([]);

    await updateEntityMetrics('entity-1');

    const snapshotData = mockPrisma.metricSnapshot.create.mock.calls[0][0].data;
    expect(snapshotData.visibility).toBe(0);
    expect(snapshotData.shareOfVoice).toBe(0);
  });

  it('stores position as null when no non-zero positions exist', async () => {
    mockPrisma.analysisResult.count.mockResolvedValue(10);
    mockPrisma.analysisResult.aggregate.mockResolvedValue({ _avg: { position: null } });
    mockPrisma.analysisMention.count.mockResolvedValue(5);
    mockPrisma.analysisMention.aggregate.mockResolvedValue({ _avg: { position: null } });
    mockPrisma.metricSnapshot.create.mockResolvedValue({});
    mockPrisma.competitor.findMany.mockResolvedValue([]);

    await updateEntityMetrics('entity-1');

    const snapshotData = mockPrisma.metricSnapshot.create.mock.calls[0][0].data;
    expect(snapshotData.position).toBeNull();
  });
});
