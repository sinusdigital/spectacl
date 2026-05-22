/**
 * Logo utilities.
 *
 * Source of truth: scraped bytes stored in `Domain.logoBytes`, served via
 * `/api/card/logo/{domain}`. The route always returns a 200 with image
 * bytes — never a redirect to a third-party host — so the client only
 * ever talks to our origin and CSP only needs `img-src 'self' data:`.
 *
 * Resolution chain (server-side, all bytes proxied through Hetzner):
 *   1. `Domain.logoBytes` (scraped apple-touch-icon, persisted)
 *   2. DuckDuckGo `ip3` fetch (1.5s timeout) — preferred when present
 *      because the icons are curated and consistently sized; 404s fast
 *      for long-tail domains it hasn't cached.
 *   3. Google S2 fetch (3s timeout) — always returns *something*, so it
 *      acts as the universal safety net.
 *   Bytes from #2/#3 are persisted on success so the next request is #1.
 *   4. Generated SVG initial-letter placeholder.
 */

import { prisma } from './prisma';

/**
 * Extract a clean domain (no www, no protocol) from a URL or domain string.
 */
export function extractDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        if (!url.includes('://')) {
            return url.replace(/^www\./, '').split('/')[0];
        }
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

/**
 * Google S2 favicon service — fetches on demand, works for any domain.
 */
export function googleFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

/**
 * Self-referenced path served by `/api/card/logo/[domain]` — the route decides
 * whether to return scraped bytes or redirect to a third-party fallback.
 */
export function logoProxyPath(domain: string): string {
    return `/api/card/logo/${encodeURIComponent(domain)}`;
}

/**
 * Scrape the real logo for a domain and persist the bytes in the DB.
 * Safe to call fire-and-forget: it swallows all errors and simply leaves
 * `logoBytes` null if scraping fails, so the API route keeps falling through
 * to third-party favicon services.
 *
 * Updates `lastChecked` on every attempt to throttle future scrapes.
 */
export async function scrapeAndStoreLogo(domain: string): Promise<boolean> {
    const clean = extractDomain(domain);
    if (!clean) return false;

    try {
        const { scrapeLogo } = await import('./logoScraper');
        const buffer = await scrapeLogo(clean);

        await prisma.domain.upsert({
            where: { domain: clean },
            update: {
                ...(buffer ? { logoBytes: buffer, logoMimeType: 'image/png' } : {}),
                lastChecked: new Date(),
                updatedAt: new Date(),
            },
            create: {
                domain: clean,
                logoUrl: logoProxyPath(clean),
                logoBytes: buffer ?? null,
                logoMimeType: buffer ? 'image/png' : null,
                lastChecked: new Date(),
            },
        });

        return buffer !== null;
    } catch (error) {
        console.error('[Logo] Scrape/persist failed for domain:', clean, error);
        return false;
    }
}

/**
 * Returns the self-ref proxy path for a domain, upserting the Domain row so
 * future dashboard queries see it. The actual bytes are fetched lazily by the
 * API route on first request.
 *
 * Kept async for API compatibility with the previous implementation.
 */
export async function downloadAndSaveLogo(domain: string | null | undefined): Promise<string | null> {
    const clean = extractDomain(domain);
    if (!clean) return null;

    const proxyPath = logoProxyPath(clean);

    try {
        await prisma.domain.upsert({
            where: { domain: clean },
            update: { logoUrl: proxyPath, updatedAt: new Date() },
            create: { domain: clean, logoUrl: proxyPath, lastChecked: new Date(0) },
        });
    } catch (error) {
        console.error('[Logo] DB error for domain:', clean, error);
    }

    return proxyPath;
}

/** Alias kept for backward compatibility. */
export async function fetchLogoUrl(domain: string | null | undefined): Promise<string | null> {
    return downloadAndSaveLogo(domain);
}

/** Synchronous helper — returns cached value or null (no fetch). */
export function getLogoUrl(_website: string | null | undefined, cachedLogoUrl: string | null | undefined): string | null {
    return cachedLogoUrl ?? null;
}

// ── Server-side resolution (used by /api/card/logo/[domain]) ──────────────────

const DDG_TIMEOUT_MS = 1500;
const GOOGLE_S2_TIMEOUT_MS = 3000;
const FAVICON_MIN_BYTES = 100; // anything smaller is almost certainly a 1x1 / empty response

