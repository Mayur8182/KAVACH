import React from 'react';

export type HealthStateType = 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE' | 'DOWN';

interface HealthStatusProps {
  status: HealthStateType | string;
  label?: string;
}

export const HealthStatus: React.FC<HealthStatusProps> = ({ status, label }) => {
  const norm = (status || 'HEALTHY').toUpperCase();

  let color = 'var(--color-success)';
  let defaultLabel = 'Operational';

  if (norm === 'DEGRADED') {
    color = 'var(--color-warning)';
    defaultLabel = 'Degraded';
  } else if (norm === 'UNREACHABLE' || norm === 'DOWN') {
    color = 'var(--color-danger)';
    defaultLabel = 'Offline';
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      <span style={{ fontSize: '12px', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-secondary)' }}>
        {label || defaultLabel}
      </span>
    </div>
  );
};
