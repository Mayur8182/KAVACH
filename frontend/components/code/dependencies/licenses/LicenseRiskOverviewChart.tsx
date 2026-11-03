'use client';

import React from 'react';
import { LicenseRiskBar } from '@/types/api/dependencies';

interface LicenseRiskOverviewChartProps {
  data: LicenseRiskBar[];
  loading?: boolean;
}

export const LicenseRiskOverviewChart: React.FC<LicenseRiskOverviewChartProps> = ({
  data,
  loading = false,
}) => {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

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
        height: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          License Risk Overview
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          Policy Risk Tiers
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: '18px',
                backgroundColor: '#F8FAFC',
                borderRadius: '4px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          No risk tier data available.
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {data.map((item) => {
            const barWidthPercent = Math.max(4, Math.round((item.count / maxCount) * 100));

            return (
              <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Category Label */}
                <div style={{ width: '85px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  {item.category}
                </div>

                {/* Bar Track */}
                <div
                  style={{
                    flex: 1,
                    height: '12px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${barWidthPercent}%`,
                      height: '100%',
                      backgroundColor: item.color,
                      borderRadius: '6px',
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>

                {/* Count & Percentage */}
                <div style={{ width: '60px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  {item.count} <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>({item.percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
