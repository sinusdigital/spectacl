/**
 * Subscription-sync reconciliation tests.
 *
 * Covers: self-hosted short-circuit, empty-sweep path, status mapping
 * (active→ACTIVE, canceled/completed→CANCELED, suspended→PAST_DUE, pending=null),
 * per-space error isolation, and the in-sync early-out.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPrisma, mockReset } from '@/test/mocks/prisma';
import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));

import { syncSubscriptions } from './subscription-sync';

beforeEach(() => {
  mockReset();
  mollieMockReset();
  vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
});

describe('syncSubscriptions', () => {
  it('returns empty success result in self-hosted mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

    const result = await syncSubscriptions();

    expect(result).toEqual({ success: true, checked: 0, corrected: 0, corrections: [] });
    expect(mockPrisma.space.findMany).not.toHaveBeenCalled();
    expect(mockMollie.customerSubscriptions.get).not.toHaveBeenCalled();
  });

  it('short-circuits when no eligible spaces exist', async () => {
    mockPrisma.space.findMany.mockResolvedValue([]);

    const result = await syncSubscriptions();

    expect(result).toEqual({ success: true, checked: 0, corrected: 0, corrections: [] });
    expect(mockMollie.customerSubscriptions.get).not.toHaveBeenCalled();
  });

  it('skips spaces already in sync with Mollie', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'InSync', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' },
    ]);
    mockMollie.customerSubscriptions.get.mockResolvedValue({ id: 'sub_1', status: 'active' });

    const result = await syncSubscriptions();

    expect(result.checked).toBe(1);
    expect(result.corrected).toBe(0);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('corrects ACTIVE → CANCELED drift when Mollie reports canceled', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Drifted', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' },
    ]);
    mockMollie.customerSubscriptions.get.mockResolvedValue({
      id: 'sub_1', status: 'canceled', canceledAt: '2026-04-10T00:00:00Z',
    });

    const result = await syncSubscriptions();

    expect(result.corrected).toBe(1);
    expect(result.corrections[0]).toMatchObject({
      spaceId: 's1', from: 'ACTIVE', to: 'CANCELED',
    });
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: expect.objectContaining({
        subscriptionStatus: 'CANCELED',
        canceledAt: new Date('2026-04-10T00:00:00Z'),
      }),
    });
  });

  it('maps Mollie "completed" to local CANCELED', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Done', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' },
    ]);
    mockMollie.customerSubscriptions.get.mockResolvedValue({ id: 'sub_1', status: 'completed' });

    const result = await syncSubscriptions();

    expect(result.corrected).toBe(1);
    expect(result.corrections[0].to).toBe('CANCELED');
  });

  it('maps Mollie "suspended" to local PAST_DUE', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Sus', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' },
    ]);
    mockMollie.customerSubscriptions.get.mockResolvedValue({ id: 'sub_1', status: 'suspended' });

    const result = await syncSubscriptions();

    expect(result.corrected).toBe(1);
    expect(result.corrections[0].to).toBe('PAST_DUE');
  });

  it('ignores Mollie "pending" status (unmapped)', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Pending', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' },
    ]);
    mockMollie.customerSubscriptions.get.mockResolvedValue({ id: 'sub_1', status: 'pending' });

    const result = await syncSubscriptions();

    expect(result.corrected).toBe(0);
    expect(mockPrisma.space.update).not.toHaveBeenCalled();
  });

  it('isolates per-space errors: one failure does not fail the whole sweep', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Bad', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' },
      { id: 's2', name: 'Good', mollieCustomerId: 'cst_2', mollieSubscriptionId: 'sub_2', subscriptionStatus: 'ACTIVE' },
    ]);
    mockMollie.customerSubscriptions.get
      .mockRejectedValueOnce(new Error('Mollie 404'))
      .mockResolvedValueOnce({ id: 'sub_2', status: 'canceled' });

    const result = await syncSubscriptions();

    expect(result.success).toBe(true);
    expect(result.checked).toBe(2);
    expect(result.corrected).toBe(1);
    expect(result.corrections[0].spaceId).toBe('s2');
  });

  it('returns error result when the initial space fetch itself throws', async () => {
    mockPrisma.space.findMany.mockRejectedValue(new Error('DB down'));

    const result = await syncSubscriptions();

    expect(result.success).toBe(false);
    expect(result.error).toContain('DB down');
  });

  it('PAST_DUE → ACTIVE drift: extends eligibility when Mollie reports active', async () => {
    mockPrisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Recovered', mollieCustomerId: 'cst_1', mollieSubscriptionId: 'sub_1', subscriptionStatus: 'PAST_DUE' },
    ]);
    mockMollie.customerSubscriptions.get.mockResolvedValue({ id: 'sub_1', status: 'active' });

    const result = await syncSubscriptions();

    expect(result.corrected).toBe(1);
    expect(mockPrisma.space.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { subscriptionStatus: 'ACTIVE' },
    });
  });
});
