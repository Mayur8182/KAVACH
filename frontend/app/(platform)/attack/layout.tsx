import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thing Attack — Attack Surface, DAST, Pentesting & Verification',
  description:
    'Offensive security workspace: attack surface enumeration, API discovery, DAST, controlled pentesting, multi-hop attack paths, and verifiable proof.',
};

import { ProductGuard } from '@/components/auth/ProductGuard';

export default function AttackLayout({ children }: { children: React.ReactNode }) {
  return <ProductGuard productKey="thing_attack">{children}</ProductGuard>;
}
