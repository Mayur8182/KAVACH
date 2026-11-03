'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, MinusCircle } from 'lucide-react';

interface IntegrationHealthBadgeProps {
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR' | 'SYNCING';
  health?: 'HEALTHY' | 'DEGRADED' | 'NOT_CONFIGURED' | 'SYNCING';
  latencyMs?: number;
}

export const IntegrationHealthBadge: React.FC<IntegrationHealthBadgeProps> = ({
  status,
  health = 'NOT_CONFIGURED',
  latencyMs,
}) => {
  if (status === 'SYNCING' || health === 'SYNCING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <RefreshCw size={12} className="animate-spin text-blue-600" />
        Syncing
      </span>
    );
  }

  if (status === 'CONNECTED' && health === 'HEALTHY') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Connected
        {latencyMs !== undefined && (
          <span className="text-emerald-600/70 text-[11px] font-mono">({latencyMs}ms)</span>
        )}
      </span>
    );
  }

  if (status === 'CONNECTED' && health === 'DEGRADED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle size={12} className="text-amber-500" />
        Degraded
      </span>
    );
  }

  if (status === 'ERROR') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle size={12} className="text-rose-600" />
        Error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      <MinusCircle size={12} className="text-slate-400" />
      Not Configured
    </span>
  );
};
