import IORedis from "ioredis";
import { NextRequest } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
}

// ── Rate limit rules ──────────────────────────────────────────────────────────
// Keyed by endpoint path suffix. First match wins.

const RATE_LIMITS: { suffix: string; key: string; config: RateLimitConfig }[] = [
    {
        suffix: "/sign-up/email",
        key: "signup",
        config: { windowMs: 3_600_000, maxRequests: 5 },       // 5 per hour
    },
    {
        suffix: "/sign-in/email",
        key: "signin",
        config: { windowMs: 60_000, maxRequests: 10 },         // 10 per minute
    },
    {
        suffix: "/magic-link/send-magic-link",
        key: "magic-link",
        config: { windowMs: 900_000, maxRequests: 5 },         // 5 per 15 min
    },
];

const DEFAULT_CONFIG: { key: string; config: RateLimitConfig } = {
    key: "auth",
    config: { windowMs: 60_000, maxRequests: 30 },             // 30 per minute
};

// ── Redis connection (lazy singleton) ─────────────────────────────────────────
// Separate from the BullMQ connection which sets maxRetriesPerRequest: null.

let redis: IORedis | null = null;

function getRedis(): IORedis {
    if (!redis) {
        redis = process.env.REDIS_URL
            ? new IORedis(process.env.REDIS_URL, { lazyConnect: true })
            : new IORedis({
                  host: process.env.REDIS_HOST || "localhost",
                  port: parseInt(process.env.REDIS_PORT || "6379"),
                  lazyConnect: true,
              });

        redis.on("error", (err) => {
            console.error("[Rate Limit] Redis error:", err.message);
        });

        redis.connect().catch(() => {
            // Handled by the error listener above
        });
    }
    return redis;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts the client IP from the request.
 * In production the app sits behind Coolify/Traefik, which sets x-forwarded-for.
 */
export function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        // x-forwarded-for can be "client, proxy1, proxy2" — take the first
        const first = forwarded.split(",")[0].trim();
        if (first) return first;
    }
    return "unknown";
}

/**
 * Resolves the rate limit config for a given pathname.
 * Returns the first matching suffix rule, or the default.
 */
export function resolveEndpointConfig(pathname: string): {
    key: string;
    config: RateLimitConfig;
} {
    for (const rule of RATE_LIMITS) {
        if (pathname.endsWith(rule.suffix)) {
            return { key: rule.key, config: rule.config };
        }
    }
    return DEFAULT_CONFIG;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Checks whether a request is within rate limits.
 *
 * Uses a Redis fixed-window counter (INCR + EXPIRE NX).
 * Fails open — if Redis is unreachable, the request is allowed through.
 */
export async function checkRateLimit(
    request: NextRequest
): Promise<RateLimitResult> {
    const ip = getClientIp(request);
    const { key: endpointKey, config } = resolveEndpointConfig(
        request.nextUrl.pathname
    );

    const windowSeconds = Math.ceil(config.windowMs / 1000);
    const bucket = Math.floor(Date.now() / config.windowMs);
    const redisKey = `spectacl:rl:${endpointKey}:${ip}:${bucket}`;

    try {
        const client = getRedis();
        const pipeline = client.pipeline();
        pipeline.incr(redisKey);
        pipeline.expire(redisKey, windowSeconds, "NX");
        const results = await pipeline.exec();

        // results[0] = [error, count] from INCR
        const count = (results?.[0]?.[1] as number) ?? 1;
        const remaining = Math.max(0, config.maxRequests - count);
        const allowed = count <= config.maxRequests;

        return {
            allowed,
            limit: config.maxRequests,
            remaining,
            retryAfterSeconds: allowed ? 0 : windowSeconds,
        };
    } catch (err) {
        // Fail open — never block auth because Redis is down
        console.error("[Rate Limit] Redis unavailable, allowing request:", err);
        return {
            allowed: true,
            limit: config.maxRequests,
            remaining: config.maxRequests,
            retryAfterSeconds: 0,
        };
    }
}
