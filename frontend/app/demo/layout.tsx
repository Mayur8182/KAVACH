import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Live Security Sandbox & Demo',
  description:
    'Experience Kavach in action: triage live SAST/SCA findings, inspect eBPF runtime alerts, and simulate MCP agent tool governance without deploying infrastructure.',
  alternates: {
    canonical: '/demo',
  },
  openGraph: {
    title: 'Kavach Interactive Security Demo',
    description:
      'Experience live finding triage, automated remediation diffs, and eBPF guardrails in our sandbox.',
    url: 'https://kavachsecurity.me/demo',
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
