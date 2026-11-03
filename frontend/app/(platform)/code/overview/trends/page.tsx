'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOverview } from '../OverviewContext';
import { api } from '@/lib/api/client';
import { ShieldAlert, RefreshCw, ChevronDown } from 'lucide-react';

interface TrendData {
  series: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    new_findings: number;
    resolved_findings: number;
  }>;
  summary: {
    total_findings: number;
    new_findings: number;
    resolved_findings: number;
    net_change: number;
    total_change_pct?: string;
    new_change_pct?: string;
    resolved_change_pct?: string;
  };
  severity_trends: Array<{
    severity: string;
    dates: Record<string, number>;
    change_pct?: string;
  }>;
}

export default function TrendsPage() {
  const { repository, branch, dateRange, refreshKey } = useOverview();
  const [groupBy, setGroupBy] = useState<string>('Day');
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.trends({
        repository: repository !== 'all' ? repository : undefined,
        branch: branch !== 'all' ? branch : undefined,
        date_range: dateRange,
        group_by: groupBy.toLowerCase(),
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load trends.');
    } finally {
      setLoading(false);
    }
  }, [repository, branch, dateRange, groupBy]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends, refreshKey]);

  if (loading && !data) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ height: '320px', backgroundColor: '#E2E8F0', borderRadius: '8px', marginBottom: '20px' }} />
        <div style={{ height: '240px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
          <ShieldAlert size={36} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#991B1B' }}>Unable to load Trends</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#B91C1C' }}>{error}</p>
          <button
            onClick={() => loadTrends()}
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

  const series = data?.series ?? [];
  const summary = data?.summary ?? {
    total_findings: 0,
    new_findings: 0,
    resolved_findings: 0,
    net_change: 0,
  };
  const severityTrends = data?.severity_trends ?? [];

  // Extract date columns from severity trends
  const dateColumns = series.slice(-3).map((s) => s.date);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header with Group By Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
            Finding Trends
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Track how security findings change over time.
          </p>
        </div>

        {/* Group By Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
          <span>Group by:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              aria-label="Group by"
              style={{
                appearance: 'none',
                padding: '6px 26px 6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1E293B',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="Day">Day</option>
              <option value="Week">Week</option>
              <option value="Month">Month</option>
            </select>
            <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Top Section: Line Chart + Trend Summary Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Findings Trend Over Time Chart */}
        <div style={panelContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={panelTitleStyle}>Findings Trend Over Time</h2>
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
              No historical finding trend points recorded yet.
            </div>
          ) : (
            <TrendLineChart series={series} />
          )}
        </div>

        {/* Trend Summary Card */}
        <div style={panelContainerStyle}>
          <h2 style={{ ...panelTitleStyle, marginBottom: '20px' }}>Trend Summary</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Total Findings */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Total Findings</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{summary.total_findings}</span>
                {summary.total_change_pct && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: summary.total_change_pct.startsWith('+') ? '#DC2626' : '#16A34A' }}>
                    ({summary.total_change_pct})
                  </span>
                )}
              </div>
            </div>

            {/* New Findings */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>New Findings</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{summary.new_findings}</span>
                {summary.new_change_pct && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
                    ({summary.new_change_pct})
                  </span>
                )}
              </div>
            </div>

            {/* Resolved Findings */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Resolved Findings</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{summary.resolved_findings}</span>
                {summary.resolved_change_pct && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                    ({summary.resolved_change_pct})
                  </span>
                )}
              </div>
            </div>

            {/* Net Change */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Net Change</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: summary.net_change <= 0 ? '#16A34A' : '#DC2626' }}>
                {summary.net_change > 0 ? `+${summary.net_change}` : summary.net_change}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: New vs Resolved Bar Chart + Severity Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
        {/* New vs Resolved Findings Bar Chart */}
        <div style={panelContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={panelTitleStyle}>New vs Resolved Findings</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748B' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#2563EB' }} /> New Findings
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#16A34A' }} /> Resolved Findings
              </span>
            </div>
          </div>

          {series.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No comparison records available for this period.
            </div>
          ) : (
            <DualBarChart series={series} />
          )}
        </div>

        {/* Findings by Severity Trend Table */}
        <div style={panelContainerStyle}>
          <h2 style={{ ...panelTitleStyle, marginBottom: '16px' }}>Findings by Severity Trend</h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Severity</th>
                  {dateColumns.map((d) => (
                    <th key={d} style={{ padding: '8px 12px', fontWeight: 600 }}>{d}</th>
                  ))}
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {severityTrends.map((row) => {
                  const sevColor =
                    row.severity === 'Critical'
                      ? '#DC2626'
                      : row.severity === 'High'
                      ? '#EA580C'
                      : row.severity === 'Medium'
                      ? '#CA8A04'
                      : '#2563EB';

                  return (
                    <tr key={row.severity} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 500, color: '#0F172A' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sevColor }} />
                          {row.severity}
                        </span>
                      </td>
                      {dateColumns.map((d) => (
                        <td key={d} style={{ padding: '12px', color: '#334155' }}>
                          {row.dates[d] ?? 0}
                        </td>
                      ))}
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {row.change_pct ? (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: row.change_pct.startsWith('+') ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {row.change_pct}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Line Chart
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

// Dual Bar Chart (New vs Resolved)
function DualBarChart({ series }: { series: any[] }) {
  const width = 500;
  const height = 200;
  const padding = { top: 15, right: 15, bottom: 25, left: 30 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(5, ...series.map((s) => Math.max(s.new_findings, s.resolved_findings)));
  const barGroupWidth = innerWidth / Math.max(1, series.length);
  const barWidth = Math.max(4, Math.min(12, (barGroupWidth - 6) / 2));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '200px' }}>
      {[0, 0.5, 1].map((pct, i) => {
        const y = padding.top + innerHeight * (1 - pct);
        return (
          <line
            key={i}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="#F1F5F9"
            strokeDasharray="2 2"
          />
        );
      })}

      {series.map((s, i) => {
        const groupX = padding.left + i * barGroupWidth;
        const newH = (s.new_findings / maxVal) * innerHeight;
        const resH = (s.resolved_findings / maxVal) * innerHeight;

        return (
          <g key={i}>
            {/* New Bar */}
            <rect
              x={groupX + (barGroupWidth / 2) - barWidth - 1}
              y={padding.top + innerHeight - newH}
              width={barWidth}
              height={Math.max(1, newH)}
              fill="#2563EB"
              rx="2"
            />
            {/* Resolved Bar */}
            <rect
              x={groupX + (barGroupWidth / 2) + 1}
              y={padding.top + innerHeight - resH}
              width={barWidth}
              height={Math.max(1, resH)}
              fill="#16A34A"
              rx="2"
            />
            {/* Date label */}
            {i % Math.ceil(series.length / 6) === 0 && (
              <text
                x={groupX + barGroupWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#94A3B8"
              >
                {s.date}
              </text>
            )}
          </g>
        );
      })}
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
