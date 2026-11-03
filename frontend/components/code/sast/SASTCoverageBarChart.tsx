'use client';

import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface SASTRepoCoverageItem {
  repository_name: string;
  findings_count: number;
  critical_count: number;
  coverage_percentage: number;
  last_scan_at?: string;
  status: 'SCANNED' | 'NOT_SCANNED' | 'FAILED';
}

interface SASTCoverageBarChartProps {
  data: SASTRepoCoverageItem[];
  height?: number;
}

export const SASTCoverageBarChart: React.FC<SASTCoverageBarChartProps> = ({
  data,
  height = 220,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          fontSize: '13px',
          gap: '4px',
        }}
      >
        <span style={{ fontWeight: 600 }}>No repository coverage records</span>
        <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Connect repositories and run SAST to track code coverage.</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: `${height}px`,
        overflowY: 'auto',
      }}
    >
      {data.map((repo) => {
        const pct = Math.min(100, Math.max(0, repo.coverage_percentage || 0));
        const barColor =
          repo.status === 'NOT_SCANNED'
            ? '#CBD5E1'
            : repo.critical_count > 0
            ? '#EF4444'
            : pct > 80
            ? '#10B981'
            : '#F59E0B';

        return (
          <div key={repo.repository_name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                {repo.status === 'SCANNED' ? (
                  <ShieldCheck size={13} color="#10B981" />
                ) : (
                  <AlertCircle size={13} color="#94A3B8" />
                )}
                <span
                  style={{
                    fontWeight: 600,
                    color: '#0F172A',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {repo.repository_name}
                </span>
                {repo.critical_count > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#DC2626',
                      backgroundColor: '#FEF2F2',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    {repo.critical_count} crit
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  {repo.findings_count} findings
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', width: '36px', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div
              style={{
                width: '100%',
                height: '7px',
                backgroundColor: '#F1F5F9',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: barColor,
                  borderRadius: '999px',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
