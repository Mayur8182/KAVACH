'use client';

import { useState, useCallback, useRef } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'empty' | 'partial' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  statusCode?: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
  isError: boolean;
  execute: (asyncFn: () => Promise<T>, options?: { isRefresh?: boolean }) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * useAsyncState Hook
 * Standardized state machine for asynchronous API calls.
 * Preserves already-loaded data during background refreshes.
 */
export function useAsyncState<T>(initialData: T | null = null): AsyncState<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [status, setStatus] = useState<AsyncStatus>(initialData ? 'idle' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);
  const isExecutingRef = useRef(false);

  const execute = useCallback(
    async (asyncFn: () => Promise<T>, options?: { isRefresh?: boolean }): Promise<T | null> => {
      if (isExecutingRef.current) return null;
      isExecutingRef.current = true;

      const isRefresh = options?.isRefresh || false;
      if (isRefresh && data !== null) {
        setStatus('refreshing');
      } else {
        setStatus('loading');
      }
      setError(null);
      setStatusCode(undefined);

      try {
        const result = await asyncFn();
        setData(result);

        // Check if empty array or object
        if (
          result === null ||
          result === undefined ||
          (Array.isArray(result) && result.length === 0) ||
          (typeof result === 'object' && Object.keys(result).length === 0)
        ) {
          setStatus('empty');
        } else {
          setStatus('success');
        }
        return result;
      } catch (err: any) {
        const message = err?.message || 'An unexpected server error occurred. Please retry.';
        const code = err?.status || err?.statusCode || (message.includes('429') ? 429 : 500);

        setError(message);
        setStatusCode(code);
        setStatus('error');
        return null;
      } finally {
        isExecutingRef.current = false;
      }
    },
    [data]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setStatus('idle');
    setError(null);
    setStatusCode(undefined);
  }, [initialData]);

  return {
    status,
    data,
    error,
    statusCode,
    isLoading: status === 'loading',
    isRefreshing: status === 'refreshing',
    isSuccess: status === 'success',
    isEmpty: status === 'empty',
    isError: status === 'error',
    execute,
    reset,
    setData,
  };
}
