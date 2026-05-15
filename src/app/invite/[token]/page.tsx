'use client';

import { useState, useEffect } from 'react';
import { Flex, Heading, Text, TextField, Callout, Box, Card, Badge, Separator, Tooltip } from '@radix-ui/themes';
import { InfoCircledIcon, EnvelopeClosedIcon, CheckCircledIcon, CrossCircledIcon, MagicWandIcon } from '@radix-ui/react-icons';
import Button from '@/components/Shared/Button';
import AuthFooter from '@/components/Shared/AuthFooter';
import ShaderBackground from '@/components/ui/ShaderBackground';
import { authClient, signIn, useSession } from '@/lib/auth-client';
import { PROVIDER_LOGOS } from '@/assets/model-logos';

interface InvitationDetails {
  space: { id: string; name: string; plan: string };
  inviter: { name: string };
}

type PageState = 'loading' | 'invalid' | 'form' | 'link_sent' | 'accepting' | 'accepted' | 'already_member';

const TRACKED_MODELS = [
  { provider: 'google',    name: 'Google AI Overviews' },
  { provider: 'google',    name: 'AI Mode (Gemini Pro)' },
  { provider: 'openai',    name: 'ChatGPT 5' },
  { provider: 'anthropic', name: 'Claude Sonnet 4.6' },
  { provider: 'mistral',   name: 'Mistral Le Chat' },
] as const;

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { data: session, isPending: sessionLoading } = useSession();

  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  // Fetch invitation details once we have the token and session state is resolved
  useEffect(() => {
    if (!token || sessionLoading) return;

    fetch(`/api/invitations/${token}`)
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Invalid invitation'); });
        return r.json();
      })
      .then((data: InvitationDetails) => {
        setInvitation(data);
        setPageState('form');
      })
      .catch(err => {
        setError(err.message || 'This invitation is invalid or has expired.');
        setPageState('invalid');
      });
  }, [token, sessionLoading]);

  const callbackURL = `/invite/${token}/accept`;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailLoading(true);
    try {
      await authClient.signIn.magicLink({ email, callbackURL });
      setPageState('link_sent');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogle = async () => {
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

  const handleAccept = async () => {
    setPageState('accepting');
    setError('');
    try {
      const res = await fetch(`/api/invitations/${token}`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json();
        if (d.error?.includes('already a member')) {
          window.location.href = '/auth/callback';
          return;
        }
        throw new Error(d.error || 'Failed to accept invitation');
      }
      setPageState('accepted');
      setTimeout(() => { window.location.href = '/auth/callback'; }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setPageState('form');
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <PageShell>
        <SingleColumn>
          <InviteCard>
            <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
              <Text color="gray">Loading invitation...</Text>
            </Flex>
          </InviteCard>
        </SingleColumn>
      </PageShell>
    );
  }

  // ── Invalid invitation ───────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <PageShell>
        <SingleColumn>
          <InviteCard>
            <Flex direction="column" align="center" gap="3">
              <CrossCircledIcon width="36" height="36" color="var(--red-9)" />
              <Heading size="5" weight="bold" align="center" className="tracking-tight">Invalid Invitation</Heading>
              <Text size="2" color="gray" align="center">{error}</Text>
            </Flex>
          </InviteCard>
        </SingleColumn>
      </PageShell>
    );
  }

  // ── Magic link sent ──────────────────────────────────────────────────────────
  if (pageState === 'link_sent') {
    return (
      <PageShell>
        <SingleColumn>
          <InviteCard>
            <Flex direction="column" align="center" gap="4">
              <EnvelopeClosedIcon width="36" height="36" color="var(--accent-9)" />
              <Flex direction="column" align="center" gap="2">
                <Heading size="6" weight="bold" className="tracking-tight">Check your email</Heading>
                <Text size="2" color="gray" align="center">
                  We sent a sign-in link to <Text weight="bold" color="gray">{email}</Text>.<br />
                  Click it to sign in and accept your invitation.
                </Text>
              </Flex>
              <Text size="1" color="gray" align="center">
                Didn&apos;t receive it?{' '}
                <button onClick={() => setPageState('form')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-11)', fontSize: 'inherit' }}>
                  Try again
                </button>
              </Text>
            </Flex>
          </InviteCard>
        </SingleColumn>
      </PageShell>
    );
  }

  // ── Accepted ─────────────────────────────────────────────────────────────────
  if (pageState === 'accepted' || pageState === 'already_member') {
    return (
      <PageShell>
        <SingleColumn>
          <InviteCard>
            <Flex direction="column" align="center" gap="4">
              <Box style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--green-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircledIcon width="22" height="22" color="var(--green-11)" />
              </Box>
              <Flex direction="column" align="center" gap="2">
                <Heading size="6" weight="bold" className="tracking-tight">
                  {pageState === 'already_member' ? 'Already a member' : `Welcome to ${invitation?.space.name}!`}
                </Heading>
                <Text size="2" color="gray" align="center">
                  {pageState === 'already_member'
                    ? "You're already a member of this workspace."
                    : "You've joined the workspace. Taking you there now…"}
                </Text>
              </Flex>
              {pageState === 'already_member' && (
                <Button variant="primary" onClick={() => { window.location.href = '/auth/callback'; }}>
                  Go to workspace
                </Button>
              )}
            </Flex>
          </InviteCard>
        </SingleColumn>
      </PageShell>
    );
  }

  // ── Main form: two-column signup-style layout ────────────────────────────────
  return (
    <PageShell>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 w-full items-center">
        <Box className="relative z-20 order-1 md:order-none">
          <InviteValuePanel invitation={invitation!} />
        </Box>
        <Box className="relative z-20 order-2 md:order-none">
          <InviteCard>
            <Flex direction="column" gap="1" align="center" mb="5">
              <Heading size="6" weight="bold" className="tracking-tight">
                {session ? 'Accept your invitation' : 'Get started'}
              </Heading>
              <Text size="2" color="gray" className="font-light mt-1" align="center">
                {session
                  ? `Signed in as ${session.user?.email ?? 'you'}`
                  : "We'll send a magic link to your email."}
              </Text>
            </Flex>

            {error && (
              <Callout.Root color="red" size="1" mb="4">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            {session ? (
              <Button
                variant="primary"
                size="lg"
                isLoading={pageState === 'accepting'}
                onClick={handleAccept}
                className="w-full h-12"
                weight="semibold"
              >
                Accept Invitation
              </Button>
            ) : (
              <Flex direction="column" gap="4">
                <form onSubmit={handleMagicLink}>
                  <Flex direction="column" gap="3">
                    <Box>
                      <Text as="label" htmlFor="invite-email" size="2" weight="medium" className="mb-2 block">
                        Email address
                      </Text>
                      <TextField.Root
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        size="3"
                        autoFocus
                      />
                    </Box>
                    <Button type="submit" size="lg" isLoading={emailLoading} className="w-full h-12 mt-2" weight="semibold">
                      {!emailLoading && <MagicWandIcon width="16" height="16" />}
                      Send Magic Link
                    </Button>
                  </Flex>
                </form>

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
                  onClick={handleGoogle}
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
              </Flex>
            )}
          </InviteCard>
        </Box>
      </div>
    </PageShell>
  );
}

// ── Layout primitives ──────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] relative w-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-12 flex items-center">
          {children}
        </div>
        <AuthFooter />
      </ShaderBackground>
    </div>
  );
}

