import * as dns from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

/**
 * SSRF guard for outbound HTTP fetches against user-controlled URLs.
 *
 * `safeFetch` validates that the target hostname does not resolve to any
 * private, loopback, link-local, multicast, or otherwise reserved IP range
 * before issuing the request, and re-validates on every redirect hop. Use
 * it anywhere we follow a URL that originated from user input (entity URL,
 * domain registry, scraped link/href, OG image, etc.).
 */

const BLOCKED_RANGES = new Set([
    'unspecified',     // 0.0.0.0, ::
    'broadcast',       // 255.255.255.255
    'multicast',       // 224.0.0.0/4, ff00::/8
    'linkLocal',       // 169.254.0.0/16, fe80::/10  (cloud metadata!)
    'loopback',        // 127.0.0.0/8, ::1
    'uniqueLocal',     // fc00::/7
    'private',         // 10.x, 172.16-31.x, 192.168.x, fd00::
    'reserved',        // 240.0.0.0/4, etc
    'benchmarking',    // 198.18.0.0/15
    'carrierGradeNat', // 100.64.0.0/10
]);

function isBlockedIp(ip: string): boolean {
    if (!isIP(ip)) return true;
    try {
        return BLOCKED_RANGES.has(ipaddr.parse(ip).range());
    } catch {
        return true;
    }
}

async function assertHostnameSafe(hostname: string): Promise<void> {
    if (isIP(hostname)) {
        if (isBlockedIp(hostname)) {
            throw new Error('Refused: target IP is in a blocked range');
        }
        return;
    }
    let addrs: Array<{ address: string; family: number }>;
    try {
        addrs = await dns.lookup(hostname, { all: true });
    } catch {
        throw new Error('Refused: DNS lookup failed');
    }
    if (addrs.length === 0) {
        throw new Error('Refused: hostname has no DNS records');
    }
    for (const a of addrs) {
        if (isBlockedIp(a.address)) {
            throw new Error('Refused: hostname resolves to a blocked IP range');
        }
    }
}

export interface SafeFetchOptions {
    timeoutMs?: number;
    headers?: Record<string, string>;
    maxRedirects?: number;
    method?: string;
    body?: BodyInit;
}

/**
 * Fetch a URL with SSRF protection. Validates hostname → IP at every hop,
 * follows redirects manually, and aborts after `timeoutMs` total.
 */
export async function safeFetch(
    rawUrl: string,
    opts: SafeFetchOptions = {},
): Promise<Response> {
    const { timeoutMs = 10000, headers = {}, maxRedirects = 5, method = 'GET', body } = opts;
    let currentUrl = rawUrl;
    let redirects = 0;
    const start = Date.now();

    while (true) {
        let url: URL;
        try {
            url = new URL(currentUrl);
        } catch {
            throw new Error('Refused: invalid URL');
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Refused: non-HTTP(S) protocol');
        }
        await assertHostnameSafe(url.hostname);

        const remaining = timeoutMs - (Date.now() - start);
        if (remaining <= 0) throw new Error('safeFetch: timeout exceeded');

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), remaining);
        let response: Response;
        try {
            response = await fetch(currentUrl, {
                method,
                headers,
                body,
                signal: controller.signal,
                redirect: 'manual',
            });
        } finally {
            clearTimeout(timer);
        }

        if (response.status >= 300 && response.status < 400) {
            const loc = response.headers.get('location');
            if (!loc) return response;
            if (redirects >= maxRedirects) {
                throw new Error('safeFetch: too many redirects');
            }
            redirects++;
            try {
                currentUrl = new URL(loc, currentUrl).toString();
            } catch {
                throw new Error('Refused: invalid redirect location');
            }
            continue;
        }
        return response;
    }
}
