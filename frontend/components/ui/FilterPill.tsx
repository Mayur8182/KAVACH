'use client';

import React from 'react';
import { X } from 'lucide-react';

export type FilterPillTone = 'neutral' | 'critical' | 'warning' | 'info' | 'success';

export interface FilterPillProps {
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
  tone?: FilterPillTone;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  label,
  count,
  isActive = false,
  onClick,
  onClear,
  tone = 'neutral',
  icon,
  disabled = false,
  className = '',
}) => {
  const toneClasses: Record<FilterPillTone, { active: string; countActive: string }> = {
    neutral: {
      active: 'bg-[#09090B] text-white border-[#09090B]',
      countActive: 'bg-[#27272A] text-white',
    },
    critical: {
      active: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
      countActive: 'bg-[#DC2626] text-white',
    },
    warning: {
      active: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
      countActive: 'bg-[#D97706] text-white',
    },
    info: {
      active: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
      countActive: 'bg-[#2563EB] text-white',
    },
    success: {
      active: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
      countActive: 'bg-[#10B981] text-white',
    },
  };

  const selectedTone = toneClasses[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border select-none transition-all duration-120 outline-none focus-visible:ring-2 focus-visible:ring-[#09090B] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? selectedTone.active
          : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
      } ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${
            isActive ? selectedTone.countActive : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
        >
          {count}
        </span>
      )}
      {isActive && onClear && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          className="ml-0.5 hover:opacity-75 inline-flex items-center"
          title="Clear filter"
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
};

