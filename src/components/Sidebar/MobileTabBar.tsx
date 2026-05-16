"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flex, Text, Box } from "@radix-ui/themes";
import {
    DashboardIcon,
    ChatBubbleIcon,
    Link2Icon,
    BarChartIcon,
    DotsHorizontalIcon,
} from "@radix-ui/react-icons";

interface MobileTabBarProps {
    onMoreClick: () => void;
    isMoreOpen: boolean;
}

export default function MobileTabBar({ onMoreClick, isMoreOpen }: MobileTabBarProps) {
    const pathname = usePathname();
    
    // Derive entityId from pathname
    const entityId = pathname.split('/').filter(Boolean)[0];

    const navItems = [
        {
            label: "Overview",
            icon: <DashboardIcon width="20" height="20" />,
            href: `/${entityId}`,
            isActive: pathname === `/${entityId}`
        },
        {
            label: "Prompts",
            icon: <ChatBubbleIcon width="20" height="20" />,
            href: `/${entityId}/prompts`,
            isActive: pathname.includes('/prompts') && !pathname.includes('/discovery') && !pathname.includes('/tags')
        },
        {
            label: "Sources",
            icon: <Link2Icon width="20" height="20" />,
            href: `/${entityId}/sources`,
            isActive: pathname.includes('/sources')
        },
        {
            label: "Rankings",
            icon: <BarChartIcon width="20" height="20" />,
            href: `/${entityId}/ranking`,
            isActive: pathname.includes('/ranking')
        }
    ];

    return (
        <Box
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-background)',
                borderTop: '1px solid var(--gray-4)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                zIndex: 200,
            }}
            display={{ initial: 'block', md: 'none' }}
        >
            <Flex justify="between" align="center" px="4" py="2">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                            color: item.isActive ? 'var(--accent-9)' : 'var(--gray-9)',
                            flex: 1,
                        }}
                    >
                        {item.icon}
                        <Text size="1" weight={item.isActive ? "bold" : "medium"}>
                            {item.label}
                        </Text>
                    </Link>
                ))}
                
                <button
                    onClick={onMoreClick}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: isMoreOpen ? 'var(--accent-9)' : 'var(--gray-9)',
                        flex: 1,
                    }}
                >
                    <DotsHorizontalIcon width="20" height="20" />
                    <Text size="1" weight={isMoreOpen ? "bold" : "medium"}>
                        More
                    </Text>
                </button>
            </Flex>
        </Box>
    );
}
