"use client";

import { useState } from "react";
import NavigationItem from "./NavigationItem";
import { Box, Flex } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";

interface NavigationItemType {
    id?: string;
    name: string | React.ReactNode;
    href: string;
    icon?: React.ReactNode;
    children?: { name: string; href: string }[];
    target?: string;
}

interface NavigationSectionProps {
    title: string;
    items: NavigationItemType[];
    currentPath: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    onNavigate?: () => void;
}

export default function NavigationSection({ title, items, currentPath, collapsible, defaultCollapsed = true, onNavigate }: NavigationSectionProps) {
    // Auto-expand if any item in this section is active
    const hasActiveItem = items.some(item => {
        if (item.children?.some(child => currentPath === child.href)) return true;
        return currentPath === item.href || currentPath.startsWith(item.href + '/');
    });

    const [collapsed, setCollapsed] = useState(collapsible ? (hasActiveItem ? false : defaultCollapsed) : false);

    return (
        <Box mb="3">
            {collapsible ? (
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-1 w-full text-[10.5px] font-semibold uppercase tracking-widest px-3 pb-1.5 select-none hover:text-[var(--gray-11)] transition-colors"
                    style={{ color: "var(--gray-a9)", background: "none", border: "none", cursor: "pointer" }}
                >
                    <ChevronRightIcon
                        className="w-3 h-3 transition-transform duration-150"
                        style={{ transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                    />
                    {title}
                </button>
            ) : (
                <div
                    className="text-[10.5px] font-semibold uppercase tracking-widest px-3 pb-1.5 select-none"
                    style={{ color: "var(--gray-a9)" }}
                >
                    {title}
                </div>
            )}
            {!collapsed && (
                <Flex direction="column" gap="0">
                    {items.map((item, index) => {
                        const isChildActive = item.children?.some(child => currentPath === child.href) || false;
                        const isGroupActive = item.children
                            ? currentPath === item.href || isChildActive || currentPath.startsWith(item.href + '/')
                            : currentPath === item.href || currentPath.startsWith(item.href + '/');
                        const isExactActive = currentPath === item.href;

                        return (
                            <NavigationItem
                                key={item.id || (typeof item.name === 'string' ? item.name : `nav-item-${index}`)}
                                name={item.name}
                                href={item.href}
                                icon={item.icon}
                                isExactActive={isExactActive}
                                isGroupActive={isGroupActive}
                                subItems={item.children}
                                currentPath={currentPath}
                                target={item.target}
                                onNavigate={onNavigate}
                            />
                        );
                    })}
                </Flex>
            )}
        </Box>
    );
}
