/**
 * Google Analytics 4 (GA4) Integration for Kavach Production
 * Measurement ID: G-FKNM7K5XNC
 * Official Domain: https://kavachsecurity.me
 *
 * Architecture & Privacy Directives:
 * - Real production integration using official gtag.js
 * - Privacy-first: strictly sanitizes all parameters to prevent PII, tokens, or sensitive security payloads
 * - Tracks page views on initial load and client-side Next.js route transitions without duplication
 * - Implements verified business conversions: sign_up, login, demo_request, github_connect, start_scan, scan_completed, pricing_view, begin_checkout, purchase
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-FKNM7K5XNC';

// Extend window interface for Google Tag Manager and Analytics
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Sensitive parameter keys that must NEVER be passed to Google Analytics
 */
const SENSITIVE_KEYS = new Set([
  'email',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'secret',
  'authorization',
  'auth',
  'api_key',
  'apikey',
  'private_key',
  'code_diff',
  'patch',
  'vulnerability_details',
  'payload',
  'file_content',
  'raw_finding',
]);

/**
 * Sanitizes an event parameter object, removing any sensitive data, tokens, or PII.
 */
export function sanitizeParams(params: Record<string, any> = {}): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      continue;
    }

    if (typeof value === 'string') {
      // Check for email pattern and scrub if accidentally included
      if (value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        continue;
      }
      // Check for JWT token pattern and scrub
      if (value.startsWith('ey') && value.split('.').length === 3) {
        continue;
      }
      sanitized[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.length; // Only track count of items, not raw elements
    } else if (value && typeof value === 'object') {
      // Omit nested complex objects
      continue;
    }
  }

  return sanitized;
}

/**
 * Sanitizes URLs to prevent transmitting sensitive query parameters (e.g., token, secret, code) to GA4.
 */
export function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, 'https://kavachsecurity.me');
    const sensitiveQueryParams = ['token', 'access_token', 'code', 'state', 'email', 'key', 'secret'];
    let modified = false;

    for (const param of sensitiveQueryParams) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        modified = true;
      }
    }

    return modified ? `${url.pathname}${url.search}` : `${url.pathname}${url.search}`;
  } catch {
    return rawUrl.split('?')[0];
  }
}

/**
 * Track a pageview in Google Analytics 4.
 */
export function pageview(url: string, title?: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const cleanPath = sanitizeUrl(url);

  window.gtag('event', 'page_view', {
    page_title: title || document.title,
    page_location: `${window.location.origin}${cleanPath}`,
    page_path: cleanPath,
  });
}

/**
 * Send a generic custom event to GA4 with parameter sanitization.
 */
export function event(action: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const cleanParams = sanitizeParams(params);
  window.gtag('event', action, cleanParams);
}

/**
 * Update Google Consent Mode v2 state dynamically.
 */
export function updateConsent(granted: boolean): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

// ---------------------------------------------------------------------------
// Business Conversion Events (Phase 5)
// ---------------------------------------------------------------------------

/**
 * sign_up: Successful account registration.
 * Fired only when registration and authentication succeed.
 */
export function trackSignUp(params: { method?: string } = {}): void {
  event('sign_up', {
    method: params.method || 'credentials',
  });
}

/**
 * login: Successful user login.
 * Fired only when authentication token is received and verified.
 */
export function trackLogin(params: { method?: string } = {}): void {
  event('login', {
    method: params.method || 'credentials',
  });
}

/**
 * demo_request: Actual demo request submission.
 * Fired only when /api/v1/sales/request-demo or bookDemo API returns success.
 */
export function trackDemoRequest(params: {
  method?: string;
  plan?: string;
  team_size?: string;
  primary_focus?: string;
} = {}): void {
  event('demo_request', {
    method: params.method || 'request_form',
    plan: params.plan || 'enterprise',
    team_size: params.team_size || 'unspecified',
    primary_focus: params.primary_focus || 'general',
  });
}

/**
 * github_connect: Successful GitHub repository or OAuth connection.
 * Fired only when authorization completes and token exchange succeeds.
 */
export function trackGitHubConnect(params: { context?: string } = {}): void {
  event('github_connect', {
    context: params.context || 'oauth_integration',
  });
}

/**
 * start_scan: User initiates a security scan.
 * Fired only when scan job is queued and backend returns job ID.
 */
export function trackStartScan(params: {
  scan_type: string;
  repository?: string;
  branch?: string;
}): void {
  event('start_scan', {
    scan_type: params.scan_type,
    repository: params.repository ? params.repository.replace(/https?:\/\/[^/]+\//, '') : 'unspecified',
    branch: params.branch || 'main',
  });
}

/**
 * scan_completed: Security scan finishes with verified results.
 * Fired only when scan status transitions to COMPLETED.
 */
export function trackScanCompleted(params: {
  scan_type: string;
  findings_total?: number;
  critical_count?: number;
  high_count?: number;
  duration_seconds?: number;
}): void {
  event('scan_completed', {
    scan_type: params.scan_type,
    findings_total: params.findings_total ?? 0,
    critical_count: params.critical_count ?? 0,
    high_count: params.high_count ?? 0,
    duration_seconds: params.duration_seconds ?? 0,
  });
}

/**
 * pricing_view: Pricing page viewed.
 */
export function trackPricingView(params: {
  billing_cycle?: string;
  source?: string;
} = {}): void {
  event('pricing_view', {
    billing_cycle: params.billing_cycle || 'annual',
    source: params.source || 'direct',
  });
}

/**
 * begin_checkout: User initiates a subscription checkout or trial.
 * Fired when choosing a paid tier from pricing or upgrade modal.
 */
export function trackBeginCheckout(params: {
  plan_name: string;
  price?: number;
  billing_cycle?: string;
}): void {
  event('begin_checkout', {
    items: [
      {
        item_name: params.plan_name,
        price: params.price ?? 0,
      },
    ],
    value: params.price ?? 0,
    currency: 'USD',
    billing_cycle: params.billing_cycle || 'annual',
  });
}

/**
 * purchase: Successful subscription payment or tier upgrade.
 */
export function trackPurchase(params: {
  transaction_id?: string;
  value?: number;
  currency?: string;
  plan_name?: string;
}): void {
  event('purchase', {
    transaction_id: params.transaction_id || `sub_${Date.now()}`,
    value: params.value ?? 0,
    currency: params.currency || 'USD',
    items: [
      {
        item_name: params.plan_name || 'Enterprise Subscription',
        price: params.value ?? 0,
      },
    ],
  });
}

