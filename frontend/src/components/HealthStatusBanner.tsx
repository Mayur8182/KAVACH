import React from 'react';
import type { ReadinessResponse, ApiErrorDetail } from '../types/api';

interface HealthStatusBannerProps {
  readiness: ReadinessResponse | null;
  error: ApiErrorDetail | null;
  loading: boolean;
  onRefresh: () => void;
  apiBaseUrl: string;
}

export const HealthStatusBanner: React.FC<HealthStatusBannerProps> = ({
  readiness,
  error,
  loading,
  onRefresh,
  apiBaseUrl,
}) => {
  if (loading && !readiness && !error) {
    return (
      <div style={{
        padding: '12px 20px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-warning)',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite'
          }} />
          <span>Connecting to backend control plane ({apiBaseUrl})...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '12px 20px',
        backgroundColor: 'var(--status-danger-bg)',
        borderBottom: '1px solid var(--border-danger)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: '#fca5a5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-danger)',
            display: 'inline-block'
          }} />
          <div>
            <strong>Backend Unavailable [{error.code}]:</strong> {error.message}
            {error.details ? (
              <span style={{ opacity: 0.8, marginLeft: '8px', fontSize: '12px' }}>
                ({typeof error.details === 'string' ? error.details : JSON.stringify(error.details)})
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fecaca',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          {loading ? 'Retrying...' : 'Retry Connection'}
        </button>
      </div>
    );
  }

  const isDbHealthy = readiness?.dependencies?.postgresql?.status === 'healthy';
  const dbLatency = readiness?.dependencies?.postgresql?.latency_ms;
  const dbDetails = readiness?.dependencies?.postgresql?.details;

  return (
    <div style={{
      padding: '10px 20px',
      backgroundColor: isDbHealthy ? 'rgba(16, 185, 129, 0.08)' : 'var(--status-warning-bg)',
      borderBottom: `1px solid ${isDbHealthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '13px',
      color: isDbHealthy ? '#6ee7b7' : '#fcd34d'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isDbHealthy ? 'var(--status-success)' : 'var(--status-warning)',
          display: 'inline-block'
        }} />
        <span>
          <strong>Backend Control Plane:</strong> Online &nbsp;|&nbsp;
          <strong>PostgreSQL:</strong> {isDbHealthy ? `Connected (${dbLatency}ms)` : `Unreachable (${dbDetails})`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Target: {apiBaseUrl}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-sm)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '11px'
          }}
        >
          {loading ? 'Checking...' : 'Ping'}
        </button>
      </div>
    </div>
  );
};
