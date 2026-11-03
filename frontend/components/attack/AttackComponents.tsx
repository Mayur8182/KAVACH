'use client';

/**
 * Thing Attack — Reusable UI Components
 * Badges, Evidence Drawers, Safety Panels, and Visual Indicators.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Download,
  Copy,
  Terminal,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';

// ── Severity Badge ───────────────────────────────────────────────

export const SeverityBadge: React.FC<{ severity: string; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  const s = severity?.toUpperCase() || 'LOW';
  let bg = 'rgba(107, 114, 128, 0.12)';
  let color = '#9ca3af';
  let border = 'rgba(107, 114, 128, 0.25)';

  if (s === 'CRITICAL') {
    bg = 'rgba(239, 68, 68, 0.14)';
    color = '#ef4444';
    border = 'rgba(239, 68, 68, 0.35)';
  } else if (s === 'HIGH') {
    bg = 'rgba(249, 115, 22, 0.14)';
    color = '#f97316';
    border = 'rgba(249, 115, 22, 0.35)';
  } else if (s === 'MEDIUM') {
    bg = 'rgba(234, 179, 8, 0.14)';
    color = '#eab308';
    border = 'rgba(234, 179, 8, 0.35)';
  } else if (s === 'LOW') {
    bg = 'rgba(59, 130, 246, 0.14)';
    color = '#3b82f6';
    border = 'rgba(59, 130, 246, 0.35)';
  }

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '1px 6px' : '2px 8px',
        fontSize: isSmall ? '9.5px' : '10.5px',
        fontWeight: 700,
        borderRadius: '4px',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {s}
    </span>
  );
};

// ── Exploitability Badge ─────────────────────────────────────────

export const ExploitabilityBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toUpperCase() || 'THEORETICAL';

  let bg = 'rgba(107, 114, 128, 0.12)';
  let color = '#9ca3af';
  let border = 'rgba(107, 114, 128, 0.2)';
  let icon = <HelpCircle size={10} />;

  if (s === 'EXPLOITABLE' || s === 'VERIFIED') {
    bg = 'rgba(220, 38, 38, 0.15)';
    color = '#dc2626';
    border = 'rgba(220, 38, 38, 0.4)';
    icon = <AlertTriangle size={10} />;
  } else if (s === 'NOT_EXPLOITABLE' || s === 'VERIFIED_SAFE') {
    bg = 'rgba(16, 185, 129, 0.12)';
    color = '#10b981';
    border = 'rgba(16, 185, 129, 0.3)';
    icon = <ShieldCheck size={10} />;
  } else if (s === 'TESTED' || s === 'TESTABLE') {
    bg = 'rgba(59, 130, 246, 0.12)';
    color = '#3b82f6';
    border = 'rgba(59, 130, 246, 0.3)';
    icon = <Clock size={10} />;
  } else if (s === 'BLOCKED') {
    bg = 'rgba(139, 92, 246, 0.15)';
    color = '#8b5cf6';
    border = 'rgba(139, 92, 246, 0.4)';
    icon = <Lock size={10} />;
  } else if (s === 'THEORETICAL' || s === 'DETECTED') {
    bg = 'rgba(234, 179, 8, 0.12)';
    color = '#eab308';
    border = 'rgba(234, 179, 8, 0.3)';
    icon = <Eye size={10} />;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        fontSize: '10px',
        fontWeight: 700,
        borderRadius: '4px',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        letterSpacing: '0.03em',
      }}
    >
      {icon}
      {s.replace(/_/g, ' ')}
    </span>
  );
};

// ── Provenance Badge ─────────────────────────────────────────────

export const ProvenanceBadge: React.FC<{ provenance: string }> = ({ provenance }) => {
  const p = provenance?.toUpperCase() || 'INFERRED';

  let color = '#94a3b8';
  let bg = 'rgba(148, 163, 184, 0.1)';

  if (p === 'OBSERVED') {
    color = '#38bdf8';
    bg = 'rgba(56, 189, 248, 0.12)';
  } else if (p === 'VERIFIED') {
    color = '#22c55e';
    bg = 'rgba(34, 197, 94, 0.12)';
  } else if (p === 'CONFIGURED') {
    color = '#a855f7';
    bg = 'rgba(168, 85, 247, 0.12)';
  } else if (p === 'INFERRED') {
    color = '#f59e0b';
    bg = 'rgba(245, 158, 11, 0.12)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '1px 5px',
        fontSize: '9.5px',
        fontWeight: 600,
        borderRadius: '3px',
        background: bg,
        color: color,
        border: `1px solid ${color}33`,
        letterSpacing: '0.02em',
      }}
    >
      {p}
    </span>
  );
};

// ── Attack Status Badge ──────────────────────────────────────────

export const AttackStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toUpperCase() || 'NOT_TESTED';

  let color = 'var(--color-text-muted)';
  let bg = 'var(--color-surface-elevated)';

  if (s === 'RUNNING' || s === 'TESTING') {
    color = '#38bdf8';
    bg = 'rgba(56, 189, 248, 0.15)';
  } else if (s === 'COMPLETED' || s === 'VERIFIED_SAFE') {
    color = '#10b981';
    bg = 'rgba(16, 185, 129, 0.12)';
  } else if (s === 'EXPLOITABLE' || s === 'FINDING_DETECTED' || s === 'FAILED') {
    color = '#ef4444';
    bg = 'rgba(239, 68, 68, 0.12)';
  } else if (s === 'PENDING_APPROVAL') {
    color = '#f59e0b';
    bg = 'rgba(245, 158, 11, 0.12)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        fontSize: '10.5px',
        fontWeight: 600,
        borderRadius: '4px',
        color,
        background: bg,
        border: `1px solid ${color}33`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
        }}
      />
      {s.replace(/_/g, ' ')}
    </span>
  );
};

// ── Metric Card ──────────────────────────────────────────────────

export const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  color?: string;
  loading?: boolean;
}> = ({ label, value, sublabel, color, loading }) => {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '10.5px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 'var(--weight-bold)',
          color: color || 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {loading ? '…' : value}
      </div>
      {sublabel && (
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {sublabel}
        </span>
      )}
    </div>
  );
};

// ── Evidence Drawer ──────────────────────────────────────────────

export const EvidenceDrawer: React.FC<{
  evidence: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ evidence, isOpen, onClose }) => {
  if (!isOpen || !evidence) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '640px',
          maxWidth: '90vw',
          height: '100%',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Verifiable Exploit Evidence
            </h3>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              SECRETS REDACTED
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              background: 'var(--color-surface-elevated)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Evidence Type</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {evidence.evidence_type}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Source</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {evidence.source}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Target URL</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontFamily: 'monospace', color: '#f87171' }}>
                {evidence.target_url}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Observed At</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                {evidence.observed_at}
              </p>
            </div>
          </div>

          {/* HTTP Request */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                HTTP Request Headers
              </span>
            </div>
            <pre
              style={{
                background: '#0d1117',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                color: '#e6edf3',
                fontFamily: 'monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(evidence.request_headers, null, 2)}
            </pre>
          </div>

          {/* HTTP Response */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                HTTP Response ({evidence.response_status || 200} OK)
              </span>
            </div>
            <pre
              style={{
                background: '#0d1117',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                color: '#7ee787',
                fontFamily: 'monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {evidence.response_body_redacted || 'No response body recorded.'}
            </pre>
          </div>

          {/* Verification Method */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <strong style={{ color: '#60a5fa' }}>Deterministic Verification Method: </strong>
            {evidence.verification_method || 'Assertion evaluation against HTTP status code, schema violation, and trace signature.'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Empty State ──────────────────────────────────────────────────

export const EmptyAttackState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        background: 'var(--color-surface)',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShieldAlert size={22} color="#ef4444" />
      </div>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '440px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '8px',
            padding: '7px 16px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
