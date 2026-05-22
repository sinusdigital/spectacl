"use client";

import React from 'react';
import { Dialog, Flex, Box, IconButton, Theme } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "@/lib/utils";

/**
 * Shared Modal component props
 */
export interface ModalProps {
    /** Whether the modal is currently open */
    isOpen: boolean;
    /** Callback when the modal requests to close */
    onClose: () => void;
    /** Modal content */
    children: React.ReactNode;
    /** Optional title shown in the header */
    title?: React.ReactNode;
    /** Optional description shown below the title */
    description?: string;
    /** Width size of the modal. Defaults to 'md' */
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
    /** Custom class name for the container */
    className?: string;
    /** Custom style for the container */
    style?: React.CSSProperties;
    /** Whether to show the bottom border in the header. Defaults to true */
    headerBorder?: boolean;
    /** Optional footer actions (buttons) */
    actions?: React.ReactNode;
}

/**
 * A reusable Modal component with standardized styling and spring animations.
 */
export default function Modal({
    isOpen,
    onClose,
    children,
    title,
    description,
    size = 'md',
    className = '',
    style = {},
    headerBorder = true,
    actions
}: ModalProps) {
    // Standardized width classes mapped to Radix Themes sizes or custom max-width where necessary
    let maxWidth = undefined;
    if (size === 'xl') maxWidth = 'var(--max-w-xl)';
    else if (size === '2xl') maxWidth = 'var(--max-w-2xl)';
    else if (size === '3xl') maxWidth = 'var(--max-w-3xl)';
    else if (size === '4xl') maxWidth = 'var(--max-w-4xl)';
    else if (size === '5xl') maxWidth = 'var(--max-w-5xl)';
    else if (size === '6xl') maxWidth = 'var(--max-w-6xl)';
    else if (size === '7xl') maxWidth = 'var(--max-w-7xl)';
    else if (size === 'full') maxWidth = '100vw';

    let themeSize: "1" | "2" | "3" | "4" = "3";
    if (size === 'sm') themeSize = "1";
    if (size === 'md') themeSize = "2";
    if (size === 'lg') themeSize = "3";
    if (maxWidth) themeSize = "4";

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
                    <Theme panelBackground="translucent" style={{ display: 'contents' }}>
                        <Dialog.Content
                            size={themeSize}
                            className={cn("p-0 overflow-hidden outline-none", className)}
                            style={{
                                maxWidth: maxWidth ? `calc(${maxWidth} - 2rem)` : undefined,
                                maxHeight: 'calc(100vh - 2rem)',
                                padding: 0,
                                borderRadius: 'var(--radius-4)',
                                boxShadow: 'var(--shadow-5)',
                                overflowY: 'auto',
                                ...style
                            }}
                            asChild
                            forceMount
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
                            >
                                {/* Header Section */}
                                {(title || description) && (
                                    <Flex justify="between" align="start" p={{ initial: "3", sm: "4" }} className={headerBorder ? 'border-b border-[var(--gray-a5)]' : ''}>
                                        <Box className="min-w-0 flex-1">
                                            {title && <Dialog.Title mb={description ? "1" : "0"} size="3">{title}</Dialog.Title>}
                                            {description && <Dialog.Description size="2" color="gray">{description}</Dialog.Description>}
                                        </Box>
                                        <Dialog.Close>
                                            <IconButton variant="ghost" color="gray" aria-label="Close modal">
                                                <Cross2Icon />
                                            </IconButton>
                                        </Dialog.Close>
                                    </Flex>
                                )}

                                {/* Body Section */}
                                <div className={cn("p-4 sm:p-6", !actions && "pb-4 sm:pb-6")}>
                                    {children}
                                </div>

                                {/* Footer Section */}
                                {actions && (
                                    <Box p={{ initial: "4", sm: "6" }} pt="0" width="100%">
                                        <Flex
                                            gap="3"
                                            direction={{ initial: 'column', sm: 'row' }}
                                            style={{ width: '100%' }}
                                        >
                                            {(() => {
                                                // Process children, unwrapping fragments if present
                                                const getChildren = (nodes: React.ReactNode): React.ReactNode[] => {
                                                    return React.Children.toArray(nodes).flatMap(node => {
                                                        if (React.isValidElement(node) && node.type === React.Fragment) {
                                                            return getChildren(node.props.children);
                                                        }
                                                        return [node];
                                                    });
                                                };

                                                const rawChildren = getChildren(actions);

                                                return rawChildren.map((child, index) => {
                                                    if (!React.isValidElement(child)) return child;

                                                    const element = child as React.ReactElement<{ fullWidth?: boolean; style?: React.CSSProperties }>;
                                                    return (
                                                        <Box key={index} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, width: '100%' }}>
                                                            {React.cloneElement(element, {
                                                                fullWidth: true,
                                                                style: { ...(element.props.style || {}), width: '100%' }
                                                            })}
                                                        </Box>
                                                    );
                                                });
                                            })()}
                                        </Flex>
                                    </Box>
                                )}
                            </motion.div>
                        </Dialog.Content>
                    </Theme>
                </Dialog.Root>
            )}
        </AnimatePresence>
    );
}
