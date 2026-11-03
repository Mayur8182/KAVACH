import React from 'react';

export type ConnectionState = 'CONNECTED' | 'NOT_CONNECTED' | 'AUTHENTICATION_FAILED' | 'CONFIGURING';

interface ConnectionStatusProps {
  status: ConnectionState | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, label, size = 'md' }) => {
  const norm = (status || 'NOT_CONNECTED').toUpperCase();

  let dotColor = 'var(--color-text-disabled)';
  let textColor = 'var(--color-text-muted)';
  let defaultLabel = 'Not Connected';

  if (norm === 'CONNECTED') {
    dotColor = 'var(--color-success)';
    textColor = 'var(--color-success)';
    defaultLabel = 'Connected';
  } else if (norm === 'AUTHENTICATION_FAILED' || norm === 'FAILED') {
    dotColor = 'var(--color-danger)';
    textColor = 'var(--color-danger)';
    defaultLabel = 'Authentication Failed';
  } else if (norm === 'CONFIGURING') {
    dotColor = 'var(--color-warning)';
    textColor = 'var(--color-warning)';
    defaultLabel = 'Configuring';
  }

  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 'var(--weight-medium)',
        color: textColor,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span
        style={{
          width: isSm ? '6px' : '7px',
          height: isSm ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: norm === 'CONNECTED' ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
          flexShrink: 0,
        }}
      />
      {label || defaultLabel}
    </span>
  );
};
