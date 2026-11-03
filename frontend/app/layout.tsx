import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import 'goey-toast/styles.css';
import { CookieConsentBanner } from '@/components/common/CookieConsentBanner';
import { AgentationDevTool } from '@/components/dev/AgentationDevTool';
import { ToastProvider } from '@/components/providers/ToastProvider';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seculayer.io';

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Kavach — Autonomous Security Engineer & Deterministic Defense',
    template: '%s | Kavach',
  },
  description:
    'Kavach investigates security issues across your code and cloud, proposes fixes, and verifies remediation. Real static analysis, runtime eBPF, and OPA policy enforcement.',
  applicationName: 'Kavach Control Plane',
  authors: [{ name: 'Kavach Security Engineering' }],
  generator: 'Next.js',
  keywords: [
    'application security',
    'autonomous security engineer',
    'cloud security posture management',
    'CSPM',
    'SAST',
    'DAST',
    'SCA',
    'eBPF runtime security',
    'Open Policy Agent',
    'OPA Rego',
    'AI agent security',
    'Model Context Protocol',
    'MCP Gateway',
    'SLSA Level 3',
    'continuous security',
  ],
  alternates: {
    canonical: './',
  },
  openGraph: {
    title: 'Kavach — Autonomous Security Engineer & Deterministic Defense',
    description:
      'Kavach investigates security issues across your code and cloud, proposes fixes, and verifies remediation. Real static analysis, runtime eBPF, and OPA policy enforcement.',
    url: baseUrl,
    siteName: 'Kavach',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kavach — Autonomous Security Engineer & Deterministic Defense',
    description:
      'Deterministic security control plane for code, cloud infrastructure, and autonomous AI agents.',
    creator: '@kavach',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/kavach-cube.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/kavach-cube.png',
    apple: '/kavach-cube.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="icon" href="/kavach-cube.png" type="image/png" />
        <link rel="shortcut icon" href="/kavach-cube.png" />
        <link rel="apple-touch-icon" href="/kavach-cube.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ToastProvider />
        {children}
        <CookieConsentBanner />
        <AgentationDevTool />
      </body>
    </html>
  );
}
