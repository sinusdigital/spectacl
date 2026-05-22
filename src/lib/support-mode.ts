import { cookies } from 'next/headers';

const SUPPORT_SPACE_COOKIE = 'support-space-id';
const SUPPORT_WRITE_COOKIE = 'support-write-space-id';
const WRITE_TTL_SECONDS = 30 * 60; // 30 min

/**
 * Returns the spaceId the app admin is currently "entering" via support mode,
 * or null if not in support mode.
 *
 * Only meaningful when the caller has verified `User.role === "ADMIN"` and
 * resolved `{ kind: "admin-override" }` for this space — the cookie alone is
 * not authz.
 */
export async function getSupportSpaceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SUPPORT_SPACE_COOKIE)?.value ?? null;
}

export async function setSupportSpaceId(spaceId: string | null): Promise<void> {
  const store = await cookies();
  if (spaceId) {
    store.set(SUPPORT_SPACE_COOKIE, spaceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  } else {
    store.delete(SUPPORT_SPACE_COOKIE);
    store.delete(SUPPORT_WRITE_COOKIE);
  }
}

/**
 * True when the current admin-override session has opted into write mode
 * for the given spaceId. Defaults to read-only on entry; admin must
 * explicitly enable writes (30-min TTL, scoped to one spaceId).
 */
export async function isSupportWriteMode(spaceId: string): Promise<boolean> {
  const store = await cookies();
  return store.get(SUPPORT_WRITE_COOKIE)?.value === spaceId;
}

export async function setSupportWriteMode(spaceId: string, enabled: boolean): Promise<void> {
  const store = await cookies();
  if (enabled) {
    store.set(SUPPORT_WRITE_COOKIE, spaceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: WRITE_TTL_SECONDS,
    });
  } else {
    store.delete(SUPPORT_WRITE_COOKIE);
  }
}
