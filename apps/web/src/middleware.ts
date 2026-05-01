import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Middleware for route protection.
 *
 * Since the refresh token cookie is set by the API (different origin/port),
 * we can't reliably read it here. Instead, we use a lightweight client-set
 * cookie "tasklane_authed" as a hint. The real auth check happens client-side
 * in the AuthHydrator/useRequireAuth hook.
 */

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

// Protected app routes — unauthenticated users are redirected to /login
const PROTECTED_PATHS = [
  '/dashboard',
  '/projects',
  '/teams',
  '/settings',
  '/notifications',
  '/inbox',
  '/activity',
  '/my-tasks',
  '/standup',
  '/changelog',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthHint = request.cookies.get('tasklane_authed')?.value === '1';

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasAuthHint ? '/dashboard' : '/login', request.url));
  }

  // If user does NOT have auth hint and visits a protected route, redirect to login
  if (!hasAuthHint && PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user has auth hint and visits auth pages, redirect to dashboard
  if (hasAuthHint && AUTH_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/dashboard/:path*',
    '/projects/:path*',
    '/teams/:path*',
    '/settings/:path*',
    '/notifications/:path*',
    '/inbox/:path*',
    '/activity/:path*',
    '/my-tasks/:path*',
    '/standup/:path*',
    '/changelog/:path*',
  ],
};
