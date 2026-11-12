import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Security Team & Responsible Vulnerability Disclosure',
  description:
    'Reach out to Kavach security engineers, request custom enterprise evaluations, or submit vulnerability reports under our responsible disclosure program.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Kavach Security Engineering',
    description:
      'Contact our team for enterprise inquiries, live architectural walkthroughs, and responsible disclosure.',
    url: 'https://kavachsecurity.me/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
