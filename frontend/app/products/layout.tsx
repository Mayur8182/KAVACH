import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SecuLayer Products — Unified Workload Defense Suite',
  description:
    'Explore the SecuLayer defense modules: Code Security (SAST/SCA), Cloud Posture (CSPM), Protect (eBPF runtime), Attack Surface (DAST), Agent Governance, and Data Security.',
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: 'SecuLayer Security Products Suite',
    description:
      'Unified security control plane across code, cloud infrastructure, runtime containers, and autonomous AI tools.',
    url: 'https://kavachsecurity.me/products',
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
