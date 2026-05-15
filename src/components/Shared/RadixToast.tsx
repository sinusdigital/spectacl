"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import {
    CheckCircledIcon,
    CrossCircledIcon,
    ExclamationTriangleIcon,
    InfoCircledIcon,
    Cross2Icon,
} from "@radix-ui/react-icons";

// --- Types ---
type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    type?: ToastType;
    duration?: number;
}

interface ToastContextValue {
    toast: (props: Omit<ToastMessage, "id">) => void;
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
}

// Solid (non-alpha) Radix scale — opaque in both light and dark mode
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; text: string; subtext: string }> = {
    success: {
        bg:      'var(--green-3)',
        border:  'var(--green-6)',
        text:    'var(--green-12)',
        subtext: 'var(--green-11)',
    },
    error: {
        bg:      'var(--red-3)',
        border:  'var(--red-6)',
        text:    'var(--red-12)',
        subtext: 'var(--red-11)',
    },
    warning: {
        bg:      'var(--amber-3)',
        border:  'var(--amber-6)',
        text:    'var(--amber-12)',
        subtext: 'var(--amber-11)',
    },
    info: {
        bg:      'var(--gray-3)',
        border:  'var(--gray-6)',
        text:    'var(--gray-12)',
        subtext: 'var(--gray-11)',
    },
};

const TYPE_ICON: Record<ToastType, React.ReactNode> = {
    success: <CheckCircledIcon width={16} height={16} />,
    error:   <CrossCircledIcon width={16} height={16} />,
    warning: <ExclamationTriangleIcon width={16} height={16} />,
    info:    <InfoCircledIcon width={16} height={16} />,
};

// --- Context ---
const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
}

// --- Provider ---
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

    const addToast = React.useCallback((props: Omit<ToastMessage, "id">) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...props, id }]);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const contextValue = React.useMemo(() => ({
        toast:   addToast,
        success: (title: string, description?: string) => addToast({ title, description, type: "success" }),
        error:   (title: string, description?: string) => addToast({ title, description, type: "error" }),
        info:    (title: string, description?: string) => addToast({ title, description, type: "info" }),
        warning: (title: string, description?: string) => addToast({ title, description, type: "warning" }),
    }), [addToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}
                {toasts.map(({ id, title, description, type = "info", duration }) => (
                    <Toast
                        key={id}
                        id={id}
                        title={title}
                        description={description}
                        type={type}
                        duration={duration}
                        onOpenChange={(open) => { if (!open) removeToast(id); }}
                    />
                ))}
                <ToastPrimitive.Viewport
                    style={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        width: 380,
                        maxWidth: 'calc(100vw - 32px)',
                        outline: 'none',
                    }}
                />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
}

// --- Toast ---
type ToastProps = Omit<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>, "type" | "title"> & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    type?: ToastType;
};

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
    ({ title, description, type = "info", ...props }, ref) => {
        const s = TYPE_STYLES[type];
        return (
            <ToastPrimitive.Root
                ref={ref}
                style={{
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderRadius: 'var(--radius-3)',
                    padding: '12px 14px',
                    boxShadow: 'var(--shadow-3)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    boxSizing: 'border-box',
                    color: s.text,
                }}
                className="data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
                {...props}
            >
                {/* Icon */}
                <span style={{ marginTop: 1, flexShrink: 0, color: s.subtext }}>{TYPE_ICON[type]}</span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {title && (
                        <ToastPrimitive.Title style={{ fontSize: 13, fontWeight: 600, lineHeight: '20px', color: s.text }}>
                            {title}
                        </ToastPrimitive.Title>
                    )}
                    {description && (
                        <ToastPrimitive.Description style={{ fontSize: 13, lineHeight: '18px', color: s.subtext, marginTop: title ? 2 : 0 }}>
                            {description}
                        </ToastPrimitive.Description>
                    )}
                </div>

                {/* Close */}
                <ToastPrimitive.Close
                    style={{
                        flexShrink: 0,
                        marginTop: 1,
                        padding: 2,
                        borderRadius: 'var(--radius-1)',
                        color: s.subtext,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        lineHeight: 0,
                    }}
                    aria-label="Close"
                >
                    <Cross2Icon width={14} height={14} />
                </ToastPrimitive.Close>
            </ToastPrimitive.Root>
        );
    }
);
Toast.displayName = "Toast";
