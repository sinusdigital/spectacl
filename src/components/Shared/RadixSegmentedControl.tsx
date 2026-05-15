"use client";

import * as React from "react";
import { SegmentedControl, Text, Flex } from "@radix-ui/themes";

interface SegmentedControlItem {
    value: string;
    label: string;
    count?: number;
    disabled?: boolean;
}

interface RadixSegmentedControlProps {
    value: string;
    onValueChange: (value: string) => void;
    items: SegmentedControlItem[];
    className?: string;
    ariaLabel?: string;
}

const RadixSegmentedControl = ({
    value,
    onValueChange,
    items,
    className = "",
    ariaLabel = "Segmented control",
}: RadixSegmentedControlProps) => {
    return (
        <SegmentedControl.Root
            value={value}
            onValueChange={onValueChange}
            className={className}
            size="2"
            variant="surface"
            aria-label={ariaLabel}
        >
            {items.map((item) => (
                <SegmentedControl.Item
                    key={item.value}
                    value={item.value}
                >
                    <Flex align="center" gap="2" px="1">
                        <Text size="1" weight="medium">{item.label}</Text>
                        {item.count !== undefined && (
                            <Text size="1" color="gray" style={{ opacity: 0.6 }}>
                                ({item.count})
                            </Text>
                        )}
                    </Flex>
                </SegmentedControl.Item>
            ))}
        </SegmentedControl.Root>
    );
};

export default RadixSegmentedControl;
