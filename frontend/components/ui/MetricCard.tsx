'use client';

import React from 'react';
import { ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export type MetricTone = 'neutral' | 'critical' | 'warning' | 'success' | 'info';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  delta?: {
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  tone?: MetricTone;
  actionText?: string;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<MetricTone, { border: string; bg: string; text: string; iconColor: string }> = {
  neutral: {
    border: 'border-[#E2E8F0]',
    bg: 'bg-white',
    text: 'text-[#0F172A]',
    iconColor: 'text-[#64748B]',
  },
  critical: {
    border: 'border-[#FECACA]',
    bg: 'bg-white',
    text: 'text-[#991B1B]',
    iconColor: 'text-[#DC2626]',
  },
  warning: {
    border: 'border-[#FED7AA]',
    bg: 'bg-white',
    text: 'text-[#9A3412]',
    iconColor: 'text-[#EA580C]',
  },
  success: {
    border: 'border-[#A7F3D0]',
    bg: 'bg-white',
    text: 'text-[#047857]',
    iconColor: 'text-[#10B981]',
  },
  info: {
    border: 'border-[#BFDBFE]',
    bg: 'bg-white',
    text: 'text-[#1E40AF]',
    iconColor: 'text-[#2563EB]',
  },
};

/**
 * Kavach Enterprise Metric Card
 * High-density, professional metric card with authentic backend data display.
 * Strictly avoids oversized empty padding and decorative fluff.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  delta,
  icon,
  tone = 'neutral',
  actionText,
  onClick,
  isLoading = false,
  className = '',
}) => {
  const currentTone = TONE_CLASSES[tone];
  const isInteractive = Boolean(onClick);

  if (isLoading) {
    return (
      <div className={`p-4 rounded-lg bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between gap-3 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 bg-[#F1F5F9] rounded" />
          <div className="h-4 w-4 bg-[#F1F5F9] rounded" />
        </div>
        <div className="h-7 w-16 bg-[#E2E8F0] rounded" />
        <div className="h-3 w-32 bg-[#F1F5F9] rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`p-4 rounded-lg border shadow-xs flex flex-col justify-between select-none transition-all duration-150 ${currentTone.bg} ${currentTone.border} ${
        isInteractive
          ? 'cursor-pointer hover:border-[#CBD5E1] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#09090B]'
          : ''
      } ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className={`shrink-0 ${currentTone.iconColor}`}>{icon}</span>}
      </div>

      {/* Main Metric Counter */}
      <div className="flex items-baseline gap-2.5 my-1">
        <span className={`text-2xl font-bold tracking-tight font-sans ${currentTone.text}`}>
          {value}
        </span>
        {delta && (
          <span
            className={`inline-flex items-center text-xs font-semibold ${
              delta.trend === 'down'
                ? 'text-[#059669]'
                : delta.trend === 'up'
                ? 'text-[#DC2626]'
                : 'text-[#64748B]'
            }`}
          >
            {delta.trend === 'up' && <ArrowUpRight size={13} className="shrink-0" />}
            {delta.trend === 'down' && <ArrowDownRight size={13} className="shrink-0" />}
            {delta.trend === 'neutral' && <Minus size={13} className="shrink-0" />}
            <span>{delta.value}</span>
            {delta.label && <span className="font-normal text-[#64748B] ml-1">{delta.label}</span>}
          </span>
        )}
      </div>

      {/* Footer / Context Subtitle */}
      {(subtitle || actionText) && (
        <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F8FAFC]">
          <span className="truncate">{subtitle}</span>
          {actionText && (
            <span className="text-xs font-semibold text-[#2563EB] inline-flex items-center gap-0.5 shrink-0 ml-2">
              <span>{actionText}</span>
              <ChevronRight size={12} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

