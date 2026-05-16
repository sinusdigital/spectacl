/**
 * Cache helper tests — fail-open contract on Redis errors.
 *
 * Mocks `ioredis` at the module boundary so each test gets the shared
 * `mockRedis` instance via `src/test/mocks/redis.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRedis, redisMockReset } from '@/test/mocks/redis';

// ioredis is imported as `import IORedis from "ioredis"` in cache.ts — we mock
// the default export as a constructor that returns our shared stub.
vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis),
}));

import { cached, invalidateCache, invalidateCacheByPrefix } from './cache';

beforeEach(() => {
  redisMockReset();
});

describe('cached()', () => {
  it('returns parsed cached value on hit without calling compute', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));
    const compute = vi.fn();

    const result = await cached('k1', 60, compute);

    expect(result).toEqual({ foo: 'bar' });
    expect(compute).not.toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalledWith('spectacl:cache:k1');
  });

  it('calls compute on cache miss and stores result with TTL', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const compute = vi.fn().mockResolvedValue({ answer: 42 });

    const result = await cached('k2', 120, compute);

    expect(result).toEqual({ answer: 42 });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'spectacl:cache:k2',
      JSON.stringify({ answer: 42 }),
      'EX',
      120,
    );
  });

  it('fail-open: falls through to compute when Redis get throws', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('redis down'));
    const compute = vi.fn().mockResolvedValue('fresh');

    const result = await cached('k3', 60, compute);

    expect(result).toBe('fresh');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('fail-open: swallows Redis set errors and still returns computed value', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.set.mockRejectedValueOnce(new Error('redis down'));
    const compute = vi.fn().mockResolvedValue('fresh');

    const result = await cached('k4', 60, compute);

    expect(result).toBe('fresh');
  });

  it('does NOT swallow errors thrown by compute()', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const compute = vi.fn().mockRejectedValue(new Error('DB down'));

    await expect(cached('k5', 60, compute)).rejects.toThrow('DB down');
  });

  it('namespaces keys under the "spectacl:cache:" prefix', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    await cached('plans:PRO', 60, async () => ({}));
    expect(mockRedis.get).toHaveBeenCalledWith('spectacl:cache:plans:PRO');
  });

  it('round-trips complex values via JSON', async () => {
    const cachedJson = JSON.stringify([1, 2, { nested: true }]);
    mockRedis.get.mockResolvedValueOnce(cachedJson);
    const result = await cached('arr', 60, async () => []);
    expect(result).toEqual([1, 2, { nested: true }]);
  });
});

describe('invalidateCache()', () => {
  it('deletes the prefixed key', async () => {
    await invalidateCache('plans:PRO');
    expect(mockRedis.del).toHaveBeenCalledWith('spectacl:cache:plans:PRO');
  });

  it('fail-open: does not throw when Redis is down', async () => {
    mockRedis.del.mockRejectedValueOnce(new Error('redis down'));
    await expect(invalidateCache('k')).resolves.toBeUndefined();
  });
});

describe('invalidateCacheByPrefix()', () => {
  it('scans keys matching the prefix and deletes them', async () => {
    mockRedis.keys.mockResolvedValueOnce([
      'spectacl:cache:plans:PRO',
      'spectacl:cache:plans:STARTER',
    ]);

    await invalidateCacheByPrefix('plans:');

    expect(mockRedis.keys).toHaveBeenCalledWith('spectacl:cache:plans:*');
    expect(mockRedis.del).toHaveBeenCalledWith(
      'spectacl:cache:plans:PRO',
      'spectacl:cache:plans:STARTER',
    );
  });

  it('does not call del() when no keys match', async () => {
    mockRedis.keys.mockResolvedValueOnce([]);

    await invalidateCacheByPrefix('nothing:');

    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('fail-open: does not throw when Redis keys() errors', async () => {
    mockRedis.keys.mockRejectedValueOnce(new Error('redis down'));
    await expect(invalidateCacheByPrefix('x')).resolves.toBeUndefined();
  });
});
