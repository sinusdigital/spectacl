"use client";

import * as React from "react";
import { ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Popover, Checkbox, Text, Flex, Box, ScrollArea, Button } from "@radix-ui/themes";

interface MultiSelectItem {
    value: string;
    label: string;
}

interface RadixMultiSelectProps {
    value: string[];
    onValueChange: (value: string[]) => void;
    options: MultiSelectItem[];
    placeholder?: string;
    className?: string;
    label?: string;
    icon?: React.ReactNode;
}

const RadixMultiSelect = ({
    value,
    onValueChange,
    options,
    placeholder = "Select items...",
    className = "",
    label,
    icon,
}: RadixMultiSelectProps) => {
    const handleToggle = (itemValue: string, checked: boolean) => {
        if (checked) {
            onValueChange([...value, itemValue]);
        } else {
            onValueChange(value.filter((v) => v !== itemValue));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onValueChange([]);
    };

    const displayValue =
        value.length > 0
            ? options
                  .filter((opt) => value.includes(opt.value))
                  .map((opt) => opt.label)
                  .join(", ")
            : placeholder;

    return (
        <Flex direction="column" gap="1">
            {label && (
                <Text size="1" weight="medium" color="gray">
                    {label}
                </Text>
            )}
            <Popover.Root>
                <Popover.Trigger>
                    <Button
                        variant="surface"
                        color="gray"
                        className={`cursor-default ${className}`}
                        style={{ height: '32px' }}
                    >
                        <Flex align="center" gap="2" px="3" py="2" width="100%">
                            <Flex align="center" gap="2" className="flex-1 overflow-hidden">
                                {icon && <Box className="flex-shrink-0 opacity-70">{icon}</Box>}
                                <Text size="1" className="truncate text-left font-medium">
                                    {value.length >= 2 ? `${value.length} selected` : displayValue}
                                </Text>
                            </Flex>
                            <Flex align="center" gap="1" className="shrink-0">
                                {value.length > 0 && (
                                    <Box onClick={handleClear} className="flex hover:opacity-100 opacity-60 transition-opacity">
                                        <Cross2Icon width="12" height="12" />
                                    </Box>
                                )}
                                <ChevronDownIcon className="w-3 h-3 opacity-50" />
                            </Flex>
                        </Flex>
                    </Button>
                </Popover.Trigger>
                <Popover.Content 
                    width="240px" 
                    size="1" 
                    className="p-0 overflow-hidden" 
                    style={{ 
                        borderRadius: 'var(--radius-3)',
                        boxShadow: 'var(--shadow-5)',
                        border: '1px solid var(--gray-a4)',
                        backgroundColor: 'var(--color-panel-solid)'
                    }}
                >
                    <Flex direction="column">
                        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 300 }}>
                            <Flex direction="column" p="0" gap="1">
                                {options.map((option) => (
                                    <Text
                                        as="label"
                                        key={option.value}
                                        size="1"
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-2)] hover:bg-[var(--gray-3)] active:bg-[var(--gray-4)] cursor-pointer transition-colors"
                                    >
                                        <Checkbox
                                            size="1"
                                            checked={value.includes(option.value)}
                                            onCheckedChange={(checked) =>
                                                handleToggle(option.value, checked as boolean)
                                            }
                                            className="shrink-0"
                                        />
                                        <Text weight="medium" color="gray" className="leading-none">
                                            {option.label}
                                        </Text>
                                    </Text>
                                ))}
                                {options.length === 0 && (
                                    <Box px="2" py="4">
                                        <Text size="1" color="gray" align="center" className="opacity-50">
                                            No options available
                                        </Text>
                                    </Box>
                                )}
                            </Flex>
                        </ScrollArea>
                    </Flex>
                </Popover.Content>
            </Popover.Root>
        </Flex>
    );
};

export default RadixMultiSelect;
