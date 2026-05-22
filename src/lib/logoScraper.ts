import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { safeFetch } from './url-guard';

/**
 * Robust Logo Scraper
 * Fetches HTML from a user-supplied domain, identifies logo/icon URLs, and
 * downloads/processes the best candidate. All outbound fetches go through
 * `safeFetch` so the domain (or any href the page links to) cannot point at
 * cloud metadata, RFC 1918, or loopback addresses.
 */

const DEFAULT_TIMEOUT = 10000; // 10s
const MIN_IMAGE_SIZE = 16;
const TARGET_SIZE = 128;

// Browser-like headers to avoid basic bot detection
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
};

async function fetchPage(url: string): Promise<Response> {
    return safeFetch(url, { timeoutMs: DEFAULT_TIMEOUT, headers: BROWSER_HEADERS });
}

export async function scrapeLogo(domain: string): Promise<Buffer | null> {
    try {
        const url = `https://${domain}`;
        console.log('[LogoScraper] Fetching HTML for domain');

        // 1. Fetch Main Page
        let response: Response;
        try {
            response = await fetchPage(url);
        } catch {
            console.log('[LogoScraper] HTTPS failed, trying HTTP');
            try {
                response = await fetchPage(`http://${domain}`);
            } catch {
                console.log('[LogoScraper] Failed to connect to domain');
                return await fetchDirectFavicon(domain);
            }
        }

        if (!response.ok) {
            console.log(`[LogoScraper] Failed to fetch page (status ${response.status})`);
            return await fetchDirectFavicon(domain);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 2. Identify Candidates
        // Priority: apple-touch-icon > fluid-icon > icon > shortcut icon
        const candidates = new Set<string>();

        // High resolution icons typically used for iOS
        $('link[rel*="apple-touch-icon"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) candidates.add(href);
        });

        // Modern sizing icons
        $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) candidates.add(href);
        });

        // Add standard fallback paths
        candidates.add('/favicon.ico');
        candidates.add('/apple-touch-icon.png');
        candidates.add('/apple-touch-icon-precomposed.png');

        // 3. Process Candidates
        // Convert Set to Array to iterate
        for (const candidate of Array.from(candidates)) {
            try {
                const absoluteUrl = new URL(candidate, response.url).toString();
                const buffer = await processCandidate(absoluteUrl);
                if (buffer) {
                    console.log('[LogoScraper] Successfully processed logo candidate');
                    return buffer;
                }
            } catch {
                // Ignore errors for individual candidates and continue
            }
        }

        return null;

    } catch (error) {
        console.error('[LogoScraper] Fatal error scraping domain:', error);
        return null;
    }
}

/**
 * Validates and processes a single image candidate
 */
async function processCandidate(url: string): Promise<Buffer | null> {
    try {
        console.log('[LogoScraper] Checking candidate');
        const response = await fetchPage(url);

        if (!response.ok) return null;

        const contentType = response.headers.get('content-type');
        // Loose check to allow for misconfigured servers (some send images as octet-stream)
        // But mainly we want to avoid downloading huge HTML files mistakenly identified as icons
        if (contentType && contentType.includes('text/html')) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate Validation & Processing with Sharp
        const image = sharp(buffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) return null;

        // Skip tiny icons
        if (metadata.width < MIN_IMAGE_SIZE || metadata.height < MIN_IMAGE_SIZE) {
            return null;
        }

        // Resize and normalize
        // We want a square output, containing the logo, on a transparent background
        return await image
            .resize(TARGET_SIZE, TARGET_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toBuffer();

    } catch (error) {
        return null;
    }
}

/**
 * Last resort: Try to fetch favicon.ico directly from root
 */
async function fetchDirectFavicon(domain: string): Promise<Buffer | null> {
    try {
        const url = `https://${domain}/favicon.ico`;
        return await processCandidate(url);
    } catch {
        return null;
    }
}
