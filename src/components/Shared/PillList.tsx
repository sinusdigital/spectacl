import React from 'react';
import { Flex, Text } from '@radix-ui/themes';
import FadeOutList from './FadeOutList';

interface PillListProps {
    children: React.ReactNode;
    layout?: 'wrap' | 'single-row' | 'detailed';
    emptyMessage?: string;
    className?: string;
    gap?: string;
}

export default function PillList({
    children,
    layout = 'wrap',
    emptyMessage = 'None found',
    className = '',
    gap = 'gap-2'
}: PillListProps) {
    const hasChildren = React.Children.count(children) > 0;

    if (!hasChildren) {
        return (
            <Text as="span" size="1" color="gray" className="italic">
                {emptyMessage}
            </Text>
        );
    }

    if (layout === 'detailed') {
        return (
            <Flex direction="column" className={`${gap} ${className}`}>
                {children}
            </Flex>
        );
    }

    if (layout === 'single-row') {
        return (
            <FadeOutList className={`${gap} ${className}`}>
                {children}
            </FadeOutList>
        );
    }

    // Default: wrap
    return (
        <Flex wrap="wrap" className={`${gap} ${className}`}>
            {children}
        </Flex>
    );
}
