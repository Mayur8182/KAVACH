import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enterprise Security Blueprint & Trust Center',
  description:
    'Enterprise-grade security controls: SOC 2 Type II, SLSA Level 3 supply chain provenance, dedicated VPC enclaves, and customized OPA policy rulesets.',
  alternates: {
    canonical: '/enterprise',
  },
  openGraph: {
    title: 'SecuLayer Enterprise Security Blueprint',
    description:
      'SOC 2 Type II, SLSA Level 3 provenance, and dedicated multi-cloud security architecture for high-compliance engineering orgs.',
    url: 'https://seculayer.io/enterprise',
  },
};

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
