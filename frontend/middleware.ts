import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — Authenticated Routes Protection
 * Protects platform workspaces (/code, /home, /cloud, /attack, /protect, /qa)
 * and redirects unauthenticated requests directly to /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route prefixes
  const protectedPrefixes = [
    '/assistant',
    '/dashboard',
    '/code',
    '/sast',
    '/home',
    '/overview',
    '/projects',
    '/repositories',
    '/findings',
    '/scans',
    '/policies',
    '/integrations',
    '/audit-logs',
    '/security',
    '/cloud',
    '/kubernetes',
    '/ci-cd',
    '/compliance',
    '/attack',
    '/protect',
    '/qa',
    '/settings',
    '/onboarding',
    '/agent',
    '/catalog',
    '/control-plane',
    '/data',
    '/governance',
    '/graph',
    '/intelligence',
    '/invitations',
    '/soc',
    '/account',
    '/superadmin',
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for authentication token in cookies
  const rawToken =
    request.cookies.get('seculayer_auth_token')?.value ||
    request.cookies.get('token')?.value ||
    request.cookies.get('access_token')?.value ||
    request.cookies.get('auth_token')?.value;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  const isExpired = (() => {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = atob(base64);
      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) return false;
      return Date.now() / 1000 >= payload.exp - 5;
    } catch {
      return false;
    }
  })();

  if (!token || token.trim() === '' || token === 'undefined' || token === 'null' || isExpired) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('seculayer_auth_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static, _next/image
     * - favicon, robots, sitemap
     * - login, register, auth
     * - static image and media files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|signup|register|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
