'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useOverview } from './OverviewContext';
import { api } from '@/lib/api/client';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Layers,
  Play,
  GitPullRequest,
  Clock,
  Sliders,
  ShieldCheck,
  Settings,
  FolderGit2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface OverviewData {
  cards: {
    total_findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_change?: string;
    critical_change?: string;
    high_change?: string;
    medium_change?: string;
    low_change?: string;
  };
  trend_series: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
  status_distribution: {
    open: number;
    in_progress: number;
    resolved: number;
    false_positive: number;
    ignored: number;
    total: number;
  };
  has_scans: boolean;
}

export default function SASTOverviewPage() {
  const {
    repository,
    branch,
    dateRange,
    refreshKey,
    triggerRefresh,
    setIsStartScanOpen,
    setIsScanPrOpen,
    setIsScheduleScanOpen,
  } = useOverview();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.overview({
        repository: repository !== 'all' ? repository : undefined,
        branch: branch !== 'all' ? branch : undefined,
        date_range: dateRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load SAST overview.');
    } finally {
      setLoading(false);
    }
  }, [repository, branch, dateRange]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, refreshKey]);

  if (loading && !data) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: '96px', backgroundColor: '#E2E8F0', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
          <div style={{ height: '320px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
          <div style={{ height: '320px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
          <ShieldAlert size={36} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#991B1B' }}>Unable to load SAST overview</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#B91C1C' }}>{error}</p>
          <button
            onClick={() => loadOverview()}
            style={{
              padding: '8px 18px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const cards = data?.cards ?? {
    total_findings: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const series = data?.trend_series ?? [];
  const statusDist = data?.status_distribution ?? {
    open: 0,
    in_progress: 0,
    resolved: 0,
    false_positive: 0,
    ignored: 0,
    total: 0,
  };

  const hasAnyScans = data?.has_scans ?? false;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
          SAST Overview
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
          Overview of security posture and key insights from your codebase.
        </p>
      </div>

      {/* Empty State Banner if no scans exist */}
      {!hasAnyScans && (
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#1E40AF' }}>
                No security scans have been completed yet.
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#3B82F6' }}>
                Connect a repository and run your first SAST scan to detect real vulnerabilities and verify policy gates.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/sast/integrations"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E40AF',
                backgroundColor: '#DBEAFE',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              Connect Repository
            </Link>
            <button
              onClick={() => setIsStartScanOpen(true)}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={14} /> Start Scan
            </button>
          </div>
        </div>
      )}

      {/* Panel 1.1: Top 5 Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total Findings Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={16} color="#DC2626" />
              </div>
              <span style={cardLabelStyle}>Total Findings</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={cardNumberStyle}>{cards.total_findings}</span>
            {cards.total_change && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: cards.total_change.startsWith('+') ? '#DC2626' : '#16A34A' }}>
                {cards.total_change}
              </span>
            )}
          </div>
        </div>

        {/* Critical Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={16} color="#DC2626" />
              </div>
              <span style={cardLabelStyle}>Critical</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ ...cardNumberStyle, color: '#DC2626' }}>{cards.critical}</span>
            {cards.critical_change && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: cards.critical_change.startsWith('+') ? '#DC2626' : '#16A34A' }}>
                {cards.critical_change}
              </span>
            )}
          </div>
        </div>

        {/* High Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={16} color="#EA580C" />
              </div>
              <span style={cardLabelStyle}>High</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ ...cardNumberStyle, color: '#EA580C' }}>{cards.high}</span>
            {cards.high_change && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: cards.high_change.startsWith('+') ? '#DC2626' : '#16A34A' }}>
                {cards.high_change}
              </span>
            )}
          </div>
        </div>

        {/* Medium Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEFCE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={16} color="#CA8A04" />
              </div>
              <span style={cardLabelStyle}>Medium</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ ...cardNumberStyle, color: '#CA8A04' }}>{cards.medium}</span>
            {cards.medium_change && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: cards.medium_change.startsWith('+') ? '#DC2626' : '#16A34A' }}>
                {cards.medium_change}
              </span>
            )}
          </div>
        </div>

        {/* Low Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info size={16} color="#2563EB" />
              </div>
              <span style={cardLabelStyle}>Low</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ ...cardNumberStyle, color: '#2563EB' }}>{cards.low}</span>
            {cards.low_change && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: cards.low_change.startsWith('+') ? '#DC2626' : '#16A34A' }}>
                {cards.low_change}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '20px', marginBottom: '28px' }}>
        {/* Left: Findings Trend Chart */}
        <div style={panelContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={panelTitleStyle}>Findings Trend</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748B' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} /> Critical
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EA580C' }} /> High
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CA8A04' }} /> Medium
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} /> Low
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          {series.length === 0 ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No historical finding trend points recorded yet.
            </div>
          ) : (
            <TrendLineChart series={series} />
          )}
        </div>

        {/* Right: Findings by Status Donut Chart */}
        <div style={panelContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={panelTitleStyle}>Findings by Status</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '240px' }}>
            <DonutChart
              total={statusDist.total}
              slices={[
                { label: 'Open', count: statusDist.open, color: '#DC2626' },
                { label: 'In Progress', count: statusDist.in_progress, color: '#2563EB' },
                { label: 'Resolved', count: statusDist.resolved, color: '#16A34A' },
                { label: 'False Positive', count: statusDist.false_positive, color: '#0D9488' },
                { label: 'Ignored', count: statusDist.ignored, color: '#94A3B8' },
              ]}
            />

            {/* Status Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Open', count: statusDist.open, color: '#DC2626' },
                { label: 'In Progress', count: statusDist.in_progress, color: '#2563EB' },
                { label: 'Resolved', count: statusDist.resolved, color: '#16A34A' },
                { label: 'False Positive', count: statusDist.false_positive, color: '#0D9488' },
                { label: 'Ignored', count: statusDist.ignored, color: '#94A3B8' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '150px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                    <span style={{ color: '#475569' }}>{item.label}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel 1.7: Quick Actions */}
      <div style={panelContainerStyle}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={panelTitleStyle}>Quick Actions</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
            Common tasks to help you get started with code security.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* 1. Start New Scan */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Play size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Start New Scan</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Run a security scan on your repository.
            </p>
            <button onClick={() => setIsStartScanOpen(true)} style={actionBtnStyle}>
              Start Scan
            </button>
          </div>

          {/* 2. Scan Pull Request */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <GitPullRequest size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Scan Pull Request</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Scan a pull request for security issues.
            </p>
            <button onClick={() => setIsScanPrOpen(true)} style={actionBtnStyle}>
              Select PR
            </button>
          </div>

          {/* 3. Schedule Scan */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Clock size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Schedule Scan</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Set up recurring scans for your repository.
            </p>
            <button onClick={() => setIsScheduleScanOpen(true)} style={actionBtnStyle}>
              Create Schedule
            </button>
          </div>

          {/* 4. Manage Rules */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sliders size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Manage Rules</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Configure and manage SAST rules.
            </p>
            <Link href="/code/configuration" style={{ ...actionBtnStyle, textAlign: 'center', textDecoration: 'none' }}>
              Manage Rules
            </Link>
          </div>

          {/* 5. View Policies */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <ShieldCheck size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>View Policies</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Set up security policies and quality gates.
            </p>
            <Link href="/code/policies" style={{ ...actionBtnStyle, textAlign: 'center', textDecoration: 'none' }}>
              View Policies
            </Link>
          </div>

          {/* 6. Configure Settings */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Settings size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Configure Settings</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Update scan settings and exclusions.
            </p>
            <Link href="/code/settings" style={{ ...actionBtnStyle, textAlign: 'center', textDecoration: 'none' }}>
              Open Settings
            </Link>
          </div>

          {/* 7. Integrate Repository */}
          <div style={actionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <FolderGit2 size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Integrate Repository</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0' }}>
              Connect your repository with SecuLayer.
            </p>
            <Link href="/sast/integrations" style={{ ...actionBtnStyle, textAlign: 'center', textDecoration: 'none' }}>
              View Integrations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// SVG Line Chart Component
function TrendLineChart({ series }: { series: any[] }) {
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    10,
    ...series.map((s) => Math.max(s.critical, s.high, s.medium, s.low, s.total))
  );

  const getX = (index: number) => padding.left + (index / Math.max(1, series.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - (val / maxVal) * innerHeight;

  const makePath = (key: string) => {
    return series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s[key])}`).join(' ');
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '220px', overflow: 'visible' }}>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = padding.top + innerHeight * (1 - pct);
        const labelVal = Math.round(maxVal * pct);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#F1F5F9" strokeDasharray="3 3" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94A3B8">
              {labelVal}
            </text>
          </g>
        );
      })}

      {/* Date Labels on X Axis */}
      {series.map((s, i) => (
        <text key={i} x={getX(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94A3B8">
          {s.date}
        </text>
      ))}

      {/* Lines */}
      <path d={makePath('low')} fill="none" stroke="#2563EB" strokeWidth="2" />
      <path d={makePath('medium')} fill="none" stroke="#CA8A04" strokeWidth="2" />
      <path d={makePath('high')} fill="none" stroke="#EA580C" strokeWidth="2" />
      <path d={makePath('critical')} fill="none" stroke="#DC2626" strokeWidth="2" />

      {/* Points */}
      {series.map((s, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(s.critical)} r="3" fill="#DC2626" />
          <circle cx={getX(i)} cy={getY(s.high)} r="3" fill="#EA580C" />
          <circle cx={getX(i)} cy={getY(s.medium)} r="3" fill="#CA8A04" />
          <circle cx={getX(i)} cy={getY(s.low)} r="3" fill="#2563EB" />
        </g>
      ))}
    </svg>
  );
}

// SVG Donut Chart Component
function DonutChart({ total, slices }: { total: number; slices: Array<{ label: string; count: number; color: string }> }) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
        ) : (
          slices.map((slice, i) => {
            if (slice.count === 0) return null;
            const slicePercent = slice.count / total;
            const strokeDasharray = `${slicePercent * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercent * circumference;
            cumulativePercent += slicePercent;

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })
        )}
      </svg>
      {/* Center Label */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Total</span>
      </div>
    </div>
  );
}

// Styles
const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '16px 20px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748B',
};

const cardNumberStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#0F172A',
  lineHeight: 1,
};

const panelContainerStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '20px 24px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
  color: '#0F172A',
};

const actionCardStyle: React.CSSProperties = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#2563EB',
  backgroundColor: '#EFF6FF',
  border: '1px solid #BFDBFE',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
