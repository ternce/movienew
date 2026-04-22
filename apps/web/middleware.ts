import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes that require authentication — redirect to /login if no token
 */
const PROTECTED_ROUTES = [
  '/account',
  '/partner',
  '/checkout',
  '/store/checkout',
  '/store/orders',
  '/bonuses',
  '/studio',
];

/**
 * Routes only for unauthenticated users — redirect to / if has token
 */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Check if pathname starts with any of the given prefixes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if user has an auth token.
 * We check the cookie set by the auth store persistence.
 * This is a lightweight check — full JWT validation happens server-side.
 */
function hasAuthToken(request: NextRequest): boolean {
  // Check cookie first (set by Zustand persist middleware)
  const authCookie = request.cookies.get('mp-auth-token');
  if (authCookie?.value) {
    // Lightweight JWT expiry check (decode payload without verification)
    try {
      const payload = JSON.parse(atob(authCookie.value.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired — treat as unauthenticated
        return false;
      }
    } catch {
      // Malformed token — treat as unauthenticated
      return false;
    }
    return true;
  }

  // Fallback: check localStorage-backed cookie
  const storageCookie = request.cookies.get('mp-authenticated');
  if (storageCookie?.value === 'true') return true;

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthenticated = hasAuthToken(request);

  // If not authenticated but stale cookies remain, clear them proactively
  if (!isAuthenticated) {
    const authCookie = request.cookies.get('mp-auth-token');
    const markerCookie = request.cookies.get('mp-authenticated');
    if (authCookie?.value || markerCookie?.value === 'true') {
      const response = NextResponse.next();
      response.cookies.delete('mp-auth-token');
      response.cookies.delete('mp-authenticated');
      return response;
    }
  }

  // Protected routes: redirect to login if not authenticated
  if (matchesRoute(pathname, PROTECTED_ROUTES) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: redirect to home if already authenticated
  if (matchesRoute(pathname, AUTH_ROUTES) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match specific route groups only.
     * Skip: API routes, _next internals, static files, images
     */
    '/account/:path*',
    '/partner/:path*',
    '/checkout',
    '/store/checkout',
    '/store/orders/:path*',
    '/bonuses/:path*',
    '/studio/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
};
