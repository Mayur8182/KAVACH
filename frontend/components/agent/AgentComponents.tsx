'use client';

/**
 * AgentComponents — Shared UI components for THING AGENT workspace.
 * Status badges, risk indicators, decision chips, evidence drawers, etc.
 * All using design system tokens. No Tailwind.
 */

import React, { useState } from 'react';
import { Shield, AlertTriangle, X, CheckCircle2, Ban, Clock, Loader2 } from 'lucide-react';

// ── Risk Badge ──────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171', label: 'CRITICAL' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', color: '#fb923c', label: 'HIGH' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#facc15', label: 'MEDIUM' },
  LOW:      { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80', label: 'LOW' },
  UNKNOWN:  { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', label: 'UNKNOWN' },
};

export const RiskBadge: React.FC<{ risk: string; size?: 'sm' | 'md' }> = ({ risk, size = 'sm' }) => {
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.UNKNOWN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 12,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 700, color: cfg.color,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
};

// ── Status Badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string }> = {
  ACTIVE:       { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  PROTECTED:    { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  VALID:        { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  ALLOWED:      { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  APPROVED:     { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  SUCCESS:      { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  DECLARED:     { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#818cf8' },
  PENDING:      { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#facc15' },
  SIGNAL:       { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#facc15' },
  ATTENTION:    { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#facc15' },
  SUSPECTED:    { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', color: '#fb923c' },
  DETECTED:     { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', color: '#fb923c' },
  HIGH_RISK:    { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', color: '#fb923c' },
  ANOMALOUS:    { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', color: '#fb923c' },
  BLOCKED:      { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  FAILED:       { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  REJECTED:     { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  REVOKED:      { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  DISABLED:     { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  QUARANTINED:  { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  EXPIRED:      { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8' },
  INACTIVE:     { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8' },
  UNKNOWN:      { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8' },
  VERIFIED_VIOLATION: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 12,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 700, color: cfg.color,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

// ── Decision Badge ──────────────────────────────────────────────────────────

export const DecisionBadge: React.FC<{ decision: string }> = ({ decision }) => {
  const isBlock = ['BLOCKED', 'FAILED', 'DENY', 'QUARANTINE'].includes(decision);
  const isAllow = ['ALLOWED', 'ALLOW', 'APPROVED', 'SUCCESS'].includes(decision);
  const isPending = ['PENDING', 'CHALLENGE', 'APPROVAL_REQUIRED'].includes(decision);

  const cfg = isBlock
    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171', icon: <Ban size={10} /> }
    : isAllow
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80', icon: <CheckCircle2 size={10} /> }
    : isPending
    ? { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#facc15', icon: <Clock size={10} /> }
    : { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', icon: <Shield size={10} /> };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 10, fontWeight: 700, color: cfg.color,
      fontFamily: 'var(--font-mono)',
    }}>
      {cfg.icon}
      {decision}
    </span>
  );
};

// ── Metric Card ─────────────────────────────────────────────────────────────

export const MetricCard: React.FC<{
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, sub, accent = '#a78bfa', icon }) => (
  <div style={{
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {icon && <span style={{ color: accent, opacity: 0.7 }}>{icon}</span>}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: accent, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>}
  </div>
);

// ── Empty State ─────────────────────────────────────────────────────────────

export const AgentEmptyState: React.FC<{ title: string; description: string; icon?: React.ReactNode }> = ({
  title, description, icon,
}) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '60px 24px', gap: 12, textAlign: 'center',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#7c3aed',
    }}>
      {icon || <Shield size={20} />}
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 360, lineHeight: 1.6 }}>{description}</div>
  </div>
);

// ── Loading State ───────────────────────────────────────────────────────────

export const AgentLoading: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 }}>
    <Loader2 size={16} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading agent data…</span>
  </div>
);

// ── Error State ─────────────────────────────────────────────────────────────

export const AgentError: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    margin: 24, padding: '16px 20px', borderRadius: 10,
    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
    display: 'flex', alignItems: 'flex-start', gap: 10,
  }}>
    <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 4 }}>Error loading data</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{message}</div>
    </div>
  </div>
);

// ── Attention Banner ────────────────────────────────────────────────────────

export const AttentionBanner: React.FC<{
  type: string;
  title: string;
  severity: string;
  action_href?: string;
}> = ({ type, title, severity, action_href }) => {
  const isHigh = severity === 'HIGH' || severity === 'CRITICAL';
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8,
      background: isHigh ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
      border: `1px solid ${isHigh ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={13} color={isHigh ? '#f87171' : '#facc15'} />
        <span style={{ fontSize: 12, color: isHigh ? '#f87171' : '#facc15', fontWeight: 500 }}>{title}</span>
      </div>
      {action_href && (
        <a href={action_href} style={{
          fontSize: 11, color: '#a78bfa', textDecoration: 'none',
          fontFamily: 'var(--font-mono)', fontWeight: 600,
          borderBottom: '1px solid rgba(167,139,250,0.3)',
          paddingBottom: 1, whiteSpace: 'nowrap',
        }}>
          INVESTIGATE →
        </a>
      )}
    </div>
  );
};

// ── Evidence Drawer ─────────────────────────────────────────────────────────

export const EvidenceDrawer: React.FC<{
  evidence: any;
  onClose: () => void;
}> = ({ evidence, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
  }} onClick={onClose}>
    <div
      style={{
        width: 480, maxWidth: '92vw',
        background: 'var(--color-bg)',
        borderLeft: '1px solid var(--color-border)',
        overflowY: 'auto',
        padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a78bfa' }}>
          EVIDENCE RECORD
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}>
          <X size={16} />
        </button>
      </div>

      {/* Evidence fields */}
      {Object.entries(evidence || {}).map(([k, v]) => (
        <div key={k} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            {k.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
            {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Table Helpers ───────────────────────────────────────────────────────────

export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      {children}
    </table>
  </div>
);

export const Th: React.FC<{ children?: React.ReactNode; width?: string }> = ({ children, width }) => (
  <th style={{
    textAlign: 'left', padding: '8px 16px', width,
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
    color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
    borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
    background: 'var(--color-surface)',
  }}>
    {children}
  </th>
);

export const Td: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <td style={{
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'var(--color-text)',
    fontFamily: mono ? 'var(--font-mono)' : undefined,
    fontSize: 12,
    verticalAlign: 'middle',
  }}>
    {children}
  </td>
);

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <tr
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : undefined,
      transition: 'background 0.1s',
    }}
    onMouseEnter={(e) => onClick && ((e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.04)')}
    onMouseLeave={(e) => onClick && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
  >
    {children}
  </tr>
);

export const SectionHeader: React.FC<{ title: string; sub?: string; actions?: React.ReactNode }> = ({
  title, sub, actions,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
    {actions}
  </div>
);
