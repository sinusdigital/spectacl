/**
 * Middleware tests — CSRF + auth gate for Next.js routes.
 *
 * These tests stub `NextRequest` / `NextResponse` minimally since jsdom/Node
 * don't ship a real Web Request/Response in all Vitest environments.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from './middleware';

type FakeCookieJar = Map<string, { name: string; value: string }>;

interface FakeRequestInit {
  method?: string;
  url?: string;
  pathname?: string;
  origin?: string | null;
  cookies?: Record<string, string>;
}

function makeRequest(init: FakeRequestInit = {}) {
  const method = init.method ?? 'GET';
  const pathname = init.pathname ?? '/dashboard';
  const url = init.url ?? `http://localhost:3000${pathname}`;
  const cookieJar: FakeCookieJar = new Map(
    Object.entries(init.cookies ?? {}).map(([k, v]) => [k, { name: k, value: v }]),
  );
  const headers = new Map<string, string>();
  if (init.origin) headers.set('origin', init.origin);
  return {
    method,
    url,
    nextUrl: { pathname },
    cookies: {
      get: (name: string) => cookieJar.get(name),
    },
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
  } as unknown as Parameters<typeof middleware>[0];
}

describe('middleware — public route matching', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const publicPaths = [
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/verify',
    '/privacy',
    '/terms',
    '/api/auth/sign-in',
    '/api/public/some-route',
    '/api/waitlist',
    '/api/webhooks/mollie',
    '/api/cron/scheduler',
    '/invite/abc',
    '/api/invitations/xyz',
    '/monitoring',
    '/icon-light.png',
    '/icon-dark.png',
    '/apple-icon.png',
  ];

  for (const path of publicPaths) {
    it(`allows public route ${path} without a session`, () => {
      const res = middleware(makeRequest({ pathname: path }));
      expect(res.status).toBe(200); // NextResponse.next() produces 200 by default
    });
  }
});

describe('middleware — auth gate', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 JSON for unauthenticated API requests', () => {
    const res = middleware(makeRequest({ pathname: '/api/entities' }));
    expect(res.status).toBe(401);
  });

  it('redirects unauthenticated page requests to /signup with ?from=', () => {
    const res = middleware(makeRequest({ pathname: '/dashboard' }));
    expect(res.status).toBe(307); // NextResponse.redirect → 307 temporary redirect
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/signup');
    expect(location).toContain('from=%2Fdashboard');
  });

  it('allows authenticated requests with plain session cookie', () => {
    const res = middleware(
      makeRequest({
        pathname: '/dashboard',
        cookies: { 'better-auth.session_token': 'abc' },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('allows authenticated requests with __Secure- prefixed cookie', () => {
    const res = middleware(
      makeRequest({
        pathname: '/dashboard',
        cookies: { '__Secure-better-auth.session_token': 'abc' },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe('middleware — CSRF origin check', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET requests never trigger CSRF check even with cross-origin header', () => {
    const res = middleware(
      makeRequest({
        method: 'GET',
        pathname: '/dashboard',
        origin: 'https://evil.com',
        cookies: { 'better-auth.session_token': 'abc' },
      }),
    );
    expect(res.status).toBe(200);
  });

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    it(`${method} with cross-origin Origin header is rejected 403`, () => {
      const res = middleware(
        makeRequest({
          method,
          pathname: '/api/entities',
          origin: 'https://evil.com',
          cookies: { 'better-auth.session_token': 'abc' },
        }),
      );
      expect(res.status).toBe(403);
    });

    it(`${method} with same-origin Origin header passes`, () => {
      const res = middleware(
        makeRequest({
          method,
          pathname: '/api/entities',
          origin: 'http://localhost:3000',
          cookies: { 'better-auth.session_token': 'abc' },
        }),
      );
      expect(res.status).toBe(200);
    });

    it(`${method} with no Origin header is allowed (same-origin relies on SameSite cookies)`, () => {
      const res = middleware(
        makeRequest({
          method,
          pathname: '/api/entities',
          origin: null,
          cookies: { 'better-auth.session_token': 'abc' },
        }),
      );
      expect(res.status).toBe(200);
    });
  }

  it('public routes skip the CSRF check even with cross-origin Origin', () => {
    // /api/webhooks is public → CSRF check should never run
    const res = middleware(
      makeRequest({
        method: 'POST',
        pathname: '/api/webhooks/mollie',
        origin: 'https://mollie.com',
      }),
    );
    expect(res.status).toBe(200);
  });
});
