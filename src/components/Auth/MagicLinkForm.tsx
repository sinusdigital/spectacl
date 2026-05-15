'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import { authClient, signIn, useSession } from '@/lib/auth-client';
import {
  EnvelopeClosedIcon,
  CheckCircledIcon,
  InfoCircledIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';
import { getInboxLink, type InboxIcon } from '@/lib/inbox-link';
import { Flex, Heading, Text, TextField, Callout, Box, Card, Link } from '@radix-ui/themes';
import Button from '@/components/Shared/Button';

type FormState = 'idle' | 'loading' | 'sent' | 'waitlist_added';

export interface MagicLinkFormProps {
  /** "signin" = compact login, no waitlist logic. "signup" = full new-user flow with waitlist support. */
  intent: 'signin' | 'signup';
  /** Override the form heading. Defaults to "Welcome back" / "Get started free". */
  heading?: string;
  /** Override the form subtitle. Defaults to intent-appropriate copy. */
  subtitle?: string;
}

function InboxProviderIcon({ icon }: { icon: InboxIcon }) {
  if (icon === 'gmail') return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1.5 14h3V6.75L0 3.5V12.5A1.5 1.5 0 001.5 14z" fill="#4285F4"/>
      <path d="M13.5 14h3A1.5 1.5 0 0018 12.5V3.5l-4.5 3.25" fill="#34A853"/>
      <path d="M13.5 1.5V6.75L18 3.5V2a2 2 0 00-3.2-1.6" fill="#FBBC04"/>
      <path d="M4.5 6.75V1.5L9 5l4.5-3.5V6.75L9 10" fill="#EA4335"/>
      <path d="M0 2v1.5l4.5 3.25V1.5L3.2.4A2 2 0 000 2" fill="#C5221F"/>
    </svg>
  );
  if (icon === 'outlook') return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M10.5 8.571V17l7.5-4.286V4.286L10.5 8.571z" fill="#0364B8"/>
      <path d="M7 0L0 3.214V14l3 1.714V4.286L10.5 8.571V3.214L7 0z" fill="#0078D4"/>
      <path d="M10.5 3.214v5.357L18 4.286 10.5 0v3.214z" fill="#28A8EA"/>
      <path d="M3 15.714L10.5 17V8.571L3 4.286v11.428z" fill="#0078D4"/>
      <circle cx="5" cy="9.5" r="3.5" fill="#0364B8"/>
      <ellipse cx="5" cy="9.5" rx="2.2" ry="2.5" fill="white"/>
    </svg>
  );
  if (icon === 'apple') return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M13.6 6.1c-.1.1-2.3 1.3-2.3 4 0 3.1 2.7 4.2 2.8 4.2 0 0-.4 1.4-1.3 2.7-.8 1.2-1.7 2.4-3 2.4s-1.6-.8-3.1-.8-2 .8-3.2.8S1.4 18 .5 16.5C-.6 14.8 0 10.7 0 10.7c0-3.2 2.2-4.9 4.3-4.9 1.1 0 2 .8 2.7.8.7 0 1.7-.9 3-.9.5 0 2.3.2 3.6 1.4zM10.4 0c.1 1-.4 2-1 2.7-.7.8-1.7 1.3-2.6 1.3-.1-1 .4-2 1-2.7C8.5.5 9.6 0 10.4 0z" fill="currentColor"/>
    </svg>
  );
  return <ExternalLinkIcon width="16" height="16" />;
}

