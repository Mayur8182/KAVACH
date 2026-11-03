import React from 'react';
import { gooeyToast, type GooeyToastOptions, type GooeyPromiseData, type GooeyToastUpdateOptions, type DismissFilter } from 'goey-toast';
import { Loader2 } from 'lucide-react';

/**
 * Enterprise Toast Notification System for Kavach Cybersecurity Platform
 * Powered by goey-toast (Sonner + Framer Motion)
 *
 * Conforms to:
 * - Deterministic, non-blocking operation feedback (Rule 11)
 * - Single authoritative provider mounted at root
 * - Deduplication of rapid repeated notifications
 * - Safe error message extraction (no token/secret leakage)
 * - Semantic statuses (success, error, warning, info, loading)
 */

export interface ToastCustomOptions extends Omit<GooeyToastOptions, 'action'> {
  action?: {
    label: string;
    onClick: () => void;
    successLabel?: string;
  };
}

// In-memory deduplication tracker
const recentToasts = new Map<string, { timestamp: number; id: string | number }>();
const DEDUPE_WINDOW_MS = 2000;

function deduplicate(key: string, fn: () => string | number): string | number {
  const now = Date.now();
  const existing = recentToasts.get(key);

  if (existing && now - existing.timestamp < DEDUPE_WINDOW_MS) {
    return existing.id;
  }

  // Cleanup old entries
  for (const [k, v] of recentToasts.entries()) {
    if (now - v.timestamp > 10000) {
      recentToasts.delete(k);
    }
  }

  const id = fn();
  recentToasts.set(key, { timestamp: now, id });
  return id;
}

/**
 * Sanitize error message to prevent leaking sensitive API tokens, passwords, or raw stack traces.
 */
export function extractSafeErrorMessage(err: unknown, fallback = 'Operation failed. Please try again.'): string {
  if (!err) return fallback;

  let raw = '';
  if (typeof err === 'string') {
    raw = err;
  } else if (err instanceof Error) {
    raw = err.message;
  } else if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string') raw = obj.message;
    else if (typeof obj.detail === 'string') raw = obj.detail;
    else if (typeof obj.error === 'string') raw = obj.error;
    else {
      try {
        raw = JSON.stringify(err);
      } catch {
        raw = fallback;
      }
    }
  }

  if (!raw || raw === '{}') return fallback;

  // Mask sensitive values if accidentally present
  let safe = raw
    .replace(/(bearer\s+)[a-zA-Z0-9_.-]{20,}/gi, '$1[REDACTED]')
    .replace(/(token["':\s]+)[a-zA-Z0-9_.-]{20,}/gi, '$1[REDACTED]')
    .replace(/(password["':\s]+)[^\s,}"']+/gi, '$1[REDACTED]')
    .replace(/(secret["':\s]+)[a-zA-Z0-9_.-]{16,}/gi, '$1[REDACTED]');

  // Truncate excessively long stack traces
  if (safe.length > 250) {
    safe = safe.slice(0, 247) + '...';
  }

  return safe;
}

/**
 * Centralized Toast API
 */
export const toast = Object.assign(
  (title: string, options?: ToastCustomOptions) => {
    return deduplicate(`default:${title}`, () =>
      gooeyToast(title, {
        duration: 4000,
        preset: 'subtle',
        bounce: 0.08,
        ...options,
      })
    );
  },
  {
    /**
     * Positive operation confirmation (e.g. Scan completed, Policy enforced, Repositories synced)
     */
    success: (title: string, options?: ToastCustomOptions) => {
      return deduplicate(`success:${title}`, () =>
        gooeyToast.success(title, {
          duration: 4000,
          preset: 'subtle',
          bounce: 0.08,
          ...options,
        })
      );
    },

    /**
     * Actionable error feedback (e.g. Scan failed, Authentication error, Network timeout)
     * Has longer duration (5500ms) so users can read the error message comfortably.
     */
    error: (title: string, options?: ToastCustomOptions) => {
      return deduplicate(`error:${title}`, () =>
        gooeyToast.error(title, {
          duration: 5500,
          preset: 'subtle',
          bounce: 0.08,
          ...options,
        })
      );
    },

    /**
     * Warning message (e.g. Rate limit warning, Policy advisory, Partial results)
     */
    warning: (title: string, options?: ToastCustomOptions) => {
      return deduplicate(`warning:${title}`, () =>
        gooeyToast.warning(title, {
          duration: 5000,
          preset: 'subtle',
          bounce: 0.08,
          ...options,
        })
      );
    },

    /**
     * Informational notification (e.g. Copied to clipboard, Background task queued)
     */
    info: (title: string, options?: ToastCustomOptions) => {
      return deduplicate(`info:${title}`, () =>
        gooeyToast.info(title, {
          duration: 4000,
          preset: 'subtle',
          bounce: 0.08,
          ...options,
        })
      );
    },

    /**
     * In-progress loading toast with spinner icon.
     * Returns toast ID so it can be updated in-place via toast.update(id, ...)
     */
    loading: (title: string, options?: ToastCustomOptions) => {
      return gooeyToast(title, {
        duration: 120000, // keep alive until updated or dismissed
        preset: 'subtle',
        icon: React.createElement(Loader2, {
          size: 16,
          className: 'animate-spin',
          style: { animation: 'spin 1s linear infinite' },
        }),
        ...options,
      });
    },

    /**
     * Promise lifecycle handler: morphs seamlessly from loading -> success or error.
     */
    promise: <T>(promise: Promise<T>, data: GooeyPromiseData<T>) => {
      return gooeyToast.promise(promise, {
        preset: 'subtle',
        bounce: 0.08,
        ...data,
      });
    },

    /**
     * Dismiss one toast by ID, all toasts of a type, or all toasts.
     */
    dismiss: (idOrFilter?: string | number | DismissFilter) => {
      return gooeyToast.dismiss(idOrFilter);
    },

    /**
     * Update an active toast in-place (e.g. transition from loading -> complete).
     */
    update: (id: string | number, options: GooeyToastUpdateOptions) => {
      return gooeyToast.update(id, options);
    },

    /**
     * Helper to safely toast an API or mutation error with automated deduplication
     * and safe error message extraction.
     */
    apiError: (err: unknown, fallbackTitle = 'Action could not be completed') => {
      const safeDesc = extractSafeErrorMessage(err, '');
      return toast.error(fallbackTitle, {
        description: safeDesc ? safeDesc : undefined,
      });
    },
  }
);

export default toast;
