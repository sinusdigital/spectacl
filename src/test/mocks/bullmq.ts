/**
 * Shared BullMQ mock for Tier 2+ tests.
 *
 * Usage in test files:
 *   vi.mock('bullmq', () => ({
 *     Queue: MockQueue,
 *     Worker: MockWorker,
 *     QueueEvents: MockQueueEvents,
 *   }));
 *   import { bullmqMockReset, mockQueueAdd } from '@/test/mocks/bullmq';
 */
import { vi } from 'vitest';

export const mockQueueAdd = vi.fn();
export const mockQueueAddBulk = vi.fn();
export const mockQueueRemove = vi.fn();
export const mockQueueGetJob = vi.fn();
export const mockQueueGetDelayed = vi.fn();
export const mockQueueGetWaiting = vi.fn();
export const mockQueueClose = vi.fn();

export class MockQueue {
  name: string;
  add = mockQueueAdd;
  addBulk = mockQueueAddBulk;
  remove = mockQueueRemove;
  getJob = mockQueueGetJob;
  getDelayed = mockQueueGetDelayed;
  getWaiting = mockQueueGetWaiting;
  close = mockQueueClose;

  constructor(name: string) {
    this.name = name;
  }
}

export class MockWorker {
  name: string;
  on = vi.fn();
  close = vi.fn();
  run = vi.fn();

  constructor(name: string) {
    this.name = name;
  }
}

export class MockQueueEvents {
  on = vi.fn();
  close = vi.fn();
  constructor(_name: string) {}
}

export function bullmqMockReset() {
  [mockQueueAdd, mockQueueAddBulk, mockQueueRemove, mockQueueGetJob, mockQueueGetDelayed, mockQueueGetWaiting, mockQueueClose].forEach((fn) => fn.mockReset());
  mockQueueAdd.mockResolvedValue({ id: 'job_default' });
  mockQueueAddBulk.mockResolvedValue([]);
  mockQueueRemove.mockResolvedValue(1);
  mockQueueGetJob.mockResolvedValue(null);
  mockQueueGetDelayed.mockResolvedValue([]);
  mockQueueGetWaiting.mockResolvedValue([]);
  mockQueueClose.mockResolvedValue(undefined);
}
