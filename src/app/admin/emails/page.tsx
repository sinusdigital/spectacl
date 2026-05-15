'use client';

import { useState, useCallback } from 'react';
import { Container, Box, Flex, Grid, Heading, Text, Card, Badge, Tabs, Table, Code, Button, TextField, Select, Separator, Switch } from "@radix-ui/themes";
import { renderEmailPreview } from './actions';

const EMAIL_DOMAIN = 'mail.spectacl.org';

interface EmailEntry {
  name: string;
  from: string;
  subject: string;
  trigger: string;
  status: 'live' | 'planned';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  templateKey?: string; // maps to server action template key
}

const IMPLEMENTED_EMAILS: EmailEntry[] = [
  {
    name: 'Magic Link Login',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: 'Sign in to Spectacl',
    trigger: 'User requests magic link on login page',
    status: 'live',
    priority: 'high',
    notes: 'Primary auth method. Link expires in 10 minutes. Dev bypass via SKIP_MAGIC_LINK_EMAIL=true.',
    templateKey: 'magicLink',
  },
  {
    name: 'Space Invitation',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: '{inviter} invited you to join {space}',
    trigger: 'Admin/Owner invites a team member',
    status: 'live',
    priority: 'high',
    notes: 'Pro/Business plans only. Link expires in 7 days. Can be re-sent.',
    templateKey: 'invitation',
  },
  {
    name: 'Subscription Cancelled',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: 'Your Spectacl workspace "{space}" has been cancelled',
    trigger: 'Owner or Admin cancels subscription',
    status: 'live',
    priority: 'high',
    notes: 'Sent to space owner. Distinguishes self-cancel vs admin-cancel. Non-fatal if send fails.',
    templateKey: 'cancellation',
  },
  {
    name: 'Invoice',
    from: `billing@${EMAIL_DOMAIN}`,
    subject: 'Invoice {number} — Spectacl',
    trigger: 'Mollie webhook confirms paid payment',
    status: 'live',
    priority: 'high',
    notes: 'Sent to space owner after each successful payment. Includes invoice number, total, tax label, and PDF download link. Fire-and-forget.',
    templateKey: 'invoiceEmail',
  },
];

const MISSING_EMAILS: EmailEntry[] = [
  {
    name: 'Welcome / Onboarding',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: 'Welcome to Spectacl!',
    trigger: 'After first sign-in',
    status: 'planned',
    priority: 'high',
    notes: 'Guide user to create first entity. Reduces time-to-value.',
  },
  {
    name: 'Waitlist Confirmation',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: "You're on the waitlist!",
    trigger: 'POST /api/waitlist',
    status: 'planned',
    priority: 'high',
    notes: 'Currently waitlist is silent. Users get no feedback after submitting.',
  },
  {
    name: 'Payment Failed',
    from: `billing@${EMAIL_DOMAIN}`,
    subject: 'Payment failed for {space}',
    trigger: 'Mollie webhook reports failed charge',
    status: 'planned',
    priority: 'high',
    notes: 'Dunning flow. Recover failed payments before involuntary churn.',
  },
  {
    name: 'Weekly Visibility Digest',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: 'Your weekly AI visibility report',
    trigger: 'Cron / scheduled job (weekly)',
    status: 'planned',
    priority: 'medium',
    notes: 'Core value prop delivered to inbox. Drives re-engagement and retention.',
  },
  {
    name: 'Visibility Change Alert',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: 'Visibility change detected for {entity}',
    trigger: 'Analysis worker detects threshold breach',
    status: 'planned',
    priority: 'medium',
    notes: 'Proactive notification when brand visibility drops or spikes. High-value signal.',
  },
  {
    name: 'Invitation Accepted',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: '{user} joined {space}',
    trigger: 'Invitee accepts invitation',
    status: 'planned',
    priority: 'medium',
    notes: 'Notify the inviter that their teammate joined the workspace.',
  },
  {
    name: 'Trial Ending Soon',
    from: `billing@${EMAIL_DOMAIN}`,
    subject: 'Your trial ends in {days} days',
    trigger: 'X days before trial expires',
    status: 'planned',
    priority: 'medium',
    notes: 'Nudge to convert before expiry. Only relevant if trial period is offered.',
  },
  {
    name: 'Plan Upgrade Confirmation',
    from: `billing@${EMAIL_DOMAIN}`,
    subject: 'Welcome to {plan}!',
    trigger: 'Plan change via Mollie',
    status: 'planned',
    priority: 'low',
    notes: 'Receipt + feature unlock summary.',
  },
  {
    name: 'Account Deletion',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: 'Your account has been deleted',
    trigger: 'Account deletion request',
    status: 'planned',
    priority: 'low',
    notes: 'GDPR compliance. Confirm data will be purged.',
  },
  {
    name: 'Inactive Account Nudge',
    from: `hello@${EMAIL_DOMAIN}`,
    subject: "We miss you at Spectacl",
    trigger: 'Cron job (14/30 days inactive)',
    status: 'planned',
    priority: 'low',
    notes: 'Re-engage users who stopped logging in.',
  },
];

