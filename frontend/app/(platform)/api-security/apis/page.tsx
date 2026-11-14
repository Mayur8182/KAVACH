'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApiCatalogRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/api-security/inventory');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 text-xs font-medium">
      Redirecting to API Inventory &amp; Discovery...
    </div>
  );
}
