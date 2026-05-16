"use client";

import { useState, useEffect, useRef } from "react";
import { Badge, Flex, Text } from "@radix-ui/themes";
import { CheckIcon, PlusIcon, Cross2Icon } from "@radix-ui/react-icons";
import { getColorForTag } from "@/lib/colors";

interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

interface TagSelectorProps {
    entityId: string;
    selectedTags: string[]; // array of tag names
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
}

export default function TagSelector({ entityId, selectedTags, onChange, placeholder = "Add tags...", className = "" }: TagSelectorProps) {
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchTags = async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}/tags`);
            if (res.ok) {
                const data = await res.json();
                setAvailableTags(data);
            }
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    };

    useEffect(() => {
        let isCancelled = false;
        async function loadTags() {
            try {
                const res = await fetch(`/api/entities/${entityId}/tags`);
                if (res.ok && !isCancelled) {
                    const data = await res.json();
                    setAvailableTags(data);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error("Error fetching tags:", error);
                }
            }
        }
        loadTags();
        return () => { isCancelled = true; };
    }, [entityId]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            const tagName = inputValue.trim();
            if (!selectedTags.includes(tagName)) {
                onChange([...selectedTags, tagName]);
            }
            setInputValue("");
            setIsOpen(false);
        } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
            onChange(selectedTags.slice(0, -1));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const toggleTag = (tagName: string) => {
        if (selectedTags.includes(tagName)) {
            onChange(selectedTags.filter(t => t !== tagName));
        } else {
            onChange([...selectedTags, tagName]);
            if (!availableTags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
                setAvailableTags(prev => [...prev, { id: tagName, name: tagName, color: getColorForTag(tagName) }].sort((a, b) => a.name.localeCompare(b.name)));
            }
        }
        setInputValue("");
        setIsOpen(false);
    };

    const filteredAvailable = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.includes(tag.name)
    );

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div
                className="flex flex-wrap items-center gap-1 px-2 min-h-[32px] rounded-[var(--radius-2)] border border-[var(--gray-a7)] bg-[var(--color-surface)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--focus-8)] transition-all cursor-text"
                onClick={() => {
                    setIsOpen(true);
                    fetchTags();
                }}
            >
                {selectedTags.map(tagName => (
                    <Badge
                        key={tagName}
                        size="1"
                        variant="soft"
                        color="gray"
                    >
                        <Flex align="center" gap="1">
                            {tagName}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTag(tagName);
                                }}
                                className="hover:opacity-75 transition-opacity"
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                <Cross2Icon width={10} height={10} />
                            </button>
                        </Flex>
                    </Badge>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedTags.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[60px] bg-transparent border-none outline-none text-sm p-0 px-1"
                    style={{ color: 'var(--gray-12)' }}
                />
            </div>

            {isOpen && (inputValue.trim() || filteredAvailable.length > 0 || availableTags.length > 0) && (
                <div
                    className="absolute z-[9999] mt-1 w-full animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        background: 'var(--color-panel-solid)',
                        border: '1px solid var(--gray-a6)',
                        borderRadius: 'var(--radius-2)',
                        boxShadow: 'var(--shadow-3)',
                        maxHeight: 200,
                        overflowY: 'auto',
                    }}
                >
                    <div style={{ padding: 'var(--space-1)' }} onClick={e => e.stopPropagation()}>
                        {filteredAvailable.map(tag => {
                            const isSelected = selectedTags.includes(tag.name);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.name)}
                                    className="w-full text-left transition-colors"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding: 'var(--space-1) var(--space-2)',
                                        borderRadius: 'var(--radius-1)',
                                        fontSize: 'var(--font-size-2)',
                                        color: isSelected ? 'var(--accent-11)' : 'var(--gray-12)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-a3)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{
                                        width: 14,
                                        height: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {isSelected && <CheckIcon width={14} height={14} />}
                                    </span>
                                    <span>{tag.name}</span>
                                </button>
                            );
                        })}
                        {inputValue.trim() && !availableTags.some(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
                            <button
                                type="button"
                                onClick={() => toggleTag(inputValue.trim())}
                                className="w-full text-left transition-colors"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-1) var(--space-2)',
                                    borderRadius: 'var(--radius-1)',
                                    fontSize: 'var(--font-size-2)',
                                    color: 'var(--accent-11)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-a3)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <PlusIcon width={14} height={14} style={{ flexShrink: 0 }} />
                                <span>Create &ldquo;{inputValue.trim()}&rdquo;</span>
                            </button>
                        )}
                        {!inputValue.trim() && filteredAvailable.length === 0 && (
                            <div style={{
                                padding: 'var(--space-3) var(--space-2)',
                                textAlign: 'center',
                                fontSize: 'var(--font-size-1)',
                                color: 'var(--gray-9)',
                            }}>
                                No tags found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
