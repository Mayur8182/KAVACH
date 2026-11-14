'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
} from 'lucide-react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  showDefaultIcon?: boolean;
  dot?: boolean;
}

/**
 * Kavach Enterprise Status Badge
 * Strictly conforms to:
 * - WCAG AA contrast (4.5:1+) on enterprise light backgrounds
 * - Compact typographic footprint (10px - 12px)
 * - Accessible status semantics
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  showDefaultIcon = false,
  dot = false,
  className = '',
  style = {},
  ...props
}) => {
  const variantStyles: Record<
    BadgeVariant,
    { bg: string; border: string; text: string; dotColor: string; defaultIcon: React.ReactNode }
  > = {
    neutral: {
      bg: 'bg-[#F1F5F9]',
      border: 'border-[#E2E8F0]',
      text: 'text-[#475569]',
      dotColor: 'bg-[#64748B]',
      defaultIcon: <Shield size={11} />,
    },
    success: {
      bg: 'bg-[#ECFDF5]',
      border: 'border-[#A7F3D0]',
      text: 'text-[#047857]',
      dotColor: 'bg-[#10B981]',
      defaultIcon: <CheckCircle2 size={11} />,
    },
    warning: {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#FDE68A]',
      text: 'text-[#B45309]',
      dotColor: 'bg-[#F59E0B]',
      defaultIcon: <AlertTriangle size={11} />,
    },
    error: {
      bg: 'bg-[#FEF2F2]',
      border: 'border-[#FECACA]',
      text: 'text-[#B91C1C]',
      dotColor: 'bg-[#EF4444]',
      defaultIcon: <AlertCircle size={11} />,
    },
    info: {
      bg: 'bg-[#F0F9FF]',
      border: 'border-[#BAE6FD]',
      text: 'text-[#0369A1]',
      dotColor: 'bg-[#0284C7]',
      defaultIcon: <Info size={11} />,
    },
    brand: {
      bg: 'bg-[#F4F4F5]',
      border: 'border-[#E4E4E7]',
      text: 'text-[#09090B]',
      dotColor: 'bg-[#09090B]',
      defaultIcon: <Shield size={11} />,
    },
  };

  const sizeClasses: Record<BadgeSize, string> = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 rounded',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 rounded-md',
    md: 'text-[12px] px-2.5 py-1 gap-1.5 rounded-md',
  };

  const current = variantStyles[variant];
  const renderedIcon = icon || (showDefaultIcon ? current.defaultIcon : null);

  return (
    <span
      className={`inline-flex items-center font-medium font-sans border whitespace-nowrap leading-none transition-colors ${current.bg} ${current.border} ${current.text} ${sizeClasses[size]} ${className}`}
      style={style}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor}`}
          aria-hidden="true"
        />
      )}
      {renderedIcon && <span className="inline-flex shrink-0" aria-hidden="true">{renderedIcon}</span>}
      <span>{children}</span>
    </span>
  );
};
