"use client";

import React from 'react';
import Header from "@/components/Shared/Header";
import PageHeader from "@/components/Shared/PageHeader";
import { 
    CheckCircledIcon, 
    CircleIcon, 
    RocketIcon, 
    MixerHorizontalIcon
} from "@radix-ui/react-icons";
import RadixTabs from "@/components/Shared/RadixTabs";
import SystemArchitecture from '@/components/Admin/Roadmap/SystemArchitecture';
import AuthenticationRoadmap from '@/components/Admin/Roadmap/AuthenticationRoadmap';
import { Container, Flex, Box, Grid, Heading, Text, Badge, Callout } from '@radix-ui/themes';

interface SchemaField {
    name: string;
    type: string;
    isRequired: boolean;
    isArray: boolean;
    isRelation: boolean;
    attributes: string[];
}

interface SchemaModel {
    name: string;
    fields: SchemaField[];
    documentation?: string;
}

interface SchemaEnum {
    name: string;
    values: string[];
}

interface Schema {
    models: SchemaModel[];
    enums: SchemaEnum[];
}

interface RoadmapContentProps {
    schema?: Schema;
}

export default function RoadmapContent({ schema }: RoadmapContentProps) {
    const getModelCategory = (modelName: string) => {
        const spaceLevel = ['Space', 'User', 'Account', 'Session', 'SpaceInvitation', 'SpaceMember', 'SpaceUsage'];
        const entityLevel = ['Entity', 'Competitor', 'ModelConfig', 'SpaceModelConfig', 'Domain'];

        if (spaceLevel.includes(modelName)) return 'Space Level';
        if (entityLevel.includes(modelName)) return 'Entity Level';
        return 'Data Level';
    };

    const groupedModels = {
        'Space Level': schema?.models.filter(m => getModelCategory(m.name) === 'Space Level') || [],
        'Entity Level': schema?.models.filter(m => getModelCategory(m.name) === 'Entity Level') || [],
        'Data Level': schema?.models.filter(m => getModelCategory(m.name) === 'Data Level') || [],
    };

    const categoryStyles = {
        'Space Level': { color: 'blue' as const, dot: 'var(--blue-9)' },
        'Entity Level': { color: 'purple' as const, dot: 'var(--purple-9)' },
        'Data Level': { color: 'green' as const, dot: 'var(--green-9)' },
    };

    return (
        <Container size="4" py="8" px="6">
            <Flex direction="column" gap="8">
                <PageHeader 
                    title="Product Roadmap & Monetization Plan" 
                    description="Strategic overview of Spectacl's future development and pricing model."
                />

                <RadixTabs.Root defaultValue="roadmap">
                    <RadixTabs.List>
                        <RadixTabs.Trigger value="roadmap">Roadmap</RadixTabs.Trigger>
                        <RadixTabs.Trigger value="authentication">Authentication</RadixTabs.Trigger>
                        <RadixTabs.Trigger value="database">Database Schema</RadixTabs.Trigger>
                        <RadixTabs.Trigger value="services">System Architecture</RadixTabs.Trigger>
                    </RadixTabs.List>

                    <RadixTabs.Content value="roadmap">
                        <Flex direction="column" gap="8" pt="6">
                            <Grid columns={{ initial: '1', md: '3' }} gap="6">
                                {/* Phase 1 */}
                                <Flex direction="column" gap="4">
                                     <Flex align="center" gap="2">
                                        <CheckCircledIcon style={{ color: 'var(--green-9)' }} />
                                        <Text size="1" weight="bold" color="green" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Phase 1: Foundation
                                        </Text>
                                    </Flex>
                                    <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--green-4)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden' }}>
                                        <Box position="absolute" top="0" right="0" width="64px" height="64px" style={{ backgroundColor: 'var(--green-2)', borderRadius: '0 0 0 100%', marginRight: '-32px', marginTop: '-32px' }} />
                                        <Heading size="4" mb="2" style={{ position: 'relative', zIndex: 10 }}>Core Architecture</Heading>
                                        <Flex direction="column" gap="3" style={{ position: 'relative', zIndex: 10 }}>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Space-based Multi-tenancy</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Schema Updates for LLM Fields</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Admin Settings UI</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Background Worker + BullMQ Queue</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Per-provider Rate Limiting</Text>
                                            </Flex>
                                        </Flex>
                                    </Box>
                                </Flex>

                                {/* Phase 2 */}
                                <Flex direction="column" gap="4">
                                     <Flex align="center" gap="2">
                                        <CheckCircledIcon style={{ color: 'var(--green-9)' }} />
                                        <Text size="1" weight="bold" color="green" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Phase 2: Monetization
                                        </Text>
                                    </Flex>
                                    <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--green-4)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden' }}>
                                         <Box position="absolute" top="0" right="0" width="64px" height="64px" style={{ backgroundColor: 'var(--green-2)', borderRadius: '0 0 0 100%', marginRight: '-32px', marginTop: '-32px' }} />
                                        <Heading size="4" mb="2" style={{ position: 'relative', zIndex: 10 }}>Enable Revenue</Heading>
                                        <Flex direction="column" gap="3" style={{ position: 'relative', zIndex: 10 }}>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Mollie Payment Integration</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Recurring Subscriptions + Webhooks</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Credit System (dynamic formula)</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Plan Upgrade + Cancellation Flow</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Admin Pricing Config (DB overrides)</Text>
                                            </Flex>
                                            <Flex align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px' }} />
                                                <Text size="2" color="gray">Configurable Trial Duration</Text>
                                            </Flex>
                                        </Flex>
                                    </Box>
                                </Flex>

                                {/* Phase 3 */}
                                <Flex direction="column" gap="4">
                                     <Flex align="center" gap="2">
                                        <MixerHorizontalIcon style={{ color: 'var(--purple-9)' }} />
                                        <Text size="1" weight="bold" color="purple" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Phase 3: Scale
                                        </Text>
                                    </Flex>
                                    <Box p="6" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--purple-4)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-1)', position: 'relative', overflow: 'hidden' }}>
                                         <Box position="absolute" top="0" right="0" width="64px" height="64px" style={{ backgroundColor: 'var(--purple-2)', borderRadius: '0 0 0 100%', marginRight: '-32px', marginTop: '-32px' }} />
                                        <Heading size="4" mb="2" style={{ position: 'relative', zIndex: 10 }}>Growth + Ops</Heading>
                                         <Flex direction="column" gap="3" style={{ position: 'relative', zIndex: 10 }}>
                                             <Flex align="start" gap="2">
                                                 <CircleIcon style={{ color: 'var(--purple-6)', marginTop: '4px', width: '12px', height: '12px' }} />
                                                 <Text size="2" color="gray">Failed payment + trial expiry emails</Text>
                                             </Flex>
                                             <Flex align="start" gap="2">
                                                 <CircleIcon style={{ color: 'var(--purple-6)', marginTop: '4px', width: '12px', height: '12px' }} />
                                                 <Text size="2" color="gray">90-day dormant space auto-deletion</Text>
                                             </Flex>
                                             <Flex align="start" gap="2">
                                                 <CircleIcon style={{ color: 'var(--purple-6)', marginTop: '4px', width: '12px', height: '12px' }} />
                                                 <Text size="2" color="gray">Proactive trial expiry sweep (cron)</Text>
                                             </Flex>
                                             <Flex align="start" gap="2">
                                                 <CircleIcon style={{ color: 'var(--purple-6)', marginTop: '4px', width: '12px', height: '12px' }} />
                                                 <Text size="2" color="gray">Snapshot deduplication (Redis counter)</Text>
                                             </Flex>
                                             <Flex align="start" gap="2">
                                                 <CircleIcon style={{ color: 'var(--purple-6)', marginTop: '4px', width: '12px', height: '12px' }} />
                                                 <Text size="2" color="gray">Staggered scheduling + horizontal workers</Text>
                                             </Flex>
                                             <Flex align="start" gap="2">
                                                 <CircleIcon style={{ color: 'var(--purple-6)', marginTop: '4px', width: '12px', height: '12px' }} />
                                                 <Text size="2" color="gray">Data retention worker (configurable per plan)</Text>
                                             </Flex>
                                         </Flex>
                                    </Box>
                                </Flex>
                            </Grid>

                            {/* Post-launch section */}
                            <Box mt="6" p="6" style={{ border: '1px solid var(--green-4)', backgroundColor: 'var(--green-2)', borderRadius: 'var(--radius-4)' }}>
                                <Flex direction="column" gap="4">
                                    <Text size="1" weight="bold" color="green" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Pre-launch Checklist — Completed
                                    </Text>
                                    <Text size="1" color="green">
                                        All critical and high-severity items resolved. See /admin/security for full audit trail.
                                    </Text>

                                    <Grid columns={{ initial: '1', md: '2' }} gap="3">
                                        {[
                                            "Mollie webhooks unblocked (middleware fix)",
                                            "IDOR auth on rankings, analysis, tags",
                                            "Cron endpoint secured with CRON_SECRET",
                                            "Debug endpoints admin-gated",
                                            "Admin role check fixed (case mismatch)",
                                            "Webhook idempotency (atomic CAS)",
                                            "Safe month addition (no setMonth overflow)",
                                            "Credit exhaustion guard per LLM call",
                                            "Entity-Space cascade delete",
                                            "Open redirect validation on checkout",
                                        ].map((item) => (
                                            <Flex key={item} align="start" gap="2">
                                                <CheckCircledIcon style={{ color: 'var(--green-9)', marginTop: '2px', flexShrink: 0 }} />
                                                <Text size="1" color="gray">{item}</Text>
                                            </Flex>
                                        ))}
                                    </Grid>
                                </Flex>
                            </Box>
                        </Flex>
                    </RadixTabs.Content>
                    
                    <RadixTabs.Content value="authentication">
                        <Box pt="6">
                            <AuthenticationRoadmap />
                        </Box>
                    </RadixTabs.Content>
                    

                    <RadixTabs.Content value="database">
                        <Flex direction="column" gap="6" pt="6">
                            <Header.Root>
                                <Header.Content>
                                    <Header.Title size="4" weight="bold">Core Database Schema</Header.Title>
                                    <Header.Description>Dynamic visual representation of current Prisma models and relationships.</Header.Description>
                                </Header.Content>
                            </Header.Root>
                            
                            {schema ? (
                                <Box style={{ overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
                                    <Grid columns="3" gap="8" style={{ minWidth: '800px', alignItems: 'start' }}>
                                        {(['Space Level', 'Entity Level', 'Data Level'] as const).map((category, colIndex) => {
                                            const styles = categoryStyles[category];
                                            return (
                                                <Flex key={category} direction="column" gap="8" style={{ marginTop: colIndex === 1 ? '48px' : colIndex === 2 ? '96px' : '0' }}>
                                                    {groupedModels[category].map(model => (
                                                        <Box key={model.name} style={{ backgroundColor: 'var(--color-background)', border: '2px solid var(--' + styles.color + '-4)', borderRadius: 'var(--radius-3)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
                                                            <Flex justify="between" p="2" px="4" style={{ backgroundColor: 'var(--' + styles.color + '-2)', borderBottom: '1px solid var(--' + styles.color + '-4)' }}>
                                                                <Text size="2" weight="bold" color={styles.color}>{model.name}</Text>
                                                                <Text size="1" color={styles.color} style={{ opacity: 0.7 }}>model</Text>
                                                            </Flex>
                                                            <Box p="4">
                                                                <Flex direction="column" gap="1">
                                                                    {model.fields.map(field => (
                                                                        <Flex key={field.name} justify="between">
                                                                            <Text size="1" weight={field.name === 'id' ? 'bold' : 'regular'} color={field.name === 'id' ? styles.color : undefined} style={{ fontFamily: 'monospace' }}>
                                                                                {field.name}
                                                                            </Text>
                                                                            <Text size="1" color="gray" style={{ fontFamily: 'monospace', fontStyle: field.isRelation ? 'italic' : undefined }}>
                                                                                {field.type}{field.isArray ? '[]' : ''}{field.isRequired ? '' : '?'}
                                                                            </Text>
                                                                        </Flex>
                                                                    ))}
                                                                </Flex>
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                    {groupedModels[category].length === 0 && (
                                                        <Box p="4" style={{ textAlign: 'center', border: '1px dashed var(--gray-5)', borderRadius: 'var(--radius-3)' }}>
                                                            <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>No models found for {category}</Text>
                                                        </Box>
                                                    )}
                                                </Flex>
                                            );
                                        })}
                                    </Grid>

                                     {/* Legend */}
                                     <Flex gap="6" mt="8" pt="4" style={{ borderTop: '1px solid var(--gray-4)' }}>
                                        {Object.entries(categoryStyles).map(([name, style]) => (
                                            <Flex key={name} align="center" gap="2">
                                                <Box width="12px" height="12px" style={{ backgroundColor: style.dot, borderRadius: '50%' }} />
                                                <Text size="1" color="gray">{name}</Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                </Box>
                            ) : (
                                <Box p="9" style={{ textAlign: 'center', backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-4)', border: '1px dashed var(--gray-5)' }}>
                                    <Text color="gray">Schema data not available.</Text>
                                </Box>
                            )}
                        </Flex>
                    </RadixTabs.Content>

                    <RadixTabs.Content value="services">
                        <Box pt="6">
                            <SystemArchitecture />
                        </Box>
                    </RadixTabs.Content>
                </RadixTabs.Root>
            </Flex>
        </Container>
    );
}
