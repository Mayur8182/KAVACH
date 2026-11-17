import { NextRequest } from 'next/server';
import { handleCorsPreflight, proxyToBackend } from '@/lib/proxy-helper';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/sse');
}
