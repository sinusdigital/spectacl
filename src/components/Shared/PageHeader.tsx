import React from 'react';
import Link from 'next/link';
import { Flex, Link as RadixLink, IconButton } from '@radix-ui/themes';
import { ChevronRightIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import Header from './Header';

interface PageHeaderProps {
    title: string;
    breadcrumbs?: { label: string; href: string }[];
    description?: string;
    timeRange?: '7d' | '30d' | '90d';
    headerTrend?: number;
    children?: React.ReactNode;
    extra?: React.ReactNode;
    backHref?: string;
}

const PageHeader = ({
    title,
    breadcrumbs,
    description,
    headerTrend,
    children,
    extra,
    backHref
}: PageHeaderProps) => {
    return (
        <Header.Root mb="4">
            <Header.Content>
                <Header.Kicker>
                    <Flex align="center" gap="1">
                        {breadcrumbs && breadcrumbs.length > 0 && (
                            <>
                                {breadcrumbs.map((crumb) => (
                                    <React.Fragment key={crumb.href}>
                                        <RadixLink asChild color="gray" highContrast={false}>
                                            <Link href={crumb.href} className="hover:underline whitespace-nowrap">
                                                {crumb.label}
                                            </Link>
                                        </RadixLink>
                                        <ChevronRightIcon width="12" height="12" style={{ opacity: 0.5 }} />
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                        <span className="whitespace-nowrap">{title}</span>
                    </Flex>
                </Header.Kicker>
                
                <Flex align="center" gap="3">
                    {backHref && (
                        <RadixLink asChild>
                            <Link href={backHref}>
                                <IconButton variant="ghost" color="gray" size="2">
                                    <ArrowLeftIcon width="18" height="18" />
                                </IconButton>
                            </Link>
                        </RadixLink>
                    )}
                    <Header.Title as="h1" size="6" weight="medium">
                        {title}
                    </Header.Title>
                </Flex>

                {(headerTrend !== undefined || description) && (
                    <Header.Description>
                        <Flex align="center" gap="2">
                            {headerTrend !== undefined ? (
                                <>
                                    Mentions trending {headerTrend >= 0 ? 'up' : 'down'} by {Math.abs(headerTrend).toFixed(1)}% this week
                                </>
                            ) : description}
                        </Flex>
                    </Header.Description>
                )}
            </Header.Content>

            <Header.Actions>
                {children}
                {extra}
            </Header.Actions>
        </Header.Root>
    );
};

export default PageHeader;
