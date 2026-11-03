'use client';

import React from 'react';
import { CheckCircle2, XCircle, RefreshCw, AlertCircle, Link2, Unlink } from 'lucide-react';

export type IntegrationStatusType =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTH_FAILED'
  | 'SYNCING'
  | 'SYNC_FAILED'
  | 'REVOKED';

interface ConnectionStatusBadgeProps {
  status: IntegrationStatusType | string;
  provider?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ConnectionStatusBadge({
  status,
  provider = 'GitHub',
  size = 'md',
  className = '',
}: ConnectionStatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  let label = norm;
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Unlink size={12} />;

  if (norm === 'CONNECTED') {
    label = `${provider} CONNECTED`;
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    icon = <CheckCircle2 size={12} />;
  } else if (norm === 'CONNECTING' || norm === 'SYNCING') {
    label = `${provider} SYNCING`;
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = <RefreshCw size={12} className="animate-spin" />;
  } else if (norm === 'AUTH_FAILED' || norm === 'REVOKED') {
    label = 'AUTHENTICATION FAILED';
    bg = 'bg-rose-100 text-rose-800 border-rose-300';
    icon = <XCircle size={12} />;
  } else if (norm === 'DISCONNECTED') {
    label = `${provider} NOT CONNECTED`;
    bg = 'bg-slate-100 text-slate-600 border-slate-200';
    icon = <Unlink size={12} />;
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-md border tracking-wide shadow-2xs ${px} ${bg} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export default ConnectionStatusBadge;
