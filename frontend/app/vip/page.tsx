'use client';

/**
 * /vip — Alias route for VIP Direct Access
 * Supports:
 * - https://yourdomain.com/vip?pass=aikido
 * - https://yourdomain.com/vip
 */

import React, { Suspense } from 'react';
import VipDirectAccessPage from '../access/[slug]/page';

export default function VipPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#090D16' }} />}>
      <VipDirectAccessPage />
    </Suspense>
  );
}

