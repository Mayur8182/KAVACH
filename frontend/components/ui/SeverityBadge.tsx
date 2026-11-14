'use client';

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'SAFE' | 'UNKNOWN';

export interface SeverityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity: SeverityLevel | string | undefined | null;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  showIcon?: boolean;
  count?: number;
  uppercase?: boolean;
}

const SEVERITY_CONFIGS: Record<
  SeverityLevel,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    countBg: string;
    countText: string;
    icon: React.ReactNode;
  }
> = {
  CRITICAL: {
    label: 'Critical',
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    text: 'text-[#B91C1C]',
    dot: 'bg-[#DC2626]',
    countBg: 'bg-[#FEE2E2]',
    countText: 'text-[#991B1B]',
    icon: <ShieldAlert size={12} className="text-[#DC2626]" />,
  },
  HIGH: {
    label: 'High',
    bg: 'bg-[#FFF7ED]',
    border: 'border-[#FED7AA]',
    text: 'text-[#C2410C]',
    dot: 'bg-[#EA580C]',
    countBg: 'bg-[#FFEDD5]',
    countText: 'text-[#9A3412]',
    icon: <AlertTriangle size={12} className="text-[#EA580C]" />,
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FEF3C7]',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    countBg: 'bg-[#FDE68A]',
    countText: 'text-[#92400E]',
    icon: <AlertCircle size={12} className="text-[#F59E0B]" />,
  },
  LOW: {
    label: 'Low',
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#DBEAFE]',
    text: 'text-[#1D4ED8]',
    dot: 'bg-[#3B82F6]',
    countBg: 'bg-[#DBEAFE]',
    countText: 'text-[#1E40AF]',
    icon: <Info size={12} className="text-[#3B82F6]" />,
  },
  INFO: {
    label: 'Info',
    bg: 'bg-[#F0F9FF]',
    border: 'border-[#E0F2FE]',
    text: 'text-[#0369A1]',
    dot: 'bg-[#0EA5E9]',
    countBg: 'bg-[#E0F2FE]',
    countText: 'text-[#075985]',
    icon: <Info size={12} className="text-[#0EA5E9]" />,
  },
  SAFE: {
    label: 'Safe',
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#A7F3D0]',
    text: 'text-[#047857]',
    dot: 'bg-[#10B981]',
    countBg: 'bg-[#D1FAE5]',
    countText: 'text-[#065F46]',
    icon: <ShieldCheck size={12} className="text-[#10B981]" />,
  },
  UNKNOWN: {
    label: 'Unknown',
    bg: 'bg-[#F8FAFC]',
    border: 'border-[#E2E8F0]',
    text: 'text-[#64748B]',
    dot: 'bg-[#94A3B8]',
    countBg: 'bg-[#F1F5F9]',
    countText: 'text-[#475569]',
    icon: <HelpCircle size={12} className="text-[#94A3B8]" />,
  },
};

/**
 * Kavach Authoritative Severity Badge
 * Consistent across all findings tables, dashboards, and detail drawers.
 */
export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'sm',
  showDot = true,
  showIcon = false,
  count,
  uppercase = false,
  className = '',
  style = {},
  ...props
}) => {
  const normalizedKey = (severity || 'UNKNOWN').toUpperCase() as SeverityLevel;
  const config = SEVERITY_CONFIGS[normalizedKey] || SEVERITY_CONFIGS.UNKNOWN;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 rounded',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 rounded-md',
    md: 'text-[12px] px-2.5 py-1 gap-2 rounded-md',
  };

  const displayLabel = uppercase ? config.label.toUpperCase() : config.label;

  return (
    <span
      className={`inline-flex items-center font-medium font-sans border whitespace-nowrap leading-none transition-colors select-none ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]} ${className}`}
      style={style}
      {...props}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      {showIcon && <span className="inline-flex shrink-0" aria-hidden="true">{config.icon}</span>}
      <span>{displayLabel}</span>
      {typeof count === 'number' && (
        <span
          className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${config.countBg} ${config.countText}`}
        >
          {count}
        </span>
      )}
    </span>
  );
};

