'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface InlineLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoader({
  label = 'Loading...',
  size = 'md',
  className = '',
}: InlineLoaderProps) {
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const textSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-[14px]' : 'text-[12.5px]';

  return (
    <div className={`inline-flex items-center gap-2 text-slate-600 font-sans ${textSize} ${className}`}>
      <Loader2 size={iconSize} className="animate-spin text-slate-900" />
      <span>{label}</span>
    </div>
  );
}

export default InlineLoader;
