"use client";

import React from 'react';
import {
    CheckCircledIcon,
    CircleIcon,
    RocketIcon,
    LockClosedIcon,
    EnvelopeClosedIcon,
    GearIcon
} from "@radix-ui/react-icons";
import { Flex, Box, Grid, Text, Heading, Badge } from '@radix-ui/themes';

export default function AuthenticationRoadmap() {
    return (
        <Flex direction="column" gap="8">
            {/* Email Provider */}
            <Box p="6" style={{ background: 'linear-gradient(to bottom right, var(--green-2), var(--green-1))', borderRadius: 'var(--radius-4)', border: '1px solid var(--green-4)' }}>
                <Flex align="start" gap="4">
                    <Flex
                        width="48px"
                        height="48px"
                        align="center"
                        justify="center"
                        style={{ backgroundColor: 'var(--green-9)', borderRadius: 'var(--radius-3)', flexShrink: 0 }}
                    >
                        <EnvelopeClosedIcon width="24" height="24" color="white" />
                    </Flex>
                    <Box style={{ flex: 1 }}>
                        <Flex align="center" gap="2" mb="2">
                             <Heading size="4" weight="bold">Email Provider: Resend</Heading>
                             <Badge color="green" variant="soft" radius="full">Active</Badge>
                        </Flex>
                        <Text size="2" color="gray" mb="2" style={{ display: 'block' }}>
                            Transactional emails via Resend on domain mail.spectacl.org. Used for magic link login, verification, invitations, and cancellation emails.
                        </Text>
                        <Box p="2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 'var(--radius-2)', border: '1px solid var(--green-3)', display: 'inline-block' }}>
                            <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                                Domain: mail.spectacl.org
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Box>

            {/* Phase Overview */}
            <Grid columns={{ initial: '1', md: '3' }} gap="6">
                {/* Phase 1 — Done */}
                <Flex direction="column" gap="4">
                    <Flex align="center" gap="2">
                        <CheckCircledIcon style={{ color: 'var(--green-9)' }} />
                        <Text size="1" weight="bold" color="green" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Phase 1: Core Auth — Done
                        </Text>
                    </Flex>
                    <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--green-3)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden' }}>
                        <Box position="absolute" top="0" right="0" width="64px" height="64px" style={{ backgroundColor: 'var(--green-1)', borderRadius: '0 0 0 100%', marginRight: '-32px', marginTop: '-32px' }} />
                        <Flex align="center" gap="2" mb="3" style={{ position: 'relative', zIndex: 10 }}>
                            <LockClosedIcon style={{ color: 'var(--green-9)', width: '20px', height: '20px' }} />
                            <Heading size="4" weight="bold">Passwordless Auth</Heading>
                        </Flex>
                        <Text size="1" color="gray" mb="3" style={{ display: 'block', position: 'relative', zIndex: 10 }}>Better Auth + Magic Link</Text>
                        <Flex direction="column" gap="2" style={{ position: 'relative', zIndex: 10 }}>
                            {[
                                { label: "Magic link login (via Resend)", done: true },
                                { label: "Google OAuth", done: true },
                                { label: "Email verification", done: true },
                                { label: "Session management", done: true },
                                { label: "Signup mode controls (open/waitlist/closed)", done: true },
                                { label: "Role-based access (USER/ADMIN)", done: true },
                                { label: "Space invitations", done: true },
                            ].map((item, i) => (
                                <Flex key={i} align="start" gap="2">
                                    <CheckCircledIcon style={{ width: '14px', height: '14px', marginTop: '4px', color: 'var(--green-9)' }} />
                                    <Text size="2" color="gray" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                                        {item.label}
                                    </Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Box>
                </Flex>

                {/* Phase 2 — Future */}
                <Flex direction="column" gap="4">
                    <Flex align="center" gap="2">
                        <RocketIcon style={{ color: 'var(--blue-9)' }} />
                        <Text size="1" weight="bold" color="blue" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Phase 2: Harden
                        </Text>
                    </Flex>
                    <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--blue-3)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden' }}>
                        <Box position="absolute" top="0" right="0" width="64px" height="64px" style={{ backgroundColor: 'var(--blue-1)', borderRadius: '0 0 0 100%', marginRight: '-32px', marginTop: '-32px' }} />
                        <Flex align="center" gap="2" mb="3" style={{ position: 'relative', zIndex: 10 }}>
                            <LockClosedIcon style={{ color: 'var(--blue-9)', width: '20px', height: '20px' }} />
                            <Heading size="4" weight="bold">Security Hardening</Heading>
                        </Flex>
                        <Text size="1" color="gray" mb="3" style={{ display: 'block', position: 'relative', zIndex: 10 }}>When needed</Text>
                        <Flex direction="column" gap="2" style={{ position: 'relative', zIndex: 10 }}>
                            {[
                                { label: "Rate limiting on auth endpoints" },
                                { label: "Two-factor authentication (TOTP)" },
                                { label: "Account deletion flow" },
                            ].map((item, i) => (
                                <Flex key={i} align="start" gap="2">
                                    <CircleIcon style={{ width: '14px', height: '14px', marginTop: '4px', color: 'var(--blue-7)' }} />
                                    <Text size="2" color="gray">{item.label}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Box>
                </Flex>

                {/* Phase 3 — Enterprise */}
                <Flex direction="column" gap="4">
                    <Flex align="center" gap="2">
                        <GearIcon style={{ color: 'var(--purple-9)' }} />
                        <Text size="1" weight="bold" color="purple" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Phase 3: Enterprise
                        </Text>
                    </Flex>
                    <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--purple-3)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden' }}>
                        <Box position="absolute" top="0" right="0" width="64px" height="64px" style={{ backgroundColor: 'var(--purple-1)', borderRadius: '0 0 0 100%', marginRight: '-32px', marginTop: '-32px' }} />
                        <Flex align="center" gap="2" mb="3" style={{ position: 'relative', zIndex: 10 }}>
                            <GearIcon style={{ color: 'var(--purple-9)', width: '20px', height: '20px' }} />
                            <Heading size="4" weight="bold">Enterprise Features</Heading>
                        </Flex>
                        <Text size="1" color="gray" mb="3" style={{ display: 'block', position: 'relative', zIndex: 10 }}>Future / on-demand</Text>
                        <Flex direction="column" gap="2" style={{ position: 'relative', zIndex: 10 }}>
                            {[
                                { label: "SSO / SAML integration" },
                                { label: "Audit logging" },
                                { label: "IP allowlisting" },
                                { label: "Custom session policies" },
                            ].map((item, i) => (
                                <Flex key={i} align="start" gap="2">
                                    <CircleIcon style={{ width: '14px', height: '14px', marginTop: '4px', color: 'var(--purple-6)' }} />
                                    <Text size="2" color="gray">{item.label}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Box>
                </Flex>
            </Grid>

            {/* Current State + Environment Variables */}
            <Grid columns={{ initial: '1', md: '2' }} gap="6">
                {/* Current State */}
                <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)' }}>
                    <Heading size="4" mb="4">
                        <Flex align="center" gap="2">
                            <CheckCircledIcon style={{ color: 'var(--green-9)' }} />
                            Current Architecture
                        </Flex>
                    </Heading>
                    <Flex direction="column" gap="2">
                        {[
                            "Passwordless — magic link only, no passwords stored",
                            "Google OAuth as alternative sign-in method",
                            "SSO toggle via admin systemSetting (sso_google_enabled)",
                            "Signup gating: open, waitlist, or closed modes",
                            "Session-based auth with cookie + middleware",
                            "Role field on User (USER / ADMIN) for admin pages",
                            "Space membership + roles (OWNER / ADMIN / MEMBER)",
                        ].map((text, i) => (
                            <Flex key={i} align="start" gap="2">
                                <Text weight="bold" color="green">✓</Text>
                                <Text size="2" color="gray">{text}</Text>
                            </Flex>
                        ))}
                    </Flex>
                </Box>

                {/* Environment Variables */}
                <Box p="6" style={{ backgroundColor: 'var(--gray-12)', borderRadius: 'var(--radius-4)', color: 'white' }}>
                    <Heading size="4" mb="4">
                        <Flex align="center" gap="2">
                            <GearIcon />
                            Environment Variables
                        </Flex>
                    </Heading>
                    <Flex direction="column" gap="4">
                        <Box>
                            <Text size="2" color="green" weight="bold" mb="2" style={{ display: 'block' }}>Auth (Active)</Text>
                            <Flex direction="column" gap="1">
                                <Text size="1" style={{ fontFamily: 'monospace', opacity: 0.9, color: 'var(--gray-6)' }}>BETTER_AUTH_SECRET</Text>
                                <Text size="1" style={{ fontFamily: 'monospace', opacity: 0.9, color: 'var(--gray-6)' }}>BETTER_AUTH_URL</Text>
                                <Text size="1" style={{ fontFamily: 'monospace', opacity: 0.9, color: 'var(--gray-6)' }}>RESEND_API_KEY</Text>
                            </Flex>
                        </Box>
                        <Box>
                            <Text size="2" color="blue" weight="bold" mb="2" style={{ display: 'block' }}>OAuth (Active)</Text>
                            <Flex direction="column" gap="1">
                                <Text size="1" style={{ fontFamily: 'monospace', opacity: 0.9, color: 'var(--gray-6)' }}>GOOGLE_CLIENT_ID</Text>
                                <Text size="1" style={{ fontFamily: 'monospace', opacity: 0.9, color: 'var(--gray-6)' }}>GOOGLE_CLIENT_SECRET</Text>
                            </Flex>
                        </Box>
                    </Flex>
                </Box>
            </Grid>
        </Flex>
    );
}