interface FetchedFavicon {
    bytes: Buffer;
    mime: string;
}

async function fetchFaviconBytes(url: string, timeoutMs: number): Promise<FetchedFavicon | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!contentType.startsWith('image/')) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < FAVICON_MIN_BYTES) return null;
        return { bytes: buf, mime: contentType.split(';')[0].trim() };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * DuckDuckGo `ip3` favicon endpoint. Curated icons, consistently sized,
 * but 404s for domains DDG hasn't cached — so this is the *preferred*
 * source for known domains, with Google S2 as the long-tail safety net.
 */
export async function fetchDDGBytes(domain: string): Promise<FetchedFavicon | null> {
    const url = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    return fetchFaviconBytes(url, DDG_TIMEOUT_MS);
}

/**
 * Google S2 favicon service. Always returns *something* (a generic globe
 * for unknown domains), so this is the universal fallback after DDG.
 */
export async function fetchGoogleS2Bytes(domain: string): Promise<FetchedFavicon | null> {
    return fetchFaviconBytes(googleFaviconUrl(domain), GOOGLE_S2_TIMEOUT_MS);
}

/**
 * Resolves logo bytes for a domain. Always tries the DB first; falls
 * through to a server-side Google S2 fetch and persists the result so
 * the next request is a cache hit. Returns null only if both the DB and
 * Google are empty — callers should fall back to a generated placeholder.
 *
 * The apple-touch-icon scraper can still overwrite these bytes later
 * (it only writes when it actually finds a higher-quality icon), so the
 * Google fallback is treated as a baseline, not a final answer.
 */
export async function getOrFetchLogoBytes(
    domain: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
    const clean = extractDomain(domain);
    if (!clean) return null;

    const record = await prisma.domain.findUnique({
        where: { domain: clean },
        select: { logoBytes: true, logoMimeType: true },
    });
    if (record?.logoBytes && record.logoBytes.length > 0) {
        return {
            bytes: Buffer.from(record.logoBytes),
            mime: record.logoMimeType || 'image/png',
        };
    }

    // Try DDG first (better quality when it has the domain), then Google
    // (universal fallback). Both run server-side so the browser only ever
    // talks to our origin.
    const fetched = (await fetchDDGBytes(clean)) ?? (await fetchGoogleS2Bytes(clean));
    if (fetched) {
        // Persist as a baseline. If the apple-touch-icon scraper later
        // succeeds, it will overwrite this with a higher-res version.
        try {
            await prisma.domain.upsert({
                where: { domain: clean },
                update: {
                    logoBytes: fetched.bytes,
                    logoMimeType: fetched.mime,
                    updatedAt: new Date(),
                },
                create: {
                    domain: clean,
                    logoUrl: logoProxyPath(clean),
                    logoBytes: fetched.bytes,
                    logoMimeType: fetched.mime,
                    lastChecked: new Date(0),
                },
            });
        } catch (err) {
            // Persist failures shouldn't break the response — just log and serve.
            console.error(`[Logo] Failed to persist favicon bytes for ${clean}:`, err);
        }
        return fetched;
    }

    return null;
}

// ── SVG initial-letter placeholder ────────────────────────────────────────────

const PLACEHOLDER_PALETTE = [
    '#1f2937', '#374151', '#4b5563', '#6b7280',
    '#0f766e', '#0e7490', '#1d4ed8', '#6d28d9',
    '#9d174d', '#9f1239', '#a16207', '#3f6212',
];

function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

/**
 * Returns a minimal SVG placeholder — a colored circle with the first
 * letter of the domain. Deterministic per-domain so the same domain
 * always renders the same color across reloads.
 */
export function renderInitialLogoSvg(domain: string): string {
    const clean = extractDomain(domain) || domain || '?';
    const letter = clean.charAt(0).toUpperCase() || '?';
    const color = PLACEHOLDER_PALETTE[hashString(clean) % PLACEHOLDER_PALETTE.length];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">`
        + `<rect width="128" height="128" rx="64" fill="${color}"/>`
        + `<text x="64" y="84" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="64" font-weight="600" fill="#ffffff">${letter}</text>`
        + `</svg>`;
}
