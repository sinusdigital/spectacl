'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flex, Card, Heading, Text, Box, Badge, Button, Separator } from '@radix-ui/themes';
import { CheckCircledIcon, DotFilledIcon, EnvelopeClosedIcon } from '@radix-ui/react-icons';
import { authClient, useSession } from '@/lib/auth-client';
import { useToast } from '@/components/Shared/RadixToast';

interface LinkedAccount {
  id: string;
  providerId: string;
  accountId: string;
}

interface ActiveSession {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
}

// ── Provider registry ────────────────────────────────────────────────────────
// Each row in the Connected Accounts list. A provider can be represented by
// multiple backend providerIds (e.g. better-auth's magic-link plugin creates a
// `credential` account row — we show both under "Email Magic Link").

interface ProviderConfig {
  /** Canonical id used for linking/unlinking API calls. */
  id: string;
  /** All providerIds from `listAccounts` that map to this provider row. */
  matches: string[];
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Show a "Connect" button when not linked. */
  linkable: boolean;
  /** Show a "Disconnect" button when linked (subject to last-method guard). */
  unlinkable: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'magic-link',
    matches: ['credential', 'magic-link', 'email'],
    label: 'Email Magic Link',
    description: 'Sign-in link sent to your email',
    icon: <EnvelopeClosedIcon width="20" height="20" />,
    linkable: false, // this is your primary email — there's nothing to "connect"
    unlinkable: false, // never removable; it's the anchor for the account
  },
  {
    id: 'google',
    matches: ['google'],
    label: 'Google',
    description: 'Sign in with your Google account',
    icon: <GoogleIcon />,
    linkable: true,
    unlinkable: true,
  },
];

