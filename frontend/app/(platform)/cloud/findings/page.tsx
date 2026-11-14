'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CloudFindingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cloud?view=fi');
  }, [router]);
  return null;
}
