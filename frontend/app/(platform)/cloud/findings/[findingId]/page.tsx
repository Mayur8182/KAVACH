'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CloudFindingDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const findingId = params?.findingId as string;

  useEffect(() => {
    if (findingId) {
      router.replace(`/cloud?view=dt&id=${encodeURIComponent(findingId)}`);
    } else {
      router.replace('/cloud?view=fi');
    }
  }, [router, findingId]);

  return null;
}
