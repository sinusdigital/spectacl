import { render } from '@react-email/components';
import { createElement, type ComponentType } from 'react';
import { resend } from '@/lib/email';

/**
 * Render a React Email component to an HTML string.
 * Works from plain .ts files (no JSX needed) by using createElement internally.
 *
 * Usage:
 *   const html = await renderEmail(MagicLinkEmail, { magicUrl: 'https://...' });
 */
export async function renderEmail<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  props: P
): Promise<string> {
  return render(createElement(Component, props));
}

// ── Email sending with delivery tracking ─────────────────────────────────────

interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  /** Short label for log context, e.g. 'invitation', 'cancellation' */
  label?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email via Resend with consistent logging and error handling.
 * All email sends should go through this function for delivery monitoring.
 *
 * - Logs success with Resend email ID
 * - Logs failure with error details (recipient domain only for privacy)
 * - Never throws — returns { success, id?, error? } for the caller to handle
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { from, to, subject, html, label = 'email' } = options;
  const domain = to.split('@')[1] ?? 'unknown';

  try {
    const result = await resend.emails.send({ from, to, subject, html });

    if (result.error) {
      console.error(`[Email] ${label} failed → domain=${domain}, error=${JSON.stringify(result.error)}`);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] ${label} sent → domain=${domain}, id=${result.data?.id}`);
    return { success: true, id: result.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Email] ${label} exception → domain=${domain}, error=${msg}`);
    return { success: false, error: msg };
  }
}
