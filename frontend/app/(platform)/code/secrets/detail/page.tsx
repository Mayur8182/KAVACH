'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SecretsDetailIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/code/secrets');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: '#64748B',
        fontSize: '14px',
      }}
    >
      <span>Redirecting to Secrets Inventory...</span>
    </div>
  );
}
