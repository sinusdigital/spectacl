/**
 * Shared SystemSettings mock.
 *
 * Usage in test files:
 *   vi.mock('@/lib/settings', () => ({ SystemSettings: mockSystemSettings }));
 *   import { mockSystemSettings, systemSettingsMockReset, seedSetting } from '@/test/mocks/systemSettings';
 *
 * Defaults seed common keys (seller info, allow_negative_credits, invoice_prefix).
 * Override per-test with seedSetting(key, value).
 */
import { vi } from 'vitest';

const store = new Map<string, string | null>();

export const mockSystemSettings = {
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  getMany: vi.fn(async (keys: string[]) => {
    const out: Record<string, string | null> = {};
    for (const k of keys) out[k] = store.get(k) ?? null;
    return out;
  }),
  set: vi.fn(async (key: string, value: string | null) => {
    store.set(key, value);
  }),
  delete: vi.fn(async (key: string) => {
    store.delete(key);
  }),
};

export function seedSetting(key: string, value: string | null) {
  store.set(key, value);
}

export function systemSettingsMockReset() {
  store.clear();
  mockSystemSettings.get.mockClear();
  mockSystemSettings.getMany.mockClear();
  mockSystemSettings.set.mockClear();
  mockSystemSettings.delete.mockClear();

  // Seed common defaults
  store.set('seller_company_name', 'Sinus Digital B.V.');
  store.set('seller_street', 'Test Street 1');
  store.set('seller_city', 'Amsterdam');
  store.set('seller_postal_code', '1000 AA');
  store.set('seller_country', 'NL');
  store.set('seller_vat_id', 'NL123456789B01');
  store.set('invoice_prefix', 'SPE');
  store.set('allow_negative_credits', 'false');
  store.set('trial_days', '14');
}
