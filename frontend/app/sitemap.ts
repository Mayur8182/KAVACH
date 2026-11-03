import { MetadataRoute } from 'next';

/**
 * Authoritative Canonical XML Sitemap Generator
 * Strictly conforms to:
 * - SEO Rule 4: Accurate, verified public URLs only.
 * - Zero private platform routes exposed in sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kavachsecurity.me';
  const currentDate = new Date().toISOString();

  const publicRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/products', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/products/code', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/products/cloud', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/products/attack', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/products/protect', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/products/agent', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/products/data', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/products/graph', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/solutions', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/docs', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/enterprise', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/governance', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/demo', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/poc', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/resources', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
