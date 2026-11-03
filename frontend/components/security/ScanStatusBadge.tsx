'use client';

import React from 'react';
import {
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Pause,
  AlertCircle,
} from 'lucide-react';

export type ScanStatusType =
  | 'QUEUED'
  | 'INITIALIZING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_FINDINGS'
  | 'COMPLETED_ZERO_FINDINGS'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'PARTIAL'
  | 'AWAITING_APPROVAL';

interface ScanStatusBadgeProps {
  status: ScanStatusType | string;
  findingsCount?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function ScanStatusBadge({
  status,
  findingsCount,
  size = 'md',
  className = '',
}: ScanStatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  let label = norm;
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Clock size={12} />;

  if (norm === 'QUEUED') {
    label = 'QUEUED';
    bg = 'bg-slate-100 text-slate-700 border-slate-200';
    icon = <Clock size={12} />;
  } else if (norm === 'INITIALIZING' || norm === 'RUNNING') {
    label = 'SCANNING';
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = <RefreshCw size={12} className="animate-spin" />;
  } else if (norm === 'COMPLETED_WITH_FINDINGS' || (norm === 'COMPLETED' && findingsCount && findingsCount > 0)) {
    label = `${findingsCount || ''} FINDINGS DETECTED`;
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    icon = <AlertTriangle size={12} />;
  } else if (norm === 'COMPLETED_ZERO_FINDINGS' || (norm === 'COMPLETED' && (!findingsCount || findingsCount === 0))) {
    label = 'ZERO FINDINGS (SAFE)';
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    icon = <CheckCircle2 size={12} />;
  } else if (norm === 'FAILED') {
    label = 'SCAN FAILED';
    bg = 'bg-rose-100 text-rose-800 border-rose-300';
    icon = <XCircle size={12} />;
  } else if (norm === 'CANCELLED') {
    label = 'CANCELLED';
    bg = 'bg-slate-100 text-slate-600 border-slate-200';
    icon = <Pause size={12} />;
  } else if (norm === 'AWAITING_APPROVAL') {
    label = 'APPROVAL REQUIRED';
    bg = 'bg-amber-50 text-amber-800 border-amber-200';
    icon = <AlertCircle size={12} />;
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

export default ScanStatusBadge;
