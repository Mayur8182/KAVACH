import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Engineering Resources & Research',
  description:
    'Deep dives, whitepapers, benchmarks, and threat intelligence on cloud vulnerabilities, eBPF telemetry, and AI agent prompt injection defense.',
  alternates: {
    canonical: '/resources',
  },
  openGraph: {
    title: 'SecuLayer Security Engineering Resources',
    description:
      'Research papers, compliance checklists, and technical blueprints for modern security engineering teams.',
    url: 'https://seculayer.io/resources',
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
