import { MetadataRoute } from 'next';

/**
 * Authoritative Search Engine Robots Directive
 * Strictly conforms to:
 * - SEO Rule 5: Public pages explicitly allowed for search indexing.
 * - SEO Rule 6: Private authenticated platform consoles strictly disallowed (noindex/nofollow).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seculayer.io';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/products',
          '/products/*',
          '/solutions',
          '/solutions/*',
          '/pricing',
          '/docs',
          '/docs/*',
          '/enterprise',
          '/governance',
          '/demo',
          '/poc',
          '/resources',
          '/contact',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/code',
          '/code/*',
          '/cloud',
          '/cloud/*',
          '/protect',
          '/protect/*',
          '/attack',
          '/attack/*',
          '/soc',
          '/soc/*',
          '/qa',
          '/qa/*',
          '/settings',
          '/settings/*',
          '/account',
          '/account/*',
          '/onboarding',
          '/onboarding/*',
          '/api',
          '/api/*',
          '/logout',
          '/session-expired',
          '/account-locked',
          '/unauthorized',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
