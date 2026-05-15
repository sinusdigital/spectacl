/**
 * Shared Resend mock for email-sending tests.
 *
 * Usage in test files:
 *   vi.mock('@/lib/email', () => ({ resend: mockResend }));
 *   import { mockResend, resendMockReset } from '@/test/mocks/resend';
 *
 * To simulate failures:
 *   mockResend.emails.send.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } });
 *   mockResend.emails.send.mockRejectedValueOnce(new Error('Network error'));
 */
import { vi } from 'vitest';

export const mockResend = {
  emails: {
    send: vi.fn(),
  },
};

export function resendMockReset() {
  mockResend.emails.send.mockReset();
  // Default happy path: successful send
  mockResend.emails.send.mockResolvedValue({
    data: { id: 'mock-email-id' },
    error: null,
  });
}
