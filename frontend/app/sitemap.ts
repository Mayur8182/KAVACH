import type { MetadataRoute } from 'next';

/**
 * Production-ready XML Sitemap for Kavach Security Control Plane
 * Production Domain: https://kavachsecurity.me
 *
 * Rules & Exclusions:
 * - Excludes private platform workspaces: /(platform)/*, /code/*, /cloud/*, /attack/*, /qa/*, /settings/*, etc.
 * - Excludes authentication-only routes: /login, /signup, /mfa, /verify-email, /logout, /reset-password, /forgot-password, /auth/*
 * - Excludes private onboarding and internal portals: /onboarding/*, /projects/create, /sales/contract, /sales/proposal, etc.
 * - Excludes API routes: /api/*, /health, /healthz
 * - Includes only canonical, publicly accessible marketing, product, and legal pages
 */

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kavachsecurity.me';

export default function sitemap(): MetadataRoute.Sitemap {
  // Use stable ISO timestamp reflecting platform release
  const lastModified = new Date();

  const publicRoutes: MetadataRoute.Sitemap = [
    // -------------------------------------------------------------------------
    // Core Marketing & Conversion Landing
    // -------------------------------------------------------------------------
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/enterprise`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/solutions`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/platform`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/poc`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    },

    // -------------------------------------------------------------------------
    // Sales & Lead Generation Pages
    // -------------------------------------------------------------------------
    {
      url: `${baseUrl}/sales`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sales/book-demo`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/sales/request-demo`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/sales/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sales/security-expert`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sales/enterprise-inquiry`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sales/guided-demo`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // -------------------------------------------------------------------------
    // Products Suite
    // -------------------------------------------------------------------------
    {
      url: `${baseUrl}/products`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/products/code`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/codebase-scanning`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/secret-scanning`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/container-security`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/iac-security`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/cloud`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/api-security`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/attack`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/protect`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/data`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/agent`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/graph`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/products/intelligence`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/products/soc`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/products/supply-chain`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/products/vulnerability-management`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    },

    // -------------------------------------------------------------------------
    // Legal & Trust
    // -------------------------------------------------------------------------
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  return publicRoutes;
}
