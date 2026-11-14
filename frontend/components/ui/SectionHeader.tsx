'use client';

import React from 'react';

export interface SectionHeaderProps {
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

/**
 * Kavach Enterprise Section Header
 * Standardized section title with optional eyebrow badge, description, and action button.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  action,
  centered = false,
  className = '',
}) => {
  return (
    <div
      className={`flex items-start justify-between flex-wrap gap-4 mb-6 ${
        centered ? 'items-center text-center' : 'text-left'
      } ${className}`}
    >
      <div className={`flex flex-col gap-1.5 ${centered ? 'items-center mx-auto max-w-2xl' : 'max-w-2xl'}`}>
        {eyebrow && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] text-[11px] font-semibold font-mono tracking-wider uppercase leading-tight">
            {eyebrowIcon && <span aria-hidden="true" className="inline-flex">{eyebrowIcon}</span>}
            <span>{eyebrow}</span>
          </div>
        )}

        <h2 className="text-lg font-bold text-[#0F172A] tracking-tight leading-snug m-0 font-sans">
          {title}
        </h2>

        {description && (
          <p className="text-xs text-[#64748B] leading-relaxed m-0 font-sans">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2.5 shrink-0 mt-1">
          {action}
        </div>
      )}
    </div>
  );
};
