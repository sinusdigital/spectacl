import { describe, it, expect } from 'vitest';
import { MentionParser } from './MentionParser';

const parser = new MentionParser();

function makeInput(response: string, entityName: string, entityAliases: string[] = [], competitors: { id: string; name: string; aliases?: string[] }[] = []) {
  return {
    entity: { name: entityName, aliases: entityAliases } as never,
    competitors: competitors.map(c => ({ id: c.id, name: c.name, aliases: c.aliases || [] }) as never),
    response,
  };
}

describe('MentionParser', () => {
  it('detects primary entity mention', async () => {
    const result = await parser.parse(makeInput('Acme is a great company', 'Acme'));
    expect(result.mentioned).toBe(true);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions![0].isPrimaryEntity).toBe(true);
    expect(result.mentions![0].detectedName).toBe('Acme');
  });

  it('returns false when entity not mentioned', async () => {
    const result = await parser.parse(makeInput('No brands here', 'Acme'));
    expect(result.mentioned).toBe(false);
    expect(result.mentions).toHaveLength(0);
  });

  it('is case insensitive', async () => {
    const result = await parser.parse(makeInput('ACME is mentioned', 'Acme'));
    expect(result.mentioned).toBe(true);
  });

  it('detects entity via alias', async () => {
    const result = await parser.parse(makeInput('The AC brand is great', 'Acme Corp', ['AC']));
    expect(result.mentioned).toBe(true);
    expect(result.mentions![0].detectedName).toBe('AC');
  });

  it('detects competitor mentions', async () => {
    const result = await parser.parse(
      makeInput('Acme and Rival are competing', 'Acme', [], [
        { id: 'comp-1', name: 'Rival' },
      ])
    );
    expect(result.mentions).toHaveLength(2);
    expect(result.mentions![1].isPrimaryEntity).toBe(false);
    expect(result.mentions![1].competitorId).toBe('comp-1');
    expect(result.mentions![1].detectedName).toBe('Rival');
  });

  it('detects competitor via alias', async () => {
    const result = await parser.parse(
      makeInput('RV Corp is mentioned', 'Acme', [], [
        { id: 'comp-1', name: 'Rival', aliases: ['RV Corp'] },
      ])
    );
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions![0].competitorId).toBe('comp-1');
  });

  it('handles multiple competitors', async () => {
    const result = await parser.parse(
      makeInput('Acme, Rival, and Foe are all here', 'Acme', [], [
        { id: 'comp-1', name: 'Rival' },
        { id: 'comp-2', name: 'Foe' },
      ])
    );
    expect(result.mentions).toHaveLength(3);
  });

  it('returns empty for empty response', async () => {
    const result = await parser.parse(makeInput('', 'Acme'));
    expect(result.mentioned).toBe(false);
    expect(result.mentions).toHaveLength(0);
  });

  it('skips competitors with empty names', async () => {
    const result = await parser.parse(
      makeInput('Just text', 'Acme', [], [
        { id: 'comp-1', name: '' },
      ])
    );
    expect(result.mentions).toHaveLength(0);
  });
});
