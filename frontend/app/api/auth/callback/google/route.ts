import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback Route Handler: /api/auth/callback/google
 *
 * Catches OAuth redirects sent to /api/auth/callback/google and seamlessly
 * forwards them to the client callback handler at /auth/callback/google with
 * all query parameters (code, state, error, etc.) preserved.
 *
 * Critical Fix for Cloud / Reverse Proxy Hosting:
 * Inside Render / Linux containers, `request.url` reports the internal bind address
 * `0.0.0.0:10000`. We extract the real public origin from headers (`x-forwarded-host`,
 * `host`) or NEXT_PUBLIC_APP_URL to prevent ERR_ADDRESS_INVALID (0.0.0.0) redirects.
 */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search;

  let host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'kavachsecurity.me';

  // If host contains internal container bind address, resolve to public domain
  if (host.includes('0.0.0.0') || (host.includes('127.0.0.1') && process.env.NODE_ENV === 'production')) {
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kavachsecurity.me';
    try {
      host = new URL(publicUrl).host;
    } catch {
      host = 'kavachsecurity.me';
    }
  }

  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https');

  const destination = `${proto}://${host}/auth/callback/google${search}`;
  return NextResponse.redirect(new URL(destination));
}

