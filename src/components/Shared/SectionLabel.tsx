import { Text } from '@radix-ui/themes';
import { ComponentPropsWithoutRef } from 'react';
import { TYPOGRAPHY } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface SectionLabelProps {
    children: React.ReactNode;
    variant?: 'card' | 'modal';
    mb?: ComponentPropsWithoutRef<typeof Text>['mb'];
    className?: string;
}

/**
 * SectionLabel component for consistent header styling in sections and modals.
 * Uses centralized TYPOGRAPHY design tokens and Radix UI primitives.
 */
export default function SectionLabel({ 
    children, 
    variant = 'card', 
    mb = "2",
    className, 
    ...props 
}: SectionLabelProps) {
    const token = variant === 'modal' ? TYPOGRAPHY.SECTION_LABEL.modal : TYPOGRAPHY.SECTION_LABEL.card;

    return (
        <Text 
            as="p"
            size={token.size}
            color={token.color}
            weight={token.weight}
            mb={mb}
            className={cn(token.className, className, "block")}
            {...props}
        >
            {children}
        </Text>
    );
}
