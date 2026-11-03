'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldOff, Activity, ShieldBan } from 'lucide-react';

export type RuntimeAgentState =
  | 'INITIALIZING'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'CONTAINMENT_ACTIVE'
  | 'THREAT_BLOCKED';

interface RuntimeStatusBadgeProps {
  status: RuntimeAgentState | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function RuntimeStatusBadge({
  status,
  size = 'md',
  className = '',
}: RuntimeStatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  let label = norm;
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Activity size={12} />;

  if (norm === 'HEALTHY' || norm === 'ACTIVE') {
    label = 'eBPF DAEMON HEALTHY';
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    icon = <ShieldCheck size={12} />;
  } else if (norm === 'DEGRADED') {
    label = 'KERNEL PROBE DEGRADED';
    bg = 'bg-amber-50 text-amber-800 border-amber-200';
    icon = <AlertTriangle size={12} />;
  } else if (norm === 'OFFLINE' || norm === 'DISCONNECTED') {
    label = 'RUNTIME DAEMON OFFLINE';
    bg = 'bg-rose-100 text-rose-800 border-rose-300';
    icon = <ShieldOff size={12} />;
  } else if (norm === 'CONTAINMENT_ACTIVE' || norm === 'THREAT_BLOCKED') {
    label = 'CONTAINMENT ACTIVE';
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    icon = <ShieldBan size={12} />;
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

export default RuntimeStatusBadge;
