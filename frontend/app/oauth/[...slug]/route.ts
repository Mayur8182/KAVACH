import { NextRequest } from 'next/server';
import { handleCorsPreflight, proxyToBackend } from '@/lib/proxy-helper';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> | { slug: string[] } }
) {
  const resolved = await context.params;
  const path = `/oauth/${(resolved?.slug || []).join('/')}`;
  return proxyToBackend(req, path);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> | { slug: string[] } }
) {
  const resolved = await context.params;
  const path = `/oauth/${(resolved?.slug || []).join('/')}`;
  return proxyToBackend(req, path);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> | { slug: string[] } }
) {
  const resolved = await context.params;
  const path = `/oauth/${(resolved?.slug || []).join('/')}`;
  return proxyToBackend(req, path);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> | { slug: string[] } }
) {
  const resolved = await context.params;
  const path = `/oauth/${(resolved?.slug || []).join('/')}`;
  return proxyToBackend(req, path);
}

