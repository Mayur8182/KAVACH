import React from 'react';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'INFORMATIONAL' | 'UNKNOWN';

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showDot = true,
}) => {
  const raw = (severity || 'UNKNOWN').toUpperCase();
  const norm: SeverityLevel = raw === 'INFORMATIONAL' ? 'INFORMATIONAL' : (raw as SeverityLevel);

  const configMap: Record<SeverityLevel, { bg: string; border: string; text: string; dot: string }> = {
    CRITICAL: {
      bg: 'var(--severity-critical-bg)',
      border: 'var(--severity-critical-border)',
      text: 'var(--severity-critical-text)',
      dot: 'var(--severity-critical)',
    },
    HIGH: {
      bg: 'var(--severity-high-bg)',
      border: 'var(--severity-high-border)',
      text: 'var(--severity-high-text)',
      dot: 'var(--severity-high)',
    },
    MEDIUM: {
      bg: 'var(--severity-medium-bg)',
      border: 'var(--severity-medium-border)',
      text: 'var(--severity-medium-text)',
      dot: 'var(--severity-medium)',
    },
    LOW: {
      bg: 'var(--severity-low-bg)',
      border: 'var(--severity-low-border)',
      text: 'var(--severity-low-text)',
      dot: 'var(--severity-low)',
    },
    INFO: {
      bg: 'var(--severity-info-bg)',
      border: 'var(--severity-info-border)',
      text: 'var(--severity-info-text)',
      dot: 'var(--severity-info)',
    },
    INFORMATIONAL: {
      bg: 'var(--severity-info-bg)',
      border: 'var(--severity-info-border)',
      text: 'var(--severity-info-text)',
      dot: 'var(--severity-info)',
    },
    UNKNOWN: {
      bg: 'var(--severity-unknown-bg)',
      border: 'var(--severity-unknown-border)',
      text: 'var(--severity-unknown-text)',
      dot: 'var(--severity-unknown)',
    },
  };

  const style = configMap[norm] || configMap.UNKNOWN;
  const isSm = size === 'sm';

  return (
    <span
      role="status"
      aria-label={`Severity: ${norm}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSm ? '1px 6px' : '2px 8px',
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: isSm ? '10px' : '11px',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.4',
        userSelect: 'none',
      }}
    >
      {showDot && (
        <span
          style={{
            width: isSm ? '5px' : '6px',
            height: isSm ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: style.dot,
            flexShrink: 0,
          }}
        />
      )}
      {norm}
    </span>
  );
};
