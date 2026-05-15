import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withLLMRetry } from './retry';

describe('withLLMRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns immediately on success', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        const result = await withLLMRetry(fn, 'test');
        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on non-retryable errors', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'));
        await expect(withLLMRetry(fn, 'test')).rejects.toThrow('Invalid API key');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 errors and succeeds', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('OpenAI API Error: 429 Too Many Requests'))
            .mockResolvedValue('ok');

        const promise = withLLMRetry(fn, 'test');
        await vi.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 503 errors and succeeds', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('Anthropic API Error: 503 Service Unavailable'))
            .mockResolvedValue('ok');

        const promise = withLLMRetry(fn, 'test');
        await vi.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('exhausts all retries and throws on persistent 429', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('OpenAI API Error: 429 Rate Limited'));

        const promise = withLLMRetry(fn, 'test');
        // Attach rejection handler immediately to prevent unhandled rejection
        const rejection = expect(promise).rejects.toThrow('429 Rate Limited');
        // Advance through all retry delays: 1s + 2s + 4s
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(4000);

        await rejection;
        expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('does not retry on 400 errors', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('Google API Error: 400 Bad Request'));
        await expect(withLLMRetry(fn, 'test')).rejects.toThrow('400 Bad Request');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 401 errors', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('Anthropic API Error: 401 Unauthorized'));
        await expect(withLLMRetry(fn, 'test')).rejects.toThrow('401 Unauthorized');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    // ── Edge-case gap coverage ────────────────────────────────────────────

    it('retries on substring "429" appearing anywhere in the message (known false-positive risk)', async () => {
        // FINDING: isRetryableError uses .includes('429'). A token-count like
        // "quota: used 4291 of 5000" would also trigger a retry. This test
        // pins the current permissive behaviour so we notice when it changes.
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('quota: used 4291 of 5000'))
            .mockResolvedValue('ok');

        const promise = withLLMRetry(fn, 'test');
        await vi.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-Error rejections (string)', async () => {
        const fn = vi.fn().mockRejectedValue('429 rate limit as bare string');
        await expect(withLLMRetry(fn, 'test')).rejects.toBe('429 rate limit as bare string');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does not retry non-Error rejections (number)', async () => {
        const fn = vi.fn().mockRejectedValue(429);
        await expect(withLLMRetry(fn, 'test')).rejects.toBe(429);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('uses exponential backoff delays of 1s, 2s, 4s', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('429 rate limit'));
        const promise = withLLMRetry(fn, 'test');
        const rejection = expect(promise).rejects.toThrow();

        // 1st retry after 1s
        expect(fn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(999);
        expect(fn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(fn).toHaveBeenCalledTimes(2);

        // 2nd retry after 2s
        await vi.advanceTimersByTimeAsync(1999);
        expect(fn).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(1);
        expect(fn).toHaveBeenCalledTimes(3);

        // 3rd retry after 4s
        await vi.advanceTimersByTimeAsync(3999);
        expect(fn).toHaveBeenCalledTimes(3);
        await vi.advanceTimersByTimeAsync(1);
        expect(fn).toHaveBeenCalledTimes(4);

        await rejection;
    });

    it('handles Error with no message property (empty string)', async () => {
        const err = new Error('');
        const fn = vi.fn().mockRejectedValue(err);
        await expect(withLLMRetry(fn, 'test')).rejects.toBe(err);
        // Empty message does not contain "429" or "503" → no retry
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
