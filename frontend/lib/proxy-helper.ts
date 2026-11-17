import { NextRequest, NextResponse } from 'next/server';

export function getBackendBaseUrl(): string {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://kavach-backend-3hdm.onrender.com';
  return backend.replace(/\/+$/, '');
}

export function handleCorsPreflight(req: NextRequest): NextResponse {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function proxyToBackend(req: NextRequest, targetPath: string): Promise<NextResponse> {
  const backendBase = getBackendBaseUrl();
  const search = req.nextUrl.search || '';
  const url = `${backendBase}${targetPath}${search}`;
  const origin = req.headers.get('origin') || '*';

  try {
    const headers = new Headers();
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'host' && lower !== 'content-length' && lower !== 'connection') {
        headers.set(key, val);
      }
    });

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

    const backendRes = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    const resHeaders = new Headers();
    backendRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'transfer-encoding' && lower !== 'content-encoding') {
        resHeaders.set(key, val);
      }
    });

    resHeaders.set('Access-Control-Allow-Origin', origin);
    resHeaders.set('Access-Control-Allow-Credentials', 'true');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Proxy forwarding failed', message: error?.message || String(error) }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    );
  }
}
