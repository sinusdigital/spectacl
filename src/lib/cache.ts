/**
 * Redis-backed cache with TTL for near-static data (plan limits, model counts, etc.).
 *
 * Design decisions:
 * - Separate Redis connection from BullMQ (different maxRetriesPerRequest needs)
 * - Fail-open: Redis errors return fresh data from the source, never block
 * - JSON serialization — only cache JSON-serializable values
 * - Lazy connection — Redis client created on first use
 */

import IORedis from "ioredis";

// ── Redis singleton ──────────────────────────────────────────────────────────

let redis: IORedis | null = null;

function getRedis(): IORedis {
    if (!redis) {
        const url = process.env.REDIS_URL || process.env.REDIS_HOST
            ? `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`
            : "redis://localhost:6379";

        redis = new IORedis(url, {
            maxRetriesPerRequest: 2,
            lazyConnect: true,
            connectTimeout: 3000,
        });

        redis.on("error", (err: Error) => {
            console.error("[Cache] Redis error:", err.message);
        });
    }
    return redis;
}

// ── Cache key prefix ─────────────────────────────────────────────────────────

const PREFIX = "spectacl:cache:";

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a cached value, or compute and cache it.
 * Fail-open: if Redis is down, always calls compute() and skips caching.
 */
export async function cached<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
): Promise<T> {
    const fullKey = `${PREFIX}${key}`;

    // Try cache hit
    try {
        const client = getRedis();
        const hit = await client.get(fullKey);
        if (hit !== null) {
            return JSON.parse(hit) as T;
        }
    } catch {
        // Redis down — fall through to compute
    }

    // Cache miss — compute fresh value
    const value = await compute();

    // Store in cache (non-blocking, fail-silent)
    try {
        const client = getRedis();
        await client.set(fullKey, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
        // Redis down — skip caching
    }

    return value;
}

/**
 * Invalidate a specific cache key.
 */
export async function invalidateCache(key: string): Promise<void> {
    try {
        const client = getRedis();
        await client.del(`${PREFIX}${key}`);
    } catch {
        // Redis down — skip
    }
}

/**
 * Invalidate all cache keys matching a prefix pattern.
 * Use sparingly — KEYS command can be slow on large Redis instances.
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
    try {
        const client = getRedis();
        const keys = await client.keys(`${PREFIX}${prefix}*`);
        if (keys.length > 0) {
            await client.del(...keys);
        }
    } catch {
        // Redis down — skip
    }
}
