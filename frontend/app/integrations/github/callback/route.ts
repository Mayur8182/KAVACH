import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy-helper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/integrations/github/callback');
}

