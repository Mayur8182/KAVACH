'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RemediationRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/code/autofix');
  }, [router]);

  return null;
}
