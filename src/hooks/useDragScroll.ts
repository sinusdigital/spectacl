"use client";

import { useCallback, useRef, useState } from 'react';

export interface UseDragScrollReturn<T extends HTMLElement> {
    ref: (el: T | null) => void;
    showLeftFade: boolean;
    showRightFade: boolean;
}

/**
 * Enables click-and-drag horizontal scrolling and tracks scroll fade indicators.
 *
 * Mouse only — touch/pen use the native scroll gesture. Clicks on buttons,
 * links, and inputs inside the scroll container are preserved; a drag that
 * crosses a small movement threshold suppresses the next click so users don't
 * accidentally trigger buttons they were scrolling past.
 *
 * Also reports `showLeftFade` / `showRightFade` based on current scroll position
 * so the caller can render edge fades that hint at more content off-screen.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>(): UseDragScrollReturn<T> {
    const cleanupRef = useRef<(() => void) | null>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    const setRef = useCallback((el: T | null) => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
        if (!el) return;

        const checkFades = () => {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            setShowLeftFade(scrollLeft > 2);
            setShowRightFade(scrollLeft + clientWidth < scrollWidth - 2);
        };

        let isDown = false;
        let startX = 0;
        let startScrollLeft = 0;
        let hasMoved = false;

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return;
            if (e.button !== 0) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest('button, a, input, textarea, select, [role="button"]')) return;

            isDown = true;
            hasMoved = false;
            startX = e.clientX;
            startScrollLeft = el.scrollLeft;
            try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
            el.style.cursor = 'grabbing';
            el.style.userSelect = 'none';
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDown) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 3) hasMoved = true;
            el.scrollLeft = startScrollLeft - dx;
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!isDown) return;
            isDown = false;
            try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
            el.style.cursor = 'grab';
            el.style.userSelect = '';

            if (hasMoved) {
                const suppressClick = (ev: Event) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    el.removeEventListener('click', suppressClick, true);
                };
                el.addEventListener('click', suppressClick, true);
            }
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('scroll', checkFades, { passive: true });
        window.addEventListener('resize', checkFades);

        const ro = new ResizeObserver(checkFades);
        ro.observe(el);
        // Also observe the first child (children wrapper) so fade state updates
        // when cards get added / removed.
        if (el.firstElementChild) ro.observe(el.firstElementChild);

        el.style.cursor = 'grab';
        checkFades();

        cleanupRef.current = () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('scroll', checkFades);
            window.removeEventListener('resize', checkFades);
            ro.disconnect();
            el.style.cursor = '';
            el.style.userSelect = '';
        };
    }, []);

    return { ref: setRef, showLeftFade, showRightFade };
}

/**
 * Computes a mask-image gradient that fades the left / right edges when the
 * scroll can scroll further in that direction. Returns `'none'` when no fade
 * is active so you can assign it directly to a style prop.
 */
export function scrollFadeMask(showLeft: boolean, showRight: boolean, edge = 32): string | undefined {
    if (!showLeft && !showRight) return undefined;
    const a = showLeft ? `${edge}px` : '0';
    const b = showRight ? `calc(100% - ${edge}px)` : '100%';
    return `linear-gradient(to right, transparent 0, black ${a}, black ${b}, transparent 100%)`;
}
