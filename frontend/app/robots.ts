import type { MetadataRoute } from 'next';

/**
 * Production Robots Configuration for Kavach Security
 * Production Domain: https://kavachsecurity.me
 *
 * Rules:
 * - Allows indexing of all public canonical marketing, products, and legal pages
 * - Disallows private platform workspaces, authentication, internal onboarding, and API endpoints
 * - Declares the production XML sitemap
 */

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kavachsecurity.me';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/(platform)/',
          '/assistant',
          '/assistant/',
          '/dashboard',
          '/dashboard/',
          '/code',
          '/code/',
          '/cloud',
          '/cloud/',
          '/attack',
          '/attack/',
          '/protect',
          '/protect/',
          '/qa',
          '/qa/',
          '/superadmin',
          '/superadmin/',
          '/settings',
          '/settings/',
          '/onboarding',
          '/onboarding/',
          '/overview',
          '/overview/',
          '/projects',
          '/projects/',
          '/repositories',
          '/repositories/',
          '/findings',
          '/findings/',
          '/scans',
          '/scans/',
          '/policies',
          '/policies/',
          '/integrations',
          '/integrations/',
          '/audit-logs',
          '/audit-logs/',
          '/login',
          '/signup',
          '/logout',
          '/session-expired',
          '/unauthorized',
          '/account-locked',
          '/account-recovery',
          '/reset-password',
          '/forgot-password',
          '/auth/',
          '/health',
          '/healthz',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
