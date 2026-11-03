/**
 * Thing Central In-Memory SWR Client Cache
 * Provides:
 * 1. Stale-While-Revalidate & TTL caching for GET endpoints
 * 2. In-flight request deduplication to prevent redundant duplicate network requests
 * 3. Namespace-aware cache invalidation on state mutations (POST, PUT, DELETE, PATCH)
 */

interface CacheEntry<T> {
  data: T;
  requestId: string;
  timestamp: number;
  expiresAt: number;
}

class ApiCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private inflight = new Map<string, Promise<{ data: any; requestId: string }>>();
  private defaultTtlMs = 60000; // 60s default TTL for dashboard and navigation state

  /**
   * Build consistent cache key from endpoint and options
   */
  public buildKey(endpoint: string, options: RequestInit = {}): string {
    const method = (options.method || 'GET').toUpperCase();
    return `${method}:${endpoint}`;
  }

  /**
   * Get cached data if valid and not expired
   */
  public get<T>(key: string): { data: T; requestId: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Stale, but still in map until evicted
      return null;
    }

    return { data: entry.data, requestId: entry.requestId };
  }

  /**
   * Stale-While-Revalidate getter: returns cached data immediately (nanoseconds memory lookup)
   * along with an isStale flag so the caller can trigger background revalidation without blocking.
   */
  public getWithStatus<T>(key: string): { data: T; requestId: string; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() > entry.expiresAt;
    return { data: entry.data, requestId: entry.requestId, isStale };
  }

  /**
   * Set cached data with optional custom TTL
   */
  public set<T>(key: string, data: T, requestId: string, ttlMs: number = this.defaultTtlMs): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      requestId,
      timestamp: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Check if a request is already in-flight to deduplicate concurrent requests
   */
  public getInflight<T>(key: string): Promise<{ data: T; requestId: string }> | null {
    return (this.inflight.get(key) as Promise<{ data: T; requestId: string }>) || null;
  }

  /**
   * Register an in-flight request promise
   */
  public setInflight<T>(key: string, promise: Promise<{ data: T; requestId: string }>): void {
    this.inflight.set(key, promise);
    promise.finally(() => {
      this.inflight.delete(key);
    });
  }

  /**
   * Invalidate all entries matching a given prefix or pattern
   * E.g. invalidate('/api/v1/code') clears all /code/* cached data
   */
  public invalidate(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}

export const apiCache = new ApiCacheManager();
