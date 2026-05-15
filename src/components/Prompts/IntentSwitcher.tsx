"use client";

import { useState } from "react";
import { Select } from "@radix-ui/themes";
import { INTENT_COLORS } from "./IntentBadge";

const STANDARD_INTENTS = ['Navigational', 'Informational', 'Transactional', 'Commercial'];

interface IntentSwitcherProps {
    currentIntent: string;
    onIntentChange: (newIntent: string) => void | Promise<void>;
    disabled?: boolean;
    mode?: 'pill' | 'input';
}

export default function IntentSwitcher({ currentIntent, onIntentChange, disabled, mode = 'pill' }: IntentSwitcherProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSelect = async (intent: string) => {
        if (intent === currentIntent) return;
        setIsUpdating(true);
        try {
            await onIntentChange(intent);
        } catch (error) {
            console.error("Failed to change intent:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const color = INTENT_COLORS[currentIntent] ?? INTENT_COLORS['default'];

    return (
        <Select.Root
            value={currentIntent}
            onValueChange={handleSelect}
            disabled={disabled || isUpdating}
            size={mode === 'input' ? '2' : '1'}
        >
            <Select.Trigger
                variant={mode === 'input' ? 'surface' : 'ghost'}
                color={color}
                style={mode === 'pill' ? { fontWeight: 500 } : undefined}
            />
            <Select.Content variant="soft" position="popper" sideOffset={4}>
                {STANDARD_INTENTS.map((intent) => (
                    <Select.Item key={intent} value={intent}>
                        {intent}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select.Root>
    );
}
