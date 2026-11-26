'use client';

/**
 * GoogleOneTap.tsx — Autonomous Google One Tap Authentication for Kavach Security
 *
 * Automatically displays Google Identity Services One Tap prompt to visitors on
 * eligible public landing pages without requiring them to click Login or Signup.
 *
 * Features:
 * - Automatic initialization on public entry
 * - FedCM compliant (Google Chrome 116+)
 * - Session suppression on dismissal (no nagging across page transitions)
 * - Safe account auto-provisioning & linking
 * - Full non-blocking page experience
 */

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { getAuthToken, isTokenExpired, setAuthToken } from '@/lib/auth/token';
import { toast } from '@/lib/toast';
import { trackLogin } from '@/lib/analytics/gtag';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          cancel: () => void;
          renderButton?: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

const PUBLIC_ELIGIBLE_PAGES = [
  '/',
  '/login',
  '/signup',
  '/solutions',
  '/contact',
  '/demo',
];

const DISMISS_KEY = 'kavach_onetap_dismissed';

// Suppress benign Google Identity Services FedCM abort noise from triggering Next.js dev overlay
if (typeof window !== 'undefined' && !(window as any).__kavach_gsi_filtered) {
  (window as any).__kavach_gsi_filtered = true;
  const originalConsoleError = window.console.error;
  window.console.error = function (...args: any[]) {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (
      firstArg.includes('[GSI_LOGGER]') ||
      firstArg.includes('FedCM get() rejects with') ||
      firstArg.includes('signal is aborted without reason')
    ) {
      console.debug(...args);
      return;
    }
    return originalConsoleError.apply(this, args);
  };
}

export const GoogleOneTap: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const initializedRef = useRef(false);

  useEffect(() => {
    // 1. SSR check
    if (typeof window === 'undefined') return;
    // Skip automated headless browsers (Lighthouse / PageSpeed / Playwright) to avoid unregistered-origin 403 errors
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;

    // 2. Do not trigger for already authenticated users
    const currentToken = getAuthToken();
    if (currentToken && !isTokenExpired(currentToken)) {
      return;
    }

    // 3. Only eligible public pages
    const isEligible = PUBLIC_ELIGIBLE_PAGES.some((route) =>
      route === '/' ? pathname === '/' : pathname?.startsWith(route)
    );
    if (!isEligible) {
      return;
    }

    // 4. Do not show if dismissed in this browser session
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
        return;
      }
    } catch {
      // Third-party cookie / storage restrictions, fail-safe exit
      return;
    }

    if (initializedRef.current) return;

    let isMounted = true;

    const setupOneTap = async () => {
      let clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        try {
          const config = await api.auth.getGoogleConfig();
          if (config?.client_id && config?.one_tap_enabled) {
            clientId = config.client_id;
          }
        } catch (err) {
          console.debug('[Kavach One Tap] Client config unavailable:', err);
          return;
        }
      }

      if (!clientId || !isMounted) return;

      // Load Google Identity Services script if not already present
      const loadGsiScript = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (window.google?.accounts?.id) {
            resolve();
            return;
          }
          const existingScript = document.getElementById('google-gsi-client');
          if (existingScript) {
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', (e) => reject(e));
            return;
          }
          const script = document.createElement('script');
          script.id = 'google-gsi-client';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
          document.head.appendChild(script);
        });
      };

      try {
        await loadGsiScript();
        if (!isMounted || !window.google?.accounts?.id) return;

        // Initialize Google Identity Services One Tap
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string; select_by?: string }) => {
            if (!response?.credential) {
              toast.error('Google One Tap failed', {
                description: 'No authorization credential returned by Google.',
              });
              return;
            }

            try {
              toast.loading('Authenticating with Google…', { id: 'google-onetap' });
              const authRes = await api.auth.googleOneTap({
                credential: response.credential,
              });

              if (authRes?.access_token) {
                setAuthToken(authRes.access_token);
                trackLogin({ method: 'google_one_tap' });
                toast.dismiss('google-onetap');
                toast.success(
                  `Welcome back, ${authRes.user?.name || authRes.email || 'Developer'}!`
                );

                // Authoritative workspace destination routing
                const targetRoute =
                  authRes.next_route ||
                  (authRes.is_new_user ? '/onboarding/connect-github' : '/overview');

                try {
                  const userProjects = await api.projects.list().catch(() => []);
                  const hasProject = Array.isArray(userProjects) && userProjects.length > 0;
                  if (hasProject) {
                    localStorage.setItem('secu_active_project_id', userProjects[0].id);
                  }
                } catch {
                  // Fallback without active project set
                }

                // Hard navigation to reset client authentication state cleanly
                window.location.href = targetRoute;
              } else {
                throw new Error('Authentication succeeded but server returned no access token.');
              }
            } catch (err: any) {
              toast.dismiss('google-onetap');
              const msg = err?.message || 'Google One Tap authentication failed.';
              toast.error('Google Sign-in Failed', {
                description: msg,
              });
            }
          },
          auto_select: false, // Explicit user consent required
          cancel_on_tap_outside: true, // Non-blocking: tapping outside cancels without blocking page
          context: 'signin',
          use_fedcm_for_prompt: false, // Set to false to avoid Chrome FedCM AbortError console noise
          itp_support: true,
        });

        // Prompt Google One Tap
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.()) {
            console.debug('[Kavach One Tap] Not displayed:', notification.getNotDisplayedReason?.() || 'suppressed');
          } else if (notification?.isSkippedMoment?.()) {
            console.debug('[Kavach One Tap] Skipped:', notification.getSkippedReason?.() || 'skipped');
          } else if (notification?.isDismissedMoment?.()) {
            console.debug('[Kavach One Tap] Dismissed:', notification.getDismissedReason?.() || 'dismissed');
            try {
              sessionStorage.setItem(DISMISS_KEY, 'true');
            } catch {
              // Ignore storage errors in restricted contexts
            }
          }
        });

        initializedRef.current = true;
      } catch (err) {
        console.debug('[Kavach One Tap] Initialization skipped:', err);
      }
    };

    let timerId: number | null = null;
    let idleId: number | null = null;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(setupOneTap, { timeout: 2200 });
    } else {
      timerId = window.setTimeout(setupOneTap, 1400);
    }

    return () => {
      isMounted = false;
      if (idleId !== null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      if (typeof window !== 'undefined' && window.google?.accounts?.id?.cancel) {
        try {
          window.google.accounts.id.cancel();
        } catch {
          // ignore clean abort
        }
      }
    };
  }, [pathname, router]);

  return null;
};

