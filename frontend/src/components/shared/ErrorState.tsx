import React from 'react';

// ================================================================
// ErrorState — never shows raw errors, always actionable
// ================================================================

interface ErrorStateProps {
  title?: string;
  message: string;
  detail?: string;
  requestId?: string;
  onRetry?: () => void;
  onViewDetail?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  message,
  detail,
  requestId,
  onRetry,
  onViewDetail,
}) => (
  <div
    style={{
      padding: 'var(--space-8)',
      border: '1px solid var(--color-danger-border)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-surface)',
    }}
  >
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-semibold)',
        color: 'var(--color-danger)',
        marginBottom: 'var(--space-3)',
      }}
    >
      <AlertIcon size={14} />
      {title}
    </div>
    <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
      {message}
    </p>
    {detail && (
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-mono)' }}>
        {detail}
      </p>
    )}
    {requestId && (
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-disabled)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-4)' }}>
        Request ID: {requestId}
      </p>
    )}
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--color-surface-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            cursor: 'pointer',
            transition: 'border-color var(--motion-fast)',
          }}
        >
          Retry
        </button>
      )}
      {onViewDetail && (
        <button
          onClick={onViewDetail}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            cursor: 'pointer',
          }}
        >
          View technical details
        </button>
      )}
    </div>
  </div>
);

// ================================================================
// EmptyState — meaningful, actionable, context-specific
// ================================================================

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  secondaryAction,
  icon,
}) => (
  <div
    style={{
      padding: 'var(--space-12) var(--space-8)',
      textAlign: 'center',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-surface)',
    }}
  >
    {icon && (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {icon}
      </div>
    )}
    <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
      {title}
    </div>
    {description && (
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '420px', margin: '0 auto var(--space-6)' }}>
        {description}
      </div>
    )}
    {(action || secondaryAction) && (
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              padding: 'var(--space-2) var(--space-5)',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              transition: 'background-color var(--motion-fast)',
            }}
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            style={{
              padding: 'var(--space-2) var(--space-5)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
            }}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    )}
  </div>
);

// ================================================================
// PermissionDeniedState
// ================================================================

export const PermissionDeniedState: React.FC<{ resource?: string }> = ({ resource }) => (
  <div
    style={{
      padding: 'var(--space-8)',
      textAlign: 'center',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-surface)',
    }}
  >
    <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
      Permission Denied
    </div>
    <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
      {resource
        ? `You don't have permission to view ${resource}.`
        : "You don't have permission to view this resource."}
    </div>
  </div>
);

// ================================================================
// Internal Icons (minimal, only what's needed here)
// ================================================================

const AlertIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
