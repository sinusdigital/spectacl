/**
 * Retry wrapper for transient LLM API errors (429 rate limit, 503 service unavailable).
 *
 * All 4 providers (OpenAI, Anthropic, Google, Mistral) include the HTTP status code
 * in their error messages, so we detect retryable errors by checking the message text.
 * This avoids modifying every provider while providing reliable retry behavior.
 *
 * Exponential backoff: 1s → 2s → 4s (3 retries max).
 */

const RETRYABLE_STATUS_CODES = ['429', '503'];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

function isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return RETRYABLE_STATUS_CODES.some(code => error.message.includes(code));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps an async LLM call with exponential backoff retry for transient errors.
 * Only retries on 429 (rate limit) and 503 (service unavailable).
 * All other errors are rethrown immediately.
 */
export async function withLLMRetry<T>(
    fn: () => Promise<T>,
    label: string = 'LLM call',
): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (!isRetryableError(error) || attempt === MAX_RETRIES) {
                throw error;
            }
            const delay = BASE_DELAY_MS * Math.pow(2, attempt);
            const msg = error instanceof Error ? error.message.slice(0, 100) : String(error);
            console.warn(
                `[LLM Retry] ${label} attempt ${attempt + 1}/${MAX_RETRIES} failed (${msg}). Retrying in ${delay}ms...`
            );
            await sleep(delay);
        }
    }

    // Unreachable — satisfies TypeScript return type
    throw new Error(`[LLM Retry] ${label} exhausted all retries`);
}