export default function MagicLinkForm({ intent, heading, subtitle }: MagicLinkFormProps) {
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();

  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const [signupMode, setSignupMode] = useState<'open' | 'waitlist' | 'closed' | null>(null);
  const [ssoGoogle, setSsoGoogle] = useState(true);
  const [trialDays, setTrialDays] = useState<number>(14);

  const from = searchParams.get('from');
  const authError = searchParams.get('error');
  const callbackURL = from ? `/auth/callback?from=${encodeURIComponent(from)}` : '/auth/callback';

  useEffect(() => {
    if (authError) {
      const key = authError.toLowerCase();
      const messages: Record<string, string> = {
        invalid_token: 'This sign-in link has expired or was already used. Please request a new one.',
        expired_token: 'This sign-in link has expired. Please request a new one.',
        no_session: 'Sign-in failed — your browser may be blocking cookies. Please try again.',
        oauth_failed: 'Google sign-in failed. Please try again, or use the email magic link instead.',
        state_mismatch: 'Sign-in failed — a security cookie was lost in transit. This usually means third-party cookies are blocked. Try again or use the email magic link.',
        state_security_mismatch: 'Sign-in failed — security check failed. Please try again.',
        no_callback_url: 'Sign-in failed — missing callback. Please try again.',
        access_denied: 'You denied access. To sign in, please allow access to continue.',
      };
      setError(messages[key] || 'Sign-in failed. Please try again.');
    }
  }, [authError]);

  useEffect(() => {
    fetch('/api/public/signup-mode', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setSignupMode(d.mode ?? 'open');
        setSsoGoogle(d.ssoGoogle !== false);
        if (typeof d.trialDays === 'number' && d.trialDays > 0) {
          setTrialDays(d.trialDays);
        }
      })
      .catch(() => setSignupMode('open'));
  }, []);

  useEffect(() => {
    if (!isPending && session) {
      window.location.href = callbackURL;
    }
  }, [session, isPending, callbackURL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setState('loading');

    try {
      // Waitlist gating runs on BOTH intents — magic link would otherwise create an
      // account for any unknown email and silently bypass the waitlist. Existing
      // users still get a normal magic link; new emails are added to the waitlist.
      if (signupMode === 'waitlist') {
        const res = await fetch(`/api/public/check-email?email=${encodeURIComponent(email)}`);
        const { exists } = await res.json();

        if (!exists) {
          const waitlistRes = await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          if (!waitlistRes.ok) throw new Error('Failed to join waitlist');
          setState('waitlist_added');
          return;
        }
      }

      const result = await authClient.signIn.magicLink({ email, callbackURL });
      if (result?.error) {
        throw new Error(result.error.message || result.error.code || 'Failed to send magic link');
      }
      setState('sent');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Unexpected end of JSON')) {
        setState('sent');
        return;
      }
      setState('idle');
      setError(msg || 'Something went wrong. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn.social({
        provider: 'google',
        callbackURL,
        errorCallbackURL: '/login?error=oauth_failed',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  if (isPending || signupMode === null) {
    return (
      <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
        <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
          <Text color="gray">Loading...</Text>
        </Flex>
      </Card>
    );
  }

  // ── Magic link sent ──────────────────────────────────────────────────────────
  if (state === 'sent') {
    const inboxLink = getInboxLink(email);
    return (
      <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
        <Flex direction="column" align="center" gap="4">
          <EnvelopeClosedIcon width="36" height="36" color="var(--accent-9)" />
          <Flex direction="column" align="center" gap="2">
            <Heading size="6" weight="bold" className="tracking-tight">Check your email</Heading>
            <Text size="2" color="gray" align="center">
              We sent a sign-in link to <Text weight="bold" color="gray">{email}</Text>.<br />
              Click the link to continue.
            </Text>
          </Flex>
          {inboxLink && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => window.open(inboxLink.url, '_blank')}
            >
              <InboxProviderIcon icon={inboxLink.icon} /> Open {inboxLink.label}
            </Button>
          )}
          <Text size="1" color="gray" align="center">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={() => setState('idle')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-11)', fontSize: 'inherit' }}
            >
              try again
            </button>
            .
          </Text>
        </Flex>
      </Card>
    );
  }

  // ── Added to waitlist ────────────────────────────────────────────────────────
  if (state === 'waitlist_added') {
    return (
      <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
        <Flex direction="column" align="center" gap="4">
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--green-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircledIcon width="22" height="22" color="var(--green-11)" />
          </Box>
          <Flex direction="column" align="center" gap="2">
            <Heading size="6" weight="bold" className="tracking-tight">You&apos;re on the list</Heading>
            <Text size="2" color="gray" align="center">
              We&apos;ve added <Text weight="bold" color="gray">{email}</Text> to the waitlist.<br />
              We&apos;ll let you know when access opens up.
            </Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  // ── Signups closed (signup intent only) ──────────────────────────────────────
  if (intent === 'signup' && signupMode === 'closed') {
    return (
      <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
        <Flex direction="column" align="center" gap="3">
          <Heading size="6" weight="bold" className="tracking-tight">Signups are closed</Heading>
          <Text size="2" color="gray" align="center">
            Spectacl is not accepting new accounts at this time. Check back later.
          </Text>
          <Box mt="2">
            <Link asChild size="2" weight="medium">
              <NextLink href="/login">Already have an account? Sign in</NextLink>
            </Link>
          </Box>
        </Flex>
      </Card>
    );
  }

  // ── Default copy per intent ──────────────────────────────────────────────────
  const defaultHeading = intent === 'signin' ? 'Welcome back' : 'Get started free';
  const defaultSubtitle = intent === 'signin'
    ? 'Sign in to your Spectacl account'
    : (signupMode === 'waitlist'
        ? 'Sign in or join the waitlist'
        : `Start your ${trialDays}-day free trial. No credit card required.`);

  const finalHeading = heading ?? defaultHeading;
  const finalSubtitle = subtitle ?? defaultSubtitle;

  // Match original gating: Google only shows when SSO is enabled AND signups are open.
  // This keeps the existing admin toggle behavior intact (signup_mode + sso_google_enabled).
  const showGoogle = ssoGoogle && signupMode === 'open';

  return (
    <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
      <Flex direction="column" gap="1" align="center" mb="5">
        <Heading size="6" weight="bold" className="tracking-tight">{finalHeading}</Heading>
        <Text size="2" color="gray" className="font-light mt-1" align="center">
          {finalSubtitle}
        </Text>
      </Flex>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Box>
            <Text as="label" htmlFor="email" size="2" weight="medium" className="mb-2 block">
              Email address
            </Text>
            <TextField.Root
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              size="3"
              autoFocus
            />
          </Box>

          <Button
            type="submit"
            size="lg"
            isLoading={state === 'loading'}
            className="w-full h-12 mt-2"
            weight="semibold"
          >
            {state !== 'loading' && <EnvelopeClosedIcon width="16" height="16" />}
            Send Magic Link
          </Button>

          {showGoogle && (
            <>
              <Flex align="center" gap="3" mt="1">
                <Box style={{ flex: 1, height: '1px', background: 'var(--gray-5)' }} />
                <Text size="1" color="gray">or</Text>
                <Box style={{ flex: 1, height: '1px', background: 'var(--gray-5)' }} />
              </Flex>

              <Button
                type="button"
                size="lg"
                variant="tertiary"
                isLoading={googleLoading}
                onClick={handleGoogleSignIn}
                className="w-full h-12"
                weight="medium"
              >
                {!googleLoading && (
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8, flexShrink: 0 }}>
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </Button>
            </>
          )}

          {/* Cross-page link — directs new users to /signup, returning users to /login */}
          <Flex justify="center" mt="2">
            {intent === 'signin' ? (
              <Text size="2" color="gray">
                New here?{' '}
                <Link asChild weight="medium">
                  <NextLink href="/signup">Start free trial</NextLink>
                </Link>
              </Text>
            ) : (
              <Text size="2" color="gray">
                Already have an account?{' '}
                <Link asChild weight="medium">
                  <NextLink href="/login">Sign in</NextLink>
                </Link>
              </Text>
            )}
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}
