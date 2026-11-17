import { NextRequest } from 'next/server';
import { handleCorsPreflight, proxyToBackend } from '@/lib/proxy-helper';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/mcp');
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/mcp');
}

export async function HEAD(req: NextRequest) {
  return proxyToBackend(req, '/mcp');
}
