"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persist an open/collapsed flag for an in-page side panel via localStorage.
 *
 * Per-user via browser profile (not per-entity). Server renders as `defaultOpen`
 * so the initial paint is stable; the effect then hydrates from localStorage
 * on mount, which may cause a one-frame flip if the stored state differs. For
 * an ambient helper panel that is an acceptable tradeoff vs. a hydration-mismatch-free
 * approach that blanks the panel on first paint.
 */
export function useSidePanelState(key: string, defaultOpen: boolean = true) {
    const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(key);
            if (stored === null) return;
            // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage; runs once per key
            setIsOpen(stored === "true");
        } catch {
            /* storage disabled — stay on defaultOpen */
        }
    }, [key]);

    const setOpen = useCallback((next: boolean) => {
        setIsOpen(next);
        try {
            window.localStorage.setItem(key, String(next));
        } catch {
            /* storage disabled — session-only */
        }
    }, [key]);

    const toggle = useCallback(() => {
        setOpen(!isOpen);
    }, [isOpen, setOpen]);

    return { isOpen, setOpen, toggle };
}
