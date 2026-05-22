"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import RadixTable from './RadixTable';

interface InlineAddRowProps {
    onAdd: (text: string) => Promise<void>;
    label: string;
    placeholder?: string;
    colCount: number;
    indexColWidth?: string;
    autoWidth?: boolean;
}

export default function InlineAddRow({
    onAdd,
    label,
    placeholder = "Type and press Enter...",
    colCount,
    indexColWidth = "30px",
    autoWidth = false
}: InlineAddRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inputWidth, setInputWidth] = useState(120);
    const inputRef = useRef<HTMLInputElement>(null);
    const mirrorRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (isEditing && !isSubmitting) {
            // Use a tiny delay to ensure the input is enabled and DOM is ready
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isEditing, isSubmitting]);

    // Sync input width to typed text if autoWidth is enabled
    useEffect(() => {
        if (autoWidth && mirrorRef.current) {
            setInputWidth(Math.max(mirrorRef.current.scrollWidth + 2, 120));
        }
    }, [value, autoWidth]);

    const handleSubmit = async () => {
        const trimmed = value.trim();
        if (!trimmed || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onAdd(trimmed);
            setValue('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            setValue('');
            setIsEditing(false);
        }
    };

    return (
        <RadixTable.Row
            className={!isEditing ? "group cursor-text hover:bg-[var(--gray-2)] transition-colors" : ""}
            onClick={!isEditing ? () => setIsEditing(true) : undefined}
        >
            <RadixTable.Cell 
                width={indexColWidth} 
                className="px-4 py-4"
                style={{ verticalAlign: 'middle' }}
            >
                <div className="flex justify-center">
                    <PlusIcon 
                        className={!isEditing ? "w-3.5 h-3.5 text-[var(--gray-9)] group-hover:text-[var(--gray-11)] transition-colors" : "w-3.5 h-3.5 text-[var(--gray-11)]"} 
                    />
                </div>
            </RadixTable.Cell>
            
            <RadixTable.Cell colSpan={colCount - 1} className="px-4 py-4">
                {!isEditing ? (
                    <span className="text-sm text-[var(--gray-9)] group-hover:text-[var(--gray-11)] transition-colors">
                        {label}
                    </span>
                ) : (
                    <div className="flex items-center gap-2 overflow-hidden">
                        {autoWidth && (
                            <span
                                ref={mirrorRef}
                                aria-hidden
                                className="invisible absolute text-sm whitespace-pre pointer-events-none"
                            >
                                {value}
                            </span>
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            placeholder={placeholder}
                            className="shrink-0 text-sm bg-transparent text-[var(--gray-12)] placeholder-[var(--gray-8)] disabled:opacity-60 border-none outline-none focus:ring-0 p-0"
                            style={{
                                width: autoWidth && value ? inputWidth : '100%',
                                boxShadow: 'none'
                            }}
                        />
                        {value.trim() && (
                            <span className="text-[10px] text-[var(--gray-9)] whitespace-nowrap shrink-0 select-none">
                                Enter ↵ · Esc to cancel
                            </span>
                        )}
                    </div>
                )}
            </RadixTable.Cell>
        </RadixTable.Row>
    );
}
