import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/verify',
    '/privacy',
    '/terms',
    '/api/auth',
    '/api/public',
    '/api/waitlist',
    '/api/webhooks',
    '/api/cron',
    '/invite',
    '/api/invitations',
    '/monitoring',
    '/icon-light.png',
    '/icon-dark.png',
    '/apple-icon.png'
  ];

  
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for session cookie (handle secure prefixes)
  const sessionToken = request.cookies.get('better-auth.session_token') || 
                      request.cookies.get('__Secure-better-auth.session_token');
  
  if (!sessionToken) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Redirect to signup if not authenticated. Acquisition-first: a cold visitor
    // (or someone following a shared link) should land on the conversion-optimized
    // page; the signup form has a "Sign in" link for returning users.
    const signupUrl = new URL('/signup', request.url);
    signupUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(signupUrl);
  }

  // CSRF protection: reject cross-origin state-changing requests.
  // Only checks when Origin header is present (browsers always send it on
  // cross-origin requests). Same-origin requests without Origin are safe
  // because SameSite cookies prevent cross-site cookie attachment.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const allowedOrigin = new URL(appUrl).origin;
      if (origin !== allowedOrigin) {
        return NextResponse.json(
          { error: 'Forbidden: cross-origin request' },
          { status: 403 }
        );
      }
    }

    // Admin support-mode write gate: when an app admin is viewing a customer
    // space (support-space-id cookie set), block customer-facing mutations
    // until they explicitly enable write mode. /api/admin/* is exempt because
    // those routes have their own role check and are deliberate admin actions
    // (extend trial, lock space, etc.) that shouldn't be gated by support mode.
    const supportSpaceId = request.cookies.get('support-space-id')?.value;
    const writeSpaceId = request.cookies.get('support-write-space-id')?.value;
    const isAdminRoute = pathname.startsWith('/api/admin/');
    if (supportSpaceId && writeSpaceId !== supportSpaceId && !isAdminRoute) {
      return NextResponse.json(
        {
          error: 'SUPPORT_READ_ONLY',
          message: 'Support mode is read-only. Enable write mode in the banner to mutate.',
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
