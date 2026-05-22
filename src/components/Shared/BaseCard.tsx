import React from 'react';
import { Card, Flex, Box } from '@radix-ui/themes';
import { cn } from "@/lib/utils";

// --- ROOT ---
interface BaseCardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'active' | 'inactive' | 'translucent' | 'ghost';
    onClick?: () => void;
    style?: React.CSSProperties;
}

function BaseCardRoot({ children, className = "", variant = 'active', onClick, style }: BaseCardProps) {
    const isInactive = variant === 'inactive';
    const isTranslucent = variant === 'translucent';
    const isGhost = variant === 'ghost';
    
    return (
        <Card 
            size="2"
            variant={isGhost ? "ghost" : "surface"}
            onClick={onClick}
            style={style}
            className={cn(
                "flex flex-col transition-colors duration-200 overflow-hidden h-full",
                isGhost && "border-none bg-transparent",
                onClick && "cursor-pointer hover:bg-[var(--gray-2)]",
                isInactive && "opacity-75 grayscale-[0.5] bg-[var(--gray-2)]",
                isTranslucent && [
                    "shadow-none transition-all",
                    "bg-[var(--gray-a2)] hover:bg-[var(--gray-a3)] backdrop-blur-md",
                ],
                className
            )}
        >
            <Flex direction="column" height="100%" width="100%">
                {children}
            </Flex>
        </Card>
    );
}

// --- HEADER ---
interface BaseCardHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    logo?: React.ReactNode;
    badges?: React.ReactNode;
    badgesPosition?: 'above' | 'below';
    headerExtra?: React.ReactNode;
    className?: string;
    titleClassName?: string;
    logoClassName?: string;
    inactive?: boolean; // Used to grayscale logos
}

function BaseCardHeader({
    title,
    subtitle,
    logo,
    badges,
    badgesPosition = 'below',
    headerExtra,
    className = "",
    titleClassName = "",
    logoClassName = "flex-shrink-0 flex items-center justify-center",
    inactive = false
}: BaseCardHeaderProps) {
    const renderBadges = () => badges && (
        <Flex direction="column" gap="1" className={badgesPosition === 'above' ? 'mb-1' : 'mt-1'}>
            {badges}
        </Flex>
    );

    return (
        <Flex gap="4" mb="4" align="start" className={className}>
            {logo && (
                <Box className={cn(logoClassName, inactive && 'grayscale opacity-50', "[&>*]:h-full")}>
                    {logo}
                </Box>
            )}
            <Box className="flex-1 min-w-0">
                {badgesPosition === 'above' && renderBadges()}
                <h3 className={cn("font-semibold text-[var(--gray-12)] truncate leading-tight", titleClassName)}>
                    {title}
                </h3>
                {subtitle && (
                    <Box mt="1" style={{ fontSize: 'var(--font-size-2)', color: 'var(--gray-11)' }}>
                        {subtitle}
                    </Box>
                )}
                {badgesPosition === 'below' && renderBadges()}
            </Box>
            {headerExtra && (
                <Box ml="4" className="flex-shrink-0">
                    {headerExtra}
                </Box>
            )}
        </Flex>
    );
}

// --- BODY ---
interface BaseCardBodyProps {
    children: React.ReactNode;
    className?: string;
}

function BaseCardBody({ children, className = "" }: BaseCardBodyProps) {
    return (
        <Box className={cn("flex-1 flex flex-col", className)}>
            {children}
        </Box>
    );
}

// --- FOOTER ---
interface BaseCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

function BaseCardFooter({ children, className = "", ...props }: BaseCardFooterProps) {
    return (
        <div 
            className={cn(
                "mt-auto pt-4 grid grid-flow-col auto-cols-fr gap-3 font-medium w-full border-t border-[var(--gray-4)] [&>*]:w-full",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export const BaseCard = Object.assign(BaseCardRoot, {
    Header: BaseCardHeader,
    Body: BaseCardBody,
    Footer: BaseCardFooter,
});

export default BaseCard;
