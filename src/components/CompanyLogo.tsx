"use client";

import { Avatar } from "@radix-ui/themes";

interface CompanyLogoProps {
    domain?: string | null;
    name: string;
    size?: number;
    className?: string;
    /** Accepted for back-compat. Used only if it's already a self-ref
     *  /api/card/logo/... path; otherwise ignored in favor of `domain`. */
    logoUrl?: string | null;
    radius?: "none" | "small" | "medium" | "large" | "full";
}

const PROXY_PREFIX = "/api/card/logo/";

function cleanDomain(domain: string | null | undefined): string {
    if (!domain) return "";
    return domain.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
}

/**
 * Resolves the image src for the avatar. Single source: our own proxy at
 * `/api/card/logo/{domain}`, which always returns image bytes (DB →
 * server-side Google S2 fallback → SVG initial placeholder). The client
 * never talks to a third party, so CSP only needs `img-src 'self' data:`.
 */
function resolveSrc(domain: string | null | undefined, logoUrl: string | null | undefined): string | undefined {
    const clean = cleanDomain(domain);
    if (clean) return `${PROXY_PREFIX}${encodeURIComponent(clean)}`;
    if (logoUrl && logoUrl.startsWith(PROXY_PREFIX)) return logoUrl;
    return undefined;
}

export default function CompanyLogo({ domain, name, size = 32, className = "", logoUrl, radius = "large" }: CompanyLogoProps) {
    const src = resolveSrc(domain, logoUrl);
    const fallbackInitials = name && typeof name === "string" && name.length > 0
        ? name.charAt(0).toUpperCase()
        : "?";

    return (
        <span
            className={className}
            style={{
                display: "inline-flex",
                background: "white",
                borderRadius: radius === "full" ? "9999px" : radius === "large" ? "var(--radius-3)" : radius === "medium" ? "var(--radius-2)" : radius === "small" ? "var(--radius-1)" : "0",
                flexShrink: 0,
                width: size,
                height: size,
            }}
        >
            <Avatar
                src={src}
                fallback={fallbackInitials}
                size={size <= 24 ? "1" : size <= 32 ? "2" : size < 48 ? "3" : size <= 64 ? "4" : "5"}
                variant="soft"
                color="gray"
                highContrast
                radius={radius}
                style={{ display: "block", width: size, height: size, minWidth: size, minHeight: size }}
            />
        </span>
    );
}
