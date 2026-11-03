import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Solutions by Industry & Architecture',
  description:
    'Tailored security patterns for FinTech, healthcare, cloud-native engineering teams, and enterprises adopting autonomous AI agents with strict compliance.',
  alternates: {
    canonical: '/solutions',
  },
  openGraph: {
    title: 'SecuLayer Security Solutions',
    description:
      'Security architectures for high-growth startups, regulated finance, and multi-cloud enterprises.',
    url: 'https://seculayer.io/solutions',
  },
};

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
