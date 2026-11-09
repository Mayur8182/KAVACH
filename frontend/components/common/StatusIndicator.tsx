'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Circle } from 'lucide-react';

export type StatusType =
  | 'SUCCESS'
  | 'COMPLETED'
  | 'PASSED'
  | 'FAILED'
  | 'RUNNING'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'WARNING'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'OPEN'
  | 'RESOLVED';

interface StatusIndicatorProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusIndicator({ status, label, size = 'sm' }: StatusIndicatorProps) {
  const s = (status || '').toUpperCase();

  let bg = '#F1F5F9';
  let text = '#475569';
  let border = '#E2E8F0';
  let icon = <Circle size={size === 'sm' ? 10 : 12} color="#64748B" />;

  if (['SUCCESS', 'COMPLETED', 'PASSED', 'RESOLVED'].includes(s)) {
    bg = '#F0FDF4';
    text = '#166534';
    border = '#BBF7D0';
    icon = <CheckCircle2 size={size === 'sm' ? 12 : 14} color="#16A34A" />;
  } else if (['FAILED', 'CRITICAL'].includes(s)) {
    bg = '#FEF2F2';
    text = '#991B1B';
    border = '#FECACA';
    icon = <XCircle size={size === 'sm' ? 12 : 14} color="#DC2626" />;
  } else if (['RUNNING', 'IN_PROGRESS'].includes(s)) {
    bg = '#EFF6FF';
    text = '#1E40AF';
    border = '#BFDBFE';
    icon = <RefreshCw size={size === 'sm' ? 11 : 13} className="animate-spin" color="#2563EB" />;
  } else if (['WARNING', 'HIGH'].includes(s)) {
    bg = '#FFF7ED';
    text = '#9A3412';
    border = '#FED7AA';
    icon = <AlertTriangle size={size === 'sm' ? 12 : 14} color="#EA580C" />;
  } else if (['MEDIUM'].includes(s)) {
    bg = '#FEFCE8';
    text = '#854D0E';
    border = '#FEF08A';
    icon = <AlertTriangle size={size === 'sm' ? 12 : 14} color="#CA8A04" />;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '4px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 700,
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {icon}
      <span>{label || status}</span>
    </span>
  );
}

export default StatusIndicator;

