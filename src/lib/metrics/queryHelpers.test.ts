import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { buildAnalysisResultWhere, buildSqlConditions, resolveModelIds } from './queryHelpers';

beforeEach(() => {
  mockReset();
  mockPrisma.modelConfig.findMany.mockResolvedValue([]);
});

type AnyRecord = Record<string, unknown>;

describe('buildAnalysisResultWhere', () => {
  it('defaults to ranking=null (exclude ranking prompts) when no promptId', () => {
    const where = buildAnalysisResultWhere('entity-1', { gte: new Date('2026-01-01') });

    expect(where.prompt).toMatchObject({
      entityId: 'entity-1',
      ranking: { is: null },
      status: 'Running',
    });
    expect((where.prompt as AnyRecord).id).toBeUndefined();
  });

  it('uses promptId when provided and does NOT add ranking filter', () => {
    const where = buildAnalysisResultWhere(
      'entity-1',
      { gte: new Date() },
      { promptId: 'prompt-xyz' }
    );

    expect((where.prompt as AnyRecord).id).toBe('prompt-xyz');
    expect((where.prompt as AnyRecord).ranking).toBeUndefined();
  });

  it('adds tags filter only when tagNames has entries', () => {
    const whereWithTags = buildAnalysisResultWhere(
      'entity-1',
      { gte: new Date() },
      { tagNames: ['marketing', 'ai'] }
    );
    expect((whereWithTags.prompt as AnyRecord).tags).toEqual({
      some: { name: { in: ['marketing', 'ai'] } },
    });

    const whereNoTags = buildAnalysisResultWhere('entity-1', { gte: new Date() }, { tagNames: [] });
    expect((whereNoTags.prompt as AnyRecord).tags).toBeUndefined();
  });

  it('adds intent filter only when intents has entries', () => {
    const where = buildAnalysisResultWhere(
      'entity-1',
      { gte: new Date() },
      { intents: ['Commercial', 'Informational'] }
    );
    expect((where.prompt as AnyRecord).intent).toEqual({
      in: ['Commercial', 'Informational'],
    });
  });

  it('includes Paused prompts when includePaused=true', () => {
    const where = buildAnalysisResultWhere(
      'entity-1',
      { gte: new Date() },
      { includePaused: true }
    );
    expect((where.prompt as AnyRecord).status).toBeUndefined();
  });

  it('restricts to Running prompts by default', () => {
    const where = buildAnalysisResultWhere('entity-1', { gte: new Date() });
    expect((where.prompt as AnyRecord).status).toBe('Running');
  });

  it('adds llmModel filter when resolvedModels provided', () => {
    const where = buildAnalysisResultWhere(
      'entity-1',
      { gte: new Date() },
      { resolvedModels: ['gpt-4', 'GPT-4'] }
    );
    expect((where as AnyRecord).llmModel).toEqual({ in: ['gpt-4', 'GPT-4'] });
  });

  it('always pins status=success on AnalysisResult', () => {
    const where = buildAnalysisResultWhere('entity-1', { gte: new Date() });
    expect((where as AnyRecord).status).toBe('success');
  });

  it('passes dateRange through to createdAt', () => {
    const range = { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') };
    const where = buildAnalysisResultWhere('entity-1', range);
    expect((where as AnyRecord).createdAt).toBe(range);
  });
});

describe('buildSqlConditions', () => {
  it('defaults prompt condition to exclude rankings via NOT EXISTS', () => {
    const c = buildSqlConditions('entity-1', {});
    expect(c.params).toEqual(['entity-1']);
    expect(c.promptIdCondition).toContain('NOT EXISTS');
    expect(c.promptIdCondition).toContain('Ranking');
  });

  it('substitutes promptId with a $ placeholder and appends to params', () => {
    const c = buildSqlConditions('entity-1', { promptId: 'prompt-42' });
    expect(c.params).toEqual(['entity-1', 'prompt-42']);
    expect(c.promptIdCondition).toContain('"Prompt"."id" = $2');
  });

  it('emits tag conditions and join when tagNames provided', () => {
    const c = buildSqlConditions('entity-1', { tagNames: ['brand'] });
    expect(c.tagJoin).toContain('_PromptToTag');
    expect(c.tagJoin).toContain('Tag');
    expect(c.tagCondition).toContain('"Tag"."name" = ANY');
    expect(c.params).toContainEqual(['brand']);
  });

  it('omits tag join/condition when tagNames empty', () => {
    const c = buildSqlConditions('entity-1', { tagNames: [] });
    expect(c.tagJoin).toBe('');
    expect(c.tagCondition).toBe('');
  });

  it('emits intent ANY condition when intents provided', () => {
    const c = buildSqlConditions('entity-1', { intents: ['Informational'] });
    expect(c.intentCondition).toContain('"Prompt"."intent" = ANY');
    expect(c.params).toContainEqual(['Informational']);
  });

  it('emits model ANY condition when resolvedModels provided', () => {
    const c = buildSqlConditions('entity-1', { resolvedModels: ['gpt-4'] });
    expect(c.modelCondition).toContain('"AnalysisResult"."llmModel" = ANY');
    expect(c.params).toContainEqual(['gpt-4']);
  });

  it('increments parameter index correctly across multiple filters', () => {
    const c = buildSqlConditions('entity-1', {
      promptId: 'p',
      tagNames: ['a'],
      intents: ['Commercial'],
      resolvedModels: ['gpt-4'],
    });
    // entityId + promptId + tags + intents + models = 5 params
    expect(c.params).toHaveLength(5);
    expect(c.promptIdCondition).toContain('$2');
    expect(c.tagCondition).toContain('$3');
    expect(c.intentCondition).toContain('$4');
    expect(c.modelCondition).toContain('$5');
  });

  it('restricts to Running by default and omits when includePaused=true', () => {
    expect(buildSqlConditions('entity-1', {}).pausedCondition).toContain("'Running'");
    expect(buildSqlConditions('entity-1', { includePaused: true }).pausedCondition).toBe('');
  });
});

describe('resolveModelIds', () => {
  it('returns empty array for empty input', async () => {
    const result = await resolveModelIds('entity-1', []);
    expect(result).toEqual([]);
    expect(mockPrisma.modelConfig.findMany).not.toHaveBeenCalled();
  });

  it('always includes the raw ID itself', async () => {
    mockPrisma.modelConfig.findMany.mockResolvedValue([]);
    const result = await resolveModelIds('entity-1', ['my-model']);
    expect(result).toContain('my-model');
  });

  it('adds config.name if a modelConfig with that id exists', async () => {
    mockPrisma.modelConfig.findMany.mockResolvedValue([
      { entityId: 'entity-1', modelId: 'gpt-4', name: 'GPT-4 Turbo' },
    ]);
    const result = await resolveModelIds('entity-1', ['gpt-4']);
    expect(result).toContain('gpt-4');
    expect(result).toContain('GPT-4 Turbo');
  });

  it('deduplicates when DEFAULT_MODELS name matches config name', async () => {
    mockPrisma.modelConfig.findMany.mockResolvedValue([
      { modelId: 'claude-3-5-sonnet-20241022', name: 'Claude Sonnet 3.5' },
    ]);
    const result = await resolveModelIds('entity-1', ['claude-3-5-sonnet-20241022']);
    // Duplicates collapse via Set
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });
});
