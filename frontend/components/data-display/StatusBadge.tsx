import React from 'react';

export type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'QUEUED'
  | 'CANCELLED'
  | 'VERIFIED'
  | 'VIOLATED'
  | 'BLOCKED'
  | 'ALLOWED'
  | 'PENDING';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  let color = 'var(--color-neutral-text)';
  let bg = 'var(--color-neutral-subtle)';
  let border = 'var(--color-neutral-border)';
  let dotColor = 'var(--color-neutral)';

  switch (norm) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'VERIFIED':
    case 'ALLOWED':
      color = 'var(--color-success-text)';
      bg = 'var(--color-success-subtle)';
      border = 'var(--color-success-border)';
      dotColor = 'var(--color-success)';
      break;

    case 'FAILED':
    case 'VIOLATED':
    case 'BLOCKED':
      color = 'var(--color-danger-text)';
      bg = 'var(--color-danger-subtle)';
      border = 'var(--color-danger-border)';
      dotColor = 'var(--color-danger)';
      break;

    case 'RUNNING':
    case 'PENDING':
      color = 'var(--color-warning-text)';
      bg = 'var(--color-warning-subtle)';
      border = 'var(--color-warning-border)';
      dotColor = 'var(--color-warning)';
      break;

    case 'QUEUED':
      color = 'var(--color-info-text)';
      bg = 'var(--color-info-subtle)';
      border = 'var(--color-info-border)';
      dotColor = 'var(--color-info)';
      break;

    case 'INACTIVE':
    case 'CANCELLED':
    default:
      color = 'var(--color-text-muted)';
      bg = 'rgba(255, 255, 255, 0.05)';
      border = 'var(--color-border)';
      dotColor = 'var(--color-text-disabled)';
      break;
  }

  const isSm = size === 'sm';

  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSm ? '1px 6px' : '2px 8px',
        borderRadius: 'var(--radius-pill)',
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: isSm ? '10px' : '11px',
        fontWeight: 'var(--weight-medium)',
        letterSpacing: '0.03em',
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.4',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />
      {norm}
    </span>
  );
};
