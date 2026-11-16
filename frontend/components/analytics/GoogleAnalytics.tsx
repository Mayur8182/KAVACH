'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_MEASUREMENT_ID, pageview, updateConsent } from '@/lib/analytics/gtag';

/**
 * Tracks route changes in Next.js App Router client-side navigation.
 * Uses Suspense boundary to prevent de-opting the entire root layout into dynamic rendering.
 */
function GoogleAnalyticsNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString();
    const currentUrl = search ? `${pathname}?${search}` : pathname;

    // The initial hard pageview is handled by the primary Google tag initialization.
    // Skip initial mount so we never dispatch a duplicate pageview event on initial load.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastTrackedUrl.current = currentUrl;
      return;
    }

    // Prevent duplicate pageview calls on re-renders for the same path
    if (lastTrackedUrl.current === currentUrl) return;
    lastTrackedUrl.current = currentUrl;

    pageview(currentUrl, document.title);
  }, [pathname, searchParams]);

  // Sync with cookie consent preferences
  useEffect(() => {
    try {
      const stored = localStorage.getItem('seculayer_cookie_consent_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.analytics === false) {
          updateConsent(false);
        } else if (parsed && parsed.analytics === true) {
          updateConsent(true);
        }
      }
    } catch {
      // LocalStorage restricted
    }

    const handleConsentChanged = (e: any) => {
      const granted = !!e.detail?.analytics;
      updateConsent(granted);
    };

    window.addEventListener('cookie_consent_changed', handleConsentChanged);
    return () => {
      window.removeEventListener('cookie_consent_changed', handleConsentChanged);
    };
  }, []);

  return null;
}

/**
 * GoogleAnalytics — Enterprise GA4 Provider for Kavach
 * Measurement ID: G-FKNM7K5XNC
 * Loads gtag.js asynchronously after interactive to protect page performance and CWV.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            // Check existing consent
            try {
              var consentRaw = localStorage.getItem('seculayer_cookie_consent_v1');
              var consentAnalytics = 'granted';
              if (consentRaw) {
                var parsed = JSON.parse(consentRaw);
                if (parsed && parsed.analytics === false) {
                  consentAnalytics = 'denied';
                }
              }
              gtag('consent', 'default', {
                'analytics_storage': consentAnalytics,
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
              });
            } catch(e) {
              gtag('consent', 'default', {
                'analytics_storage': 'granted',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
              });
            }

            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false
            });
          `,
        }}
      />
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsNavigation />
      </Suspense>
    </>
  );
}

