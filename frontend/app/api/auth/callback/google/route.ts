import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback Route Handler: /api/auth/callback/google
 *
 * Catches OAuth redirects sent to /api/auth/callback/google and seamlessly
 * forwards them to the client callback handler at /auth/callback/google with
 * all query parameters (code, state, error, etc.) preserved.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = new URL('/auth/callback/google', url.origin);
  targetUrl.search = url.search;

  return NextResponse.redirect(targetUrl);
}

