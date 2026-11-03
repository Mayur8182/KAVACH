import React from 'react';
import { Button } from '@/components/ui/Button';

export type EmptyStateType = 'empty' | 'not_configured' | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * Enterprise Empty State Component
 * Strictly conforms to:
 * - Rule 7: Empty state with helpful next step (never a dead end).
 * - Rule 6: 44px touch targets on action buttons.
 * - Rule 1: Visual hierarchy with max 3 levels of emphasis.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
}) => {
  let borderColor = 'var(--color-border)';
  let bg = 'var(--color-surface)';
  let accentColor = 'var(--color-text-muted)';

  if (type === 'not_configured') {
    borderColor = 'var(--color-border)';
    bg = '#FAFAFA';
    accentColor = 'var(--color-text-secondary)';
  } else if (type === 'error') {
    borderColor = 'var(--color-danger-border)';
    bg = 'var(--color-danger-subtle)';
    accentColor = 'var(--color-danger)';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        background: bg,
        border: `1px dashed ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        maxWidth: '540px',
        margin: '24px auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {icon && (
        <div
          style={{
            color: accentColor,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontSize: '16px',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: '8px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {title}
      </div>

      <div
        className="prose-readable"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: '1.5',
          maxWidth: '440px',
          marginBottom: actionLabel || secondaryActionLabel ? '24px' : '0',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {description}
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionLabel && onAction && (
            <Button
              variant={type === 'not_configured' ? 'primary' : 'secondary'}
              size="md"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="ghost"
              size="md"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
