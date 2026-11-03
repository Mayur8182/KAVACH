import React from 'react';

// ================================================================
// SeverityBadge — consistent severity representation
// Never use color alone — text label is always present
// ================================================================

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | string;

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

const SEVERITY_MAP: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: {
    color: 'var(--severity-critical)',
    bg: 'var(--severity-critical-bg)',
    border: 'var(--severity-critical-border)',
  },
  HIGH: {
    color: 'var(--severity-high)',
    bg: 'var(--severity-high-bg)',
    border: 'var(--severity-high-border)',
  },
  MEDIUM: {
    color: 'var(--severity-medium)',
    bg: 'var(--severity-medium-bg)',
    border: 'var(--severity-medium-border)',
  },
  LOW: {
    color: 'var(--severity-low)',
    bg: 'var(--severity-low-bg)',
    border: 'var(--severity-low-border)',
  },
  INFO: {
    color: 'var(--severity-info)',
    bg: 'var(--severity-info-bg)',
    border: 'var(--severity-info-border)',
  },
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const config = SEVERITY_MAP[severity.toUpperCase()] ?? SEVERITY_MAP.LOW;
  const fontSize = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  const padding = size === 'sm' ? '2px 6px' : '3px 8px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize,
        fontWeight: 'var(--weight-semibold)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-sm)',
        padding,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {severity.toUpperCase()}
    </span>
  );
};

// ================================================================
// StatusBadge — standardized status vocabulary
// ================================================================

type StatusVariant =
  | 'connected' | 'not_connected' | 'configured' | 'not_configured'
  | 'running' | 'completed' | 'failed' | 'cancelled' | 'queued'
  | 'allow' | 'warn' | 'block' | 'require_approval' | 'not_evaluated'
  | 'verified' | 'violated' | 'unknown' | 'not_applicable'
  | 'open' | 'fixed' | 'reopened' | 'false_positive'
  | 'active' | 'draft' | 'retired' | 'disabled'
  | 'healthy' | 'degraded' | 'unavailable'
  | 'auth_failed' | 'permission_denied'
  | string;

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;    // Override display label
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot?: string }> = {
  connected:        { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)', dot: 'var(--color-success)' },
  healthy:          { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)', dot: 'var(--color-success)' },
  completed:        { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)' },
  allow:            { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)' },
  verified:         { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)' },
  fixed:            { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)' },
  active:           { color: 'var(--color-success)',  bg: 'var(--color-success-subtle)',  border: 'var(--color-success-border)' },

  warn:             { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)' },
  running:          { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)', dot: 'var(--color-warning)' },
  queued:           { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)' },
  require_approval: { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)' },
  unknown:          { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)' },
  degraded:         { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)', dot: 'var(--color-warning)' },
  open:             { color: 'var(--color-warning)',  bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)' },

  failed:           { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  block:            { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  violated:         { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  not_connected:    { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)', dot: 'var(--color-danger)' },
  not_configured:   { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  auth_failed:      { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  permission_denied:{ color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  unavailable:      { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  reopened:         { color: 'var(--color-danger)',   bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },

  not_evaluated:    { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },
  not_applicable:   { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },
  cancelled:        { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },
  false_positive:   { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },
  draft:            { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },
  retired:          { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },
  disabled:         { color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)' },

  configured:       { color: 'var(--color-info)',     bg: 'var(--color-info-subtle)',     border: 'var(--color-info-border)' },
};

const STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  not_connected: 'Not Connected',
  configured: 'Configured',
  not_configured: 'Not Configured',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  queued: 'Queued',
  allow: 'Allow',
  warn: 'Warn',
  block: 'Block',
  require_approval: 'Approval Required',
  not_evaluated: 'Not Evaluated',
  verified: 'Verified',
  violated: 'Violated',
  unknown: 'Unknown',
  not_applicable: 'N/A',
  open: 'Open',
  fixed: 'Fixed',
  reopened: 'Reopened',
  false_positive: 'False Positive',
  active: 'Active',
  draft: 'Draft',
  retired: 'Retired',
  disabled: 'Disabled',
  healthy: 'Healthy',
  degraded: 'Degraded',
  unavailable: 'Unavailable',
  auth_failed: 'Auth Failed',
  permission_denied: 'Permission Denied',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const key = status.toLowerCase().replace(/ /g, '_');
  const config = STATUS_CONFIG[key] ?? {
    color: 'var(--color-text-secondary)',
    bg: 'rgba(113,113,122,0.08)',
    border: 'rgba(113,113,122,0.18)',
  };
  const displayLabel = label ?? STATUS_LABELS[key] ?? status;
  const fontSize = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  const padding = size === 'sm' ? '2px 6px' : '3px 8px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize,
        fontWeight: 'var(--weight-medium)',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-sm)',
        padding,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {config.dot && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: config.dot,
            flexShrink: 0,
          }}
        />
      )}
      {displayLabel}
    </span>
  );
};

// ================================================================
// NotConnectedState — explicit integration state
// ================================================================

interface NotConnectedStateProps {
  integration: string;
  description?: string;
  onConnect?: () => void;
  connectLabel?: string;
}

export const NotConnectedState: React.FC<NotConnectedStateProps> = ({
  integration,
  description,
  onConnect,
  connectLabel,
}) => (
  <div
    style={{
      padding: 'var(--space-8)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--color-surface)',
      textAlign: 'center',
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
        backgroundColor: 'var(--color-danger-subtle)',
        border: '1px solid var(--color-danger-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger)', display: 'inline-block' }} />
      NOT CONNECTED
    </div>
    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
      {integration}
    </div>
    {description && (
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
        {description}
      </div>
    )}
    {onConnect && (
      <button
        onClick={onConnect}
        style={{
          padding: 'var(--space-2) var(--space-5)',
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--weight-medium)',
          cursor: 'pointer',
          transition: 'background-color var(--motion-fast)',
        }}
      >
        {connectLabel ?? `Connect ${integration}`}
      </button>
    )}
  </div>
);
