'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CloudRemediationRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cloud?view=fx');
  }, [router]);

  return null;
}
