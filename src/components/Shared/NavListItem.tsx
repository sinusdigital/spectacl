import Link from "next/link";
import React from "react";

interface NavListItemBaseProps {
    name: string | React.ReactNode;
    icon?: React.ReactNode;
    /** Right-side slot (e.g. count badge). Stays out of the truncating label flow. */
    trailing?: React.ReactNode;
    isActive: boolean;
    isSubactive?: boolean;
    hasSubItems?: boolean;
    className?: string;
    size?: "sm" | "md";
}

interface NavListItemLinkProps extends NavListItemBaseProps {
    /** Render as a `<Link>`. Mutually exclusive with `onClick`. */
    href: string;
    target?: string;
    onNavigate?: () => void;
    onClick?: never;
}

interface NavListItemButtonProps extends NavListItemBaseProps {
    /** Render as a `<button>`. Mutually exclusive with `href`. */
    onClick: () => void;
    href?: never;
    target?: never;
    onNavigate?: never;
}

type NavListItemProps = NavListItemLinkProps | NavListItemButtonProps;

export default function NavListItem(props: NavListItemProps) {
    const {
        name,
        icon,
        trailing,
        isActive,
        isSubactive,
        hasSubItems,
        className = "",
        size = "md",
    } = props;
    const isMd = size === "md";

    // Active: neutral bg + dark forest green text — selected without bright lime
    // Sub-active: parent of active child — on-path, same text, lighter bg
    // Default: muted text, hover reveals subtle bg
    const stateClasses = isActive
        ? "bg-[var(--gray-a3)] text-[var(--gray-12)] font-medium"
        : isSubactive && hasSubItems
        ? "bg-[var(--gray-a2)] text-[var(--gray-11)] font-medium"
        : "text-[var(--gray-10)] hover:bg-[var(--gray-a3)] hover:text-[var(--gray-12)]";

    const sharedClassName = `flex items-center rounded-lg my-px transition-colors duration-150 ${stateClasses} ${className}`;
    const sharedStyle: React.CSSProperties = {
        gap: "var(--space-2)",
        padding: isMd
            ? "var(--space-2) var(--space-3)"
            : "var(--space-1) var(--space-3)",
        fontSize: isMd ? "var(--font-size-2)" : "var(--font-size-1)",
    };

    const iconOpacity = isActive ? 0.9 : isSubactive && hasSubItems ? 0.7 : 0.5;

    const body = (
        <>
            {icon && (
                <span
                    className="flex-shrink-0"
                    style={{ width: "var(--space-4)", height: "var(--space-4)", opacity: iconOpacity }}
                >
                    {icon}
                </span>
            )}
            <span className="truncate flex-1 min-w-0">{name}</span>
            {trailing != null && (
                <span className="flex-shrink-0" style={{ display: "inline-flex", alignItems: "center" }}>
                    {trailing}
                </span>
            )}
        </>
    );

    if ("href" in props && props.href) {
        return (
            <Link
                href={props.href}
                target={props.target}
                rel={props.target === "_blank" ? "noopener noreferrer" : undefined}
                onClick={() => props.onNavigate?.()}
                className={sharedClassName}
                style={sharedStyle}
            >
                {body}
            </Link>
        );
    }

    // Native <button> with Tailwind preflight handling the bg reset.
    // Why this works: `@import "tailwindcss"` in globals.css ships preflight,
    // which sets `button { background-color: transparent; }` in the `base`
    // cascade layer. The active state's `bg-[var(--gray-a3)]` is a utility
    // (in the `utilities` layer), which always wins over base — so we don't
    // need (and must NOT have) our own `bg-transparent` class fighting it.
    //
    // `fontFamily: inherit` (longhand, not the `font:` shorthand which would
    // also reset font-size) — keeps the page font but leaves font-size to
    // the size prop and font-weight to the active class.
    //
    // `appearance: none` is defensive against any browser quirk that ignores
    // preflight (e.g. focus-ring overlays on some Safari versions).
    return (
        <button
            type="button"
            onClick={(props as NavListItemButtonProps).onClick}
            aria-pressed={isActive}
            className={`${sharedClassName} cursor-pointer w-full text-left`}
            style={{ ...sharedStyle, fontFamily: "inherit", appearance: "none" }}
        >
            {body}
        </button>
    );
}
