import { describe, it, expect } from 'vitest';
import { createLLMProvider } from './factory';

describe('createLLMProvider', () => {
  const makeConfig = (provider: string) => ({
    provider,
    modelId: 'test-model',
    name: `Test ${provider}`,
  });

  it('creates OpenAI provider', () => {
    const provider = createLLMProvider(makeConfig('openai'), 'sk-test-key');
    expect(provider).toBeDefined();
    expect(provider.generate).toBeDefined();
  });

  it('creates Google provider', () => {
    const provider = createLLMProvider(makeConfig('google'), 'google-key');
    expect(provider).toBeDefined();
    expect(provider.generate).toBeDefined();
  });

  it('creates Mistral provider', () => {
    const provider = createLLMProvider(makeConfig('mistral'), 'mistral-key');
    expect(provider).toBeDefined();
    expect(provider.generate).toBeDefined();
  });

  it('creates Anthropic provider', () => {
    const provider = createLLMProvider(makeConfig('anthropic'), 'anthropic-key');
    expect(provider).toBeDefined();
    expect(provider.generate).toBeDefined();
  });

  it('is case insensitive for provider name', () => {
    const provider = createLLMProvider(makeConfig('OpenAI'), 'sk-test-key');
    expect(provider).toBeDefined();
  });

  it('throws for missing API key', () => {
    expect(() => createLLMProvider(makeConfig('openai'))).toThrow('API Key missing');
  });

  it('throws for unsupported provider', () => {
    expect(() => createLLMProvider(makeConfig('unknown'), 'key')).toThrow('Unsupported provider');
  });

  it('uses apiKey from config object when no explicit key', () => {
    const config = { provider: 'openai', modelId: 'gpt-4', name: 'GPT-4', apiKey: 'sk-from-config' };
    const provider = createLLMProvider(config);
    expect(provider).toBeDefined();
  });

  it('passes maxOutputTokens to provider', () => {
    const provider = createLLMProvider(makeConfig('openai'), 'sk-test', 4096);
    expect(provider).toBeDefined();
  });
});
