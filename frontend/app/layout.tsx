import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import 'goey-toast/styles.css';
import { CookieConsentBanner } from '@/components/common/CookieConsentBanner';
import { AgentationDevTool } from '@/components/dev/AgentationDevTool';
import { ToastProvider } from '@/components/providers/ToastProvider';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kavachsecurity.me';

export const viewport: Viewport = {
  themeColor: '#0F172A',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Kavach Security | #1 Autonomous AI Defense & DevSecOps Platform',
    template: '%s | Kavach Security',
  },
  description:
    'Kavach is an autonomous cybersecurity platform enforcing deterministic OPA policies, AST scanners, and runtime defense. Scan your GitHub repository free today.',
  applicationName: 'Kavach Security Control Plane',
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
    title: 'Kavach Security | #1 Autonomous AI Defense & DevSecOps Platform',
    description:
      'Kavach is an autonomous cybersecurity platform enforcing deterministic OPA policies, AST scanners, and runtime defense. Scan your GitHub repository free today.',
    url: baseUrl,
    siteName: 'Kavach Security',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/kavach-logo-banner.png',
        width: 1200,
        height: 630,
        alt: 'Kavach Security Autonomous Control Plane',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kavach Security | #1 Autonomous AI Defense & DevSecOps Platform',
    description:
      'Deterministic security control plane for code, cloud infrastructure, and autonomous AI agents. Scan your GitHub repository free today.',
    images: ['/kavach-logo-banner.png'],
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
        {/* Machine-extractable Schema.org Structured Data (JSON-LD) for SEO & AI Answer Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://kavachsecurity.me/#organization',
                  name: 'Kavach Security',
                  url: 'https://kavachsecurity.me',
                  logo: 'https://kavachsecurity.me/kavach-logo.png',
                  sameAs: ['https://github.com/Mayur8182/KAVACH'],
                  contactPoint: [
                    {
                      '@type': 'ContactPoint',
                      telephone: '+91-8780378086',
                      contactType: 'customer support',
                      email: 'security@kavachsecurity.me',
                    },
                  ],
                },
                {
                  '@type': 'SoftwareApplication',
                  '@id': 'https://kavachsecurity.me/#software',
                  name: 'Kavach Security Control Plane',
                  applicationCategory: 'SecuritySoftware',
                  operatingSystem: 'All',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                  description:
                    'Autonomous DevSecOps and AI agent security platform with deterministic OPA policy enforcement and runtime defense.',
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '12px',
            zIndex: 9999,
            padding: '8px 16px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
          }}
          onFocus={(e) => {
            e.currentTarget.style.left = '16px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.left = '-9999px';
          }}
        >
          Skip to main content
        </a>
        <ToastProvider />
        {children}
        <CookieConsentBanner />
        <AgentationDevTool />
      </body>
    </html>
  );
}
