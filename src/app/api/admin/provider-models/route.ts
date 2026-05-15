import { NextRequest, NextResponse } from 'next/server';

interface OpenAIModel { id: string; context_window?: number }
interface GoogleModel { name: string; displayName?: string; supportedGenerationMethods?: string[]; inputTokenLimit?: number }
interface MistralModel { id: string }
interface AnthropicModel { id: string; display_name?: string; max_input_tokens?: number }
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');

    if (!provider) {
        return NextResponse.json({ error: 'Missing provider parameter' }, { status: 400 });
    }

    try {
        let models: { id: string, displayName: string, contextWindow?: number | null }[] = [];

        if (provider === 'openai') {
            if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API Key is missing on the server');
            
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
            });
            if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
            const data = await res.json();
            
            // OpenAI - only return chat-capable models
            models = data.data
                .filter((m: OpenAIModel) => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3'))
                .sort((a: OpenAIModel, b: OpenAIModel) => a.id.localeCompare(b.id))
                .map((m: OpenAIModel) => ({ id: m.id, displayName: m.id, contextWindow: m.context_window || null }));
        } 
        else if (provider === 'anthropic') {
            if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API Key is missing on the server');
            
            const res = await fetch('https://api.anthropic.com/v1/models', {
                headers: { 
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                }
            });
            if (!res.ok) throw new Error(`Anthropic API error: ${res.statusText}`);
            const data = await res.json();
            
            models = data.data.map((m: AnthropicModel) => ({
                id: m.id,
                displayName: m.display_name || m.id,
                contextWindow: m.max_input_tokens || null,
            }));
        }
        else if (provider === 'google') {
            if (!process.env.GOOGLE_API_KEY) throw new Error('Google API Key is missing on the server');
            
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
            if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);
            const data = await res.json();
            
            // Google - only generative models
            models = data.models
                .filter((m: GoogleModel) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: GoogleModel) => ({ 
                    id: m.name.replace('models/', ''), 
                    displayName: m.displayName || m.name.replace('models/', ''),
                    contextWindow: m.inputTokenLimit || null
                }));
        }
        else if (provider === 'mistral') {
            if (!process.env.MISTRAL_API_KEY) throw new Error('Mistral API Key is missing on the server');
            
            const res = await fetch('https://api.mistral.ai/v1/models', {
                headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` }
            });
            if (!res.ok) throw new Error(`Mistral API error: ${res.statusText}`);
            const data = await res.json();
            
            models = data.data
                .sort((a: MistralModel, b: MistralModel) => a.id.localeCompare(b.id))
                .map((m: MistralModel) => ({ id: m.id, displayName: m.id }));
        } 
        else {
            return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
        }

        return NextResponse.json({ models });
    } catch (err: unknown) {
        console.error(`Failed to fetch models for ${provider}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage || 'Failed to fetch provider models' }, { status: 500 });
    }
}
