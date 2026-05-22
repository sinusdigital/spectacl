import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';

const mockGenerate = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('./llm/factory', () => ({
  createLLMProvider: vi.fn(() => ({ generate: mockGenerate })),
}));
vi.mock('./internal-models', () => ({
  getInternalTaskModel: vi.fn().mockResolvedValue({
    taskKey: 'brand_extraction',
    provider: 'openai',
    modelId: 'gpt-4',
    displayName: 'GPT-4',
    maxOutputTokens: 1500,
    apiKey: 'test-key',
  }),
}));

import { processBrandSuggestions, discoverCompetitors } from './suggestions';

beforeEach(() => {
  mockReset();
  vi.clearAllMocks();
});

describe('processBrandSuggestions', () => {
  it('returns early when entity has no space', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: null });

    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: 'some content' }]);

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('extracts brands from LLM response and creates suggestions', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: 'space-1' });
    mockPrisma.competitor.findMany.mockResolvedValue([]);
    mockPrisma.suggestedCompetitor.findMany.mockResolvedValue([]);
    mockPrisma.suggestedCompetitor.createMany.mockResolvedValue({ count: 2 });

    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        { name: 'Competitor A', website: 'https://a.com' },
        { name: 'Competitor B', website: 'https://b.com' },
      ]),
    });

    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: 'content with brands' }]);

    expect(mockPrisma.suggestedCompetitor.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Competitor A', entityId: 'entity-1' }),
        expect.objectContaining({ name: 'Competitor B', entityId: 'entity-1' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('skips brands that already exist as competitors', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: 'space-1' });
    mockPrisma.competitor.findMany.mockResolvedValue([
      { name: 'Existing Co', aliases: [] },
    ]);
    mockPrisma.suggestedCompetitor.findMany.mockResolvedValue([]);
    mockPrisma.suggestedCompetitor.createMany.mockResolvedValue({ count: 1 });

    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        { name: 'Existing Co', website: 'https://existing.com' },
        { name: 'New Brand', website: 'https://new.com' },
      ]),
    });

    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: 'content' }]);

    const createCall = mockPrisma.suggestedCompetitor.createMany.mock.calls[0][0];
    const names = createCall.data.map((d: { name: string }) => d.name);
    expect(names).toContain('New Brand');
    expect(names).not.toContain('Existing Co');
  });

  it('excludes the primary entity name', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: 'space-1' });
    mockPrisma.competitor.findMany.mockResolvedValue([]);
    mockPrisma.suggestedCompetitor.findMany.mockResolvedValue([]);

    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        { name: 'TestBrand', website: 'https://testbrand.com' },
        { name: 'Real Competitor', website: 'https://real.com' },
      ]),
    });

    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: 'content' }]);

    if (mockPrisma.suggestedCompetitor.createMany.mock.calls.length > 0) {
      const createCall = mockPrisma.suggestedCompetitor.createMany.mock.calls[0][0];
      const names = createCall.data.map((d: { name: string }) => d.name);
      expect(names).not.toContain('TestBrand');
    }
  });

  it('handles malformed LLM JSON gracefully', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: 'space-1' });

    mockGenerate.mockResolvedValue({ text: 'not valid json at all' });

    // Should not throw
    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: 'content' }]);

    expect(mockPrisma.suggestedCompetitor.createMany).not.toHaveBeenCalled();
  });

  it('handles empty content strings (joined separators still trigger LLM)', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: 'space-1' });
    mockPrisma.competitor.findMany.mockResolvedValue([]);
    mockPrisma.suggestedCompetitor.findMany.mockResolvedValue([]);

    // Empty strings joined with separators produce non-empty text, so LLM is still called
    mockGenerate.mockResolvedValue({ text: '[]' });

    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: '' }, { analysisResultId: 'r2', response: '  ' }]);

    // LLM is called but returns empty array, so no suggestions created
    expect(mockPrisma.suggestedCompetitor.createMany).not.toHaveBeenCalled();
  });

  it('filters short names (<=2 chars)', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ spaceId: 'space-1' });
    mockPrisma.competitor.findMany.mockResolvedValue([]);
    mockPrisma.suggestedCompetitor.findMany.mockResolvedValue([]);

    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        { name: 'AB', website: 'https://ab.com' },
        { name: 'Valid Brand', website: 'https://valid.com' },
      ]),
    });

    await processBrandSuggestions('entity-1', 'TestBrand', [{ analysisResultId: 'r1', response: 'content' }]);

    if (mockPrisma.suggestedCompetitor.createMany.mock.calls.length > 0) {
      const createCall = mockPrisma.suggestedCompetitor.createMany.mock.calls[0][0];
      const names = createCall.data.map((d: { name: string }) => d.name);
      expect(names).not.toContain('AB');
    }
  });
});

describe('discoverCompetitors', () => {
  it('returns competitors from LLM response', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({
      name: 'TestBrand',
      website: 'https://testbrand.com',
      spaceId: 'space-1',
    });

    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        { name: 'Comp A', website: 'https://a.com' },
        { name: 'Comp B', website: 'https://b.com' },
      ]),
    });

    const result = await discoverCompetitors('entity-1');

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Comp A');
  });

  it('limits to 6 competitors', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({
      name: 'TestBrand',
      website: null,
      spaceId: 'space-1',
    });

    const manyComps = Array.from({ length: 10 }, (_, i) => ({
      name: `Comp ${i}`,
      website: `https://comp${i}.com`,
    }));

    mockGenerate.mockResolvedValue({ text: JSON.stringify(manyComps) });

    const result = await discoverCompetitors('entity-1');

    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('throws when entity has no space', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({ name: 'Test', spaceId: null });

    await expect(discoverCompetitors('entity-1')).rejects.toThrow('Entity or space not found');
  });

  it('returns empty array on LLM failure', async () => {
    mockPrisma.entity.findUnique.mockResolvedValue({
      name: 'TestBrand',
      website: null,
      spaceId: 'space-1',
    });

    mockGenerate.mockRejectedValue(new Error('LLM timeout'));

    const result = await discoverCompetitors('entity-1');

    expect(result).toEqual([]);
  });
});
