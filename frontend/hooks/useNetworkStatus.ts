'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  isSlowNetwork: boolean;
  rttMs: number | null;
  downlinkMb: number | null;
  effectiveType: string | null;
  reconnectCountdown: number;
  reconnectNow: () => void;
}

/**
 * useNetworkStatus Hook
 * Monitors browser network connectivity, edge latency (RTT), and reconnection timers.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [rttMs, setRttMs] = useState<number | null>(null);
  const [downlinkMb, setDownlinkMb] = useState<number | null>(null);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkConnection = useCallback(() => {
    if (typeof window === 'undefined') return;

    const online = navigator.onLine;
    setIsOnline(online);

    // Inspect Network Information API if supported
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      const rtt = conn.rtt || null;
      const dl = conn.downlink || null;
      const type = conn.effectiveType || null;

      setRttMs(rtt);
      setDownlinkMb(dl);
      setEffectiveType(type);

      // Flag slow network if RTT > 1200ms or 2g
      const slow = Boolean((rtt && rtt > 1200) || type === '2g' || type === 'slow-2g');
      setIsSlowNetwork(slow);
    }
  }, []);

  const reconnectNow = useCallback(async () => {
    setCountdown(0);
    try {
      // Test real reachability to backend health check
      const res = await fetch('/api/v1/health', { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
      }
    } catch {
      // Still offline, reset 5s timer
      setCountdown(5);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    checkConnection();

    const handleOnline = () => {
      setIsOnline(true);
      setCountdown(0);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setCountdown(5);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', checkConnection);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', checkConnection);
      }
    };
  }, [checkConnection]);

  // Countdown timer for auto-reconnect attempt
  useEffect(() => {
    if (!isOnline && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((c) => (c > 1 ? c - 1 : 0));
      }, 1000);
    } else if (!isOnline && countdown === 0) {
      reconnectNow();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOnline, countdown, reconnectNow]);

  return {
    isOnline,
    isOffline: !isOnline,
    isSlowNetwork,
    rttMs,
    downlinkMb,
    effectiveType,
    reconnectCountdown: countdown,
    reconnectNow,
  };
}
