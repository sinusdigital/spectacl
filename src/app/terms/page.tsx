'use client';

import React from 'react';
import { Container, Heading, Text, Section, Flex, Box, Link as RadixLink, Separator } from '@radix-ui/themes';
import Link from 'next/link';
import { LegalFooter } from '@/components/Shared/LegalFooter';

export default function TermsPage() {
    return (
        <Container size="3">
            <Section p={{ initial: '4', sm: '8' }}>
                <Flex direction="column" gap="8">
                    {/* Header */}
                    <Flex direction="column" gap="2" align="center" mb="4">
                        <Heading size="9" weight="bold" color="indigo" style={{ letterSpacing: '-0.02em' }}>
                            Spectacl
                        </Heading>
                        <Heading size="6" weight="medium">Terms of Service</Heading>
                        <Text size="2" color="gray" mt="2">Last updated: April 14, 2026</Text>
                    </Flex>

                    <Flex direction="column" gap="6">
                        <Text size="3" color="gray">
                            These Terms of Service (&ldquo;Terms&rdquo;) govern all access to and use of the Spectacl website available at{' '}
                            <RadixLink href="https://spectacl.org" target="_blank">https://spectacl.org</RadixLink>{' '}
                            and the application at{' '}
                            <RadixLink href="https://app.spectacl.org" target="_blank">https://app.spectacl.org</RadixLink>{' '}
                            (the &ldquo;Website&rdquo;) and all related products, features, tools, dashboards, APIs, analyses, reports, and services provided by Spectacl (collectively, the &ldquo;Services&rdquo;).
                        </Text>

                        <Text size="3" color="gray">
                            The Services are operated by Sinus Digital B.V. (&ldquo;Spectacl&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a company registered in the Netherlands. The Services are offered subject to your acceptance, without modification, of all terms and conditions contained herein, as well as any other policies or notices published by Spectacl from time to time, including our <Link href="/privacy" className="text-[var(--indigo-9)] hover:underline">Privacy Policy</Link> (collectively, the &ldquo;Agreement&rdquo;).
                        </Text>

                        <Text size="3" color="gray">
                            Please read this Agreement carefully before accessing or using the Services. By accessing or using any part of the Services, you agree to be bound by this Agreement. If you do not agree to all the terms and conditions of this Agreement, you may not access or use the Services.
                        </Text>

                        <Box p="4" style={{ backgroundColor: 'var(--amber-2)', borderRadius: 'var(--radius-3)', border: '1px solid var(--amber-6)' }}>
                            <Text size="3" weight="medium">
                                The Services are intended for business use only (B2B). By using the Services, you represent and warrant that you are acting on behalf of a business, company, or other legal entity, and not as a private consumer. All prices are displayed excluding VAT.
                            </Text>
                        </Box>

                        <Text size="3" weight="medium">
                            The Services are available only to individuals who are at least 16 years old.
                        </Text>
                    </Flex>

                    <Separator size="4" />

                    {/* Sections */}
                    <Flex direction="column" gap="8">
                        {/* 1. Account */}
                        <Box>
                            <Heading size="5" mb="3">1. Your Spectacl Account</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                To access certain features of the Services, you may be required to create an account. You are responsible for maintaining the security of your account and credentials and for all activities that occur under your account.
                            </Text>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}>You will provide accurate, current, and complete information during registration.</li>
                                    <li style={{ marginBottom: 4 }}>You will keep your account information up to date.</li>
                                    <li style={{ marginBottom: 4 }}>Your account is for use by a single individual unless explicitly permitted otherwise (e.g., team workspaces).</li>
                                    <li style={{ marginBottom: 4 }}>You will immediately notify Spectacl of any unauthorized use of your account or any other breach of security.</li>
                                    <li style={{ marginBottom: 4 }}>Accounts registered using automated methods or bots are not permitted.</li>
                                    <li>Spectacl is not liable for any loss or damage arising from your failure to safeguard your account credentials.</li>
                                </ul>
                            </Text>
                        </Box>

                        {/* 2. Services */}
                        <Box>
                            <Heading size="5" mb="3">2. Description of the Services</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                Spectacl provides software tools that allow users to:
                            </Text>
                            <Text as="div" size="3" color="gray" mb="3">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 4 }}>Create, manage, and schedule prompts;</li>
                                    <li style={{ marginBottom: 4 }}>Systematically send those prompts to third-party large language models (&ldquo;LLMs&rdquo;);</li>
                                    <li style={{ marginBottom: 4 }}>Collect, analyze, compare, and visualize responses generated by those LLMs;</li>
                                    <li>Generate insights such as visibility, mention rates, sentiment, positioning, and other analytical outputs.</li>
                                </ul>
                            </Text>
                            <Text as="p" size="3" color="gray">
                                Spectacl does not create, control, or guarantee the content generated by third-party LLMs. All LLM responses are generated and governed by the respective third-party providers.
                            </Text>
                        </Box>

                        {/* 3. User Responsibility */}
                        <Box>
                            <Heading size="5" mb="3">3. Responsibility of Users</Heading>
                            <Box mb="4">
                                <Heading size="3" mb="2">3.1 User-Provided Inputs</Heading>
                                <Text as="p" size="3" color="gray" mb="2">
                                    You are solely responsible for all prompts, queries, datasets, configurations, and other materials you submit to the Services (&ldquo;User Inputs&rdquo;).
                                </Text>
                                <Text as="p" size="3" color="gray">
                                    You represent and warrant that you have all necessary rights, that your inputs do not violate any law, and that they do not infringe third-party rights.
                                </Text>
                            </Box>
                            <Box mb="4">
                                <Heading size="3" mb="2">3.2 License to Operate the Services</Heading>
                                <Text as="p" size="3" color="gray">
                                    By submitting User Inputs, you grant Spectacl a limited, non-exclusive, worldwide, royalty-free license to process, store, and display inputs solely for providing and improving the Services. Spectacl does not claim ownership over your User Inputs.
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">3.3 Prohibited Uses</Heading>
                                <Text as="p" size="3" color="gray" mb="2">You may not:</Text>
                                <Text as="div" size="3" color="gray">
                                    <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                        <li style={{ marginBottom: 4 }}>Use the Services for unlawful, harmful, or fraudulent purposes;</li>
                                        <li style={{ marginBottom: 4 }}>Reverse engineer, decompile, or scrape the source code, models, or data of the Services;</li>
                                        <li style={{ marginBottom: 4 }}>Circumvent usage limits, rate limits, or other technical restrictions;</li>
                                        <li style={{ marginBottom: 4 }}>Use the Services to build a competing product or to train models on output data;</li>
                                        <li>Violate the terms of any third-party LLM provider accessed through the Services.</li>
                                    </ul>
                                </Text>
                            </Box>
                        </Box>

                        {/* 4. Third-Party */}
                        <Box>
                            <Heading size="5" mb="3">4. Third-Party Services and LLM Providers</Heading>
                            <Text as="p" size="3" color="gray">
                                The Services rely on third-party LLM providers (such as OpenAI, Anthropic, Google, and others). Spectacl is not responsible for their availability, accuracy, content, or policy changes. Your use of the Services is also subject to the respective terms of these third-party providers.
                            </Text>
                        </Box>

                        {/* 5. Payments */}
                        <Box>
                            <Heading size="5" mb="3">5. Payments, Subscriptions, and Billing</Heading>
                            <Box mb="4">
                                <Heading size="3" mb="2">5.1 Subscription Plans</Heading>
                                <Text as="p" size="3" color="gray">
                                    The Services are offered on a subscription basis. Subscriptions are billed monthly and automatically renew unless canceled. There are no long-term contracts. You may cancel your subscription at any time through your dashboard. Cancellation takes effect at the end of the current billing period — you retain access until then. Fees are non-refundable except where required by law.
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">5.2 Fee Changes</Heading>
                                <Text as="p" size="3" color="gray">
                                    We may change subscription fees at any time. Price changes take effect at the start of the next billing cycle. We will provide reasonable notice of fee changes via email or in-app notification.
                                </Text>
                            </Box>
                        </Box>

                        {/* 6. Trials */}
                        <Box>
                            <Heading size="5" mb="3">6. Free Trials</Heading>
                            <Flex direction="column" gap="3">
                                <Text as="p" size="3" color="gray">
                                    Spectacl may, at its sole discretion, offer free trial periods for the Services. Trials are provided as a courtesy and do not create any entitlement, right, or expectation of continued access.
                                </Text>
                                <Text as="p" size="3" color="gray">
                                    We reserve the right to: (a) offer, modify, or discontinue trials at any time without prior notice; (b) change the duration, features, and limitations of any trial; (c) extend or shorten an active trial for any user or group of users; (d) limit the number of trials per user, organisation, or account; and (e) terminate a trial at any time for any reason.
                                </Text>
                                <Text as="p" size="3" color="gray">
                                    Trial accounts may be subject to reduced functionality, usage limits, or restricted features compared to paid plans. These restrictions may change at any time. No guarantee is made regarding the availability, completeness, or performance of the Services during a trial period.
                                </Text>
                                <Text as="p" size="3" color="gray">
                                    A trial does not constitute a commitment to offer any particular pricing, plan, feature set, or level of service. Spectacl is under no obligation to provide a trial to any user, and the absence of a trial offer shall not be grounds for any claim.
                                </Text>
                                <Text as="p" size="3" color="gray">
                                    If you do not subscribe to a paid plan before the trial expires, your access to the Services will be restricted or suspended. Data created during the trial may be retained for a limited period at our discretion, after which it may be permanently deleted.
                                </Text>
                            </Flex>
                        </Box>

                        {/* 7. Data */}
                        <Box>
                            <Heading size="5" mb="3">7. Data, Analytics, and Outputs</Heading>
                            <Box mb="4">
                                <Heading size="3" mb="2">7.1 Accuracy</Heading>
                                <Text as="p" size="3" color="gray">
                                    All analytical results, metrics, visibility scores, and other outputs provided by the Services are for informational and comparative purposes only. They are derived from third-party LLM responses which may change without notice. Spectacl does not guarantee the accuracy, completeness, or reliability of any output.
                                </Text>
                            </Box>
                            <Box mb="4">
                                <Heading size="3" mb="2">7.2 Variability</Heading>
                                <Text as="p" size="3" color="gray">
                                    LLM responses may vary over time due to model updates, provider policy changes, or other factors outside Spectacl&apos;s control. Historical results may not be reproducible.
                                </Text>
                            </Box>
                            <Box>
                                <Heading size="3" mb="2">7.3 Data Retention</Heading>
                                <Text as="p" size="3" color="gray">
                                    If your workspace is closed, deleted, or your subscription lapses, Spectacl may permanently delete all associated data after a grace period. This action is irreversible. You are responsible for exporting your data before account closure. Spectacl processes personal data in accordance with the GDPR and our <Link href="/privacy" className="text-[var(--indigo-9)] hover:underline">Privacy Policy</Link>.
                                </Text>
                            </Box>
                        </Box>

                        {/* 8. IP */}
                        <Box>
                            <Heading size="5" mb="3">8. Intellectual Property</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                The Services, including all software, designs, text, graphics, interfaces, and underlying technology, are the exclusive property of Sinus Digital B.V. and its licensors, protected by copyright, trademark, and other intellectual property laws.
                            </Text>
                            <Text as="p" size="3" color="gray">
                                Your use of the Services does not grant you any ownership rights in the Services or any content therein. You retain ownership of your User Inputs. Spectacl retains ownership of aggregated, anonymized insights derived from usage of the Services.
                            </Text>
                        </Box>

                        {/* 9. Feedback */}
                        <Box>
                            <Heading size="5" mb="3">9. Feedback</Heading>
                            <Text as="p" size="3" color="gray">
                                If you provide feedback, suggestions, or ideas about the Services, you grant Spectacl an unrestricted, irrevocable, worldwide, royalty-free license to use, modify, and incorporate that feedback into the Services without any obligation to you.
                            </Text>
                        </Box>

                        {/* 10. Termination */}
                        <Box>
                            <Heading size="5" mb="3">10. Termination</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                We may suspend or terminate your access to the Services immediately, without prior notice or liability, for any reason, including if you breach these Terms or if we reasonably believe your use poses a risk to the Services, other users, or third parties.
                            </Text>
                            <Text as="p" size="3" color="gray">
                                Upon termination, your right to use the Services will cease immediately. Sections regarding intellectual property, disclaimers, limitation of liability, indemnification, and governing law shall survive termination.
                            </Text>
                        </Box>

                        {/* 11. Disclaimers */}
                        <Box>
                            <Heading size="5" mb="3">11. Disclaimers</Heading>
                            <Text as="p" size="3" color="gray">
                                THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, COMPLETENESS, AND NON-INFRINGEMENT. SPECTACL DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED.
                            </Text>
                        </Box>

                        {/* 12. Liability */}
                        <Box>
                            <Heading size="5" mb="3">12. Limitation of Liability</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPECTACL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES.
                            </Text>
                            <Text as="p" size="3" color="gray">
                                Spectacl&apos;s total aggregate liability for all claims arising out of or related to these Terms or the Services shall not exceed the total fees paid by you to Spectacl in the twelve (12) months preceding the claim, or one hundred euros (&euro;100), whichever is greater.
                            </Text>
                        </Box>

                        {/* 13. Indemnification */}
                        <Box>
                            <Heading size="5" mb="3">13. Indemnification</Heading>
                            <Text as="p" size="3" color="gray">
                                You agree to indemnify, defend, and hold harmless Spectacl, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to your use of the Services, your User Inputs, or your violation of these Terms.
                            </Text>
                        </Box>

                        {/* 14. Changes */}
                        <Box>
                            <Heading size="5" mb="3">14. Changes to These Terms</Heading>
                            <Text as="p" size="3" color="gray">
                                We reserve the right to modify these Terms at any time. For material changes, we will provide at least thirty (30) days&apos; notice via email or in-app notification before the changes take effect. Your continued use of the Services after the effective date constitutes acceptance of the revised Terms. If you do not agree to the new Terms, you must stop using the Services.
                            </Text>
                        </Box>

                        {/* 15. Governing Law */}
                        <Box>
                            <Heading size="5" mb="3">15. Governing Law and Jurisdiction</Heading>
                            <Text as="p" size="3" color="gray" mb="3">
                                This Agreement is governed by and construed in accordance with the laws of the Netherlands, without regard to its conflict of law provisions. Any disputes arising from or relating to these Terms or the Services shall be subject to the exclusive jurisdiction of the courts of the Netherlands.
                            </Text>
                            <Text as="p" size="3" color="gray">
                                If you are located in the European Union, nothing in these Terms affects your rights under mandatory consumer protection laws of your country of residence, to the extent such laws apply notwithstanding the B2B nature of the Services.
                            </Text>
                        </Box>

                        {/* 16. Miscellaneous */}
                        <Box>
                            <Heading size="5" mb="3">16. Miscellaneous</Heading>
                            <Text as="div" size="3" color="gray">
                                <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                                    <li style={{ marginBottom: 8 }}><Text weight="medium">Entire Agreement.</Text> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Spectacl regarding the Services and supersede all prior agreements.</li>
                                    <li style={{ marginBottom: 8 }}><Text weight="medium">Severability.</Text> If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</li>
                                    <li style={{ marginBottom: 8 }}><Text weight="medium">No Waiver.</Text> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</li>
                                    <li style={{ marginBottom: 8 }}><Text weight="medium">Assignment.</Text> You may not assign or transfer your rights under these Terms without our prior written consent. Spectacl may assign its rights and obligations without restriction.</li>
                                    <li><Text weight="medium">Contact.</Text> To report violations or for any questions regarding these Terms, please contact us at <RadixLink href="mailto:info@sinusdigital.nl">info@sinusdigital.nl</RadixLink>.</li>
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
