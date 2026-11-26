import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import 'goey-toast/styles.css';
import { CookieConsentBanner } from '@/components/common/CookieConsentBanner';
import { AgentationDevTool } from '@/components/dev/AgentationDevTool';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { GoogleOneTap } from '@/components/auth/GoogleOneTap';
import { CrispChat } from '@/components/common/CrispChat';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kavachsecurity.me';

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  colorScheme: 'light',
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
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kavach Security — Autonomous Security for Code, Cloud & AI Agents',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Kavach_Secure',
    creator: '@Kavach_Secure',
    title: 'Kavach Security | #1 Autonomous AI Defense & DevSecOps Platform',
    description:
      'Deterministic security control plane for code, cloud infrastructure, and autonomous AI agents. Scan your GitHub repository free today.',
    images: [
      {
        url: `${baseUrl}/twitter-card.png`,
        width: 1200,
        height: 630,
        alt: 'Kavach Security — Autonomous Security for Code, Cloud & AI Agents',
      },
    ],
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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-next-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-next-mono',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
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
                  sameAs: [
                    'https://x.com/Kavach_Secure',
                    'https://www.linkedin.com/in/mayurbharvad/',
                    'https://github.com/Mayur8182/KAVACH',
                  ],
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
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-md focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
        <ToastProvider />
        <GoogleAnalytics />
        <GoogleOneTap />
        {children}
        <CookieConsentBanner />
        <AgentationDevTool />
        <CrispChat />
      </body>
    </html>
  );
}
