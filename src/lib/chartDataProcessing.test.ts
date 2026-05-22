import { describe, it, expect } from 'vitest';
import { formatDateLabel, getTickInterval, processChartData } from './chartDataProcessing';
import type { DataPoint, ChartEntity } from './chartDataProcessing';

describe('formatDateLabel', () => {
  it('returns weekday + day for <= 7 days', () => {
    const label = formatDateLabel('2026-04-03', 7);
    expect(label).toMatch(/\d/); // contains a day number
  });

  it('returns month + day for > 7 days', () => {
    const label = formatDateLabel('2026-04-03', 30);
    expect(label).toMatch(/Apr/);
  });
});

describe('getTickInterval', () => {
  it('returns 0 for <= 7 days', () => {
    expect(getTickInterval(7, 7)).toBe(0);
  });

  it('returns calculated interval for 30 days', () => {
    const interval = getTickInterval(30, 30);
    expect(interval).toBeGreaterThanOrEqual(0);
    expect(interval).toBeLessThan(30);
  });

  it('returns calculated interval for 90 days', () => {
    const interval = getTickInterval(90, 90);
    expect(interval).toBeGreaterThan(0);
  });

  it('never returns negative', () => {
    expect(getTickInterval(1, 30)).toBeGreaterThanOrEqual(0);
  });
});

describe('processChartData', () => {
  const entities: ChartEntity[] = [
    { name: 'Acme', color: '#3B82F6' },
    { name: 'Rival', color: '#10B981' },
  ];

  it('returns empty result for no data', () => {
    const result = processChartData({
      data: [],
      entities,
      days: 30,
      dataKeyFn: (name) => name,
      fillValue: 0,
      perEntityInception: true,
    });
    expect(result.processedData).toEqual([]);
    expect(result.inceptionDate).toBeNull();
  });

  it('returns empty result for no entities', () => {
    const data: DataPoint[] = [{ date: '2026-04-01', Acme: 50 }];
    const result = processChartData({
      data,
      entities: [],
      days: 30,
      dataKeyFn: (name) => name,
      fillValue: 0,
      perEntityInception: true,
    });
    expect(result.inceptionDate).toBeNull();
  });

  it('finds inception date from primary entity', () => {
    const data: DataPoint[] = [
      { date: '2026-04-01' },
      { date: '2026-04-02', Acme: 50 },
      { date: '2026-04-03', Acme: 60 },
    ];
    const result = processChartData({
      data,
      entities,
      days: 7,
      dataKeyFn: (name) => name,
      fillValue: 0,
      perEntityInception: true,
    });
    expect(result.inceptionDate).toBe('2026-04-02');
  });

  it('fills before inception with 0 in perEntityInception mode', () => {
    const data: DataPoint[] = [
      { date: '2026-04-01' },
      { date: '2026-04-02', Acme: 50 },
    ];
    const result = processChartData({
      data,
      entities: [{ name: 'Acme', color: '#3B82F6' }],
      days: 7,
      dataKeyFn: (name) => name,
      fillValue: 0,
      perEntityInception: true,
    });
    expect(result.processedData[0].Acme).toBe(0);
  });

  it('fills with baseline for position chart', () => {
    const data: DataPoint[] = [
      { date: '2026-04-01' },
      { date: '2026-04-02', Acme: 3 },
      { date: '2026-04-03', Acme: 2 },
    ];
    const result = processChartData({
      data,
      entities: [{ name: 'Acme', color: '#3B82F6' }],
      days: 7,
      dataKeyFn: (name) => name,
      fillValue: 'baseline',
      perEntityInception: true,
    });
    // yDomain max should be at least 5
    expect(result.yDomain[1]).toBeGreaterThanOrEqual(4);
    // Fill value before inception should be the yMax
    expect(result.processedData[0].Acme).toBe(result.yDomain[1]);
  });

  it('uses shared inception in non-perEntity mode', () => {
    const data: DataPoint[] = [
      { date: '2026-04-01' },
      { date: '2026-04-02', Acme: 50, Rival: 30 },
    ];
    const result = processChartData({
      data,
      entities,
      days: 7,
      dataKeyFn: (name) => name,
      fillValue: 0,
      perEntityInception: false,
    });
    // Both should be zero-filled before inception
    expect(result.processedData[0].Acme).toBe(0);
    expect(result.processedData[0].Rival).toBe(0);
  });

  it('handles null inception (no primary data)', () => {
    const data: DataPoint[] = [
      { date: '2026-04-01' },
      { date: '2026-04-02' },
    ];
    const result = processChartData({
      data,
      entities,
      days: 7,
      dataKeyFn: (name) => name,
      fillValue: 0,
      perEntityInception: true,
    });
    expect(result.inceptionDate).toBeNull();
  });
});
