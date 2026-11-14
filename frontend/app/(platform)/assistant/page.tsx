'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/overview');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Redirecting to Kavach Security Workspace...</span>
    </div>
  );
}
