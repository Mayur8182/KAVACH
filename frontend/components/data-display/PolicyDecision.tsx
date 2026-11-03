import React from 'react';

export type PolicyDecisionType = 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' | 'SIMULATE_ALLOW' | 'SIMULATE_BLOCK';

interface PolicyDecisionProps {
  decision: PolicyDecisionType | string;
  ruleId?: string;
  size?: 'sm' | 'md';
}

export const PolicyDecision: React.FC<PolicyDecisionProps> = ({ decision, ruleId, size = 'md' }) => {
  const norm = (decision || 'BLOCK').toUpperCase();

  let bg = 'var(--color-danger-subtle)';
  let border = 'var(--color-danger-border)';
  let color = 'var(--color-danger-text)';
  let text = 'BLOCKED';

  if (norm === 'ALLOW' || norm === 'SIMULATE_ALLOW') {
    bg = 'var(--color-success-subtle)';
    border = 'var(--color-success-border)';
    color = 'var(--color-success-text)';
    text = 'ALLOWED';
  } else if (norm === 'REQUIRE_APPROVAL') {
    bg = 'var(--color-warning-subtle)';
    border = 'var(--color-warning-border)';
    color = 'var(--color-warning-text)';
    text = 'APPROVAL REQUIRED';
  }

  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSm ? '2px 6px' : '3px 10px',
        borderRadius: 'var(--radius-sm)',
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: isSm ? '10px' : '11px',
        fontWeight: 'var(--weight-semibold)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}
    >
      <span>●</span>
      <span>{text}</span>
      {ruleId && (
        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', marginLeft: '2px' }}>
          ({ruleId})
        </span>
      )}
    </span>
  );
};
