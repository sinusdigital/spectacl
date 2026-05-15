/**
 * Subtle accent-tinted gradient inspired by radix-ui.com/colors/custom.
 * Uses Radix color tokens so it auto-adapts to light/dark mode.
 * Render as the first child of a position:relative container.
 */
export default function BackgroundGlow() {
    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 480,
                opacity: 0.6,
                background: 'linear-gradient(to bottom, var(--accent-4), transparent)',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}
