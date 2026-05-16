"use client";

import React from "react";
import { Badge } from "@radix-ui/themes";

// Maps domain/source type labels to Radix theme color tokens
const TYPE_TO_COLOR: Record<string, React.ComponentPropsWithoutRef<typeof Badge>["color"]> = {
    Own: "green",
    Editorial: "orange",
    UGC: "blue",
    Technical: "gray",
    "E-Commerce": "pink",
    Corporate: "purple",
};

interface RadixBadgeProps {
    /** Pass a domain-type string for automatic color mapping, or use `color` directly */
    type?: string;
    color?: React.ComponentPropsWithoutRef<typeof Badge>["color"];
    variant?: React.ComponentPropsWithoutRef<typeof Badge>["variant"];
    size?: React.ComponentPropsWithoutRef<typeof Badge>["size"];
    highContrast?: boolean;
    children: React.ReactNode;
    className?: string;
}

/**
 * Themed badge for categorical labels (domain types, statuses, etc).
 * Pass `type` for automatic color from the TYPE_TO_COLOR map,
 * or pass `color` directly for full control.
 */
export default function RadixBadge({
    type,
    color,
    variant = "soft",
    size = "1",
    highContrast = false,
    children,
    className,
}: RadixBadgeProps) {
    const resolvedColor = color ?? (type ? TYPE_TO_COLOR[type] : undefined);

    return (
        <Badge
            color={resolvedColor}
            variant={variant}
            size={size}
            highContrast={highContrast}
            className={className}
        >
            {children}
        </Badge>
    );
}
