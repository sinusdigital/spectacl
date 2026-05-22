import React from 'react';
import { Flex, Text, Box } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import BaseCard from './BaseCard';

interface PlaceholderCardProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    onClick: () => void;
    actions?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export default function PlaceholderCard({
    title,
    description,
    icon = <PlusIcon width="32" height="32" />,
    onClick,
    actions,
    className = "",
    style,
}: PlaceholderCardProps) {
    return (
        <BaseCard
            variant="translucent"
            onClick={onClick}
            className={className}
            style={style}
        >
            <Flex direction="column" height="100%" width="100%">
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap="2"
                    className="flex-1 text-center p-6"
                >
                    <Box className="text-[var(--gray-9)] mb-1">
                        {icon}
                    </Box>
                    <Text size="5" weight="bold" highContrast>
                        {title}
                    </Text>
                    <Text size="2" color="gray" className="max-w-[240px]">
                        {description}
                    </Text>
                </Flex>

                {actions && (
                    <BaseCard.Footer>
                        {actions}
                    </BaseCard.Footer>
                )}
            </Flex>
        </BaseCard>
    );
}
