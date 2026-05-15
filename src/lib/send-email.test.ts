/**
 * send-email.ts tests — never-throws contract, delivery logging,
 * and a happy-path sanity render.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockResend, resendMockReset } from '@/test/mocks/resend';

vi.mock('@/lib/email', () => ({ resend: mockResend }));

import { sendEmail, renderEmail } from './send-email';
import { createElement, type FC } from 'react';

beforeEach(() => {
  resendMockReset();
});

describe('sendEmail', () => {
  it('returns { success: true, id } on happy path', async () => {
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: 'em_1' }, error: null });

    const result = await sendEmail({
      from: 'hello@mail.spectacl.org',
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>hi</p>',
      label: 'greeting',
    });

    expect(result).toEqual({ success: true, id: 'em_1' });
    expect(mockResend.emails.send).toHaveBeenCalledWith({
      from: 'hello@mail.spectacl.org',
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>hi</p>',
    });
  });

  it('logs success with label + domain (no full recipient for privacy)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: 'em_2' }, error: null });

    await sendEmail({
      from: 'hello@mail.spectacl.org',
      to: 'alice@example.com',
      subject: 'Test',
      html: '<p>x</p>',
      label: 'magic-link',
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('magic-link'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('domain=example.com'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('id=em_2'));
    // Must NOT log the full address
    const allLogs = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allLogs).not.toContain('alice@example.com');
    log.mockRestore();
  });

  it('returns { success: false } when Resend reports a result.error', async () => {
    mockResend.emails.send.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rate limited', name: 'ResendError' },
    });

    const result = await sendEmail({
      from: 'a@b.c',
      to: 'u@d.e',
      subject: 's',
      html: 'h',
      label: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limited');
  });

  it('never throws when Resend throws — returns { success: false, error }', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResend.emails.send.mockRejectedValueOnce(new Error('Network down'));

    const result = await sendEmail({
      from: 'a@b.c',
      to: 'u@d.e',
      subject: 's',
      html: 'h',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network down');
  });

  it('defaults the log label to "email" when omitted', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: 'x' }, error: null });

    await sendEmail({ from: 'a@b.c', to: 'u@d.e', subject: 's', html: 'h' });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('[Email] email'));
    log.mockRestore();
  });

  it('handles recipients with no @ gracefully (domain="unknown")', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: 'x' }, error: null });

    await sendEmail({ from: 'a@b.c', to: 'weird-recipient', subject: 's', html: 'h' });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('domain=unknown'));
    log.mockRestore();
  });

  it('preserves the from address passed by caller (no rewriting)', async () => {
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: 'x' }, error: null });

    await sendEmail({
      from: 'billing@mail.spectacl.org',
      to: 'u@d.e',
      subject: 'Invoice',
      html: 'h',
      label: 'invoice',
    });

    expect(mockResend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'billing@mail.spectacl.org' }),
    );
  });

  it('stringifies non-Error exceptions from Resend', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResend.emails.send.mockRejectedValueOnce('string error');

    const result = await sendEmail({ from: 'a@b', to: 'u@d.e', subject: 's', html: 'h' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });
});

describe('renderEmail', () => {
  it('renders a React Email component to HTML string', async () => {
    const Component: FC<{ name: string }> = (props) =>
      createElement('div', null, `Hello ${props.name}`);

    const html = await renderEmail(Component, { name: 'Alice' });

    expect(typeof html).toBe('string');
    expect(html).toContain('Hello Alice');
  });

  it('works from plain .ts files (no JSX)', async () => {
    const Component: FC<Record<string, never>> = () =>
      createElement('p', null, 'no jsx needed');

    const html = await renderEmail(Component, {});
    expect(html).toContain('no jsx needed');
  });
});
