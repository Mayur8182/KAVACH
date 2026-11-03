'use client';

import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft, ShieldAlert, Clock, ZapOff } from 'lucide-react';

export type ErrorType = '500_server_error' | '429_rate_limited' | '504_gateway_timeout' | 'partial_failure' | 'generic';

export interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  onBack?: () => void;
  retryCountdown?: number;
  className?: string;
}

export function ErrorState({
  type = '500_server_error',
  title,
  message,
  errorCode,
  onRetry,
  onBack,
  retryCountdown,
  className = '',
}: ErrorStateProps) {
  const is429 = type === '429_rate_limited';
  const is504 = type === '504_gateway_timeout';
  const isPartial = type === 'partial_failure';

  const defaultTitle =
    title ||
    (is429
      ? 'API Rate Limit Exceeded (429)'
      : is504
      ? 'Security Gateway Timeout (504)'
      : isPartial
      ? 'Partial Telemetry Pipeline Failure'
      : 'Internal Control Plane Error (500)');

  const defaultMsg =
    message ||
    (is429
      ? 'Your automated pipeline has submitted requests faster than your tenant rate allowance. Backing off automatically.'
      : is504
      ? 'Upstream security scanner connection timed out while processing large abstract syntax trees.'
      : isPartial
      ? 'Some components succeeded, but the dependency graph collector failed to respond.'
      : 'The security platform encountered an unexpected processing issue. No sensitive data was exposed.');

  const defaultCode = errorCode || (is429 ? 'ERR_RATE_LIMIT_EXCEEDED' : is504 ? 'ERR_GATEWAY_TIMEOUT' : 'ERR_INTERNAL_SOC_FAULT');

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col justify-between max-w-xl mx-auto ${className}`}
    >
      <div>
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              is429
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
          >
            {is429 ? <Clock size={22} /> : is504 ? <ZapOff size={22} /> : <AlertCircle size={22} />}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{defaultTitle}</h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                {defaultCode}
              </span>
            </div>

            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{defaultMsg}</p>

            {retryCountdown !== undefined && retryCountdown > 0 && (
              <div className="mt-3 text-[12px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span>Retry window resets in {retryCountdown} seconds...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-400">TRACE ID: tr-secops-991204</span>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-[12px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 bg-slate-900 text-white text-[12px] font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorState;
