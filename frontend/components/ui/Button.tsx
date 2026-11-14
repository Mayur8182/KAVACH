'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Kavach Enterprise Button Component
 * Standardized across all security workspaces:
 * - Crisp monochrome primary CTA (#09090B with high-contrast text)
 * - Clean white secondary with subtle slate border
 * - Explicit hover, active (scale 0.98), focus-visible, and loading states
 * - Strict 4-tier sizing scale (xs: 28px, sm: 32px, md: 38px, lg: 44px)
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      style = {},
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    // Standardized enterprise sizing scale
    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'h-7 px-2.5 text-xs rounded gap-1.5 min-w-[28px]',
      sm: 'h-8 px-3 text-xs font-medium rounded-md gap-1.5 min-w-[32px]',
      md: 'h-9 px-3.5 text-sm font-medium rounded-md gap-2 min-w-[36px]',
      lg: 'h-11 px-5 text-sm font-semibold rounded-lg gap-2.5 min-w-[44px]',
    };

    // Standardized enterprise visual variants
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#09090B] text-white border border-[#09090B] hover:bg-[#27272A] hover:border-[#27272A] active:bg-[#18181B] shadow-xs',
      secondary:
        'bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:bg-[#F1F5F9] shadow-xs',
      outline:
        'bg-transparent text-[#334155] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#0F172A] active:bg-[#F1F5F9]',
      ghost:
        'bg-transparent text-[#475569] border border-transparent hover:bg-[#F1F5F9] hover:text-[#0F172A] active:bg-[#E2E8F0]',
      destructive:
        'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2] hover:border-[#FCA5A5] active:bg-[#FED7D7]',
      accent:
        'bg-[#2563EB] text-white border border-[#2563EB] hover:bg-[#1D4ED8] hover:border-[#1D4ED8] active:bg-[#1E40AF] shadow-xs',
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={`inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#09090B] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${
          fullWidth ? 'w-full' : 'w-auto'
        } ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        style={style}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              size={size === 'xs' ? 12 : size === 'sm' ? 13 : 15}
              className="animate-spin shrink-0"
              aria-hidden="true"
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true" className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span aria-hidden="true" className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
