import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing & Enterprise Plans — Continuous Workload Protection',
  description:
    'Transparent security control plane pricing for developer teams and multi-cloud enterprises. Real deterministic OPA gates, eBPF probes, and MCP agent defense.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'SecuLayer Pricing & Enterprise Plans',
    description:
      'Transparent security control plane pricing for developer teams and multi-cloud enterprises. Real deterministic OPA gates, eBPF probes, and MCP agent defense.',
    url: 'https://kavachsecurity.me/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
