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
    title: 'Kavach Security Engineering Resources',
    description:
      'Research papers, compliance checklists, and technical blueprints for modern security engineering teams.',
    url: 'https://kavachsecurity.me/resources',
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
