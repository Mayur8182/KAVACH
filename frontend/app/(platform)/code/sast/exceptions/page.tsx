'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function SASTExceptionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/code/sast/rules?tab=exceptions');
  }, [router]);

  return (
    <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
      <div style={{ fontSize: '13px', fontWeight: 500 }}>Redirecting to Rules & Policies (Risk Exceptions)...</div>
    </div>
  );
}
