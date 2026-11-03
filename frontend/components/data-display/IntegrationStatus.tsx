import React from 'react';
import { ConnectionStatus, ConnectionState } from './ConnectionStatus';

interface IntegrationStatusProps {
  providerName: string;
  providerIcon?: React.ReactNode;
  status: ConnectionState | string;
  lastSync?: string;
  resourceCount?: { label: string; count: number };
  errorMessage?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const IntegrationStatus: React.FC<IntegrationStatusProps> = ({
  providerName,
  providerIcon,
  status,
  lastSync,
  resourceCount,
  errorMessage,
  onAction,
  actionLabel,
}) => {
  const norm = (status || 'NOT_CONNECTED').toUpperCase() as ConnectionState;

  let btnLabel = actionLabel;
  if (!btnLabel) {
    if (norm === 'CONNECTED') btnLabel = 'Manage';
    else if (norm === 'AUTHENTICATION_FAILED') btnLabel = 'Reconnect';
    else btnLabel = `Connect ${providerName}`;
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {providerIcon && (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border)',
              }}
            >
              {providerIcon}
            </div>
          )}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
              {providerName}
            </div>
            <ConnectionStatus status={norm} />
          </div>
        </div>

        {onAction && (
          <button
            onClick={onAction}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'var(--weight-medium)',
              borderRadius: 'var(--radius-md)',
              background: norm === 'CONNECTED' ? 'var(--color-surface-elevated)' : 'var(--color-primary)',
              color: norm === 'CONNECTED' ? 'var(--color-text-primary)' : '#ffffff',
              border: norm === 'CONNECTED' ? '1px solid var(--color-border)' : 'none',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
          >
            {btnLabel}
          </button>
        )}
      </div>

      {norm === 'CONNECTED' && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {lastSync && <span>Last synchronization: {lastSync}</span>}
          {resourceCount && (
            <span>
              {resourceCount.label}: <strong style={{ color: 'var(--color-text-primary)' }}>{resourceCount.count}</strong>
            </span>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-danger-text)',
            background: 'var(--color-danger-subtle)',
            border: '1px solid var(--color-danger-border)',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};
