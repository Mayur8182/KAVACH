import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proof-of-Concept & Production Evaluation Guide',
  description:
    'Step-by-step enterprise PoC framework: connect your test repository, deploy eBPF kernel probes, and evaluate deterministic OPA gates against your security criteria.',
  alternates: {
    canonical: '/poc',
  },
  openGraph: {
    title: 'SecuLayer Proof-of-Concept Deployment',
    description:
      'Evaluate SecuLayer inside your VPC or cloud account with measurable security benchmarks.',
    url: 'https://seculayer.io/poc',
  },
};

export default function PocLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
