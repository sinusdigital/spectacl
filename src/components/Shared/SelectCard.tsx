"use client";

import React from 'react';
import { Box } from '@radix-ui/themes';
import { cn } from "@/lib/utils";
import BaseCard from "./BaseCard";

interface SelectCardProps {
    title: string;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
    iconClassName?: string;
}

export default function SelectCard({
    title,
    subtitle,
    icon,
    selected = false,
    onClick,
    className = "",
    iconClassName = "",
}: SelectCardProps) {
    return (
        <Box
            onClick={onClick}
            style={{ borderRadius: 'var(--radius-3)' }}
            className={cn(
                "cursor-pointer transition-all border-2 overflow-hidden relative",
                selected ? "border-[var(--accent-9)] bg-[var(--accent-a2)]" : "border-transparent hover:border-[var(--gray-5)]",
                className
            )}
        >
            <BaseCard
                variant="ghost"
                className="!shadow-none border-none"
            >
                <BaseCard.Header
                    title={title}
                    subtitle={subtitle}
                    logo={icon}
                    logoClassName={cn("flex-shrink-0 flex items-center justify-center p-2", iconClassName)}
                    titleClassName="text-[var(--gray-12)] font-bold"
                    className="mb-0 p-4"
                />
            </BaseCard>

            {selected && (
                <Box className="absolute top-3 right-3 rounded-full p-1 shadow-sm z-10" style={{ background: 'var(--accent-9)', color: 'white' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </Box>
            )}
        </Box>
    );
}