function StatusBadge({ status }: { status: 'live' | 'planned' }) {
  return status === 'live' ? (
    <Badge color="green" variant="soft">Live</Badge>
  ) : (
    <Badge color="gray" variant="soft">Planned</Badge>
  );
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const color = priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'gray';
  return <Badge color={color} variant="soft">{priority}</Badge>;
}

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [previewHtmlCache, setPreviewHtmlCache] = useState<Record<string, string>>({});
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  // Debug tab state
  const [debugTo, setDebugTo] = useState('');
  const [debugTemplate, setDebugTemplate] = useState('magicLink');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<Record<string, unknown> | null>(null);
  const [useTestDomain, setUseTestDomain] = useState(true); // default on: avoids domain-not-verified error

  const allEmails = [...IMPLEMENTED_EMAILS, ...MISSING_EMAILS];

  const handleDebugSend = useCallback(async () => {
    if (!debugTo.trim()) return;
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const res = await fetch('/api/debug/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: debugTemplate, to: debugTo.trim(), useTestDomain }),
      });
      const data = await res.json() as Record<string, unknown>;
      setDebugResult(data);
    } catch (err) {
      setDebugResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setDebugLoading(false);
    }
  }, [debugTo, debugTemplate, useTestDomain]);

  const handlePreviewToggle = useCallback(async (templateKey: string) => {
    if (expandedTemplate === templateKey) {
      setExpandedTemplate(null);
      return;
    }

    setExpandedTemplate(templateKey);

    // Load HTML if not cached
    if (!previewHtmlCache[templateKey]) {
      setLoadingTemplate(templateKey);
      try {
        const html = await renderEmailPreview(templateKey);
        setPreviewHtmlCache(prev => ({ ...prev, [templateKey]: html }));
      } catch (err) {
        console.error('Failed to render preview:', err);
      } finally {
        setLoadingTemplate(null);
      }
    }
  }, [expandedTemplate, previewHtmlCache]);

  return (
    <Container size="4" p="6">
      <Box mb="8">
        <Heading size="8" mb="2" style={{ letterSpacing: '-0.02em' }}>Email System</Heading>
        <Text size="3" color="gray">
          React Email templates sent via Resend from <Code>{EMAIL_DOMAIN}</Code>
        </Text>
      </Box>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List mb="6">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="templates">Template Previews</Tabs.Trigger>
          <Tabs.Trigger value="roadmap">Roadmap</Tabs.Trigger>
          <Tabs.Trigger value="config">Configuration</Tabs.Trigger>
          <Tabs.Trigger value="debug">Debug</Tabs.Trigger>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Content value="overview">
          <Flex direction="column" gap="6">
            <Grid columns={{ initial: "2", md: "4" }} gap="4">
              <Card size="2">
                <Text size="2" color="gray">Live</Text>
                <Heading size="7" color="green" mt="1">{IMPLEMENTED_EMAILS.length}</Heading>
              </Card>
              <Card size="2">
                <Text size="2" color="gray">Planned</Text>
                <Heading size="7" color="gray" mt="1">{MISSING_EMAILS.length}</Heading>
              </Card>
              <Card size="2">
                <Text size="2" color="gray">High Priority Missing</Text>
                <Heading size="7" color="red" mt="1">{MISSING_EMAILS.filter(e => e.priority === 'high').length}</Heading>
              </Card>
              <Card size="2">
                <Text size="2" color="gray">Total Planned</Text>
                <Heading size="7" mt="1">{allEmails.length}</Heading>
              </Card>
            </Grid>

            <Card size="3">
              <Heading size="4" mb="4">All Emails</Heading>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>From</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Trigger</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Priority</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {allEmails.map(email => (
                    <Table.Row key={email.name}>
                      <Table.Cell>
                        <Text weight="medium" size="2">{email.name}</Text>
                        {email.notes && (
                          <Text size="1" color="gray" as="p" mt="1">{email.notes}</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell><Code size="1">{email.from}</Code></Table.Cell>
                      <Table.Cell><Text size="2" color="gray">{email.trigger}</Text></Table.Cell>
                      <Table.Cell><StatusBadge status={email.status} /></Table.Cell>
                      <Table.Cell><PriorityBadge priority={email.priority} /></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>

            <Card size="3">
              <Heading size="4" mb="4">From Addresses</Heading>
              <Text size="2" color="gray" mb="4" as="p">
                Consolidated to 2 addresses for simplicity and deliverability.
              </Text>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Address</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Purpose</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Used By</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell><Code size="1">hello@{EMAIL_DOMAIN}</Code></Table.Cell>
                    <Table.Cell>All transactional emails</Table.Cell>
                    <Table.Cell>Magic Link, Invitation, Cancellation, Digests, Alerts, Welcome, Nudges</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Code size="1">billing@{EMAIL_DOMAIN}</Code></Table.Cell>
                    <Table.Cell>Payment &amp; subscription emails</Table.Cell>
                    <Table.Cell>Invoice (live), Payment Failed, Upgrade Confirmation, Trial Expiry</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </Card>
          </Flex>
        </Tabs.Content>

        {/* Template Previews Tab */}
        <Tabs.Content value="templates">
          <Flex direction="column" gap="6">
            <Box p="4" style={{ backgroundColor: 'var(--blue-2)', borderLeft: '4px solid var(--blue-9)', borderRadius: 'var(--radius-2)' }}>
              <Text size="2" color="blue">
                Previews are rendered server-side using React Email components. Click a card to load the preview.
              </Text>
            </Box>

            {IMPLEMENTED_EMAILS.map(email => (
              <Card
                key={email.name}
                size="3"
                style={{ cursor: email.templateKey ? 'pointer' : 'default' }}
                onClick={() => email.templateKey && handlePreviewToggle(email.templateKey)}
              >
                <Flex direction="column" gap="4">
                  <Flex justify="between" align="center" style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: 'var(--space-4)' }}>
                    <Box>
                      <Heading size="4">{email.name}</Heading>
                      <Flex gap="3" mt="1">
                        <Text size="1" color="gray">From: <Code size="1">{email.from}</Code></Text>
                        <Text size="1" color="gray">Subject: {email.subject}</Text>
                      </Flex>
                    </Box>
                    <StatusBadge status={email.status} />
                  </Flex>

                  {email.notes && (
                    <Text size="2" color="gray">{email.notes}</Text>
                  )}

                  {expandedTemplate === email.templateKey && loadingTemplate === email.templateKey && (
                    <Flex justify="center" py="6">
                      <Text size="2" color="gray">Rendering preview...</Text>
                    </Flex>
                  )}

                  {expandedTemplate === email.templateKey && email.templateKey && previewHtmlCache[email.templateKey] && (
                    <Box style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
                      <div dangerouslySetInnerHTML={{ __html: previewHtmlCache[email.templateKey] }} />
                    </Box>
                  )}

                  {expandedTemplate !== email.templateKey && email.templateKey && (
                    <Text size="1" color="blue">Click to preview template</Text>
                  )}
                </Flex>
              </Card>
            ))}
          </Flex>
        </Tabs.Content>

        {/* Roadmap Tab */}
        <Tabs.Content value="roadmap">
          <Flex direction="column" gap="6">
            <Card size="3">
              <Flex justify="between" align="center" mb="4">
                <Heading size="4">Phase 1: Pre-Launch Essentials</Heading>
                <Badge color="red" variant="soft">High Priority</Badge>
              </Flex>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Why</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Trigger Point</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {MISSING_EMAILS.filter(e => e.priority === 'high').map(email => (
                    <Table.Row key={email.name}>
                      <Table.Cell><Text weight="medium" size="2">{email.name}</Text></Table.Cell>
                      <Table.Cell><Text size="2" color="gray">{email.notes}</Text></Table.Cell>
                      <Table.Cell><Code size="1">{email.trigger}</Code></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>

            <Card size="3">
              <Flex justify="between" align="center" mb="4">
                <Heading size="4">Phase 2: Growth &amp; Engagement</Heading>
                <Badge color="orange" variant="soft">Medium Priority</Badge>
              </Flex>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Why</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Trigger Point</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {MISSING_EMAILS.filter(e => e.priority === 'medium').map(email => (
                    <Table.Row key={email.name}>
                      <Table.Cell><Text weight="medium" size="2">{email.name}</Text></Table.Cell>
                      <Table.Cell><Text size="2" color="gray">{email.notes}</Text></Table.Cell>
                      <Table.Cell><Code size="1">{email.trigger}</Code></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>

            <Card size="3">
              <Flex justify="between" align="center" mb="4">
                <Heading size="4">Phase 3: Polish &amp; Lifecycle</Heading>
                <Badge color="gray" variant="soft">Low Priority</Badge>
              </Flex>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Why</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Trigger Point</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {MISSING_EMAILS.filter(e => e.priority === 'low').map(email => (
                    <Table.Row key={email.name}>
                      <Table.Cell><Text weight="medium" size="2">{email.name}</Text></Table.Cell>
                      <Table.Cell><Text size="2" color="gray">{email.notes}</Text></Table.Cell>
                      <Table.Cell><Code size="1">{email.trigger}</Code></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>
          </Flex>
        </Tabs.Content>

        {/* Configuration Tab */}
        <Tabs.Content value="config">
          <Flex direction="column" gap="6">
            <Card size="3">
              <Heading size="4" mb="4">Resend Configuration</Heading>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Setting</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Provider</Text></Table.Cell>
                    <Table.Cell>Resend + React Email</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Verified Domain</Text></Table.Cell>
                    <Table.Cell><Code>{EMAIL_DOMAIN}</Code></Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">API Key Env Var</Text></Table.Cell>
                    <Table.Cell><Code>RESEND_API_KEY</Code></Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Client Singleton</Text></Table.Cell>
                    <Table.Cell><Code>src/lib/email.ts</Code></Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Render Helper</Text></Table.Cell>
                    <Table.Cell><Code>src/lib/send-email.ts</Code> — renderEmail(Component, props)</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Templates</Text></Table.Cell>
                    <Table.Cell><Code>src/emails/</Code> — React Email components</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Shared Layout</Text></Table.Cell>
                    <Table.Cell><Code>src/emails/components/layout.tsx</Code></Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell><Text weight="medium">Auth Integration</Text></Table.Cell>
                    <Table.Cell><Code>src/lib/auth.ts</Code> (better-auth hooks)</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </Card>

            {/* Brand Color Palette */}
            <Card size="3">
              <Heading size="4" mb="2">Color Palette</Heading>
              <Text size="2" color="gray" mb="4" as="p">
                All emails use the Spectacl brand green — sourced from the app&apos;s custom Radix lime palette. Hardcoded hex (CSS variables don&apos;t work in email clients). No gradients.
              </Text>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Token</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Used For</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {([
                    { role: 'Primary',  token: 'lime-9',  hex: '#2b4d1a', usedFor: 'Header background, button background (= app primary CTA)' },
                    { role: 'Hover',    token: 'lime-10', hex: '#3c5e2b', usedFor: 'Button hover reference (informational)' },
                    { role: 'Link',     token: 'lime-11', hex: '#457d28', usedFor: 'Hyperlinks, URL fallbacks' },
                    { role: 'Callout',  token: 'lime-3',  hex: '#dbface', usedFor: 'Callout / info box background' },
                    { role: 'Body bg',  token: 'white',    hex: '#ffffff', usedFor: 'Email body background' },
                  ] as const).map(c => (
                    <Table.Row key={c.role}>
                      <Table.Cell><Text weight="medium" size="2">{c.role}</Text></Table.Cell>
                      <Table.Cell><Code size="1">{c.token}</Code></Table.Cell>
                      <Table.Cell>
                        <Flex align="center" gap="2">
                          <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: c.hex, border: '1px solid var(--gray-6)' }} />
                          <Code size="1">{c.hex}</Code>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell><Text size="2" color="gray">{c.usedFor}</Text></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
              <Box mt="3" p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
                <Text size="1" color="gray">
                  Text: <Code size="1">Slate 12 (#11181C)</Code> primary · <Code size="1">Slate 11 (#687076)</Code> secondary.
                  Borders: <Code size="1">Slate 4 (#E8E8EC)</Code>. Defined in <Code size="1">src/emails/components/layout.tsx</Code> as <Code size="1">BRAND</Code> and <Code size="1">SLATE</Code>.
                </Text>
              </Box>
            </Card>

            {/* Architecture */}
            <Card size="3">
              <Heading size="4" mb="4">Architecture</Heading>
              <Flex direction="column" gap="3">
                <Box p="4" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-4)' }}>
                  <Text size="2" style={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
{`React Email components with shared layout.
Templates:  src/emails/*.tsx (thin components, typed props)
Layout:     src/emails/components/layout.tsx (shared shell)
Helper:     src/lib/send-email.ts (renderEmail — createElement + render)
Client:     src/lib/email.ts (Resend singleton)

Colors:     Spectacl brand green (Radix lime scale, hardcoded hex, no CSS vars, no gradients)
            Defined in src/emails/components/layout.tsx as BRAND + SLATE

Flow:
  1. Event triggers (signup, reset, invite, cancel...)
  2. renderEmail(Component, props) → HTML string
  3. resend.emails.send({ html }) delivers to inbox
  4. Password reset is fire-and-forget (timing attack prevention)
  5. Invitation + cancellation emails are non-fatal (logged, not thrown)

Adding a new email:
  1. Create src/emails/my-email.tsx with props interface + PreviewProps
  2. Wrap content in <EmailLayout preview="..." headerTitle="...">
  3. Export from src/emails/index.ts
  4. Call renderEmail(MyEmail, props) at the trigger point`}
                  </Text>
                </Box>

                <Box p="4" style={{ backgroundColor: 'var(--yellow-2)', borderLeft: '4px solid var(--yellow-9)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="2" color="yellow">
                    <Text weight="bold">Note:</Text> No email queue/worker exists yet. All emails are sent synchronously in the request path.
                    For high-volume emails (weekly digests, alerts), a dedicated email queue should be added to BullMQ.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        </Tabs.Content>
        {/* Debug Tab */}
        <Tabs.Content value="debug">
          <Flex direction="column" gap="6">
            <Box p="4" style={{ backgroundColor: 'var(--orange-2)', borderLeft: '4px solid var(--orange-9)', borderRadius: 'var(--radius-2)' }}>
              <Text size="2" color="orange">
                <Text weight="bold">Admin only.</Text> Sends a real email with preview props. Use your own email to verify delivery and rendering.
              </Text>
            </Box>

            {/* Send Test Email */}
            <Card size="3">
              <Heading size="4" mb="4">Send Test Email</Heading>
              <Flex direction="column" gap="4">

                {/* Test domain toggle */}
                <Box p="3" style={{ backgroundColor: useTestDomain ? 'var(--blue-2)' : 'var(--gray-2)', borderRadius: 'var(--radius-2)', border: `1px solid ${useTestDomain ? 'var(--blue-6)' : 'var(--gray-6)'}` }}>
                  <Flex justify="between" align="start" gap="4">
                    <Box>
                      <Flex align="center" gap="2" mb="1">
                        <Text size="2" weight="medium">Use <Code size="1">onboarding@resend.dev</Code> (sandbox)</Text>
                        {useTestDomain && <Badge color="blue" variant="soft" size="1">Active</Badge>}
                      </Flex>
                      {useTestDomain ? (
                        <Text size="1" color="blue" as="p">
                          Resend&apos;s shared test domain — no DNS setup needed. <Text weight="bold">Free plan restriction: recipient must be your Resend account email.</Text> Disable once <Code size="1">mail.spectacl.org</Code> is verified.
                        </Text>
                      ) : (
                        <Text size="1" color="gray" as="p">
                          Sends from your verified <Code size="1">mail.spectacl.org</Code> domain. Will fail with 403 until DNS records are added in Resend.
                        </Text>
                      )}
                    </Box>
                    <Switch
                      checked={useTestDomain}
                      onCheckedChange={setUseTestDomain}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                  </Flex>
                </Box>

                <Flex gap="3" align="end" wrap="wrap">
                  <Box style={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <Text size="2" weight="medium" mb="2" as="p">Template</Text>
                    <Select.Root value={debugTemplate} onValueChange={setDebugTemplate}>
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        {IMPLEMENTED_EMAILS.filter(e => e.templateKey).map(e => (
                          <Select.Item key={e.templateKey} value={e.templateKey!}>
                            {e.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Box>
                  <Box style={{ flex: '2 1 260px', minWidth: '200px' }}>
                    <Text size="2" weight="medium" mb="2" as="p">
                      Recipient
                      {useTestDomain && <Text size="1" color="blue" ml="2">(must be your Resend account email)</Text>}
                    </Text>
                    <TextField.Root
                      placeholder={useTestDomain ? 'your-resend-account@example.com' : 'anyone@example.com'}
                      value={debugTo}
                      onChange={e => setDebugTo(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !debugLoading && handleDebugSend()}
                    />
                  </Box>
                  <Button
                    onClick={handleDebugSend}
                    disabled={debugLoading || !debugTo.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {debugLoading ? 'Sending…' : 'Send Test Email'}
                  </Button>
                </Flex>
              </Flex>
            </Card>

            {/* Result */}
            {debugResult && (
              <Card size="3">
                <Flex justify="between" align="center" mb="4">
                  <Heading size="4">Result</Heading>
                  <Badge color={debugResult.ok ? 'green' : 'red'} variant="soft" size="2">
                    {debugResult.ok ? 'Sent' : 'Failed'}
                  </Badge>
                </Flex>

                <Table.Root variant="surface">
                  <Table.Body>
                    {!!debugResult.ok && (
                      <>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">Resend ID</Text></Table.Cell>
                          <Table.Cell><Code size="1">{String(debugResult.resendId ?? '—')}</Code></Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">From</Text></Table.Cell>
                          <Table.Cell><Code size="1">{String(debugResult.from ?? '—')}</Code></Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">To</Text></Table.Cell>
                          <Table.Cell><Code size="1">{String(debugResult.to ?? '—')}</Code></Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">Subject</Text></Table.Cell>
                          <Table.Cell><Text size="2">{String(debugResult.subject ?? '—')}</Text></Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">HTML size</Text></Table.Cell>
                          <Table.Cell><Text size="2">{String(debugResult.htmlLength ?? '—')} chars</Text></Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">Render time</Text></Table.Cell>
                          <Table.Cell><Text size="2">{String(debugResult.renderMs ?? '—')}ms</Text></Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">Total time</Text></Table.Cell>
                          <Table.Cell><Text size="2">{String(debugResult.totalMs ?? '—')}ms</Text></Table.Cell>
                        </Table.Row>
                      </>
                    )}
                    {!debugResult.ok && debugResult !== null && (
                      <>
                        {debugResult.stage && (
                          <Table.Row>
                            <Table.Cell><Text size="2" weight="medium">Failed at</Text></Table.Cell>
                            <Table.Cell><Badge color="red" variant="soft">{String(debugResult.stage)}</Badge></Table.Cell>
                          </Table.Row>
                        )}
                        <Table.Row>
                          <Table.Cell><Text size="2" weight="medium">Error</Text></Table.Cell>
                          <Table.Cell>
                            <Code size="1" style={{ color: 'var(--red-11)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {typeof debugResult.error === 'object'
                                ? JSON.stringify(debugResult.error, null, 2)
                                : String(debugResult.error ?? 'Unknown error')}
                            </Code>
                          </Table.Cell>
                        </Table.Row>
                        {debugResult.resendError && (
                          <Table.Row>
                            <Table.Cell><Text size="2" weight="medium">Resend error</Text></Table.Cell>
                            <Table.Cell>
                              <Code size="1" style={{ color: 'var(--red-11)' }}>
                                {JSON.stringify(debugResult.resendError, null, 2)}
                              </Code>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </>
                    )}
                  </Table.Body>
                </Table.Root>

                {!!debugResult.ok && (
                  <>
                    <Separator size="4" mt="4" mb="4" />
                    <Text size="2" color="gray" mb="2" as="p">
                      Check your server logs for <Code size="1">[email-debug]</Code> lines with the full Resend response and rendered HTML details.
                    </Text>
                  </>
                )}
              </Card>
            )}

            {/* What to check */}
            <Card size="3">
              <Heading size="4" mb="4">Debugging Checklist</Heading>
              <Flex direction="column" gap="3">
                {([
                  {
                    label: 'Resend accepted (200)',
                    desc: 'Check the Resend dashboard → Logs. A 200 means delivery was accepted — not necessarily delivered to inbox.',
                  },
                  {
                    label: 'Resend ID in logs',
                    desc: 'After a test send, look for [auth] or [email-debug] in your Next.js server logs. You should see a resend id=re_... line.',
                  },
                  {
                    label: 'Free plan: recipient must be your Resend account email',
                    desc: 'When using the resend.dev sandbox, Resend only allows sending to the email address you signed up with. You\'ll get a 403 if you try any other address.',
                  },
                  {
                    label: 'Check spam / junk folder',
                    desc: 'Resend may deliver but Gmail/Outlook routes to spam. Check spam for the test address.',
                  },
                  {
                    label: 'Magic link URL',
                    desc: 'The magic link URL is built from BETTER_AUTH_URL. On dev, check that BETTER_AUTH_URL=https://dev.spectacl.org (not localhost). The URL logged as [auth] sendMagicLink should start with your domain.',
                  },
                  {
                    label: 'Email rendering',
                    desc: 'Use the Template Previews tab to confirm the HTML renders correctly before sending.',
                  },
                  {
                    label: 'RESEND_API_KEY set on server',
                    desc: 'If email.ts throws "RESEND_API_KEY is not set", the env var is missing. Check your .env and Coolify env config.',
                  },
                ] as const).map((item, i) => (
                  <Box key={i} p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
                    <Text size="2" weight="medium">{i + 1}. {item.label}</Text>
                    <Text size="2" color="gray" as="p" mt="1">{item.desc}</Text>
                  </Box>
                ))}
              </Flex>
            </Card>
          </Flex>
        </Tabs.Content>

      </Tabs.Root>
    </Container>
  );
}
