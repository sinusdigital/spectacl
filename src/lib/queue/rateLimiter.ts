/**
 * Per-provider rate limiting for LLM API calls.
 * Uses Bottleneck with Redis-backed clustering so limits are shared
 * across all worker processes (distributed rate limiting).
 *
 * Usage:
 *   const limiter = getProviderLimiter('openai');
 *   const result = await limiter.schedule(() => provider.generate(prompt));
 */

import Bottleneck from 'bottleneck';

// Redis connection options for Bottleneck clustering.
// Uses the same REDIS_URL as BullMQ to avoid extra infrastructure.
function getRedisOptions() {
    if (process.env.REDIS_URL) {
        // Parse REDIS_URL into host/port/password for Bottleneck's ioredis-compatible options
        try {
            const url = new URL(process.env.REDIS_URL);
            return {
                host: url.hostname,
                port: parseInt(url.port || '6379'),
                ...(url.password ? { password: url.password } : {}),
                ...(url.pathname && url.pathname !== '/' ? { db: parseInt(url.pathname.slice(1)) } : {}),
            };
        } catch {
            // Fallback if URL parsing fails
            return { host: 'localhost', port: 6379 };
        }
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    };
}

/**
 * Rate limit configurations per LLM provider.
 * Conservative values — stay under tier-1 API minimums to avoid bans.
 *
 * maxConcurrent: max simultaneous in-flight requests
 * minTime: minimum ms between request starts (1000/minTime ≈ max RPS)
 * reservoir: requests per window (acts as hard RPM cap)
 * reservoirRefreshInterval: window duration in ms
 */
const PROVIDER_LIMITS: Record<string, { maxConcurrent: number; minTime: number; reservoir: number; reservoirRefreshInterval: number }> = {
    openai: {
        maxConcurrent: 10,
        minTime: 150,          // ~6.7 RPS
        reservoir: 400,        // 400 per minute
        reservoirRefreshInterval: 60_000,
    },
    anthropic: {
        maxConcurrent: 5,
        minTime: 300,          // ~3.3 RPS
        reservoir: 200,        // 200 per minute
        reservoirRefreshInterval: 60_000,
    },
    google: {
        maxConcurrent: 8,
        minTime: 200,          // ~5 RPS
        reservoir: 300,        // 300 per minute
        reservoirRefreshInterval: 60_000,
    },
    mistral: {
        maxConcurrent: 5,
        minTime: 300,          // ~3.3 RPS
        reservoir: 200,        // 200 per minute
        reservoirRefreshInterval: 60_000,
    },
};

// Default limits for unknown providers
const DEFAULT_LIMITS = {
    maxConcurrent: 3,
    minTime: 500,
    reservoir: 120,
    reservoirRefreshInterval: 60_000,
};

// Cache limiter instances so we don't create duplicates
const limiters = new Map<string, Bottleneck>();

/**
 * Get or create a rate limiter for a specific LLM provider.
 * Limiters are Redis-backed (Bottleneck Clustering) so they work
 * across multiple worker processes.
 */
export function getProviderLimiter(provider: string): Bottleneck {
    const key = provider.toLowerCase();

    if (limiters.has(key)) {
        return limiters.get(key)!;
    }

    const config = PROVIDER_LIMITS[key] || DEFAULT_LIMITS;
    const redisOpts = getRedisOptions();

    const limiter = new Bottleneck({
        // Clustering: use Redis so limits are shared across processes
        id: `spectacl-limiter-${key}`,
        datastore: 'ioredis',
        clientOptions: redisOpts,

        // Rate limit settings
        maxConcurrent: config.maxConcurrent,
        minTime: config.minTime,
        reservoir: config.reservoir,
        reservoirRefreshInterval: config.reservoirRefreshInterval,
        reservoirRefreshAmount: config.reservoir,
    });

    // Log rate limit events for visibility
    limiter.on('error', (err) => {
        console.error(`[RateLimiter] [${key}] Error:`, err);
    });

    limiters.set(key, limiter);
    return limiter;
}

/**
 * Gracefully shut down all limiter connections.
 * Call this when the worker process is stopping.
 */
export async function shutdownLimiters() {
    const promises = Array.from(limiters.values()).map(l =>
        l.disconnect().catch(() => { /* ignore shutdown errors */ })
    );
    await Promise.all(promises);
    limiters.clear();
}
