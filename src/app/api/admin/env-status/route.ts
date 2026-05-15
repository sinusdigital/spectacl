import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { isSelfHosted } from '@/lib/mode';

interface EnvVar {
    set: boolean;
    description: string;
}

export type EnvGroup = Record<string, EnvVar>;
export type EnvStatusResponse = Record<string, EnvGroup>;

export async function GET() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const env = (key: string, description: string): EnvVar => ({
        set: !!process.env[key],
        description,
    });

    const selfHosted = isSelfHosted();
    const modeMismatch = !!process.env.MOLLIE_API_KEY && selfHosted;

    const status: EnvStatusResponse = {
        deployment: {
            NEXT_PUBLIC_SPECTACL_MODE: {
                set: !!process.env.NEXT_PUBLIC_SPECTACL_MODE,
                description: selfHosted
                    ? 'Self-hosted mode (unlimited, no billing)'
                    : 'Cloud mode (billing & plan limits enabled)',
            },
            ...(modeMismatch ? {
                MODE_MISMATCH_WARNING: {
                    set: false,
                    description: '⚠️ MOLLIE_API_KEY is set but mode is not "cloud" — billing enforcement is DISABLED',
                },
            } : {}),
        },
        llm: {
            OPENAI_API_KEY:    env('OPENAI_API_KEY', 'OpenAI GPT models'),
            ANTHROPIC_API_KEY: env('ANTHROPIC_API_KEY', 'Anthropic Claude models'),
            GOOGLE_API_KEY:    env('GOOGLE_API_KEY', 'Google Gemini models'),
            MISTRAL_API_KEY:   env('MISTRAL_API_KEY', 'Mistral AI models'),
        },
        payments: {
            MOLLIE_API_KEY:      env('MOLLIE_API_KEY', 'Mollie payment provider (test_ or live_)'),
            MOLLIE_WEBHOOK_URL:  env('MOLLIE_WEBHOOK_URL', 'Webhook URL override (auto-derived if unset)'),
            CRON_SECRET:         env('CRON_SECRET', 'Auth token for /api/cron endpoint'),
        },
        app: {
            NEXT_PUBLIC_APP_URL: env('NEXT_PUBLIC_APP_URL', 'Public app URL (e.g. https://app.spectacl.org)'),
            DATABASE_URL:        env('DATABASE_URL', 'PostgreSQL connection string'),
            REDIS_URL:           env('REDIS_URL', 'Redis for BullMQ, caching, rate limiting'),
            BETTER_AUTH_SECRET:  env('BETTER_AUTH_SECRET', 'Auth session encryption secret'),
            RESEND_API_KEY:      env('RESEND_API_KEY', 'Resend email provider (domain: mail.spectacl.org)'),
        },
        auth: {
            GOOGLE_CLIENT_ID:     env('GOOGLE_CLIENT_ID', 'Google OAuth client ID for SSO'),
            GOOGLE_CLIENT_SECRET: env('GOOGLE_CLIENT_SECRET', 'Google OAuth client secret'),
        },
        optional: {
            SENTRY_AUTH_TOKEN:     env('SENTRY_AUTH_TOKEN', 'Sentry source map upload (not yet configured)'),
            INTERNAL_API_SECRET:   env('INTERNAL_API_SECRET', 'Internal API auth for worker revalidation'),
            BETTER_AUTH_URL:       env('BETTER_AUTH_URL', 'Auth base URL (defaults to localhost:3000)'),
        },
    };

    return NextResponse.json(status);
}
