"use client";

import React from 'react';
import { Card, Flex, Text } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

interface SuggestedPromptCardProps {
    text: string;
    className?: string;
    actions?: React.ReactNode;
    tags?: string[];
    /**
     * `horizontal` (default): text column on the left, actions stacked on the right.
     *   Used in the horizontal scrolling kickstart strip.
     * `vertical`: text on top, actions in a row below.
     *   Used inside the right-side suggested panel where card width is constrained.
     */
    layout?: 'horizontal' | 'vertical';
}

export default function SuggestedPromptCard({
    text,
    className = "",
    actions,
    tags = [],
    layout = 'horizontal',
}: SuggestedPromptCardProps) {
    if (layout === 'vertical') {
        return (
            <Card size="1" variant="surface" className={className}>
                <Flex direction="column" gap="2" p="1">
                    <Text as="p" size="1" weight="medium" className="leading-snug">
                        &ldquo;{text}&rdquo;
                    </Text>

                    {tags && tags.length > 0 && (
                        <Flex gap="1" wrap="wrap">
                            {tags.map((tag) => (
                                <Text key={tag} size="1" color="gray">
                                    #{tag}
                                </Text>
                            ))}
                        </Flex>
                    )}

                    {actions && (
                        <div
                            className="[&>*]:w-full"
                            style={{
                                display: "grid",
                                gridAutoFlow: "column",
                                gridAutoColumns: "minmax(0, 1fr)",
                                gap: "var(--space-2)",
                            }}
                        >
                            {actions}
                        </div>
                    )}
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="1" variant="surface" className={cn("h-full", className)}>
            <Flex direction="row" gap="3" align="start" height="100%">
                <Flex
                    direction="column"
                    gap="2"
                    flexGrow="1"
                    minWidth="0"
                    p="2"
                >
                    <Text as="p" size="1" weight="medium" className="leading-snug">
                        &ldquo;{text}&rdquo;
                    </Text>

                    {tags && tags.length > 0 && (
                        <Flex gap="1" wrap="wrap">
                            {tags.map((tag) => (
                                <Text key={tag} size="1" color="gray">
                                    #{tag}
                                </Text>
                            ))}
                        </Flex>
                    )}
                </Flex>

                {actions && (
                    <Flex direction="column" gap="2" flexShrink="0">
                        {actions}
                    </Flex>
                )}
            </Flex>
        </Card>
    );
}
