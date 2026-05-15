"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Box, Theme, VisuallyHidden } from "@radix-ui/themes";

interface MobileDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sidebar: React.ReactNode;
}

export default function MobileDrawer({ open, onOpenChange, sidebar }: MobileDrawerProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        zIndex: 150,
                        animation: open ? 'fadeIn 300ms ease' : 'fadeOut 300ms ease',
                    }}
                />
                <Dialog.Content
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'var(--color-background)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 160,
                        transform: open ? 'translateY(0)' : 'translateY(100%)',
                        transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                >
                    <Theme style={{ display: 'contents' }}>
                    <VisuallyHidden>
                        <Dialog.Title>Navigation Menu</Dialog.Title>
                        <Dialog.Description>Access navigation links and settings</Dialog.Description>
                    </VisuallyHidden>

                    <Box
                        className="mobile-sidebar-wrapper"
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            width: '100%',
                            padding: 'env(safe-area-inset-top) 0 0',
                            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                        }}
                    >
                        {/* 
                            Note: We use the sidebar prop directly. 
                            The drawer closes on navigation via the useEffect in AppShell 
                            which monitors pathname changes.
                        */}
                        {sidebar}
                    </Box>
                    </Theme>
                </Dialog.Content>
            </Dialog.Portal>
            
        </Dialog.Root>
    );
}
