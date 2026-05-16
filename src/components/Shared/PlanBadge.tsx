"use client";

import React from "react";
import RadixBadge from "./RadixBadge";
import { Badge } from "@radix-ui/themes";

export type PlanKey = "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE" | "FOUNDER";

interface PlanBadgeProps {
    plan: string | PlanKey;
    size?: React.ComponentPropsWithoutRef<typeof Badge>["size"];
    className?: string;
}

const PLAN_CONFIG: Record<string, { 
    color: React.ComponentPropsWithoutRef<typeof Badge>["color"]; 
    variant: React.ComponentPropsWithoutRef<typeof Badge>["variant"];
    highContrast?: boolean;
}> = {
    STARTER: { color: "lime", variant: "surface" },
    PRO: { color: "lime", variant: "soft" },
    BUSINESS: { color: "gray", variant: "surface" },
    ENTERPRISE: { color: "gray", variant: "solid", highContrast: true },
    FOUNDER: { color: "amber", variant: "solid" },
};

/**
 * Standardized badge for subscription plans.
 * Follows the visual hierarchy established in the upgrade modal.
 */
export default function PlanBadge({ plan, size = "1", className }: PlanBadgeProps) {
    const upperPlan = plan.toUpperCase();
    const config = PLAN_CONFIG[upperPlan] || PLAN_CONFIG.STARTER;

    return (
        <RadixBadge
            color={config.color}
            variant={config.variant}
            size={size}
            highContrast={config.highContrast}
            className={className}
        >
            {upperPlan}
        </RadixBadge>
    );
}
