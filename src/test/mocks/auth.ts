/**
 * Shared auth mock for API route tests.
 *
 * Canonical usage in a test file (note: mocks are hoisted, so `mockAuth` must
 * be imported from this file inside the factory via `vi.hoisted` or via the
 * factory re-importing the shared instance):
 *
 *   // Top-level in your test file:
 *   vi.mock('@/lib/auth', async () => {
 *     const { mockAuth } = await import('@/test/mocks/auth');
 *     return { auth: mockAuth };
 *   });
 *   vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
 *
 *   import { mockAuth, mockSession, authMockReset } from '@/test/mocks/auth';
 *
 *   beforeEach(() => {
 *     authMockReset();
 *     mockSession({ userId: 'user-1', role: 'ADMIN' });
 *   });
 *
 * `mockSession()` sets the NEXT call on `auth.api.getSession` to resolve to the
 * given shape. Call again (or use mockResolvedValueOnce directly) for
 * per-test overrides. `mockNoSession()` resolves to `null` for the unauth case.
 */
import { vi } from 'vitest';

export interface MockSessionOptions {
  userId?: string;
  /** `role` on the user object — admin check uses uppercase `"ADMIN"`. */
  role?: string;
  email?: string;
  name?: string;
  /** Optional spaceId attached for convenience; not standard on better-auth. */
  spaceId?: string;
}

export const mockAuth = {
  api: {
    getSession: vi.fn(),
  },
  handler: vi.fn(),
};

/**
 * Seed the next `auth.api.getSession()` call with a session shaped like
 * what better-auth returns: `{ user, session }`. Uses `mockResolvedValue`
 * (not `Once`) so subsequent calls in the same test also see this session
 * unless overridden.
 */
export function mockSession(opts: MockSessionOptions = {}) {
  const user = {
    id: opts.userId ?? 'user-default',
    email: opts.email ?? 'test@example.com',
    name: opts.name ?? 'Test User',
    role: opts.role ?? 'USER',
    ...(opts.spaceId ? { spaceId: opts.spaceId } : {}),
  };
  mockAuth.api.getSession.mockResolvedValue({
    user,
    session: { id: 'sess-default', userId: user.id },
  });
  return user;
}

/** Stub `getSession()` to return null for unauthenticated requests. */
export function mockNoSession() {
  mockAuth.api.getSession.mockResolvedValue(null);
}

export function authMockReset() {
  mockAuth.api.getSession.mockReset();
  mockAuth.handler.mockReset();
  // Default: no session unless a test calls mockSession()
  mockAuth.api.getSession.mockResolvedValue(null);
}
