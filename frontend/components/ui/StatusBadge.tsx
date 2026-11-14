'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Play,
  RotateCw,
  Ban,
  ShieldAlert,
} from 'lucide-react';

export type StatusType =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'IGNORED'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PASSED'
  | 'BLOCKED';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string | undefined | null;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  // Findings Statuses
  OPEN: {
    label: 'Open',
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    text: 'text-[#DC2626]',
    icon: <ShieldAlert size={11} className="text-[#DC2626]" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#BFDBFE]',
    text: 'text-[#2563EB]',
    icon: <RotateCw size={11} className="text-[#2563EB] animate-spin" />,
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#A7F3D0]',
    text: 'text-[#059669]',
    icon: <CheckCircle2 size={11} className="text-[#059669]" />,
  },
  FALSE_POSITIVE: {
    label: 'False Positive',
    bg: 'bg-[#FAF5FF]',
    border: 'border-[#E9D5FF]',
    text: 'text-[#9333EA]',
    icon: <HelpCircle size={11} className="text-[#9333EA]" />,
  },
  IGNORED: {
    label: 'Ignored',
    bg: 'bg-[#F4F4F5]',
    border: 'border-[#E4E4E7]',
    text: 'text-[#71717A]',
    icon: <Ban size={11} className="text-[#71717A]" />,
  },

  // Scan & Run Statuses
  QUEUED: {
    label: 'Queued',
    bg: 'bg-[#F8FAFC]',
    border: 'border-[#E2E8F0]',
    text: 'text-[#64748B]',
    icon: <Clock size={11} className="text-[#64748B]" />,
  },
  RUNNING: {
    label: 'Running',
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#BFDBFE]',
    text: 'text-[#2563EB]',
    icon: <RotateCw size={11} className="text-[#2563EB] animate-spin" />,
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#A7F3D0]',
    text: 'text-[#059669]',
    icon: <CheckCircle2 size={11} className="text-[#059669]" />,
  },
  PASSED: {
    label: 'Passed',
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#A7F3D0]',
    text: 'text-[#059669]',
    icon: <CheckCircle2 size={11} className="text-[#059669]" />,
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    text: 'text-[#DC2626]',
    icon: <XCircle size={11} className="text-[#DC2626]" />,
  },
  BLOCKED: {
    label: 'Blocked',
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    text: 'text-[#DC2626]',
    icon: <XCircle size={11} className="text-[#DC2626]" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-[#F4F4F5]',
    border: 'border-[#E4E4E7]',
    text: 'text-[#71717A]',
    icon: <Ban size={11} className="text-[#71717A]" />,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  className = '',
  style = {},
  ...props
}) => {
  const normalizedKey = (status || '').toUpperCase().replace(/\s+/g, '_');
  const config = STATUS_MAP[normalizedKey] || {
    label: status || 'Unknown',
    bg: 'bg-[#F8FAFC]',
    border: 'border-[#E2E8F0]',
    text: 'text-[#64748B]',
    icon: <HelpCircle size={11} className="text-[#64748B]" />,
  };

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 rounded',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 rounded-md',
    md: 'text-[12px] px-2.5 py-1 gap-1.5 rounded-md',
  };

  return (
    <span
      className={`inline-flex items-center font-medium font-sans border whitespace-nowrap leading-none transition-colors select-none ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]} ${className}`}
      style={style}
      {...props}
    >
      {showIcon && <span className="inline-flex shrink-0">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

