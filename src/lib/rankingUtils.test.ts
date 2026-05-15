import { describe, it, expect } from 'vitest';
import { parseRankingResponse } from './rankingUtils';

describe('parseRankingResponse', () => {
  it('returns null for null input', () => {
    expect(parseRankingResponse(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseRankingResponse(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseRankingResponse('')).toBeNull();
  });

  it('parses valid JSON string', () => {
    const data = { market_ranking: { entities: [{ name: 'Test', market_share: '50%' }] } };
    const result = parseRankingResponse(JSON.stringify(data));
    expect(result).not.toBeNull();
  });

  it('extracts JSON from markdown code block', () => {
    const response = '```json\n{"market_ranking": {"entities": [{"name": "Test"}]}}\n```';
    const result = parseRankingResponse(response);
    expect(result).not.toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseRankingResponse('not json at all')).toBeNull();
  });

  it('cleans markdown artifacts from entity names', () => {
    const data = {
      market_ranking: {
        entities: [{ name: '[Test](#entity-highlight)', market_share: '50%' }],
      },
    };
    const result = parseRankingResponse(JSON.stringify(data));
    expect(result).not.toBeNull();
    const entities = (result as any)?.market_ranking?.entities;
    expect(entities?.[0]?.name).toBe('Test');
  });

  it('falls back to company field for entity name', () => {
    const data = {
      market_ranking: {
        entities: [{ company: 'TestCo', market_share: '30%' }],
      },
    };
    const result = parseRankingResponse(JSON.stringify(data));
    const entities = (result as any)?.market_ranking?.entities;
    expect(entities?.[0]?.name).toBe('TestCo');
  });
});
