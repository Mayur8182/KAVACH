'use client';

import React from 'react';
import { ProductGuard } from '@/components/auth/ProductGuard';

export default function CloudProductLayout({ children }: { children: React.ReactNode }) {
  return <ProductGuard productKey="thing_cloud">{children}</ProductGuard>;
}
