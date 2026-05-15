
/**
 * Simple utility to fetch website content and strip HTML.
 * Uses native fetch and regex to avoid heavy dependencies for MVP.
 */
export async function scrapeWebsiteContent(url: string): Promise<string> {
    try {
        // Ensure protocol
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Spectacl-Bot/1.0 (AI Visibility Tracker)'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Status ${response.status} fetching ${url}`);
            return "";
        }

        const html = await response.text();

        // Basic clean up
        // 1. Remove Scripts and Styles
        let text = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, " ");
        text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, " ");

        // 2. Remove HTML Tags
        text = text.replace(/<[^>]+>/g, " ");

        // 3. Normalize Whitespace (replace multiple spaces/newlines with single space)
        text = text.replace(/\s+/g, " ").trim();

        // Limit length to avoid token limits (e.g., first 15k chars is usually enough for "Home" or "About")
        return text.slice(0, 15000);
    } catch (error) {
        console.error("Error scraping website:", error);
        return "";
    }
}
