/**
 * Shared ioredis mock for Tier 2+ tests.
 *
 * Usage in test files:
 *   vi.mock('ioredis', () => ({ default: vi.fn(() => mockRedis) }));
 *   import { mockRedis, redisMockReset } from '@/test/mocks/redis';
 *
 * Fail-open: individual tests can override methods to reject to exercise
 * fail-open branches (e.g. cache.ts falls through to computeFn on Redis error).
 */
import { vi } from 'vitest';

export const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  eval: vi.fn(),
  keys: vi.fn(),
  scan: vi.fn(),
  pipeline: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

export function redisMockReset() {
  Object.values(mockRedis).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  // Default happy-path: empty cache, successful writes
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.setex.mockResolvedValue('OK');
  mockRedis.del.mockResolvedValue(1);
  mockRedis.incr.mockResolvedValue(1);
  mockRedis.expire.mockResolvedValue(1);
  mockRedis.eval.mockResolvedValue(0);
  mockRedis.keys.mockResolvedValue([]);
  mockRedis.scan.mockResolvedValue(['0', []]);
  mockRedis.quit.mockResolvedValue('OK');
  mockRedis.connect.mockResolvedValue(undefined);
  // pipeline returns a chainable stub
  mockRedis.pipeline.mockReturnValue({
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  });
}
