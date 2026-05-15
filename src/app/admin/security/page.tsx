"use client";

import {
    Container, Flex, Heading, Text, Card, Badge, Table, Separator, Box, Callout,
} from "@radix-ui/themes";
import {
    CheckCircledIcon,
    LockClosedIcon,
    ExclamationTriangleIcon,
    InfoCircledIcon,
} from "@radix-ui/react-icons";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
    label: string;
    description: string;
    check: string;
}

interface SecurityPattern {
    pattern: string;
    risk: string;
    example: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const AUDIT_SUMMARY = {
    lastAudit: "April 11, 2026",
    totalFindings: 10,
    fixed: 9,
    open: 1,
    scope: "All 90+ API route handlers, payment flows, webhook security, auth middleware",
};

const SECURITY_STACK: { layer: string; implementation: string }[] = [
    { layer: "Auth", implementation: "better-auth (cookie-based, SameSite)" },
    { layer: "Login methods", implementation: "Magic link + Google SSO" },
    { layer: "CSRF", implementation: "Origin header validation on mutations" },
    { layer: "Rate limiting", implementation: "Redis fixed-window (signup 5/hr, login 10/min)" },
    { layer: "Webhook auth", implementation: "Mollie API fetch-back (never trust POST body)" },
    { layer: "Cron auth", implementation: "CRON_SECRET bearer token (mandatory)" },
    { layer: "Admin auth", implementation: "session.user.role === 'ADMIN' (uppercase)" },
    { layer: "Tenant isolation", implementation: "requireSpaceMembership() on all space-scoped routes" },
    { layer: "Headers", implementation: "CSP, HSTS, X-Frame-Options, X-Content-Type-Options" },
    { layer: "Error tracking", implementation: "Sentry (session replay 5%, tracing 10%)" },
];

const CHECKLIST: ChecklistItem[] = [
    {
        label: "API route auth",
        description: "Every route in src/app/api/ checks session or uses a public route exemption.",
        check: "grep -rL 'getSession\\|requireSpaceMembership\\|withEntityAuth\\|CRON_SECRET' src/app/api/*/route.ts",
    },
    {
        label: "IDOR prevention",
        description: "Routes with ID params resolve ownership chain (resource → entity → space → membership).",
        check: "Manual: log in as User A, note IDs. Log in as User B (different space), try accessing User A's resources.",
    },
    {
        label: "Admin role check",
        description: "All admin routes use session.user.role !== 'ADMIN' (uppercase, never lowercase).",
        check: "grep -rn \"role.*admin\" src/app/api/admin/ — should find only 'ADMIN' (uppercase)",
    },
    {
        label: "Webhook verification",
        description: "Mollie webhook fetches payment from API before acting. Never trusts POST body alone.",
        check: "Review src/app/api/webhooks/mollie/route.ts — verify mollie.payments.get() is called.",
    },
    {
        label: "Payment integrity",
        description: "confirm-payment does NOT set lastProcessedWebhookId. Webhook is sole authority for subscription + credits.",
        check: "Review src/app/api/mollie/confirm-payment/route.ts — verify lastProcessedWebhookId is not written.",
    },
    {
        label: "Data exposure",
        description: "API responses use Prisma select (not include) to avoid leaking related model fields.",
        check: "grep -rn 'include:' src/app/api/ — verify each include has a corresponding select.",
    },
    {
        label: "GDPR export scope",
        description: "Export only contains the requesting user's own data. No third-party PII.",
        check: "Review src/app/api/user/export/route.ts — verify no other users' emails/names are included.",
    },
    {
        label: "Debug endpoints",
        description: "All /api/debug/* routes are ADMIN-only or removed in production.",
        check: "grep -rn 'ADMIN' src/app/api/debug/",
    },
];

const DANGEROUS_PATTERNS: SecurityPattern[] = [
    {
        pattern: "Missing requireSpaceMembership()",
        risk: "IDOR — any user can CRUD resources in any space",
        example: "DELETE /api/rankings/{id} without ownership check",
    },
    {
        pattern: "role !== 'admin' (lowercase)",
        risk: "Auth bypass — admin endpoint silently rejects all admins",
        example: "plan-limits PUT was broken for all admins",
    },
    {
        pattern: "Trusting webhook POST body",
        risk: "Payment fraud — attacker fakes payment confirmations",
        example: "Skipping mollie.payments.get() verification",
    },
    {
        pattern: "include without select in Prisma",
        risk: "Data leak — related model fields in API response",
        example: "Space query leaking all member emails",
    },
    {
        pattern: "GDPR export with detail: true",
        risk: "PII leak — third-party data in audit logs gets exported",
        example: "Waitlist approval emails in admin audit log detail",
    },
    {
        pattern: "Debug endpoints without auth",
        risk: "Privilege escalation — unauthenticated data manipulation",
        example: "/api/debug/email as open spam relay",
    },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">

                {/* Header */}
                <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                        <LockClosedIcon width="20" height="20" />
                        <Heading size="6">Security Hub</Heading>
                    </Flex>
                    <Text size="3" color="gray">
                        Security overview, audit checklist, and known patterns. Findings are tracked in Notion.
                    </Text>
                </Flex>

                {/* Audit Status */}
                <Card size="3">
                    <Flex direction="column" gap="4">
                        <Flex justify="between" align="center">
                            <Heading size="4">Last Audit</Heading>
                            <Badge color="blue" variant="soft" size="2">{AUDIT_SUMMARY.lastAudit}</Badge>
                        </Flex>
                        <Text size="2" color="gray">{AUDIT_SUMMARY.scope}</Text>
                        <Flex gap="4" wrap="wrap">
                            <Badge size="2" variant="surface" color="gray">
                                {AUDIT_SUMMARY.totalFindings} findings
                            </Badge>
                            <Badge size="2" variant="surface" color="green">
                                {AUDIT_SUMMARY.fixed} fixed
                            </Badge>
                            {AUDIT_SUMMARY.open > 0 && (
                                <Badge size="2" variant="surface" color="red">
                                    {AUDIT_SUMMARY.open} open
                                </Badge>
                            )}
                        </Flex>
                        {AUDIT_SUMMARY.open > 0 && (
                            <Callout.Root color="amber" size="1">
                                <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                                <Callout.Text>
                                    {AUDIT_SUMMARY.open} open finding{AUDIT_SUMMARY.open !== 1 ? "s" : ""} — see Notion Security Findings database for details.
                                </Callout.Text>
                            </Callout.Root>
                        )}
                    </Flex>
                </Card>

                <Separator size="4" />

                {/* Security Stack */}
                <Flex direction="column" gap="4">
                    <Heading size="4">Security Stack</Heading>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell style={{ width: 160 }}>Layer</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Implementation</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {SECURITY_STACK.map((row) => (
                                <Table.Row key={row.layer}>
                                    <Table.Cell>
                                        <Text size="2" weight="medium">{row.layer}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">{row.implementation}</Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Audit Checklist */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Audit Checklist</Heading>
                        <Text size="2" color="gray">
                            Run through this checklist before each production deployment or after adding new API routes.
                        </Text>
                    </Flex>
                    <Flex direction="column" gap="3">
                        {CHECKLIST.map((item) => (
                            <Card key={item.label} variant="surface">
                                <Flex direction="column" gap="2" p="1">
                                    <Flex align="center" gap="2">
                                        <CheckCircledIcon width="14" height="14" color="var(--gray-7)" />
                                        <Text size="2" weight="medium">{item.label}</Text>
                                    </Flex>
                                    <Text size="2" color="gray" style={{ lineHeight: 1.5 }}>
                                        {item.description}
                                    </Text>
                                    <Box p="2" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)" }}>
                                        <Text size="1" style={{ fontFamily: "var(--font-mono)", color: "var(--gray-9)" }}>
                                            {item.check}
                                        </Text>
                                    </Box>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                </Flex>

                <Separator size="4" />

                {/* Dangerous Patterns */}
                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="1">
                        <Heading size="4">Dangerous Patterns</Heading>
                        <Text size="2" color="gray">
                            Code patterns that have caused vulnerabilities in this codebase. Watch for these in PRs.
                        </Text>
                    </Flex>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Pattern</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Risk</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Example</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {DANGEROUS_PATTERNS.map((p) => (
                                <Table.Row key={p.pattern}>
                                    <Table.Cell>
                                        <Text size="2" weight="medium" color="red">{p.pattern}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color="gray">{p.risk}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="1" color="gray" style={{ fontFamily: "var(--font-mono)" }}>{p.example}</Text>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Flex>

                <Separator size="4" />

                {/* Resources */}
                <Flex direction="column" gap="4">
                    <Heading size="4">Resources</Heading>
                    <Flex direction="column" gap="2">
                        <Card variant="surface">
                            <Flex align="center" gap="3" p="1">
                                <InfoCircledIcon width="16" height="16" color="var(--blue-9)" />
                                <Flex direction="column">
                                    <Text size="2" weight="medium">Notion: Security Findings Database</Text>
                                    <Text size="1" color="gray">All historical findings with status, severity, category, and fix details.</Text>
                                </Flex>
                            </Flex>
                        </Card>
                        <Card variant="surface">
                            <Flex align="center" gap="3" p="1">
                                <InfoCircledIcon width="16" height="16" color="var(--blue-9)" />
                                <Flex direction="column">
                                    <Text size="2" weight="medium">Notion: Security Audit Runbook</Text>
                                    <Text size="1" color="gray">Step-by-step process for running a security audit with grep commands and test methods.</Text>
                                </Flex>
                            </Flex>
                        </Card>
                        <Card variant="surface">
                            <Flex align="center" gap="3" p="1">
                                <InfoCircledIcon width="16" height="16" color="var(--blue-9)" />
                                <Flex direction="column">
                                    <Text size="2" weight="medium">Claude Code: /security-review</Text>
                                    <Text size="1" color="gray">Run automated security review on any PR diff using the /security-review skill.</Text>
                                </Flex>
                            </Flex>
                        </Card>
                    </Flex>
                </Flex>

            </Flex>
        </Container>
    );
}
