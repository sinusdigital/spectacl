import React from 'react';
import { Badge } from '@radix-ui/themes';

type BadgeColor = React.ComponentProps<typeof Badge>['color'];

export const INTENT_COLORS: Record<string, BadgeColor> = {
    'Transactional': 'green',
    'Commercial': 'purple',
    'Navigational': 'orange',
    'Informational': 'blue',
    'default': 'gray'
};

interface IntentBadgeProps {
    intent: string;
    className?: string;
    size?: '1' | '2' | '3';
}

export default function IntentBadge({ intent, className = "", size = '1' }: IntentBadgeProps) {
    // Find matching color key case-insensitively
    const matchKey = Object.keys(INTENT_COLORS).find(key => 
        key.toLowerCase() === intent?.toLowerCase()
    );
    const color = matchKey ? INTENT_COLORS[matchKey] : INTENT_COLORS['default'];
    
    return (
        <Badge 
            color={color} 
            size={size} 
            variant="soft" 
            highContrast
            radius="full"
            className={className}
        >
            {intent.toUpperCase()}
        </Badge>
    );
}
