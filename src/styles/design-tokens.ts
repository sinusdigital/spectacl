/**
 * Shared UI design tokens for consistent styling across the application.
 * Using these constants ensures that changes to branding or UI patterns 
 * can be managed from a single source of truth.
 */

export const TYPOGRAPHY = {
    // Radix UI Themes sizing scale mapping:
    // size 1 = 11px
    // size 2 = 12px
    // size 3 = 14px
    SECTION_LABEL: {
        modal: {
            size: "1" as const,
            color: "gray" as const,
            weight: "bold" as const,
            className: "uppercase tracking-wider",
        },
        card: {
            size: "1" as const,
            color: "gray" as const,
            weight: "bold" as const,
            className: "uppercase tracking-wider opacity-80",
        },
        default: {
            size: "3" as const,
            color: undefined,
            weight: "bold" as const,
            className: "mb-3",
        }
    }
} as const;

export const LAYOUT = {
    MODAL_CONTENT_HEIGHT: "70vh",
} as const;
