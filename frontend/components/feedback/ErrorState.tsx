import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  code?: string;
  title?: string;
  message: string;
  requestId?: string;
  remediation?: string;
  onRetry?: () => void;
}

/**
 * Enterprise Error State Component
 * Strictly conforms to:
 * - Rule 11: Human error messages explaining what failed, why, and how to fix it with retry.
 * - Rule 6: 44px touch targets on retry action.
 * - Rule 4: Semantic danger color paired with alert icon and code badge.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  code = 'REQUEST_FAILED',
  title = 'Request Failed',
  message,
  requestId,
  remediation,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-danger-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        maxWidth: '540px',
        margin: '24px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="var(--color-danger)" aria-hidden="true" />
          <span style={{ fontSize: '15px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-danger-text)' }}>
            {title}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-danger-text)',
            background: 'var(--color-danger-subtle)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          {code}
        </span>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
        {message}
      </div>

      {remediation && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-warning-text)',
            background: 'var(--color-warning-subtle)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-warning-border)',
            lineHeight: 1.4,
          }}
        >
          <strong>Remediation:</strong> {remediation}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {requestId ? (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Request ID: <span style={{ color: 'var(--color-text-secondary)' }}>{requestId}</span>
          </div>
        ) : (
          <div />
        )}

        {onRetry && (
          <Button
            size="md"
            variant="secondary"
            leftIcon={<RotateCcw size={14} />}
            onClick={onRetry}
          >
            Retry Request
          </Button>
        )}
      </div>
    </div>
  );
};
