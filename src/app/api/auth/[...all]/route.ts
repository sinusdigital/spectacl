import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';
import { SystemSettings } from '@/lib/settings';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const handlers = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const isMagicLink = pathname.includes('magic-link/verify');
    const oauthMatch = pathname.match(/\/callback\/([^/]+)$/);
    const isOAuthCallback = !!oauthMatch;

    if (isMagicLink) {
      console.log(`[auth] magic-link verify → token=${request.nextUrl.searchParams.get('token')?.slice(0, 8)}... callbackURL=${request.nextUrl.searchParams.get('callbackURL')}`);
    }
    if (isOAuthCallback) {
      const provider = oauthMatch![1];
      const sp = request.nextUrl.searchParams;
      const cookieNames = request.cookies.getAll().map(c => c.name).filter(n => n.includes('state') || n.includes('oauth') || n.includes('pkce'));
      console.log(`[auth] oauth callback → provider=${provider} hasCode=${sp.has('code')} hasState=${sp.has('state')} hasError=${sp.has('error')} stateCookies=${JSON.stringify(cookieNames)}`);
      if (sp.has('error')) {
        console.error(`[auth] oauth provider error: ${sp.get('error')} description="${sp.get('error_description')}"`);
      }
    }

    const response = await handlers.GET(request);

    if (isMagicLink) {
      console.log(`[auth] magic-link verify result → status=${response.status} location=${response.headers.get('location')}`);
    }
    if (isOAuthCallback) {
      console.log(`[auth] oauth callback result → status=${response.status} location=${response.headers.get('location')?.slice(0, 200)}`);
    }
    return response;
  } catch (error) {
    console.error('========== Better Auth GET Error ==========');
    console.error('Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('==========================================');
    
    return NextResponse.json(
      { 
        error: 'Authentication error', 
        details: error instanceof Error ? error.message : String(error),
        type: error?.constructor?.name 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit all POST auth requests
    const rateLimit = await checkRateLimit(request);
    if (!rateLimit.allowed) {
      console.warn(`[Rate Limit] Auth blocked: ${getClientIp(request)} → ${request.nextUrl.pathname}`);
      return NextResponse.json(
        { code: 'too-many-requests', error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    // Intercept signup requests to enforce signup mode
    if (request.nextUrl.pathname.endsWith('/sign-up/email')) {
      const mode = await SystemSettings.get('signup_mode', 'open');
      if (mode !== 'open') {
        return NextResponse.json(
          { error: 'Signups are currently closed or invite-only.' },
          { status: 403 }
        );
      }
    }

    console.log('[Better Auth] POST request to:', request.url);
    const result = await handlers.POST(request);
    console.log('[Better Auth] POST response status:', result.status);
    return result;
  } catch (error) {
    console.error('========== Better Auth POST Error ==========');
    console.error('URL:', request.url);
    console.error('Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('===========================================');
    
    return NextResponse.json(
      { 
        error: 'Authentication error', 
        details: error instanceof Error ? error.message : String(error),
        type: error?.constructor?.name 
      },
      { status: 500 }
    );
  }
}