export default function SecuritySettings() {
  const { data: session } = useSession();
  const toast = useToast();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null); // provider id currently linking/unlinking

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsResult, sessionsResult] = await Promise.all([
        authClient.listAccounts(),
        authClient.listSessions(),
      ]);
      if (accountsResult.data) setAccounts(accountsResult.data as LinkedAccount[]);
      if (sessionsResult.data) setSessions(sessionsResult.data as ActiveSession[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    try {
      await authClient.revokeSession({ token });
      setSessions(prev => prev.filter(s => s.token !== token));
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevoking('all');
    try {
      await authClient.revokeOtherSessions();
      await fetchData();
    } finally {
      setRevoking(null);
    }
  };

  // ── Link: redirect to provider OAuth, return to this page. ────────────────
  const handleLink = async (provider: ProviderConfig) => {
    setProcessing(provider.id);
    try {
      await authClient.linkSocial({
        provider: provider.id,
        callbackURL: '/user-settings',
      });
      // redirect happens; we won't reach code below on success
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to connect ${provider.label}`;
      toast.error(msg);
      setProcessing(null);
    }
  };

  // ── Unlink: remove the provider from the account. ─────────────────────────
  const handleUnlink = async (provider: ProviderConfig, linked: LinkedAccount) => {
    setProcessing(provider.id);
    try {
      const result = await authClient.unlinkAccount({
        providerId: linked.providerId,
        accountId: linked.accountId,
      });
      if (result?.error) {
        throw new Error(result.error.message || `Failed to disconnect ${provider.label}`);
      }
      toast.success(`${provider.label} disconnected.`);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to disconnect ${provider.label}`;
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const findLinked = (provider: ProviderConfig): LinkedAccount | undefined => {
    return accounts.find(a => provider.matches.includes(a.providerId));
  };

  const linkedCount = PROVIDERS.filter(p => !!findLinked(p)).length;

  const currentToken = (session as { session?: { token?: string } } | null)?.session?.token;
  const otherSessionCount = sessions.filter(s => s.token !== currentToken).length;

  return (
    <Flex direction="column" gap="6">
      {/* Connected Accounts */}
      <Card size="3">
        <Flex direction="column" gap="4">
          <Box>
            <Heading size="4" mb="1">Connected Accounts</Heading>
            <Text size="2" color="gray">
              Sign-in methods for your account. At least one must remain connected.
            </Text>
          </Box>

          {loading ? (
            <Text size="2" color="gray">Loading…</Text>
          ) : (
            <Flex direction="column" gap="3">
              {PROVIDERS.map((p) => {
                const linked = findLinked(p);
                const isProcessing = processing === p.id;
                // Last-method lockout guard: can only disconnect if another method remains.
                const isOnlyLinked = !!linked && linkedCount <= 1;
                const showDisconnect = !!linked && p.unlinkable && !isOnlyLinked;
                const showConnect = !linked && p.linkable;

                return (
                  <Flex
                    key={p.id}
                    align="center"
                    justify="between"
                    p="3"
                    gap="3"
                    style={{
                      borderRadius: 'var(--radius-3)',
                      border: '1px solid var(--gray-4)',
                      backgroundColor: 'var(--gray-2)',
                    }}
                  >
                    <Flex align="center" gap="3" style={{ minWidth: 0, flex: 1 }}>
                      <Box
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: 'var(--gray-3)',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {p.icon}
                      </Box>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="2" weight="bold">{p.label}</Text>
                        <Text
                          as="p"
                          size="1"
                          color="gray"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {linked ? (session?.user?.email ?? p.description) : p.description}
                        </Text>
                      </Box>
                    </Flex>

                    <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
                      {linked && (
                        <Badge color="green" size="2" variant="soft">
                          <Flex align="center" gap="1">
                            <CheckCircledIcon />
                            Connected
                          </Flex>
                        </Badge>
                      )}
                      {showDisconnect && (
                        <Button
                          variant="ghost"
                          color="red"
                          size="1"
                          loading={isProcessing}
                          onClick={() => handleUnlink(p, linked!)}
                        >
                          Disconnect
                        </Button>
                      )}
                      {showConnect && (
                        <Button
                          variant="soft"
                          size="2"
                          loading={isProcessing}
                          onClick={() => handleLink(p)}
                        >
                          Connect
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                );
              })}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Active Sessions */}
      <Card size="3">
        <Flex direction="column" gap="4">
          <Flex align="center" justify="between">
            <Box>
              <Heading size="4" mb="1">Active Sessions</Heading>
              <Text size="2" color="gray">
                Devices currently signed in to your account
              </Text>
            </Box>
            {!loading && otherSessionCount > 0 && (
              <Button
                variant="soft"
                color="red"
                size="1"
                loading={revoking === 'all'}
                onClick={handleRevokeOthers}
              >
                Revoke all others
              </Button>
            )}
          </Flex>

          {loading ? (
            <Text size="2" color="gray">Loading…</Text>
          ) : sessions.length === 0 ? (
            <Text size="2" color="gray">No active sessions found.</Text>
          ) : (
            <Flex direction="column">
              {sessions.map((s, i) => {
                const isCurrent = s.token === currentToken;
                return (
                  <Box key={s.id}>
                    {i > 0 && <Separator size="4" />}
                    <Flex align="center" justify="between" py="3">
                      <Flex align="center" gap="3">
                        <DotFilledIcon color={isCurrent ? 'var(--green-9)' : 'var(--gray-8)'} />
                        <Box>
                          <Flex align="center" gap="2">
                            <Text size="2" weight="bold">{parseUserAgent(s.userAgent)}</Text>
                            {isCurrent && (
                              <Badge color="blue" variant="soft" size="1">Current</Badge>
                            )}
                          </Flex>
                          <Text as="p" size="1" color="gray">
                            {s.ipAddress ? `${s.ipAddress} · ` : ''}{formatDate(s.createdAt)}
                          </Text>
                        </Box>
                      </Flex>
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          color="red"
                          size="1"
                          loading={revoking === s.token}
                          onClick={() => handleRevoke(s.token)}
                        >
                          Revoke
                        </Button>
                      )}
                    </Flex>
                  </Box>
                );
              })}
            </Flex>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

function parseUserAgent(ua?: string | null): string {
  if (!ua) return 'Unknown device';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
  if (/Android/i.test(ua)) return 'Android device';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown device';
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}