function SingleColumn({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-md mx-auto">{children}</div>;
}

function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
      {children}
    </Card>
  );
}

// ── Value panel (left column) ──────────────────────────────────────────────────

function ModelStrip() {
  return (
    <Flex align="center" style={{ position: 'relative', height: 32 }}>
      {TRACKED_MODELS.map((m, i) => (
        <Tooltip key={m.name} content={m.name}>
          <Box
            style={{
              lineHeight: 0,
              padding: 2,
              border: '1.5px solid var(--green-9)',
              borderRadius: '50%',
              backgroundColor: 'white',
              position: 'relative',
              zIndex: TRACKED_MODELS.length - i,
              marginLeft: i === 0 ? 0 : -6,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(PROVIDER_LOGOS[m.provider.toLowerCase()] as { src: string })?.src ?? ''}
              alt={m.name}
              width={18}
              height={18}
              style={{ borderRadius: '50%', display: 'block' }}
            />
          </Box>
        </Tooltip>
      ))}
    </Flex>
  );
}

function InviteValuePanel({ invitation }: { invitation: InvitationDetails }) {
  return (
    <Flex direction="column" gap="6" className="max-w-md w-full mx-auto md:mx-0">
      {/* Brand mark */}
      <Flex align="center" gap="2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-light.png"
          alt=""
          width={32}
          height={32}
          style={{ display: 'block', borderRadius: 6 }}
        />
        <Heading size="5" weight="bold" className="tracking-tight">
          Spectacl
        </Heading>
      </Flex>

      {/* Headline + invite context */}
      <Flex direction="column" gap="3">
        <Heading
          size={{ initial: '7', md: '9' } as never}
          weight="bold"
          className="tracking-tight"
          style={{ lineHeight: 1.05 }}
        >
          You&apos;ve been invited
          <br />
          to {invitation.space.name}.
        </Heading>
        <Text size="4" color="gray" style={{ lineHeight: 1.5 }}>
          <Text weight="bold" color="gray">{invitation.inviter.name}</Text> wants you on the team. Track how
          ChatGPT, Claude, Gemini and Google AI Overviews talk about your brand — together.
        </Text>
      </Flex>

      {/* Model strip */}
      <Flex direction="column" gap="2">
        <ModelStrip />
        <Text size="2" color="gray" weight="medium">
          All major AI models, tracked daily.
        </Text>
      </Flex>

      {/* Workspace details */}
      <Box p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-4)' }}>
        <Flex align="center" justify="between">
          <Text size="2" color="gray">Workspace</Text>
          <Text size="2" weight="bold">{invitation.space.name}</Text>
        </Flex>
        <Separator size="4" my="2" />
        <Flex align="center" justify="between">
          <Text size="2" color="gray">Plan</Text>
          <Badge color="blue" variant="soft" size="1">{invitation.space.plan}</Badge>
        </Flex>
      </Box>
    </Flex>
  );
}
