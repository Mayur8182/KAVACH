'use client';

import React from 'react';
import { LicenseTrendPoint } from '@/types/api/dependencies';

interface LicenseTrendsChartProps {
  data: LicenseTrendPoint[];
  loading?: boolean;
}

export const LicenseTrendsChart: React.FC<LicenseTrendsChartProps> = ({
  data,
  loading = false,
}) => {
  const chartHeight = 110;
  const chartWidth = 380;

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.compliant, d.restricted, d.prohibited, d.unknown])
  );

  const getPoints = (getter: (d: LicenseTrendPoint) => number) => {
    if (data.length < 2) return '';
    return data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * chartWidth;
        const y = chartHeight - (getter(d) / maxVal) * (chartHeight - 16);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const ptsCompliant = getPoints((d) => d.compliant);
  const ptsRestricted = getPoints((d) => d.restricted);
  const ptsProhibited = getPoints((d) => d.prohibited);
  const ptsUnknown = getPoints((d) => d.unknown);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          License Trends
        </h3>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#64748B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
            <span>Compliant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} />
            <span>Restricted</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span>Prohibited</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span>Unknown</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '80%',
              height: '90px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          No trend timeline data available.
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* SVG Multi-curve Area Chart */}
          <div style={{ width: '100%', height: `${chartHeight}px`, position: 'relative' }}>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="grad-compliant" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="grad-restricted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid line */}
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#F1F5F9" strokeDasharray="3,3" />
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#E2E8F0" />

              {/* Area Fills */}
              {ptsCompliant && (
                <polygon
                  points={`0,${chartHeight} ${ptsCompliant} ${chartWidth},${chartHeight}`}
                  fill="url(#grad-compliant)"
                />
              )}

              {/* Trend Lines */}
              {ptsCompliant && (
                <polyline fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={ptsCompliant} />
              )}
              {ptsRestricted && (
                <polyline fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={ptsRestricted} />
              )}
              {ptsProhibited && (
                <polyline fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={ptsProhibited} />
              )}
              {ptsUnknown && (
                <polyline fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={ptsUnknown} />
              )}
            </svg>
          </div>

          {/* Dates X-Axis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', paddingTop: '6px' }}>
            {data.map((d) => (
              <span key={d.date}>{d.date}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
