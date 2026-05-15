"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContextMenu } from '@radix-ui/themes';
import SuggestionCard, { SuggestionCardProps } from './SuggestionCard';
import { SuggestionStatus } from './types';

interface DraggableSuggestionCardProps extends SuggestionCardProps {
    id: string;
    onStatusChange?: (id: string, status: SuggestionStatus) => void;
}

export default function DraggableSuggestionCard({ id, onStatusChange, ...props }: DraggableSuggestionCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // The dnd-kit wrapper IS the ContextMenu.Trigger. Wrapping at the inner Card
    // didn't work — Radix Themes' Card with onClick interfered with the trigger
    // hit area. The outer wrapper div is plain DOM and reliably receives
    // the contextmenu event.
    const wrapper = (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <SuggestionCard {...props} />
        </div>
    );

    if (!onStatusChange) return wrapper;

    // Menu adapts to status:
    //   Done            → Open / Move to backlog / Archive (no Dismiss — you
    //                     archive completed work, you don't dismiss it)
    //   ToDo / Doing    → Open / Move to backlog / Dismiss
    const isDone = props.suggestion.status === "Done";

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger>{wrapper}</ContextMenu.Trigger>
            <ContextMenu.Content>
                {props.onClick && (
                    <ContextMenu.Item onSelect={props.onClick}>Open</ContextMenu.Item>
                )}
                <ContextMenu.Item onSelect={() => onStatusChange(id, "Suggested")}>
                    Move to backlog
                </ContextMenu.Item>
                <ContextMenu.Separator />
                {isDone ? (
                    <ContextMenu.Item onSelect={() => onStatusChange(id, "Archived")}>
                        Archive
                    </ContextMenu.Item>
                ) : (
                    <ContextMenu.Item color="red" onSelect={() => onStatusChange(id, "Dismissed")}>
                        Dismiss
                    </ContextMenu.Item>
                )}
            </ContextMenu.Content>
        </ContextMenu.Root>
    );
}
