'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

function ResultsRedirectInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scanId = params?.scanId as string;
  const tab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    if (scanId) {
      router.replace(`/api-security/scans/${scanId}?tab=${tab}`);
    }
  }, [scanId, tab, router]);

  return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
      Loading scan results...
    </div>
  );
}

export default function ResultsRedirectPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Redirecting to scan details...</div>}>
      <ResultsRedirectInner />
    </Suspense>
  );
}
