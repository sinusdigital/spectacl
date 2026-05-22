import React from 'react';
import { Badge } from '@radix-ui/themes';

interface CountBadgeProps {
    count: React.ReactNode;
    className?: string;
}

export default function CountBadge({ count, className = "" }: CountBadgeProps) {
    return (
        <Badge variant="solid" size="1" className={className}>
            {count}
        </Badge>
    );
}

