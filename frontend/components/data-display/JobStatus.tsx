import React from 'react';
import { StatusBadge } from './StatusBadge';

export type JobState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface JobStatusProps {
  jobId: string;
  name: string;
  status: JobState | string;
  progressPercent?: number;
  toolOrScanner?: string;
  startedAt?: string;
  errorMessage?: string;
}

export const JobStatus: React.FC<JobStatusProps> = ({
  jobId,
  name,
  status,
  progressPercent,
  toolOrScanner,
  startedAt,
  errorMessage,
}) => {
  const normStatus = (status || 'QUEUED').toUpperCase();

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
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
            {name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Job: {jobId} {toolOrScanner ? `• Engine: ${toolOrScanner}` : ''}
          </div>
        </div>
        <StatusBadge status={normStatus} />
      </div>

      {normStatus === 'RUNNING' && typeof progressPercent === 'number' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
            <span>Execution Progress</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{progressPercent}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                height: '100%',
                background: 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-danger-text)',
            background: 'var(--color-danger-subtle)',
            border: '1px solid var(--color-danger-border)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {errorMessage}
        </div>
      )}

      {startedAt && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Started: {new Date(startedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};
