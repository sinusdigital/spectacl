import React from 'react';
import { Avatar } from "@radix-ui/themes";
import { PROVIDER_LOGOS } from '@/assets/model-logos';

interface ModelLogoProps {
    provider: string;
    name: string;
    size?: 'sm' | 'md' | 'lg' | number;
    className?: string;
    radius?: "none" | "small" | "medium" | "large" | "full";
    grayscale?: boolean;
}

export default function ModelLogo({
    provider,
    name,
    size = 'md',
    className = "",
    radius = "large",
    grayscale = false
}: ModelLogoProps) {
    const logo = PROVIDER_LOGOS[provider.toLowerCase()];

    // Size mapping
    const sizeMap = {
        sm: 16,
        md: 24,
        lg: 32
    };

    const pixelSize = typeof size === 'number' ? size : sizeMap[size];

    const avatarSize = pixelSize <= 24 ? "1" : pixelSize <= 32 ? "2" : pixelSize < 48 ? "3" : pixelSize <= 64 ? "4" : "5";
    const fallbackInitials = name && typeof name === 'string' && name.length > 0
        ? name.charAt(0).toUpperCase()
        : "?";

    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                background: 'white',
                borderRadius: radius === 'full' ? '9999px' : radius === 'large' ? 'var(--radius-3)' : radius === 'medium' ? 'var(--radius-2)' : radius === 'small' ? 'var(--radius-1)' : '0',
                flexShrink: 0,
                opacity: grayscale ? 0.5 : 1,
                filter: grayscale ? 'grayscale(1)' : 'none',
            }}
        >
            <Avatar
                src={logo ? (logo.src || logo) : undefined}
                fallback={fallbackInitials}
                size={avatarSize}
                variant="soft"
                color="gray"
                highContrast
                radius={radius}
                style={{ display: 'block' }}
            />
        </span>
    );
}
