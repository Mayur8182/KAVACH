'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOverview } from '../OverviewContext';
import { api } from '@/lib/api/client';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface SeverityRow {
  severity: string;
  count: number;
  percentage: number;
  open: number;
  in_progress: number;
  resolved: number;
  false_positive: number;
  ignored: number;
}

interface SeverityData {
  total_findings: number;
  distribution: SeverityRow[];
  history_series: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
}

export default function SeverityPage() {
  const { repository, branch, dateRange, refreshKey } = useOverview();
  const [data, setData] = useState<SeverityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSeverity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.severity({
        repository: repository !== 'all' ? repository : undefined,
        branch: branch !== 'all' ? branch : undefined,
        date_range: dateRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load severity distribution.');
    } finally {
      setLoading(false);
    }
  }, [repository, branch, dateRange]);

  useEffect(() => {
    loadSeverity();
  }, [loadSeverity, refreshKey]);

  if (loading && !data) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ height: '300px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
          <div style={{ height: '300px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
        </div>
        <div style={{ height: '240px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
          <ShieldAlert size={36} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#991B1B' }}>Unable to load Severity</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#B91C1C' }}>{error}</p>
          <button
            onClick={() => loadSeverity()}
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

  const totalFindings = data?.total_findings ?? 0;
  const distribution = data?.distribution ?? [];
  const series = data?.history_series ?? [];

  const sevColors: Record<string, string> = {
    Critical: '#DC2626',
    High: '#EA580C',
    Medium: '#CA8A04',
    Low: '#2563EB',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
          Findings by Severity
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
          Detailed breakdown of findings by severity level.
        </p>
      </div>

      {/* Top Section: Donut + Line Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 6fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Severity Distribution Donut */}
        <div style={panelContainerStyle}>
          <h2 style={{ ...panelTitleStyle, marginBottom: '16px' }}>Severity Distribution</h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '240px' }}>
            <SeverityDonut
              total={totalFindings}
              slices={distribution.map((d) => ({
                label: d.severity,
                count: d.count,
                color: sevColors[d.severity] || '#64748B',
              }))}
            />

            {/* Severity Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {distribution.map((d) => {
                const color = sevColors[d.severity] || '#64748B';
                return (
                  <div key={d.severity} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '160px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{d.severity}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{d.count}</span>
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>({d.percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Severity Over Time Line Chart */}
        <div style={panelContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={panelTitleStyle}>Severity Over Time</h2>
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

          {series.length === 0 ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No historical severity data recorded yet.
            </div>
          ) : (
            <TrendLineChart series={series} />
          )}
        </div>
      </div>

      {/* Bottom Section: Severity Breakdown Table */}
      <div style={panelContainerStyle}>
        <h2 style={{ ...panelTitleStyle, marginBottom: '16px' }}>Findings by Severity</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Count</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Percentage</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Open</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>In Progress</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Resolved</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>False Positive</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Ignored</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((row) => {
                const color = sevColors[row.severity] || '#64748B';
                return (
                  <tr key={row.severity} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                        {row.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>{row.count}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{row.percentage}%</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: row.open > 0 ? '#DC2626' : '#64748B' }}>
                      {row.open}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500, color: row.in_progress > 0 ? '#2563EB' : '#64748B' }}>
                      {row.in_progress}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500, color: row.resolved > 0 ? '#16A34A' : '#64748B' }}>
                      {row.resolved}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{row.false_positive}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{row.ignored}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Donut Component
function SeverityDonut({ total, slices }: { total: number; slices: Array<{ label: string; count: number; color: string }> }) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
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

// Trend Line Chart
function TrendLineChart({ series }: { series: any[] }) {
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(10, ...series.map((s) => Math.max(s.critical, s.high, s.medium, s.low, s.total)));

  const getX = (index: number) => padding.left + (index / Math.max(1, series.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - (val / maxVal) * innerHeight;

  const makePath = (key: string) => {
    return series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s[key])}`).join(' ');
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '220px', overflow: 'visible' }}>
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

      {series.map((s, i) => (
        <text key={i} x={getX(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94A3B8">
          {s.date}
        </text>
      ))}

      <path d={makePath('low')} fill="none" stroke="#2563EB" strokeWidth="2" />
      <path d={makePath('medium')} fill="none" stroke="#CA8A04" strokeWidth="2" />
      <path d={makePath('high')} fill="none" stroke="#EA580C" strokeWidth="2" />
      <path d={makePath('critical')} fill="none" stroke="#DC2626" strokeWidth="2" />

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
