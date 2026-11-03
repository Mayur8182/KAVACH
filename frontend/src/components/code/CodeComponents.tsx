'use client';

/**
 * ScanStatusBadge — Displays repository scan status with appropriate color coding.
 * Uses deterministic status values only — no invented states.
 */

import React from 'react';

type ScanStatus =
  | 'HEALTHY'
  | 'FINDINGS'
  | 'SCAN_FAILED'
  | 'NEVER_SCANNED'
  | 'SCANNING'
  | 'SCAN_PENDING'
  | 'DISCONNECTED'
  | 'AUTHENTICATION_FAILED'
  | 'UNKNOWN'
  | string;

interface ScanStatusBadgeProps {
  status: ScanStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot?: string }> = {
  HEALTHY: { label: 'Healthy', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', dot: '#22c55e' },
  FINDINGS: { label: 'Findings', color: '#f97316', bg: 'rgba(249,115,22,0.12)', dot: '#f97316' },
  SCAN_FAILED: { label: 'Scan Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', dot: '#ef4444' },
  NEVER_SCANNED: { label: 'Never Scanned', color: '#6b7280', bg: 'rgba(107,114,128,0.10)', dot: '#6b7280' },
  SCANNING: { label: 'Scanning…', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', dot: '#3b82f6' },
  SCAN_PENDING: { label: 'Pending', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6' },
  DISCONNECTED: { label: 'Disconnected', color: '#6b7280', bg: 'rgba(107,114,128,0.10)', dot: '#6b7280' },
  AUTHENTICATION_FAILED: { label: 'Auth Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', dot: '#ef4444' },
  UNKNOWN: { label: 'Unknown', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

export const ScanStatusBadge: React.FC<ScanStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN;
  const fs = size === 'md' ? '11px' : '10px';
  const px = size === 'md' ? '8px' : '6px';
  const py = size === 'md' ? '3px' : '2px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: fs,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        padding: `${py} ${px}`,
        borderRadius: '4px',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.dot && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: cfg.dot,
            flexShrink: 0,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
};

/**
 * FindingSeverityChip — Compact severity indicator for use in tables and lists.
 */

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL' | string;

interface FindingSeverityChipProps {
  severity: Severity;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  HIGH: { color: '#f97316', bg: 'rgba(249,115,22,0.13)' },
  MEDIUM: { color: '#eab308', bg: 'rgba(234,179,8,0.13)' },
  LOW: { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  INFORMATIONAL: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
};

export const FindingSeverityChip: React.FC<FindingSeverityChipProps> = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity?.toUpperCase()] ?? SEVERITY_CONFIG.LOW;
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '10px',
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        padding: '2px 7px',
        borderRadius: '4px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {severity}
    </span>
  );
};

/**
 * ScannerChip — Shows which scanner produced a finding.
 */
interface ScannerChipProps {
  scanner: string;
}

const SCANNER_COLORS: Record<string, string> = {
  semgrep: '#6366f1',
  gitleaks: '#ec4899',
  trivy: '#06b6d4',
  osv: '#10b981',
  checkov: '#f59e0b',
};

export const ScannerChip: React.FC<ScannerChipProps> = ({ scanner }) => {
  const lc = scanner.toLowerCase();
  const color = SCANNER_COLORS[lc] ?? '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '10px',
        fontWeight: 600,
        color,
        background: `${color}18`,
        padding: '2px 7px',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
      }}
    >
      {scanner}
    </span>
  );
};

/**
 * MetricCard — Used in the overview grid.
 */
interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sublabel, color, loading }) => (
  <div
    style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    }}
  >
    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
    {loading ? (
      <div style={{ height: '28px', background: '#F1F5F9', borderRadius: '4px', width: '60%' }} />
    ) : (
      <span
        style={{
          fontSize: '26px',
          fontWeight: 700,
          color: color ?? '#0F172A',
          lineHeight: 1,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {value}
      </span>
    )}
    {sublabel && (
      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{sublabel}</span>
    )}
  </div>
);

/**
 * CoverageBar — Displays scanner coverage as a progress bar with counts.
 */
interface CoverageBarProps {
  label: string;
  covered: int;
  total: int;
  loading?: boolean;
}

// TypeScript: use number type
type int = number;

export const CoverageBar: React.FC<{ label: string; covered: number; total: number; loading?: boolean }> = ({
  label,
  covered,
  total,
  loading,
}) => {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{label}</span>
        {loading ? (
          <div style={{ height: '14px', background: '#F1F5F9', borderRadius: '3px', width: '60px' }} />
        ) : (
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748B', fontWeight: 600 }}>
            {covered}/{total}
          </span>
        )}
      </div>
      <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '99px', overflow: 'hidden' }}>
        {!loading && (
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: pct === 100 ? '#10B981' : pct > 50 ? '#2563EB' : '#F59E0B',
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * EmptyCodeState — Shown when a code workspace page has no data yet.
 */
interface EmptyCodeStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  type?: 'empty' | 'not-connected' | 'error';
}

export const EmptyCodeState: React.FC<EmptyCodeStateProps> = ({ title, description, action, type = 'empty' }) => {
  const icon = type === 'not-connected' ? '🔌' : type === 'error' ? '⚠️' : '📁';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '50px 24px',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '32px' }}>{icon}</span>
      <div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
          {title}
        </p>
        <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px' }}>{description}</p>
      </div>
      {action}
    </div>
  );
};

export const RepositoryStatusBadge = ScanStatusBadge;

