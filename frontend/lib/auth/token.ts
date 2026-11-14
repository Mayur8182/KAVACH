/**
 * Thing Auth Token Storage & Session Manager
 * Persists session token upon authentication and clears upon logout.
 */

import { apiCache } from '@/lib/api/cache';

const STORAGE_KEY = 'seculayer_auth_token';

let inMemoryToken: string | null = null;

export function isTokenExpired(token?: string | null): boolean {
  if (!token || token.trim() === '' || token === 'undefined' || token === 'null') {
    return true;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false; // Non-JWT token format, defer to server validation
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Buffer by 5 seconds to prevent race condition during in-flight requests
    return Date.now() / 1000 >= payload.exp - 5;
  } catch {
    return false;
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined' && !inMemoryToken) {
    try {
      inMemoryToken = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }

  // If token is found but expired, auto-purge immediately
  if (inMemoryToken && isTokenExpired(inMemoryToken)) {
    clearAuthToken();
    return null;
  }

  return inMemoryToken;
}

export function setAuthToken(token: string): void {
  inMemoryToken = token;
  apiCache.setToken(token);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(STORAGE_KEY, token);
      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${STORAGE_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
    } catch {
      // Storage unavailable
    }
  }
}

export function clearAuthToken(): void {
  inMemoryToken = null;
  apiCache.clear();
  apiCache.setToken(null);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('secu_active_workspace_id');
      localStorage.removeItem('secu_active_project_id');
      localStorage.removeItem('secu_active_repo');
      sessionStorage.removeItem('secu_active_workspace_id');
      sessionStorage.removeItem('secu_active_project_id');
      sessionStorage.removeItem('secu_active_repo');

      // Also clean up any lingering tenant-scoped keys in localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('secu_') || key.startsWith('kavach_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
    } catch {
      // Storage unavailable
    }
  }
}

export function redirectToLogin(redirectPath?: string): void {
  clearAuthToken();
  if (typeof window !== 'undefined') {
    const current = redirectPath || window.location.pathname;
    if (!current.startsWith('/login') && !current.startsWith('/register') && !current.startsWith('/signup')) {
      window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
    }
  }
}

