'use client';

import React from 'react';
import { ProductGuard } from '@/components/auth/ProductGuard';

export default function ProtectProductLayout({ children }: { children: React.ReactNode }) {
  return <ProductGuard productKey="thing_protect">{children}</ProductGuard>;
}
