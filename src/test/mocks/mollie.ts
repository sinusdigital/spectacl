/**
 * Shared Mollie client mock for Tier 2+ tests.
 *
 * Usage in test files:
 *   vi.mock('@/lib/mollie', () => ({ getMollie: () => mockMollie }));
 *   import { mockMollie, mollieMockReset } from '@/test/mocks/mollie';
 *
 * Call mollieMockReset() in beforeEach to re-seed default happy-path behaviour.
 * Individual tests can override per-call via mockMollie.payments.get.mockResolvedValueOnce(...).
 */
import { vi } from 'vitest';

export const mockMollie = {
  payments: {
    create: vi.fn(),
    get: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    get: vi.fn(),
  },
  customerSubscriptions: {
    create: vi.fn(),
    cancel: vi.fn(),
    get: vi.fn(),
  },
  customerMandates: {
    page: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    cancel: vi.fn(),
  },
};

export function mockPaidPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tr_paid_default',
    status: 'paid',
    sequenceType: 'first',
    customerId: 'cst_default',
    subscriptionId: null,
    metadata: { spaceId: 'space-1', plan: 'PRO', userId: 'user-1', price: '99.00', netPrice: '99.00', taxType: 'STANDARD', taxRate: '0.21' },
    amount: { currency: 'EUR', value: '99.00' },
    getCheckoutUrl: () => 'https://checkout.mollie.test/tr_paid_default',
    ...overrides,
  };
}

export function mockFailedPayment(overrides: Record<string, unknown> = {}) {
  return mockPaidPayment({ id: 'tr_failed_default', status: 'failed', ...overrides });
}

export function mockRecurringPayment(overrides: Record<string, unknown> = {}) {
  return mockPaidPayment({
    id: 'tr_recurring_default',
    sequenceType: 'recurring',
    subscriptionId: 'sub_default',
    ...overrides,
  });
}

export function mollieMockReset() {
  Object.values(mockMollie).forEach((group) => {
    Object.values(group).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });

  // Default happy-path responses
  mockMollie.payments.create.mockResolvedValue({
    id: 'tr_created_default',
    getCheckoutUrl: () => 'https://checkout.mollie.test/tr_created_default',
  });
  mockMollie.payments.get.mockResolvedValue(mockPaidPayment());
  mockMollie.customers.create.mockResolvedValue({ id: 'cst_created_default', email: 'test@example.com' });
  mockMollie.customers.get.mockResolvedValue({ id: 'cst_default', email: 'test@example.com' });
  mockMollie.customerSubscriptions.create.mockResolvedValue({ id: 'sub_created_default', status: 'active' });
  mockMollie.customerSubscriptions.cancel.mockResolvedValue({ id: 'sub_default', status: 'canceled' });
  mockMollie.customerSubscriptions.get.mockResolvedValue({ id: 'sub_default', status: 'active', canceledAt: null });
  mockMollie.customerMandates.page.mockResolvedValue([{ status: 'valid', id: 'mdt_default' }]);
}
