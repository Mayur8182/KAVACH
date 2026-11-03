'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
} from 'lucide-react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  showDefaultIcon?: boolean;
}

/**
 * Enterprise Status Badge
 * Strictly conforms to:
 * - Rule 4: Never color alone (always paired with icon or text tag).
 * - Rule 6: WCAG 4.5:1 contrast compliance.
 * - Rule 3: Limited to short tags under 20 characters.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  showDefaultIcon = true,
  style = {},
  ...props
}) => {
  const configs: Record<
    BadgeVariant,
    { bg: string; border: string; text: string; defaultIcon: React.ReactNode }
  > = {
    neutral: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#94A3B8',
      defaultIcon: <Shield size={12} />,
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      text: '#10B981',
      defaultIcon: <CheckCircle2 size={12} />,
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#F59E0B',
      defaultIcon: <AlertTriangle size={12} />,
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#EF4444',
      defaultIcon: <AlertCircle size={12} />,
    },
    info: {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.3)',
      text: '#38BDF8',
      defaultIcon: <Info size={12} />,
    },
  };

  const current = configs[variant];
  const renderedIcon = icon || (showDefaultIcon ? current.defaultIcon : null);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '4px',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {renderedIcon && <span aria-hidden="true" style={{ display: 'inline-flex' }}>{renderedIcon}</span>}
      <span>{children}</span>
    </span>
  );
};
