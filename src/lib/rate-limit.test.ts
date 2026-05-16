import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { mockRedis, redisMockReset } from "@/test/mocks/redis";

vi.mock("ioredis", () => ({ default: vi.fn(() => mockRedis) }));

import { getClientIp, resolveEndpointConfig, checkRateLimit } from "./rate-limit";

// ── getClientIp ───────────────────────────────────────────────────────────────

describe("getClientIp", () => {
    const makeRequest = (headers: Record<string, string> = {}) =>
        ({
            headers: {
                get: (key: string) => headers[key.toLowerCase()] ?? null,
            },
        }) as unknown as NextRequest;

    it("extracts single IP from x-forwarded-for", () => {
        const req = makeRequest({ "x-forwarded-for": "203.0.113.5" });
        expect(getClientIp(req)).toBe("203.0.113.5");
    });

    it("extracts first IP from comma-separated list", () => {
        const req = makeRequest({
            "x-forwarded-for": "203.0.113.5, 10.0.0.1, 172.16.0.1",
        });
        expect(getClientIp(req)).toBe("203.0.113.5");
    });

    it("trims whitespace from IP", () => {
        const req = makeRequest({
            "x-forwarded-for": "  203.0.113.5 , 10.0.0.1",
        });
        expect(getClientIp(req)).toBe("203.0.113.5");
    });

    it('returns "unknown" when header is missing', () => {
        const req = makeRequest({});
        expect(getClientIp(req)).toBe("unknown");
    });

    it('returns "unknown" when header is empty', () => {
        const req = makeRequest({ "x-forwarded-for": "" });
        expect(getClientIp(req)).toBe("unknown");
    });
});

// ── resolveEndpointConfig ─────────────────────────────────────────────────────

describe("resolveEndpointConfig", () => {
    it("matches signup endpoint", () => {
        const result = resolveEndpointConfig("/api/auth/sign-up/email");
        expect(result.key).toBe("signup");
        expect(result.config.maxRequests).toBe(5);
        expect(result.config.windowMs).toBe(3_600_000); // 1 hour
    });

    it("matches signin endpoint", () => {
        const result = resolveEndpointConfig("/api/auth/sign-in/email");
        expect(result.key).toBe("signin");
        expect(result.config.maxRequests).toBe(10);
        expect(result.config.windowMs).toBe(60_000); // 1 minute
    });

    it("matches magic link endpoint", () => {
        const result = resolveEndpointConfig(
            "/api/auth/magic-link/send-magic-link"
        );
        expect(result.key).toBe("magic-link");
        expect(result.config.maxRequests).toBe(5);
        expect(result.config.windowMs).toBe(900_000); // 15 minutes
    });

    it("returns default config for unknown endpoints", () => {
        const result = resolveEndpointConfig("/api/auth/session");
        expect(result.key).toBe("auth");
        expect(result.config.maxRequests).toBe(30);
        expect(result.config.windowMs).toBe(60_000); // 1 minute
    });

    it("returns default config for callback endpoints", () => {
        const result = resolveEndpointConfig("/api/auth/callback/google");
        expect(result.key).toBe("auth");
        expect(result.config.maxRequests).toBe(30);
    });
});

// ── checkRateLimit ────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
    beforeEach(() => {
        redisMockReset();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function pipelineReturning(count: number) {
        const pipe = {
            incr: vi.fn().mockReturnThis(),
            expire: vi.fn().mockReturnThis(),
            exec: vi.fn().mockResolvedValue([[null, count]]),
        };
        mockRedis.pipeline.mockReturnValue(pipe);
        return pipe;
    }

    function makeRequest(pathname: string, headers: Record<string, string> = {}) {
        return {
            nextUrl: { pathname },
            headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
        } as unknown as NextRequest;
    }

    it("allows requests under the limit", async () => {
        pipelineReturning(3); // signup limit = 5 per hour
        const result = await checkRateLimit(
            makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "1.2.3.4" }),
        );
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(5);
        expect(result.remaining).toBe(2);
        expect(result.retryAfterSeconds).toBe(0);
    });

    it("blocks requests exactly at the limit boundary (count > max)", async () => {
        pipelineReturning(6); // one over the limit of 5
        const result = await checkRateLimit(
            makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "1.2.3.4" }),
        );
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterSeconds).toBe(3600); // 1h window
    });

    it("permits exactly at-the-limit count (== maxRequests)", async () => {
        pipelineReturning(5); // exactly at limit
        const result = await checkRateLimit(
            makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "1.2.3.4" }),
        );
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(0);
    });

    it("fails open when Redis pipeline rejects", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        mockRedis.pipeline.mockReturnValue({
            incr: vi.fn().mockReturnThis(),
            expire: vi.fn().mockReturnThis(),
            exec: vi.fn().mockRejectedValue(new Error("redis down")),
        });

        const result = await checkRateLimit(
            makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "1.2.3.4" }),
        );

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(result.limit);
    });

    it("tracks different endpoints + IPs with distinct Redis keys (bucketed by window)", async () => {
        const pipe1 = pipelineReturning(1);
        await checkRateLimit(makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "1.1.1.1" }));
        const pipe2 = pipelineReturning(1);
        await checkRateLimit(makeRequest("/api/auth/sign-in/email", { "x-forwarded-for": "2.2.2.2" }));

        const key1 = pipe1.incr.mock.calls[0][0] as string;
        const key2 = pipe2.incr.mock.calls[0][0] as string;
        expect(key1).toContain(":signup:1.1.1.1:");
        expect(key2).toContain(":signin:2.2.2.2:");
        expect(key1).not.toBe(key2);
    });

    it("uses different bucket per window boundary (fixed-window math)", async () => {
        vi.useFakeTimers();
        // signup windowMs = 3_600_000, so bucket = floor(Date.now / 3600000)
        vi.setSystemTime(new Date("2026-04-17T10:00:00Z"));
        const pipe1 = pipelineReturning(1);
        await checkRateLimit(makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "9.9.9.9" }));
        const key1 = pipe1.incr.mock.calls[0][0] as string;

        // Advance 1 hour — next bucket
        vi.setSystemTime(new Date("2026-04-17T11:30:00Z"));
        const pipe2 = pipelineReturning(1);
        await checkRateLimit(makeRequest("/api/auth/sign-up/email", { "x-forwarded-for": "9.9.9.9" }));
        const key2 = pipe2.incr.mock.calls[0][0] as string;

        expect(key1).not.toBe(key2);
        vi.useRealTimers();
    });
});
