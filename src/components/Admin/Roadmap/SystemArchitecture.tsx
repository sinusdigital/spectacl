"use client";

import React from 'react';
import { 
    GlobeIcon, 
    PersonIcon, 
    LightningBoltIcon,
    MixerHorizontalIcon,
    CubeIcon,
    FileTextIcon,
    CodeIcon,
    LockClosedIcon
} from "@radix-ui/react-icons";
import { Flex, Box, Grid, Text, Heading, Badge, Container } from '@radix-ui/themes';

// Helper for connection lines
const ConnectionLine = ({ vertical = false, height = "32px", width = "32px" }) => (
    <Flex align="center" justify="center" direction={vertical ? 'column' : 'row'}>
        <Box 
            style={{ 
                width: vertical ? '2px' : width, 
                height: vertical ? height : '2px', 
                backgroundColor: 'var(--gray-6)', 
                position: 'relative' 
            }}
        >
             <Box 
                position="absolute"
                style={{ 
                    bottom: vertical ? '-4px' : 'auto',
                    right: vertical ? 'auto' : '-4px',
                    left: vertical ? '50%' : 'auto',
                    top: vertical ? 'auto' : '50%',
                    transform: vertical ? 'translateX(-50%)' : 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--gray-6)',
                    borderRadius: '50%'
                }}
            />
        </Box>
    </Flex>
);

const ServiceCard = ({ 
    icon, 
    title, 
    subtitle, 
    color = "blue", 
    port,
    tech
}: { 
    icon: React.ReactNode, 
    title: string, 
    subtitle?: string, 
    color?: string,
    port?: string,
    tech?: string
}) => {
    // Map colors to Radix theme colors
    const colorMap: Record<string, any> = {
        blue: { bg: 'var(--blue-2)', border: 'var(--blue-4)', text: 'var(--blue-11)', ring: 'var(--blue-3)' },
        green: { bg: 'var(--green-2)', border: 'var(--green-4)', text: 'var(--green-11)', ring: 'var(--green-3)' },
        purple: { bg: 'var(--purple-2)', border: 'var(--purple-4)', text: 'var(--purple-11)', ring: 'var(--purple-3)' },
        orange: { bg: 'var(--orange-2)', border: 'var(--orange-4)', text: 'var(--orange-11)', ring: 'var(--orange-3)' },
        red: { bg: 'var(--red-2)', border: 'var(--red-4)', text: 'var(--red-11)', ring: 'var(--red-3)' },
        gray: { bg: 'var(--gray-2)', border: 'var(--gray-4)', text: 'var(--gray-11)', ring: 'var(--gray-3)' },
        black: { bg: 'var(--gray-12)', border: 'var(--gray-11)', text: 'white', ring: 'var(--gray-10)' }
    };

    const style = colorMap[color] || colorMap.gray;

    return (
        <Box 
            p="4" 
            style={{ 
                position: 'relative',
                borderRadius: 'var(--radius-4)', 
                border: `1px solid ${style.border}`,
                backgroundColor: style.bg,
                boxShadow: 'var(--shadow-1)',
                minWidth: '180px',
                transition: 'all 0.2s'
            }}
        >
            {tech && (
                <Box 
                    position="absolute"
                    style={{ 
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--gray-4)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: 'var(--shadow-1)',
                        zIndex: 1
                    }}
                >
                    <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>
                        {tech}
                    </Text>
                </Box>
            )}
            <Flex direction="column" align="center" gap="2" mt="1">
                <Box p="2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 'var(--radius-3)', backdropFilter: 'blur(4px)' }}>
                    {icon}
                </Box>
                <Box style={{ textAlign: 'center' }}>
                    <Text size="2" weight="bold" color={color === 'black' ? undefined : (color as any)} style={{ color: style.text, display: 'block' }}>{title}</Text>
                    {subtitle && <Text size="1" style={{ opacity: 0.8, display: 'block' }}>{subtitle}</Text>}
                    {port && (
                        <Text size="1" style={{ fontFileSystem: 'monospace', opacity: 0.6, marginTop: '4px', display: 'block' }}>
                            :{port}
                        </Text>
                    )}
                </Box>
            </Flex>
        </Box>
    );
};

