import React from 'react';
import { Badge } from '@radix-ui/themes';
import CompanyLogo from '@/components/CompanyLogo';

interface EntityBadgeProps {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    isArchived?: boolean;
    variant?: 'default' | 'primary' | 'warning';
    className?: string;
}

export default function EntityBadge({
    name,
    logoUrl,
    website,
    isArchived = false,
    variant = 'default',
    className = ''
}: EntityBadgeProps) {
    let color: "gray" | "green" | "yellow" | undefined = 'gray';

    if (isArchived) {
        color = 'gray';
    } else if (variant === 'primary') {
        color = 'green';
    } else if (variant === 'warning') {
        color = 'yellow';
    }

    const hasLogo = !!(logoUrl || website);

    return (
        <Badge
            color={color}
            variant="surface"
            size="2"
            className={`${isArchived ? 'opacity-50' : ''} ${className}`}
        >
            {hasLogo && (
                <CompanyLogo
                    name={name}
                    logoUrl={logoUrl}
                    domain={website}
                    size={16}
                    radius="small"
                    className={isArchived ? 'grayscale' : ''}
                />
            )}
            <span className="truncate max-w-[150px]">
                {name}
            </span>
        </Badge>
    );
}
