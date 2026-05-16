import React, { ReactNode, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Theme, Grid, TextField, Text, Box } from "@radix-ui/themes";
import Button from "@/components/Shared/Button";

export interface ActionDialogProps {
    /** Controls whether the dialog is open */
    isOpen: boolean;
    /** Callback fired when the dialog should close */
    onClose: () => void;
    /** Callback fired when the primary action button is clicked */
    onConfirm: () => void;
    /** The main title of the dialog */
    title: string;
    /** A descriptive message explaining the action */
    message: string;
    /** Optional icon to display above the text */
    icon?: ReactNode;
    /** Label for the confirm button. Defaults to 'Confirm' */
    confirmText?: string;
    /** Label for the cancel button. Defaults to 'Cancel' */
    cancelText?: string;
    /** Whether the confirm action is currently loading/processing */
    isLoading?: boolean;
    /** Text to display on the button while loading */
    loadingText?: string;
    /** The visual variant of the primary action. 'destructive' uses red, 'primary' uses the accent color */
    variant?: "destructive" | "primary";
    /**
     * If set, requires the user to type this exact string before the confirm
     * button becomes enabled. Used as a deliberate-confirmation gate for
     * irreversible actions (e.g. "DELETE", "CANCEL"). Comparison is case-sensitive.
     */
    confirmationText?: string;
}

/**
 * A standardized, reusable Alert Dialog for destructive or important actions.
 * Encapsulates the idiomatic Radix UI structure and layout patterns,
 * guaranteeing consistent 50/50 full-width buttons without developer boilerplate.
 */
export default function ActionDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    icon,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isLoading = false,
    loadingText,
    variant = "primary",
    confirmationText
}: ActionDialogProps) {
    const isDestructive = variant === "destructive";
    const [confirmInput, setConfirmInput] = useState("");

    const requiresConfirmation = !!confirmationText;
    const confirmationMatches = !requiresConfirmation || confirmInput === confirmationText;
    const isConfirmDisabled = isLoading || !confirmationMatches;

    // Reset the confirmation input whenever the dialog closes — handled in the
    // close path (no effect needed) so typed text never carries across opens.
    const handleClose = () => {
        setConfirmInput("");
        onClose();
    };

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <AlertDialog.Portal>
                {/* Fade-in Overlay */}
                <AlertDialog.Overlay className="fixed inset-0 bg-[var(--black-a9)] z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                
                {/* Restore Radix variables that get lost when teleporting outside of the main root Theme */}
                <Theme style={{ display: 'contents' }}>
                    {/* Modal Content */}
                    <AlertDialog.Content 
                        className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl bg-[var(--color-background)] p-6 shadow-xl z-50 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
                    >
                        <div className="flex flex-col items-center">
                            {icon && (
                                <div className="flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: isDestructive ? 'var(--red-3)' : 'var(--gray-3)' }}>
                                    {icon}
                                </div>
                            )}
                            
                            <AlertDialog.Title className="text-lg font-bold text-center text-[var(--gray-12)] mb-2">
                                {title}
                            </AlertDialog.Title>
                            <AlertDialog.Description className={`text-sm text-center text-[var(--gray-11)] ${requiresConfirmation ? 'mb-4' : 'mb-6'}`}>
                                {message}
                            </AlertDialog.Description>
                        </div>

                        {requiresConfirmation && (
                            <Box mb="5">
                                <TextField.Root
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder={`Type ${confirmationText} to confirm`}
                                    size="3"
                                    autoFocus
                                    autoComplete="off"
                                    aria-label={`Type ${confirmationText} to confirm`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && confirmationMatches && !isLoading) {
                                            e.preventDefault();
                                            onConfirm();
                                        }
                                    }}
                                />
                                {confirmInput && !confirmationMatches && (
                                    <Text size="1" color="red" mt="1" className="block">
                                        Doesn&apos;t match — type {confirmationText} exactly.
                                    </Text>
                                )}
                            </Box>
                        )}

                        {/* Standardized 50/50 dual-action layout */}
                        <Grid columns="2" gap="3" width="100%">
                            <AlertDialog.Cancel asChild>
                                <Button
                                    variant="secondary"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    fullWidth
                                    className="justify-center"
                                >
                                    {cancelText}
                                </Button>
                            </AlertDialog.Cancel>
                            
                            <AlertDialog.Action asChild>
                                <Button
                                    variant={isDestructive ? "danger" : "primary"}
                                    onClick={(e) => {
                                        // Prevent Radix from closing internal state immediately, let the parent fully control it
                                        e.preventDefault();
                                        onConfirm();
                                    }}
                                    disabled={isConfirmDisabled}
                                    isLoading={isLoading}
                                    loadingText={loadingText}
                                    className="justify-center"
                                    fullWidth
                                >
                                    {confirmText}
                                </Button>
                            </AlertDialog.Action>
                        </Grid>
                    </AlertDialog.Content>
                </Theme>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
