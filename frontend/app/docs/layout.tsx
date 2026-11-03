import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture & Technical Documentation',
  description:
    'Comprehensive technical guides for SecuLayer control plane: SAST/SCA scanners, eBPF kernel telemetry, OPA Rego policies, and MCP agent gateway.',
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: 'SecuLayer Technical Documentation',
    description:
      'Architecture, API references, CLI integration, and deterministic security guides.',
    url: 'https://kavachsecurity.me/docs',
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
