'use client';

/**
 * Thing Protect — Reusable UI Components
 * Badges, Evidence Drawers, Safety Panels, and Visual Indicators using Design System tokens.
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Unlock,
  Key,
  Database,
  ExternalLink,
  ChevronRight,
  Server,
  Activity,
  FileCode,
  Copy,
  Eye,
  Check,
  Zap,
  Info
} from 'lucide-react';
import {
  ProtectionState,
  EnforcementDecision,
  PolicyStatus,
  ThreatVerification,
  ProtectionEvidence
} from '@/types/api/protect';

// ── Protection State Badge ──────────────────────────────────────────
export function ProtectionStateBadge({ state }: { state: ProtectionState | string }) {
  const s = state?.toUpperCase() || 'UNKNOWN';
  let bg = 'rgba(107, 114, 128, 0.12)';
  let color = '#9ca3af';
  let border = 'rgba(107, 114, 128, 0.25)';
  let dotColor = '#9ca3af';
  let Icon = Info;

  if (s === 'ACTIVE') {
    bg = 'rgba(16, 185, 129, 0.12)';
    color = '#10b981';
    border = 'rgba(16, 185, 129, 0.35)';
    dotColor = '#10b981';
    Icon = ShieldCheck;
  } else if (s === 'DEGRADED') {
    bg = 'rgba(234, 179, 8, 0.12)';
    color = '#eab308';
    border = 'rgba(234, 179, 8, 0.35)';
    dotColor = '#eab308';
    Icon = AlertTriangle;
  } else if (s === 'FAILED') {
    bg = 'rgba(239, 68, 68, 0.14)';
    color = '#ef4444';
    border = 'rgba(239, 68, 68, 0.4)';
    dotColor = '#ef4444';
    Icon = ShieldAlert;
  } else if (s === 'NOT_CONFIGURED' || s === 'NOT_CONNECTED') {
    bg = 'rgba(239, 68, 68, 0.08)';
    color = '#f87171';
    border = 'rgba(239, 68, 68, 0.25)';
    dotColor = '#f87171';
    Icon = AlertTriangle;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm, 4px)',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dotColor,
        }}
      />
      <Icon size={12} />
      <span>{s}</span>
    </span>
  );
}

// ── Enforcement Decision Badge ──────────────────────────────────────
export function EnforcementDecisionBadge({ decision }: { decision: EnforcementDecision | string }) {
  const d = decision?.toUpperCase() || 'UNKNOWN';
  let bg = 'rgba(107, 114, 128, 0.12)';
  let color = '#9ca3af';
  let border = 'rgba(107, 114, 128, 0.25)';

  if (d === 'ALLOW') {
    bg = 'rgba(16, 185, 129, 0.14)';
    color = '#10b981';
    border = 'rgba(16, 185, 129, 0.35)';
  } else if (d === 'BLOCK' || d === 'DENY' || d === 'REVOKE') {
    bg = 'rgba(239, 68, 68, 0.16)';
    color = '#ef4444';
    border = 'rgba(239, 68, 68, 0.4)';
  } else if (d === 'CHALLENGE') {
    bg = 'rgba(234, 179, 8, 0.14)';
    color = '#eab308';
    border = 'rgba(234, 179, 8, 0.35)';
  } else if (d === 'REQUIRE_APPROVAL') {
    bg = 'rgba(99, 102, 241, 0.14)';
    color = '#818cf8';
    border = 'rgba(99, 102, 241, 0.35)';
  } else if (d === 'RATE_LIMIT') {
    bg = 'rgba(249, 115, 22, 0.14)';
    color = '#f97316';
    border = 'rgba(249, 115, 22, 0.35)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        fontSize: '10.5px',
        fontWeight: 700,
        borderRadius: 'var(--radius-sm, 4px)',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {d}
    </span>
  );
}

// ── Policy Status Badge ─────────────────────────────────────────────
export function PolicyStatusBadge({ status }: { status: PolicyStatus | string }) {
  const s = status?.toUpperCase() || 'DRAFT';
  let bg = 'rgba(107, 114, 128, 0.12)';
  let color = '#9ca3af';
  let border = 'rgba(107, 114, 128, 0.25)';

  if (s === 'ACTIVE' || s === 'PUBLISHED') {
    bg = 'rgba(16, 185, 129, 0.12)';
    color = '#10b981';
    border = 'rgba(16, 185, 129, 0.3)';
  } else if (s === 'PENDING_APPROVAL') {
    bg = 'rgba(99, 102, 241, 0.12)';
    color = '#818cf8';
    border = 'rgba(99, 102, 241, 0.3)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        fontSize: '10px',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm, 4px)',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {s}
    </span>
  );
}

// ── Threat Verification Badge ───────────────────────────────────────
export function ThreatVerificationBadge({
  verification
}: {
  verification: ThreatVerification | string;
}) {
  const v = verification?.toUpperCase() || 'SIGNAL';
  let bg = 'rgba(107, 114, 128, 0.12)';
  let color = '#9ca3af';
  let border = 'rgba(107, 114, 128, 0.25)';

  if (v === 'VERIFIED') {
    bg = 'rgba(239, 68, 68, 0.16)';
    color = '#ef4444';
    border = 'rgba(239, 68, 68, 0.4)';
  } else if (v === 'DETECTED') {
    bg = 'rgba(249, 115, 22, 0.14)';
    color = '#f97316';
    border = 'rgba(249, 115, 22, 0.35)';
  } else if (v === 'SUSPECTED') {
    bg = 'rgba(234, 179, 8, 0.14)';
    color = '#eab308';
    border = 'rgba(234, 179, 8, 0.35)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        fontSize: '10px',
        fontWeight: 700,
        borderRadius: 'var(--radius-sm, 4px)',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.03em',
      }}
    >
      {v}
    </span>
  );
}

// ── Metric Card ─────────────────────────────────────────────────────
export const MetricCard: React.FC<{
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  accent?: string;
  badge?: React.ReactNode;
}> = ({ title, value, subtitle, accent = '#10b981', badge }) => {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '90px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
        {badge}
      </div>

      <div style={{ margin: '8px 0 4px 0' }}>
        <span
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: accent,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {value}
        </span>
      </div>

      {subtitle && (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};

// ── Evidence Drawer Component ───────────────────────────────────────
export function EvidenceDrawer({
  evidence,
  isOpen,
  onClose
}: {
  evidence: ProtectionEvidence | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !evidence) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(evidence, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '650px',
          height: '100%',
          background: 'var(--color-surface, #0f1117)',
          borderLeft: '1px solid var(--color-border)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="#10b981" />
            <div>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                RUNTIME EVIDENCE TRACE
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                {evidence.id}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              {copied ? 'COPIED' : 'COPY JSON'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Verification Status */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              CRYPTOGRAPHIC PROVENANCE
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} />
              VERIFIED IMMUTABLE HASH
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px', wordBreak: 'break-all' }}>
            SHA256: {evidence.sha256_hash}
          </p>
        </div>

        {/* Evidence Fields */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>ACTOR</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{evidence.actor}</span>
            </div>
            <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>ACTION &amp; TARGET</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{evidence.action} → {evidence.resource}</span>
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>DECISION REASON</span>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{evidence.reason}</p>
          </div>

          {/* Redacted Payload */}
          <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              NORMALIZED &amp; SANITIZED EVENT PAYLOAD
            </span>
            <pre
              style={{
                margin: 0,
                padding: '10px',
                background: '#08090d',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#34d399',
                overflowX: 'auto',
                maxHeight: '220px',
              }}
            >
              {JSON.stringify(evidence.normalized_event || evidence.raw_event_payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>Environment: {evidence.environment_id}</span>
          <span>{new Date(evidence.timestamp).toUTCString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Empty State Component ───────────────────────────────────────────
export function EmptyProtectState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 255, 0.01)',
        margin: '16px 0',
      }}
    >
      <ShieldAlert size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 12px auto' }} />
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '6px 0 0 0' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '16px',
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 600,
            background: '#10b981',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
