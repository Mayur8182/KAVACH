'use client';

import React, { useState } from 'react';
import { RiskDistributionBar } from '@/types/api/dependencies';

interface RiskDistributionChartProps {
  data: RiskDistributionBar[];
  loading?: boolean;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  data,
  loading = false,
}) => {
  const [hoveredBar, setHoveredBar] = useState<RiskDistributionBar | null>(null);

  // Compute maximum stacked height for scaling
  const maxTotal = Math.max(
    1,
    ...data.map((d) => d.critical + d.high + d.medium + d.low)
  );

  const chartHeight = 130;
  const barWidth = 28;

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
        height: '270px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Risk Distribution
        </h3>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
            <span>Crit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F97316' }} />
            <span>High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#FBBF24' }} />
            <span>Med</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#93C5FD' }} />
            <span>Low</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '80%',
              height: '100px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          No risk distribution data available.
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {/* Chart Area with Gridlines */}
          <div
            style={{
              position: 'relative',
              height: `${chartHeight}px`,
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              padding: '0 10px',
            }}
          >
            {/* Horizontal guideline */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                borderTop: '1px dashed #F1F5F9',
                pointerEvents: 'none',
              }}
            />

            {data.map((bar) => {
              const total = bar.critical + bar.high + bar.medium + bar.low;
              const scale = chartHeight / (maxTotal || 1);

              const hCrit = bar.critical * scale;
              const hHigh = bar.high * scale;
              const hMed = bar.medium * scale;
              const hLow = bar.low * scale;

              const isHovered = hoveredBar?.depth_label === bar.depth_label;

              return (
                <div
                  key={bar.depth_label}
                  onMouseEnter={() => setHoveredBar(bar)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: `${chartHeight + 10}px`,
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{bar.depth_label}</div>
                      <div style={{ color: '#FCA5A5' }}>Critical: {bar.critical}</div>
                      <div style={{ color: '#FDBA74' }}>High: {bar.high}</div>
                      <div style={{ color: '#FDE68A' }}>Medium: {bar.medium}</div>
                      <div style={{ color: '#BFDBFE' }}>Low: {bar.low}</div>
                    </div>
                  )}

                  {/* Stacked Bar Container */}
                  <div
                    style={{
                      width: `${barWidth}px`,
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      borderRadius: '4px 4px 0 0',
                      overflow: 'hidden',
                      transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                      transformOrigin: 'bottom',
                      transition: 'transform 150ms ease',
                    }}
                  >
                    {/* Critical (bottom segment) */}
                    {bar.critical > 0 && (
                      <div
                        style={{
                          height: `${Math.max(4, hCrit)}px`,
                          backgroundColor: '#EF4444',
                        }}
                      />
                    )}
                    {/* High */}
                    {bar.high > 0 && (
                      <div
                        style={{
                          height: `${Math.max(4, hHigh)}px`,
                          backgroundColor: '#F97316',
                        }}
                      />
                    )}
                    {/* Medium */}
                    {bar.medium > 0 && (
                      <div
                        style={{
                          height: `${Math.max(4, hMed)}px`,
                          backgroundColor: '#FBBF24',
                        }}
                      />
                    )}
                    {/* Low */}
                    {bar.low > 0 && (
                      <div
                        style={{
                          height: `${Math.max(4, hLow)}px`,
                          backgroundColor: '#93C5FD',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              padding: '8px 10px 0',
              fontSize: '11px',
              color: '#64748B',
              fontWeight: 500,
            }}
          >
            {data.map((bar) => (
              <span
                key={bar.depth_label}
                style={{
                  width: `${barWidth + 16}px`,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: hoveredBar?.depth_label === bar.depth_label ? '#0F172A' : '#64748B',
                  fontWeight: hoveredBar?.depth_label === bar.depth_label ? 700 : 500,
                }}
              >
                {bar.depth_label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
