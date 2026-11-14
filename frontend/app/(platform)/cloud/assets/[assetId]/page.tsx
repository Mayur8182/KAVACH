'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CloudAssetDetailRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cloud?view=as');
  }, [router]);
  return null;
}
