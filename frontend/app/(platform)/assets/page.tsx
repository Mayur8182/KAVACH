'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssetsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/repositories');
  }, [router]);

  return null;
}
