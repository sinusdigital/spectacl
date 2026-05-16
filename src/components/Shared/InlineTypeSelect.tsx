'use client';

import { Select, Text, Box } from '@radix-ui/themes';

export interface InlineTypeOption {
    id: string;
    name: string;
    color: string | null;
    /** Domain-type only — flips trigger label color to the owned/earned/other tier palette. */
    isOwned?: boolean;
    isEarned?: boolean;
}

interface InlineTypeSelectProps {
    /** The current DomainType ID (not name) */
    value: string | null | undefined;
    /** Called with the new DomainType ID, or null to clear */
    onChange: (newTypeId: string | null) => void;
    types: InlineTypeOption[];
    /** When false, hides the "— No type" option. Defaults to true. */
    nullable?: boolean;
}

// If the option carries `isOwned` / `isEarned` (i.e. it's a domain type),
// the trigger label uses the tier palette instead of the per-type registry
// color — keeps the customer-facing UI from going rainbow. Non-domain-type
// callers (e.g. intent dropdown) still use their own `color` field.
function resolveLabelColor(currentType: InlineTypeOption | null): string {
    if (!currentType) return 'var(--gray-9)';
    const hasTierFlags =
        typeof currentType.isOwned === 'boolean' ||
        typeof currentType.isEarned === 'boolean';
    if (hasTierFlags) {
        if (currentType.isOwned) return 'var(--green-11)';
        if (currentType.isEarned) return 'var(--iris-11)';
        return 'var(--gray-11)';
    }
    return currentType.color ?? 'var(--gray-9)';
}

/**
 * Inline ghost Select for choosing a domain type inside a table cell.
 * Works with DomainType IDs — displays name, stores ID.
 */
export default function InlineTypeSelect({ value, onChange, types, nullable = true }: InlineTypeSelectProps) {
    const currentType = value ? types.find(t => t.id === value) ?? null : null;
    const labelColor = resolveLabelColor(currentType);

    return (
        <Box onClick={e => e.stopPropagation()}>
            <Select.Root
                value={value ?? '__none__'}
                onValueChange={val => onChange(val === '__none__' ? null : val)}
                size="1"
            >
                <Select.Trigger
                    variant="ghost"
                    color="gray"
                    style={{ color: labelColor }}
                />
                <Select.Content color="gray">
                    {nullable && (
                        <>
                            <Select.Item value="__none__">
                                <Text color="gray">— No type</Text>
                            </Select.Item>
                            <Select.Separator />
                        </>
                    )}
                    {types.map(t => (
                        <Select.Item key={t.id} value={t.id}>
                            {t.name}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select.Root>
        </Box>
    );
}
