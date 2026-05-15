"use client";

import { useState, useEffect } from "react";
import { Select } from "@radix-ui/themes";

interface LanguageSelectProps {
    value: string;
    onChange: (value: string) => void;
    size?: "1" | "2" | "3";
    disabled?: boolean;
}

type GroupedLanguages = Record<string, { id: string; name: string }[]>;

const GROUP_ORDER = ['Global', 'Europe', 'Americas', 'Asia Pacific', 'Middle East & Africa'];

export default function LanguageSelect({ value, onChange, size = "2", disabled }: LanguageSelectProps) {
    const [grouped, setGrouped] = useState<GroupedLanguages>({});

    useEffect(() => {
        fetch("/api/languages")
            .then(res => res.ok ? res.json() : {})
            .then(setGrouped)
            .catch(() => {});
    }, []);

    const sortedGroups = GROUP_ORDER.filter(g => grouped[g]?.length > 0);

    return (
        <Select.Root value={value || undefined} onValueChange={onChange} size={size} disabled={disabled}>
            <Select.Trigger variant="surface" placeholder="Select market..." />
            <Select.Content variant="soft" position="popper" sideOffset={4}>
                {sortedGroups.map((group, groupIdx) => (
                    <Select.Group key={group}>
                        {groupIdx > 0 && <Select.Separator />}
                        <Select.Label>{group}</Select.Label>
                        {grouped[group].map(lang => (
                            <Select.Item key={lang.id} value={lang.name}>
                                {lang.name}
                            </Select.Item>
                        ))}
                    </Select.Group>
                ))}
            </Select.Content>
        </Select.Root>
    );
}