export default function SystemArchitecture() {
    return (
        <Box p="8" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-5)', border: '1px solid var(--gray-6)', overflowX: 'auto' }}>
            <Flex direction="column" gap="8" style={{ minWidth: '1024px' }}>
                
                {/* 1. Client Layer */}
                <Box position="relative">
                    <Box position="absolute" left="0" style={{ top: '-16px' }}>
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Client Layer</Text>
                    </Box>
                    <Flex justify="center" gap="9" p="6" style={{ border: '2px dashed var(--gray-4)', borderRadius: 'var(--radius-5)', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                        <ServiceCard 
                            icon={<PersonIcon width="24" height="24" />}
                            title="Web Browser"
                            subtitle="Admin / User"
                            tech="Chrome/Safari"
                            color="gray"
                        />
                         <ServiceCard 
                            icon={<GlobeIcon width="24" height="24" />}
                            title="Public Site"
                            subtitle="Anonymous"
                            tech="SEO / Bot"
                            color="gray"
                        />
                    </Flex>
                </Box>

                {/* Connection */}
                <Flex justify="center">
                    <Box style={{ height: '32px', width: '2px', backgroundColor: 'var(--gray-6)' }} />
                </Flex>

                {/* 2. Edge Layer */}
                <Box position="relative">
                     <Box position="absolute" left="0" style={{ top: '-16px' }}>
                        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Edge Layer</Text>
                    </Box>
                     <Flex justify="center" p="6" style={{ border: '2px dashed var(--gray-4)', borderRadius: 'var(--radius-5)', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                        <ServiceCard 
                            icon={<LightningBoltIcon width="24" height="24" />}
                            title="CDN / Edge"
                            subtitle="Caching & Routing"
                            tech="Vercel Edge"
                            color="black"
                        />
                     </Flex>
                </Box>

                {/* Connection */}
                <Flex direction="column" align="center">
                    <Text size="1" color="gray" weight="bold" style={{ fontFileSystem: 'monospace', padding: '4px 0' }}>HTTPS / 443</Text>
                    <Box style={{ height: '32px', width: '2px', backgroundColor: 'var(--gray-6)' }} />
                </Flex>

                <Grid columns="12" gap="8">
                    
                    {/* 3. Application Layer (Main) - Spans 4 columns */}
                    <Box style={{ gridColumn: 'span 4', position: 'relative' }}>
                        <Box position="absolute" left="0" style={{ top: '-32px' }}>
                            <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Application Layer</Text>
                        </Box>
                        
                        <Flex direction="column" gap="4" p="6" style={{ flex: 1, border: '2px solid var(--blue-3)', backgroundColor: 'var(--blue-2)', borderRadius: 'var(--radius-5)' }}>
                            <Flex justify="center">
                                <ServiceCard 
                                    icon={<CodeIcon width="24" height="24" />}
                                    title="Next.js Core"
                                    subtitle="Server Components"
                                    tech="Node.js 20"
                                    color="blue"
                                    port="3000"
                                />
                            </Flex>
                            
                            <Flex justify="between" gap="4">
                                <ServiceCard 
                                    icon={<LockClosedIcon width="20" height="20" />}
                                    title="Auth"
                                    subtitle="Middleware"
                                    tech="NextAuth"
                                    color="blue"
                                />
                                <ServiceCard 
                                    icon={<FileTextIcon width="20" height="20" />}
                                    title="API Routes"
                                    subtitle="/api/v1/*"
                                    tech="tRPC / REST"
                                    color="blue"
                                />
                            </Flex>
                        </Flex>
                    </Box>

                    {/* Connection Horizontal */}
                    <Box style={{ gridColumn: 'span 1', position: 'relative' }}>
                        <Flex height="100%" align="center" justify="center">
                            <Box style={{ height: '2px', width: '100%', backgroundColor: 'var(--gray-6)' }} />
                            <Box 
                                position="absolute" 
                                style={{ 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    backgroundColor: 'var(--gray-2)', 
                                    padding: '0 8px' 
                                }}
                            >
                                <Text size="1" color="gray" weight="bold">TCP</Text>
                            </Box>
                        </Flex>
                    </Box>

                    {/* 4. Data & Worker Layer - Spans 4 columns */}
                    <Box style={{ gridColumn: 'span 4', position: 'relative' }}>
                        <Box position="absolute" left="0" style={{ top: '-32px' }}>
                            <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data & Compute Layer</Text>
                        </Box>

                        <Flex direction="column" gap="6">
                            {/* Database */}
                            <Flex justify="center">
                                <ServiceCard 
                                    icon={<CubeIcon width="24" height="24" />}
                                    title="Primary DB"
                                    subtitle="Relational Data"
                                    tech="PostgreSQL"
                                    color="green"
                                    port="5432"
                                />
                            </Flex>

                            <Flex justify="center">
                                <Box style={{ width: '2px', height: '32px', backgroundColor: 'var(--gray-6)' }} />
                            </Flex>

                             {/* Cache/Queue */}
                             <Flex justify="center">
                                <ServiceCard 
                                    icon={<LightningBoltIcon width="24" height="24" />}
                                    title="Message Queue"
                                    subtitle="Jobs & Caching"
                                    tech="Redis"
                                    color="red"
                                    port="6379"
                                />
                            </Flex>

                            <Flex justify="center">
                                <Box style={{ width: '2px', height: '32px', backgroundColor: 'var(--gray-6)' }} />
                            </Flex>
                            
                            {/* Worker */}
                            <Flex justify="center">
                                <ServiceCard 
                                    icon={<MixerHorizontalIcon width="24" height="24" />}
                                    title="Job Worker"
                                    subtitle="Async Processing"
                                    tech="Node / BullMQ"
                                    color="orange"
                                />
                            </Flex>
                        </Flex>
                    </Box>

                    {/* Connection Horizontal */}
                    <Box style={{ gridColumn: 'span 1', position: 'relative' }}>
                        <Flex height="100%" align="center" justify="center">
                            <Box style={{ height: '2px', width: '100%', backgroundColor: 'var(--gray-6)' }} />
                            <Box 
                                position="absolute" 
                                style={{ 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    backgroundColor: 'var(--gray-2)', 
                                    padding: '0 8px' 
                                }}
                            >
                                <Text size="1" color="gray" weight="bold">HTTPS</Text>
                            </Box>
                        </Flex>
                    </Box>

                    {/* 5. External Services - Spans 2 columns */}
                    <Box style={{ gridColumn: 'span 2', position: 'relative' }}>
                        <Box position="absolute" left="0" style={{ top: '-32px' }}>
                            <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>External Services</Text>
                        </Box>
                        
                        <Flex direction="column" justify="center" gap="6" height="100%">
                             <ServiceCard 
                                icon={<Text weight="bold" size="4">AI</Text>}
                                title="LLM Providers"
                                subtitle="OpenAI / Pi-AI"
                                tech="External API"
                                color="purple"
                            />
                             <ServiceCard 
                                icon={<Text weight="bold" size="4">$</Text>}
                                title="Payments"
                                subtitle="Billing & Subs"
                                tech="Stripe"
                                color="purple"
                            />
                        </Flex>
                    </Box>
                </Grid>
            </Flex>
        </Box>
    );
}
