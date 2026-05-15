"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export default function DroppableColumn({ id, children, className, style }: DroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    // Background tint instead of an outer ring — the column is typically nested
    // inside an overflow-hidden Card, where a ring would clip at the edges.
    const bg = isOver ? 'var(--accent-3)' : style?.background;

    return (
        <div
            ref={setNodeRef}
            className={`${className ?? ''} transition-colors duration-200`}
            style={{ ...style, background: bg }}
        >
            {children}
        </div>
    );
}
