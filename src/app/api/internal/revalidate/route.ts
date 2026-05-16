import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getCachedPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tag, tags, secret, promptId } = body;

        // Check for secret to secure the API
        if (secret !== process.env.INTERNAL_API_SECRET) {
            return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
        }

        if (!tag && (!tags || !Array.isArray(tags))) {
            return NextResponse.json({ message: 'Tag or Tags array is required' }, { status: 400 });
        }

        const tagsToRevalidate = tags || [tag];

        for (const t of tagsToRevalidate) {
            revalidateTag(t);
            console.log(`[API] Revalidated tag: ${t}`);
        }

        // Proactive Cache Warming
        if (promptId) {
            console.log(`[API] Warming cache for prompt: ${promptId}`);
            // This fetch triggers the unstable_cache function, forcing a re-fetch and cache set
            await getCachedPrompt(promptId);
        }

        return NextResponse.json({ revalidated: true, warmed: !!promptId, now: Date.now() });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ message: 'Error revalidating', error: message }, { status: 500 });
    }
}
