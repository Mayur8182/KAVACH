import { NextRequest } from 'next/server';
import { handleCorsPreflight, proxyToBackend } from '@/lib/proxy-helper';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = `/oauth/${(params.slug || []).join('/')}`;
  return proxyToBackend(req, path);
}

export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = `/oauth/${(params.slug || []).join('/')}`;
  return proxyToBackend(req, path);
}
