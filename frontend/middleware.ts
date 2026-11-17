import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — Authenticated Routes Protection & Multi-Subdomain Routing
 * Protects platform workspaces (/code, /home, /cloud, /attack, /protect, /qa)
 * and seamlessly routes enterprise subdomains (app, docs, auth, status, support).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostname = host.toLowerCase().split(':')[0];

  // 1. Enterprise Subdomain Routing
  if (hostname.startsWith('docs.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/docs', request.url));
    }
    if (!pathname.startsWith('/docs') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
      return NextResponse.rewrite(new URL(`/docs${pathname}`, request.url));
    }
  }

  if (hostname.startsWith('status.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/status', request.url));
    }
  }

  if (hostname.startsWith('support.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/contact', request.url));
    }
  }

  if (hostname.startsWith('auth.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/login', request.url));
    }
  }

  // Determine effective path for auth check (e.g. app.kavachsecurity.me/ -> /overview)
  let effectivePath = pathname;
  if (hostname.startsWith('app.') && pathname === '/') {
    effectivePath = '/overview';
  }

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
    (prefix) => effectivePath === prefix || effectivePath.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    if (hostname.startsWith('app.') && pathname === '/') {
      return NextResponse.rewrite(new URL('/overview', request.url));
    }
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
    loginUrl.searchParams.set('redirect', effectivePath);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('seculayer_auth_token');
    return response;
  }

  if (hostname.startsWith('app.') && pathname === '/') {
    return NextResponse.rewrite(new URL('/overview', request.url));
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
