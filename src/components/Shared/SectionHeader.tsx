import React from 'react';
import { Flex, Heading, Text } from '@radix-ui/themes';
import CountBadge from './CountBadge';

interface SectionHeaderProps {
    title: string;
    description?: string;
    count?: React.ReactNode;
    className?: string;
    badgeClassName?: string;
    actions?: React.ReactNode;
}

export default function SectionHeader({
    title,
    description,
    count,
    className = "",
    badgeClassName = "",
    actions
}: SectionHeaderProps) {
    return (
        <Flex justify="between" align="start" mb="4" className={className}>
            <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                    <Heading size="4" weight="bold">{title}</Heading>
                    {count !== undefined && (
                        <CountBadge count={count} className={badgeClassName} />
                    )}
                </Flex>
                {description && (
                    <Text size="1" color="gray">{description}</Text>
                )}
            </Flex>
            {actions && (
                <Flex align="center" gap="2">
                    {actions}
                </Flex>
            )}
        </Flex>
    );
}

