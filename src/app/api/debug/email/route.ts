import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/email';
import { renderEmail } from '@/lib/send-email';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import MagicLinkEmail from '@/emails/magic-link-email';
import InvitationEmail from '@/emails/invitation-email';
import CancellationEmail from '@/emails/cancellation-email';

// Resend's shared sandbox domain — no DNS setup needed.
// Free plan restriction: can only send to your own Resend account email.
const TEST_FROM = 'Spectacl <onboarding@resend.dev>';

const TEMPLATES = {
  magicLink: {
    component: MagicLinkEmail,
    props: MagicLinkEmail.PreviewProps,
    subject: 'Sign in to Spectacl',
    from: 'Spectacl <hello@mail.spectacl.org>',
  },
  invitation: {
    component: InvitationEmail,
    props: InvitationEmail.PreviewProps,
    subject: 'You have been invited',
    from: 'Spectacl <hello@mail.spectacl.org>',
  },
  cancellation: {
    component: CancellationEmail,
    props: CancellationEmail.PreviewProps,
    subject: 'Your subscription has been cancelled',
    from: 'Spectacl <hello@mail.spectacl.org>',
  },
} as const;

export async function POST(request: NextRequest) {
  // Admin-only — this endpoint can send emails to arbitrary addresses
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json() as { template?: string; to?: string; useTestDomain?: boolean };
  const { template, to, useTestDomain = false } = body;

  if (!template || !to) {
    return NextResponse.json({ ok: false, error: 'Missing required fields: template, to' }, { status: 400 });
  }

  const tpl = TEMPLATES[template as keyof typeof TEMPLATES];
  if (!tpl) {
    return NextResponse.json(
      { ok: false, error: `Unknown template: "${template}". Valid: ${Object.keys(TEMPLATES).join(', ')}` },
      { status: 400 }
    );
  }

  // Use resend.dev sandbox when custom domain isn't verified yet
  const from = useTestDomain ? TEST_FROM : tpl.from;
  const startTime = Date.now();

  let html: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html = await renderEmail(tpl.component as any, tpl.props as Record<string, unknown>);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email-debug] Render failed for "${template}":`, err);
    return NextResponse.json({ ok: false, stage: 'render', error }, { status: 500 });
  }

  const renderMs = Date.now() - startTime;
  const subject = `[TEST] ${tpl.subject}`;

  console.log(`[email-debug] ─── test send ───────────────────────────────`);
  console.log(`[email-debug]  template       : ${template}`);
  console.log(`[email-debug]  from           : ${from}${useTestDomain ? ' (resend.dev sandbox)' : ''}`);
  console.log(`[email-debug]  to             : ${to}`);
  console.log(`[email-debug]  subject        : ${subject}`);
  console.log(`[email-debug]  html size      : ${html.length} chars (rendered in ${renderMs}ms)`);

  let result: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    result = await resend.emails.send({ from, to, subject, html });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email-debug] Resend send() threw:`, err);
    return NextResponse.json({ ok: false, stage: 'send', error }, { status: 500 });
  }

  const totalMs = Date.now() - startTime;

  console.log(`[email-debug]  resend id      : ${result.data?.id ?? 'none'}`);
  console.log(`[email-debug]  error          : ${result.error ? JSON.stringify(result.error) : 'none'}`);
  console.log(`[email-debug]  total          : ${totalMs}ms`);
  console.log(`[email-debug] ────────────────────────────────────────────`);

  return NextResponse.json({
    ok: !result.error,
    template,
    from,
    to,
    subject,
    useTestDomain,
    renderMs,
    totalMs,
    resendId: result.data?.id ?? null,
    resendError: result.error ?? null,
    htmlLength: html.length,
  });
}
