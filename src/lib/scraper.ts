import * as cheerio from 'cheerio';
import { safeFetch } from './url-guard';

/**
 * Fetch a website and return its visible text content (script/style stripped).
 * Outbound fetch goes through `safeFetch` for SSRF protection.
 */
export async function scrapeWebsiteContent(url: string): Promise<string> {
    try {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        const response = await safeFetch(url, {
            timeoutMs: 10000,
            headers: {
                'User-Agent': 'Spectacl-Bot/1.0 (AI Visibility Tracker)',
            },
        });

        if (!response.ok) {
            console.error(`Status ${response.status} fetching website`);
            return '';
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        $('script, style, noscript, template').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        return text.slice(0, 15000);
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}
