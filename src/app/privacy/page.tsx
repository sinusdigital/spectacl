'use client';

import React from 'react';
import { Container, Heading, Text, Section, Flex, Box, Separator, Link as RadixLink } from '@radix-ui/themes';
import { LegalFooter } from '@/components/Shared/LegalFooter';

export default function PrivacyPage() {
    return (
        <Container size="3">
            <Section p={{ initial: '4', sm: '8' }}>
                <Flex direction="column" gap="8">
                    {/* Header */}
                    <Flex direction="column" gap="2" align="center" mb="4">
                        <Heading size="9" weight="bold" color="indigo" style={{ letterSpacing: '-0.02em' }}>
                            Spectacl
                        </Heading>
                        <Heading size="6" weight="medium">Privacy Policy</Heading>
                        <Text color="gray" size="2">Last updated: April 14, 2026</Text>
                    </Flex>

                    <Flex direction="column" gap="6">
                        <Text size="3" color="gray">
                            This privacy policy (&ldquo;Privacy Policy&rdquo;) describes how Sinus Digital B.V. (KVK: 99865416), trading as Spectacl (&ldquo;Spectacl&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;), registered in the Netherlands, collects, uses, discloses, transfers, and otherwise processes (collectively, &ldquo;Processes&rdquo;) your personal data.
                        </Text>

                        <Text size="3" color="gray">
                            By accessing or using our website, products, or services, or otherwise interacting with us, you are deemed to have read, understood, and agreed to the Processing of your personal data as described in this Privacy Policy.
                        </Text>

                        <Text size="3" color="gray">
                            The Services are intended for business use (B2B). We process personal data of business users and their employees in the context of providing AI visibility tracking tools.
                        </Text>
                    </Flex>

                    <Separator size="4" />

                    <Flex direction="column" gap="8">
                        {/* 1. Definitions */}
                        <Box>
                            <Heading size="5" mb="3">1. Interpretation and Definitions</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                The words of which the initial letter is capitalized have meanings defined below. These definitions apply regardless of whether they appear in singular or plural.
                            </Text>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}><strong>Account:</strong> A unique account created for you to access the Service.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Company:</strong> Sinus Digital B.V., registered in the Netherlands (KVK: 99865416).</li>
                                    <li style={{ marginBottom: 4 }}><strong>Personal Data:</strong> Any information that relates to an identified or identifiable individual (Art. 4(1) GDPR).</li>
                                    <li style={{ marginBottom: 4 }}><strong>Service:</strong> The website at spectacl.org and app.spectacl.org, and all related analytical tools.</li>
                                    <li><strong>Service Provider:</strong> Any natural or legal person who processes data on behalf of the Company (Art. 4(8) GDPR).</li>
                                </ul>
                            </Text>
                        </Box>

                        {/* 2. Data Collection */}
                        <Box>
                            <Heading size="5" mb="3">2. Collecting and Using Your Personal Data</Heading>
                            <Box mb="4">
                                <Heading size="3" mb="2">2.1 Types of Data Collected</Heading>
                                <Text as="p" size="3" color="gray" mb="2">
                                    While using the Service, we may collect the following personal data:
                                </Text>
                                <Text as="div" size="3" color="gray">
                                    <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                        <li style={{ marginBottom: 4 }}><strong>Account data:</strong> Email address, name, profile image</li>
                                        <li style={{ marginBottom: 4 }}><strong>Billing data:</strong> Company name, address, country, VAT ID (stored for invoicing and tax compliance)</li>
                                        <li style={{ marginBottom: 4 }}><strong>Usage data:</strong> IP address, browser type, device identifiers, pages visited, time on pages</li>
                                        <li style={{ marginBottom: 4 }}><strong>Session data:</strong> IP address and user agent string (stored for security and active session management)</li>
                                        <li><strong>Activity data:</strong> Last-seen timestamp updated periodically while the app is open (used for admin online status indicators)</li>
                                    </ul>
                                </Text>
                            </Box>
                            <Box mb="4">
                                <Heading size="3" mb="2">2.2 Internal Access to Content</Heading>
                                <Text as="p" size="3" color="gray">
                                    To provide, maintain, and troubleshoot the Service, authorized personnel may have access to prompts, configurations, and analytical results associated with your account. We use this access strictly for operational purposes such as resolving technical issues, preventing abuse, and improving system performance. We do not use your specific content for marketing purposes without your explicit consent.
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">2.3 Aggregated and Anonymized Benchmarks</Heading>
                                <Text as="p" size="3" color="gray" mb="3">
                                    To provide platform-wide insights and comparative benchmarks, Spectacl may aggregate and anonymize data derived from usage across all users. This includes aggregated statistics on domain citation frequencies, model response patterns, and visibility trends.
                                </Text>
                                <Text as="p" size="3" color="gray" mb="3">
                                    Aggregated data is stripped of all user-identifying information and cannot be used to identify individual users, their organisations, or the specific prompts or entities they research.
                                </Text>
                                <Text as="p" size="3" color="gray">
                                    By using the Services, you agree that Spectacl may include anonymized, aggregated derivatives of your usage data in platform-wide analyses and benchmarks.
                                </Text>
                            </Box>
                        </Box>

                        {/* 3. GDPR */}
                        <Box>
                            <Heading size="5" mb="3">3. GDPR Privacy (European Union)</Heading>
                            <Box mb="4">
                                <Heading size="3" mb="2">Legal Basis for Processing</Heading>
                                <Text as="p" size="3" color="gray" mb="2">
                                    We process Personal Data under the following lawful bases (Art. 6(1) GDPR):
                                </Text>
                                <Text as="div" size="3" color="gray">
                                    <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                        <li style={{ marginBottom: 4 }}><strong>Contract performance (Art. 6(1)(b)):</strong> Processing necessary to provide the Services you subscribed to.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Legitimate interests (Art. 6(1)(f)):</strong> Security monitoring, fraud prevention, service improvement, admin activity tracking.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Legal obligation (Art. 6(1)(c)):</strong> Tax compliance, invoice retention, law enforcement requests.</li>
                                        <li><strong>Consent (Art. 6(1)(a)):</strong> Optional marketing communications (opt-in only).</li>
                                    </ul>
                                </Text>
                            </Box>
                            <Box mb="4">
                                <Heading size="3" mb="2">Your Rights under the GDPR</Heading>
                                <Text as="div" size="3" color="gray">
                                    <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                        <li style={{ marginBottom: 4 }}><strong>Access (Art. 15):</strong> Request a copy of your personal data. You can download your data export from User Settings &gt; Privacy &amp; Data.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Rectification (Art. 16):</strong> Request correction of inaccurate data.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Erasure (Art. 17):</strong> Request deletion of your personal data. You can delete your account from User Settings &gt; Danger Zone.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Restriction (Art. 18):</strong> Request restriction of processing in certain circumstances.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Portability (Art. 20):</strong> Receive your data in a machine-readable format (JSON export).</li>
                                        <li style={{ marginBottom: 4 }}><strong>Objection (Art. 21):</strong> Object to processing based on legitimate interests.</li>
                                        <li><strong>Complaint (Art. 77):</strong> Lodge a complaint with the Autoriteit Persoonsgegevens (Dutch Data Protection Authority), The Hague, Netherlands — <RadixLink href="https://autoriteitpersoonsgegevens.nl" target="_blank">autoriteitpersoonsgegevens.nl</RadixLink>.</li>
                                    </ul>
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">Data Protection Officer</Heading>
                                <Text as="p" size="3" color="gray">
                                    Given the nature and scale of our processing activities, we are not required to appoint a Data Protection Officer under Art. 37 GDPR. For privacy-related enquiries, contact us at <RadixLink href="mailto:info@sinusdigital.nl">info@sinusdigital.nl</RadixLink>.
                                </Text>
                            </Box>
                        </Box>

                        {/* 4. CCPA */}
                        <Box>
                            <Heading size="5" mb="3">4. CCPA/CPRA Privacy Notice (California Residents)</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                This section applies solely to visitors and users who reside in the State of California.
                            </Text>
                            <Box mb="3">
                                <Heading size="3" mb="2">Categories of Personal Information Collected</Heading>
                                <Text as="p" size="3" color="gray">
                                    We collect identifiers (name, email), commercial information (subscription records), and internet activity (usage data).
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">Your Rights</Heading>
                                <Text as="div" size="3" color="gray">
                                    <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                        <li style={{ marginBottom: 4 }}><strong>Right to Know:</strong> Disclosure of what data we collect and how we use it.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Right to Delete:</strong> Deletion of personal information collected.</li>
                                        <li style={{ marginBottom: 4 }}><strong>Right to Opt-Out:</strong> We do not sell your personal data.</li>
                                        <li><strong>Non-Discrimination:</strong> We will not discriminate against you for exercising your rights.</li>
                                    </ul>
                                </Text>
                            </Box>
                        </Box>

                        {/* 5. Cookies */}
                        <Box>
                            <Heading size="5" mb="3">5. Cookies and Tracking Technologies</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                We use only strictly necessary cookies for the operation of the Service:
                            </Text>
                            <Text as="div" size="3" color="gray" mb="3">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}><strong>Authentication:</strong> Session cookie to identify you when logged in (better-auth session token, SameSite, Secure in production).</li>
                                    <li style={{ marginBottom: 4 }}><strong>Workspace:</strong> Cookie to remember your selected workspace (Space ID).</li>
                                </ul>
                            </Text>
                            <Text as="p" size="3" color="gray">
                                We do not use marketing, advertising, or third-party tracking cookies. You can instruct your browser to refuse cookies, but some parts of the Service may not function correctly without them.
                            </Text>
                        </Box>

                        {/* 6. Third-Party Processors */}
                        <Box>
                            <Heading size="5" mb="3">6. Third-Party Service Providers</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                We share personal data with the following categories of service providers to operate the Services:
                            </Text>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}><strong>Hosting:</strong> Hetzner Online GmbH (Germany) — all infrastructure hosted in the EU.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Payment processing:</strong> Mollie B.V. (Netherlands) — billing data for subscription payments.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Email delivery:</strong> Resend Inc. (United States) — email addresses for transactional emails (magic links, invitations, invoices).</li>
                                    <li style={{ marginBottom: 4 }}><strong>Error tracking:</strong> Sentry (Functional Software Inc., United States, EU data region) — error traces and masked session replays for debugging. All text and inputs are masked; no readable user content is captured.</li>
                                    <li style={{ marginBottom: 4 }}><strong>LLM providers:</strong> OpenAI (US), Anthropic (US), Google (US), Mistral (France) — prompt text is sent to these providers to generate analysis results. No personal data beyond the prompt text is transmitted.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Authentication:</strong> Google (US) — for optional Google SSO login. Email, name, and profile image are received.</li>
                                    <li><strong>Favicons:</strong> Google (US) — domain names are sent to Google&apos;s favicon service to display website logos. No personal data is transmitted.</li>
                                </ul>
                            </Text>
                            <Text as="p" size="3" color="gray" mt="3">
                                We do not sell personal data to any third party.
                            </Text>
                        </Box>

                        {/* 7. International Transfers */}
                        <Box>
                            <Heading size="5" mb="3">7. International Data Transfers</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                Our primary infrastructure is hosted in the European Union (Hetzner, Germany). However, some service providers are based in the United States (Resend, Sentry, OpenAI, Anthropic, Google). Data transferred to US-based processors is protected by:
                            </Text>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}>Standard Contractual Clauses (SCCs) where available;</li>
                                    <li style={{ marginBottom: 4 }}>The EU-U.S. Data Privacy Framework, where the processor is certified;</li>
                                    <li>Contractual data protection obligations with each processor.</li>
                                </ul>
                            </Text>
                        </Box>

                        {/* 8. Error Tracking */}
                        <Box>
                            <Heading size="5" mb="3">8. Error Tracking and Session Replay</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                We use Sentry for error tracking to diagnose and fix technical issues. Sentry&apos;s Session Replay feature may record anonymized DOM snapshots of user sessions when errors occur. All text content, form inputs, and media are masked — no readable user data is captured in recordings.
                            </Text>
                            <Text as="p" size="3" color="gray">
                                Sentry data is stored in the EU data region (Frankfurt, Germany). Session Replay runs on a small percentage of sessions (5%) and 100% of sessions where an error occurs. The legal basis for this processing is legitimate interest in maintaining service quality and security (Art. 6(1)(f) GDPR).
                            </Text>
                        </Box>

                        {/* 9. Retention */}
                        <Box>
                            <Heading size="5" mb="3">9. Data Retention</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                We retain personal data only as long as necessary for the purposes stated in this policy:
                            </Text>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}><strong>Account data:</strong> Retained until you delete your account.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Analysis results:</strong> Retained according to your plan&apos;s data retention period (90 days to 1 year).</li>
                                    <li style={{ marginBottom: 4 }}><strong>Invoices and billing records:</strong> Retained for 7 years as required by Dutch tax law.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Session data:</strong> Deleted when sessions expire or you sign out.</li>
                                    <li style={{ marginBottom: 4 }}><strong>Audit logs:</strong> Retained indefinitely for security purposes. Personal identifiers are removed when a user account is deleted.</li>
                                    <li><strong>Canceled workspaces:</strong> Data retained during a grace period, then permanently deleted.</li>
                                </ul>
                            </Text>
                        </Box>

                        {/* 10. Disclosure */}
                        <Box>
                            <Heading size="5" mb="3">10. Disclosure of Your Personal Data</Heading>
                            <Box mb="4">
                                <Heading size="3" mb="2">Business Transactions</Heading>
                                <Text as="p" size="3" color="gray">
                                    If the Company is involved in a merger, acquisition, or asset sale, your personal data may be transferred. We will provide notice before your data is transferred and becomes subject to a different privacy policy.
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">Legal Requirements</Heading>
                                <Text as="p" size="3" color="gray">
                                    We may disclose your personal data if required to do so by law, in response to valid requests by public authorities (e.g. a court or government agency), or to protect the rights, property, or safety of Spectacl, our users, or the public.
                                </Text>
                            </Box>
                        </Box>

                        {/* 11. Security */}
                        <Box>
                            <Heading size="5" mb="3">11. Security</Heading>
                            <Text as="p" size="3" color="gray">
                                The security of your personal data is important to us. We implement appropriate technical and organisational measures including encryption in transit (TLS), access controls, rate limiting on authentication endpoints, CSRF protection, and audit logging. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                            </Text>
                        </Box>

                        {/* 12. Children */}
                        <Box>
                            <Heading size="5" mb="3">12. Children&apos;s Privacy</Heading>
                            <Text as="p" size="3" color="gray">
                                Our Service does not address anyone under the age of 16. We do not knowingly collect personally identifiable information from children. If we become aware that we have collected personal data from anyone under 16 without verification of parental consent, we take steps to remove that information.
                            </Text>
                        </Box>

                        {/* 13. Changes */}
                        <Box>
                            <Heading size="5" mb="3">13. Changes to This Privacy Policy</Heading>
                            <Text as="p" size="3" color="gray">
                                We may update this Privacy Policy from time to time. For material changes, we will provide at least thirty (30) days&apos; notice via email or in-app notification. Your continued use of the Services after the effective date constitutes acceptance of the revised policy.
                            </Text>
                        </Box>

                        {/* 14. Contact */}
                        <Box>
                            <Heading size="5" mb="3">14. Contact Us</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                For any questions about this Privacy Policy, to exercise your data protection rights, or to report a concern:
                            </Text>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}>Email: <RadixLink href="mailto:info@sinusdigital.nl">info@sinusdigital.nl</RadixLink></li>
                                    <li style={{ marginBottom: 4 }}>Company: Sinus Digital B.V. (KVK: 99865416)</li>
                                    <li>Supervisory Authority: Autoriteit Persoonsgegevens, The Hague, Netherlands — <RadixLink href="https://autoriteitpersoonsgegevens.nl" target="_blank">autoriteitpersoonsgegevens.nl</RadixLink></li>
                                </ul>
                            </Text>
                        </Box>
                    </Flex>

                    <Separator size="4" mt="4" />

                    <LegalFooter />
                </Flex>
            </Section>
        </Container>
    );
}
