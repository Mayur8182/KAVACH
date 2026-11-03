'use client';

import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw, Activity, ArrowRight } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface NetworkStatusBannerProps {
  forceOffline?: boolean;
  forceSlow?: boolean;
  bufferedEventsCount?: number;
  className?: string;
}

export function NetworkStatusBanner({
  forceOffline,
  forceSlow,
  bufferedEventsCount = 42,
  className = '',
}: NetworkStatusBannerProps) {
  const { isOffline, isSlowNetwork, rttMs, reconnectCountdown, reconnectNow } = useNetworkStatus();

  const showOffline = forceOffline || isOffline;
  const showSlow = !showOffline && (forceSlow || isSlowNetwork);

  if (!showOffline && !showSlow) {
    return null;
  }

  if (showOffline) {
    return (
      <div
        className={`bg-white border-l-4 border-l-rose-600 border border-slate-200 p-4 rounded-xl shadow-sm ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <WifiOff size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-900">
                  Network Connection Severed — Running in Local Cache Mode
                </span>
                <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                  AIR-GAPPED BUFFER
                </span>
              </div>
              <p className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">
                Telemetry buffered locally (<span className="font-mono font-semibold text-slate-900">{bufferedEventsCount} events</span> pending sync to US-East-1 SOC ledger). Local encrypted SQLite datastore engaged.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={reconnectNow}
                  className="px-3 py-1.5 bg-slate-900 text-white text-[12px] font-semibold rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Reconnect Now</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  {reconnectCountdown > 0 ? `Retrying in ${reconnectCountdown}s...` : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold text-slate-400 hidden sm:inline-block">
            STATE: CACHE_ONLY
          </span>
        </div>
      </div>
    );
  }

  // Slow Network Banner
  return (
    <div
      className={`bg-white border-l-4 border-l-amber-500 border border-slate-200 p-4 rounded-xl shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-slate-900">
                High Latency Detected ({rttMs || 1480}ms RTT)
              </span>
              <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                EXPONENTIAL BACKOFF
              </span>
            </div>
            <p className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">
              Degrading real-time stream to 30s polling intervals to preserve edge bandwidth and prevent ingress buffer packet drop.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={reconnectNow}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 text-[12px] font-semibold rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Force Full Telemetry Bandwidth</span>
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                RTT: {rttMs || 1480}ms | LOSS: 0.04%
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-400 hidden sm:inline-block">
          STATE: THROTTLED
        </span>
      </div>
    </div>
  );
}

export default NetworkStatusBanner;
