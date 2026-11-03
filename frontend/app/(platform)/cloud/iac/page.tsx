'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CloudIaCSecurityRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/code/iac');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748B' }}>
      Loading Infrastructure as Code (IaC) Security...
    </div>
  );
}
