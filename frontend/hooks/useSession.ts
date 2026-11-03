'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '../lib/auth/token';

export function useSession(idleTimeoutMinutes: number = 15) {
  const [isExpired, setIsExpired] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [savedWorkPreserved, setSavedWorkPreserved] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const idleTime = (now - lastActivityRef.current) / 1000 / 60;
      if (idleTime >= idleTimeoutMinutes && !isExpired && getAuthToken()) {
        setIsExpired(true);
      }
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetActivity));
      clearInterval(checkInterval);
    };
  }, [idleTimeoutMinutes, isExpired, resetActivity]);

  const reauthenticate = useCallback(async (passwordOrPasskey: string) => {
    setIsReauthenticating(true);
    try {
      // In real scenario, verifies credentials and renews JWT
      await new Promise((r) => setTimeout(r, 800));
      setIsExpired(false);
      lastActivityRef.current = Date.now();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Authentication failed' };
    } finally {
      setIsReauthenticating(false);
    }
  }, []);

  const triggerExpiredForTesting = useCallback(() => {
    setIsExpired(true);
  }, []);

  const dismissExpired = useCallback(() => {
    setIsExpired(false);
    lastActivityRef.current = Date.now();
  }, []);

  return {
    isExpired,
    isReauthenticating,
    savedWorkPreserved,
    reauthenticate,
    triggerExpiredForTesting,
    dismissExpired,
  };
}
