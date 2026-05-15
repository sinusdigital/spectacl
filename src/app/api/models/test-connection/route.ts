
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, modelId } = body;

        if (!provider || !apiKey) {
            return NextResponse.json(
                { error: "Provider and API Key are required" },
                { status: 400 }
            );
        }

        let success = false;
        const message = "Connection successful";

        switch (provider.toLowerCase()) {
            case 'openai':
                // Check OpenAI Connection by listing models
                const openaiRes = await fetch("https://api.openai.com/v1/models", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`
                    }
                });

                if (openaiRes.ok) {
                    success = true;
                } else {
                    const err = await openaiRes.json();
                    throw new Error(err.error?.message || openaiRes.statusText);
                }
                break;

            case 'google':
                // Check Google Connection by listing models
                // Note: Google API key is passed as query param
                const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                    method: "GET"
                });

                if (googleRes.ok) {
                    success = true;
                } else {
                    const err = await googleRes.json();
                    throw new Error(err.error?.message || googleRes.statusText);
                }
                break;

            case 'anthropic':
                // Check Anthropic Connection
                // Using 2023-06-01 version defaults
                const anthropicRes = await fetch("https://api.anthropic.com/v1/models", {
                    method: "GET",
                    headers: {
                        "x-api-key": apiKey,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                });

                if (anthropicRes.ok) {
                    success = true;
                } else {
                    const errText = await anthropicRes.text();
                    let errMsg = errText;
                    try {
                        const json = JSON.parse(errText);
                        errMsg = json.error?.message || errText;
                    } catch (e) { }
                    throw new Error(errMsg);
                }
                break;

            case 'mistral':
                // Check Mistral Connection
                const mistralRes = await fetch("https://api.mistral.ai/v1/models", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                });

                if (mistralRes.ok) {
                    success = true;
                } else {
                    const err = await mistralRes.json();
                    throw new Error(err.message || mistralRes.statusText);
                }
                break;

            default:
                return NextResponse.json(
                    { error: "Unsupported provider" },
                    { status: 400 }
                );
        }

        return NextResponse.json({ success, message });

    } catch (error: unknown) {
        console.error("Test connection failed:", error);
        const message = error instanceof Error ? error.message : "Connection failed";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
