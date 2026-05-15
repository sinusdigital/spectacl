import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    extractDomain,
    getOrFetchLogoBytes,
    logoProxyPath,
    renderInitialLogoSvg,
    scrapeAndStoreLogo,
} from '@/lib/logoUtils';

const SCRAPE_COOLDOWN_MS = 60 * 60 * 1000; // 1h — throttle apple-touch-icon re-scrapes
const BYTES_CACHE_SECONDS = 60 * 60 * 24 * 7; // 7d browser cache for image bytes
const PLACEHOLDER_CACHE_SECONDS = 60 * 60; // 1h cache for the SVG fallback

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ domain: string }> }
) {
    const { domain: rawDomain } = await context.params;
    const domain = extractDomain(rawDomain);

    if (!domain) {
        return new NextResponse('Domain is required', { status: 400 });
    }

    // Kick off the apple-touch-icon scrape in the background if we're past
    // the cooldown. This runs orthogonally to the in-band Google fallback in
    // getOrFetchLogoBytes — the scraper may eventually upgrade those bytes
    // with a higher-res icon, the upsert in scrapeAndStoreLogo only writes
    // when it actually finds something better.
    const cooldownRow = await prisma.domain.findUnique({
        where: { domain },
        select: { lastChecked: true },
    });
    const lastCheckedMs = cooldownRow?.lastChecked?.getTime() ?? 0;
    const coolingDown = Date.now() - lastCheckedMs < SCRAPE_COOLDOWN_MS;
    if (!coolingDown) {
        try {
            await prisma.domain.upsert({
                where: { domain },
                update: { lastChecked: new Date(), updatedAt: new Date() },
                create: {
                    domain,
                    logoUrl: logoProxyPath(domain),
                    lastChecked: new Date(),
                },
            });
        } catch (error) {
            console.error(`[Logo] Failed to claim scrape slot for ${domain}:`, error);
        }
        void scrapeAndStoreLogo(domain);
    }

    // Resolve bytes: DB hit, then in-band Google S2 fetch (which persists on
    // success). Same answer the browser used to get from the redirect, but
    // proxied through us so CSP doesn't need to whitelist anything.
    const resolved = await getOrFetchLogoBytes(domain);

    if (resolved) {
        const body = new Uint8Array(resolved.bytes);
        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': resolved.mime,
                'Cache-Control': `public, max-age=${BYTES_CACHE_SECONDS}`,
            },
        });
    }

    // Last resort: deterministic SVG placeholder so the UI never shows a
    // broken image. Same domain always renders the same letter + color.
    return new NextResponse(renderInitialLogoSvg(domain), {
        status: 200,
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': `public, max-age=${PLACEHOLDER_CACHE_SECONDS}`,
        },
    });
}
