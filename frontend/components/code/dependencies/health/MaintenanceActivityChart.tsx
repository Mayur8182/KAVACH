'use client';

import React, { useState } from 'react';
import { MaintenanceActivityBar } from '@/types/api/dependencies';

interface MaintenanceActivityChartProps {
  data: MaintenanceActivityBar[];
  loading?: boolean;
}

export const MaintenanceActivityChart: React.FC<MaintenanceActivityChartProps> = ({
  data = [],
  loading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(...data.map((d) => d.commits), 100);

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
          Maintenance Activity
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#2563EB',
            backgroundColor: '#EFF6FF',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
        >
          6-Month Cadence
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '6px solid #F1F5F9',
              borderTopColor: '#3B82F6',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
          No maintenance cadence data available.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-end' }}>
          {/* Chart area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              height: '140px',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            {data.map((item, idx) => {
              const heightPct = Math.min(Math.round((item.commits / maxVal) * 100), 100);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={item.month}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: `calc(${heightPct}% + 8px)`,
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      {item.commits} commits · {item.releases} releases
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: `${Math.max(heightPct, 8)}%`,
                      backgroundColor: isHovered ? '#2563EB' : '#93C5FD',
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'all 180ms ease',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Month labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '8px' }}>
            {data.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <span
                  key={item.month}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: isHovered ? 700 : 500,
                    color: isHovered ? '#2563EB' : '#64748B',
                    transition: 'color 120ms ease',
                  }}
                >
                  {item.month}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
