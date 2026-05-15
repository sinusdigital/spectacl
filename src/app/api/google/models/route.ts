import { NextResponse } from 'next/server';
import https from 'https';

interface SimpleResponse {
    ok: boolean;
    status: number | undefined;
    statusText: string | undefined;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
}

function fetchWithHttps(url: string): Promise<SimpleResponse> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { family: 4 }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: !!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    json: async () => JSON.parse(data),
                    text: async () => data
                });
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

export async function POST(req: Request) {
    try {
        const { apiKey } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: "API Key required" }, { status: 400 });
        }

        console.log("[Google] Listing models using provided API Key (via https)...");
        // const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const response = await fetchWithHttps(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Google] Error fetching models:", response.status, errorText);

            let errorMsg = response.statusText;
            try {
                const json = JSON.parse(errorText);
                if (json.error && json.error.message) errorMsg = json.error.message;
            } catch (e) { }

            return NextResponse.json(
                { error: errorMsg },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        const err = error as { message?: string; cause?: unknown; code?: string; stack?: string };
        console.error("[Google] Server Error Details:", {
            message: err.message,
            cause: err.cause,
            code: err.code,
            stack: err.stack
        });
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}
