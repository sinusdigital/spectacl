import React from "react";
import { Card, Flex, Box, Text, HoverCard } from "@radix-ui/themes";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

export interface StatCardProps {
    title: string;
    tooltipContent: React.ReactNode;
    tooltipDirection?: "top" | "right" | "bottom" | "left";
    value: React.ReactNode;
    valueTitle?: string;
    isActive: boolean;
    onClick?: () => void;
    trendNode?: React.ReactNode;
    icon?: React.ReactNode;
    /** "flush" renders without Card chrome — use inside a bordered container */
    variant?: "card" | "flush";
    /** forwarded to flush root element — use for grid-cell borders */
    className?: string;
    /** Native Radix prop to allow the card to stretch */
    flexGrow?: string | "1" | "0";
}

export const StatCard = ({
    title,
    tooltipContent,
    tooltipDirection = "right",
    value,
    valueTitle,
    isActive,
    onClick,
    trendNode,
    icon,
    variant = "card",
    className,
    flexGrow,
}: StatCardProps) => {
    const inner = (
        <Box>
            <Flex align="center" justify="between" mb="1">
                <Flex align="center" gap="1">
                    <Text size="2" color="gray" weight="medium">
                        {title}
                    </Text>
                    <HoverCard.Root>
                        <HoverCard.Trigger>
                            <QuestionMarkCircledIcon
                                style={{ cursor: "help", color: "var(--gray-9)" }}
                                className="w-4 h-4 mt-[1px]"
                            />
                        </HoverCard.Trigger>
                        <HoverCard.Content side={tooltipDirection} maxWidth="280px">
                            {tooltipContent}
                        </HoverCard.Content>
                    </HoverCard.Root>
                </Flex>
                {icon}
            </Flex>

            <Text
                as="p"
                size={{ initial: '5', md: '7' }}
                weight="bold"
                mt="1"
                title={valueTitle}
            >
                {value}
            </Text>

            {trendNode}
        </Box>
    );

    if (variant === "flush") {
        const hoverClass = isActive ? "" : "hover:bg-[var(--gray-a2)]";
        // Box doesn't support flexGrow directly in all Radix versions, but Flex does,
        // and since we need alignment, Flex is the right component here anyway.
        return (
            <Flex
                p={{ initial: '3', md: '4' }}
                align="center"
                onClick={onClick}
                className={[hoverClass, className].filter(Boolean).join(" ")}
                style={{
                    flexGrow,
                    cursor: onClick ? "pointer" : "default",
                    background: isActive ? "var(--accent-2)" : "transparent",
                    borderLeft: isActive
                        ? "3px solid var(--accent-8)"
                        : "3px solid transparent",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                    boxSizing: "border-box",
                }}
            >
                {inner}
            </Flex>
        );
    }

    return (
        <Card
            variant="surface"
            onClick={onClick}
            style={{
                cursor: onClick ? "pointer" : "default",
                outline: isActive ? "2px solid var(--accent-8)" : "none",
                outlineOffset: "-1px",
            }}
        >
            {inner}
        </Card>
    );
};
