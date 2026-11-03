import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Code Security & Supply Chain — Kavach Control Plane',
  description:
    'Source code security, SAST, dependency scanning, secrets detection, SBOM, PR security, CI/CD gates, and AI coding-agent security.',
};

import { ProductGuard } from '@/components/auth/ProductGuard';

export default function CodeLayout({ children }: { children: React.ReactNode }) {
  return <ProductGuard productKey="thing_code">{children}</ProductGuard>;
}
