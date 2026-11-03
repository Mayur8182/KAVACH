import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Container Security — Kavach Platform',
  description:
    'Comprehensive container security posture: image vulnerability triage, layer secrets, Dockerfile static analysis, and Kubernetes runtime behavioral telemetry.',
};

export default function ContainerSecurityRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
