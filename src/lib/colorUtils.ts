import { Vibrant } from 'node-vibrant/node';

type ColorResult = { vibrant: string | null; darkVibrant: string | null };

const EMPTY: ColorResult = { vibrant: null, darkVibrant: null };

/**
 * Extracts dominant brand colors from an image.
 *
 * Accepts either a Buffer (scraped bytes — preferred) or a string. Strings
 * must be an absolute http(s) URL or a filesystem path; self-ref API paths
 * like `/api/card/logo/...` are not resolvable here, so pass the bytes instead.
 */
export async function extractBrandColor(source: Buffer | string | null | undefined): Promise<ColorResult> {
    if (!source) return EMPTY;

    try {
        // Buffer path — Vibrant's Node adapter accepts Buffer directly.
        if (Buffer.isBuffer(source)) {
            const palette = await Vibrant.from(source).getPalette();
            return {
                vibrant: palette.Vibrant?.hex || null,
                darkVibrant: palette.DarkVibrant?.hex || null,
            };
        }

        // Reject self-ref API paths — caller should pass bytes instead.
        if (source.startsWith('/api/')) return EMPTY;

        let imageSource = source;
        if (source.startsWith('/')) {
            const path = await import('path');
            imageSource = path.join(process.cwd(), 'public', source);
        }

        const palette = await Vibrant.from(imageSource).getPalette();
        return {
            vibrant: palette.Vibrant?.hex || null,
            darkVibrant: palette.DarkVibrant?.hex || null,
        };
    } catch (error) {
        console.error('Error extracting brand color:', error);
        return EMPTY;
    }
}
