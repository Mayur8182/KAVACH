'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Key,
  Terminal,
  FileCode2,
  Lock,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export interface HotspotItem {
  id: string;
  display_id: string;
  title: string;
  file: string;
  file_path: string;
  category: string;
  severity: string;
  risk_level: string;
  status: string;
  detected: string;
  created_at?: string;
  lines: string;
  branch: string;
  repository: string;
  assignee: string;
  rule_id?: string;
  cwe?: string;
  owasp?: string;
}

export const HotspotSeverityBadge: React.FC<{ severity: string; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  const sev = (severity || 'medium').toUpperCase();

  const styles: Record<string, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    HIGH: { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5' },
    MEDIUM: { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A' },
    LOW: { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' },
  };

  const current = styles[sev] || styles.MEDIUM;
  const padding = size === 'sm' ? '2px 7px' : '3px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        borderRadius: '9999px',
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: current.text,
        }}
      />
      {sev.charAt(0) + sev.slice(1).toLowerCase()}
    </span>
  );
};

export const HotspotStatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const norm = (status || 'TO_REVIEW').toUpperCase().replace(' ', '_');

  const configs: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<any> }
  > = {
    TO_REVIEW: { label: 'To Review', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: Clock },
    IN_REVIEW: { label: 'In Review', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: Clock },
    CONFIRMED_RISK: { label: 'Confirmed Risk', bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5', icon: AlertTriangle },
    ACKNOWLEDGED: { label: 'Acknowledged', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: AlertTriangle },
    SAFE: { label: 'Safe', bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', icon: ShieldCheck },
    FIXED: { label: 'Fixed', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: CheckCircle2 },
    FIXED_VERIFIED: { label: 'Fixed & Verified', bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', icon: CheckCircle2 },
    REMEDIATION: { label: 'Remediation', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', icon: AlertTriangle },
    FALSE_POSITIVE: { label: 'False Positive', bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0', icon: ShieldAlert },
  };

  const c = configs[norm] || configs.TO_REVIEW;
  const Icon = c.icon;
  const padding = size === 'sm' ? '2px 7px' : '3px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding,
        borderRadius: '9999px',
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontSize,
        fontWeight: 600,
      }}
    >
      <Icon size={12} color={c.text} />
      {c.label}
    </span>
  );
};

export const HotspotCategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const getIcon = (cat: string) => {
    const l = cat.toLowerCase();
    if (l.includes('injection') || l.includes('command')) return Terminal;
    if (l.includes('crypto')) return Lock;
    if (l.includes('auth')) return Key;
    if (l.includes('exposure') || l.includes('data')) return ShieldAlert;
    return FileCode2;
  };
  const Icon = getIcon(category);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      <Icon size={14} color="#64748B" />
      {category}
    </span>
  );
};

export const HotspotDonutChart: React.FC<{
  byStatus: Record<string, number>;
  total: number;
  size?: number;
}> = ({ byStatus, total, size = 180 }) => {
  const radius = 64;
  const strokeWidth = 22;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { key: 'TO_REVIEW', label: 'To Review', color: '#EF4444', count: byStatus.TO_REVIEW || 0 },
    { key: 'ACKNOWLEDGED', label: 'Acknowledged', color: '#3B82F6', count: byStatus.ACKNOWLEDGED || 0 },
    { key: 'SAFE', label: 'Safe', color: '#10B981', count: byStatus.SAFE || 0 },
    { key: 'FIXED', label: 'Fixed', color: '#059669', count: byStatus.FIXED || 0 },
    { key: 'FALSE_POSITIVE', label: 'False Positive', color: '#94A3B8', count: byStatus.FALSE_POSITIVE || 0 },
  ].filter((s) => s.count > 0);

  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
            />
          ) : (
            segments.map((seg) => {
              const strokeDasharray = `${(seg.count / total) * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += seg.count / total;

              return (
                <circle
                  key={seg.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: `${center}px ${center}px`,
                    transition: 'stroke-dasharray 0.5s ease',
                  }}
                />
              );
            })
          )}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
            {total}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginTop: '3px' }}>
            Total
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
          return (
            <div
              key={seg.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: seg.color,
                  }}
                />
                <span style={{ color: '#475569', fontWeight: 500 }}>{seg.label}</span>
              </div>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>
                {seg.count} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HotspotCategoryBarChart: React.FC<{
  byCategory: Array<{ category: string; count: number }>;
}> = ({ byCategory }) => {
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count));

  const colors = ['#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#6366F1', '#8B5CF6', '#10B981'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {byCategory.slice(0, 6).map((item, index) => {
        const widthPct = Math.max(12, Math.round((item.count / maxCount) * 100));
        const color = colors[index % colors.length];

        return (
          <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#475569',
                fontWeight: 500,
              }}
            >
              <span>{item.category}</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.count}</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: '#F1F5F9',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  borderRadius: '4px',
                  backgroundColor: color,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const HotspotsBreadcrumbs: React.FC<{
  currentPage: string;
  subPage?: string;
  hotspotId?: string;
}> = ({ currentPage, subPage, hotspotId }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#64748B',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: '10px',
      }}
    >
      <span>THING CODE</span>
      <ChevronRight size={12} color="#94A3B8" />
      <span>SAST</span>
      <ChevronRight size={12} color="#94A3B8" />
      <Link
        href="/sast/hotspots"
        style={{ color: '#64748B', textDecoration: 'none' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
      >
        Security Hotspots
      </Link>
      {currentPage && (
        <>
          <ChevronRight size={12} color="#94A3B8" />
          <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentPage}</span>
        </>
      )}
      {hotspotId && (
        <>
          <ChevronRight size={12} color="#94A3B8" />
          <span style={{ color: '#2563EB', fontWeight: 600 }}>{hotspotId}</span>
        </>
      )}
    </div>
  );
};
