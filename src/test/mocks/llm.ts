/**
 * Shared LLM provider mock for analysis/worker tests.
 *
 * Usage:
 *   vi.mock('@/lib/llm/factory', async () => {
 *     const { mockCreateLLMProvider } = await import('@/test/mocks/llm');
 *     return { createLLMProvider: mockCreateLLMProvider };
 *   });
 *
 *   import {
 *     mockLLMProvider,
 *     mockCreateLLMProvider,
 *     llmMockReset,
 *     mockLLMError,
 *   } from '@/test/mocks/llm';
 *
 * `mockLLMProvider.generate` returns a canned happy-path response. Override
 * per-test via `mockResolvedValueOnce(...)` or call `mockLLMError('429')`
 * to queue a retryable error for the next call.
 */
import { vi } from 'vitest';

export const mockLLMProvider = {
  generate: vi.fn(),
  /** Some codepaths (e.g. direct SDK use) call `complete` — mirror of generate. */
  complete: vi.fn(),
};

export const mockCreateLLMProvider = vi.fn(() => mockLLMProvider);

/**
 * Set the default happy-path text returned by `.generate()`.
 * Useful for tests that want a specific response without rebuilding the stub.
 */
export function setLLMResponse(text: string, usage: Record<string, unknown> = { promptTokens: 10, completionTokens: 20 }) {
  mockLLMProvider.generate.mockResolvedValue({ text, usage });
  mockLLMProvider.complete.mockResolvedValue({ text, usage });
}

/**
 * Queue a retryable-looking error for the NEXT generate() call.
 * Codes `"429"` and `"503"` are the ones withLLMRetry treats as retryable.
 * Anything else is rethrown immediately.
 */
export function mockLLMError(code: '429' | '503' | '500' | '400' | '401' | string, message?: string) {
  const msg = message ?? defaultMessageFor(code);
  const err = new Error(msg);
  mockLLMProvider.generate.mockRejectedValueOnce(err);
  mockLLMProvider.complete.mockRejectedValueOnce(err);
  return err;
}

function defaultMessageFor(code: string): string {
  switch (code) {
    case '429':
      return 'OpenAI API Error: 429 Too Many Requests';
    case '503':
      return 'Anthropic API Error: 503 Service Unavailable';
    case '500':
      return 'Provider 500 Internal Server Error';
    case '400':
      return 'Provider 400 Bad Request';
    case '401':
      return 'Provider 401 Unauthorized';
    default:
      return `Provider error ${code}`;
  }
}

export function llmMockReset() {
  mockLLMProvider.generate.mockReset();
  mockLLMProvider.complete.mockReset();
  mockCreateLLMProvider.mockClear();
  mockCreateLLMProvider.mockImplementation(() => mockLLMProvider);
  setLLMResponse('Default mock LLM response mentioning TestBrand.');
}
