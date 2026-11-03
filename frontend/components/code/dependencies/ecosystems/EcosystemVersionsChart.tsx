'use client';

import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { EcosystemVersionBar } from '@/types/api/dependencies';

interface EcosystemVersionsChartProps {
  versionBars: EcosystemVersionBar[];
  isLoading?: boolean;
}

const BAR_COLORS: Record<string, string> = {
  npm: '#60A5FA',
  python: '#34D399',
  java: '#C084FC',
  go: '#FBBF24',
  other: '#F87171',
};

export const EcosystemVersionsChart: React.FC<EcosystemVersionsChartProps> = ({
  versionBars = [],
  isLoading = false,
}) => {
  const [hoveredEcosystem, setHoveredEcosystem] = useState<string | null>(null);

  const maxVal = Math.max(
    1,
    ...versionBars.map(
      (b) => (b.current_count || 0) + (b.minor_count || 0) + (b.major_count || 0)
    )
  );

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Ecosystem Versions
        </h2>
        <button
          aria-label="Ecosystem versions actions"
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <div
            style={{
              width: '100%',
              height: '120px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
      ) : versionBars.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '160px',
            color: '#94A3B8',
            fontSize: '13px',
          }}
        >
          No package version data recorded
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          {/* Vertical Bar Chart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '140px',
              padding: '0 8px',
              borderBottom: '1px solid #F1F5F9',
              position: 'relative',
            }}
          >
            {versionBars.map((bar) => {
              const total = (bar.current_count || 0) + (bar.minor_count || 0) + (bar.major_count || 0);
              const heightPct = total > 0 ? Math.max(12, Math.round((total / maxVal) * 100)) : 8;
              const barColor = BAR_COLORS[bar.ecosystem] || bar.color || '#3B82F6';
              const isHovered = hoveredEcosystem === bar.ecosystem;

              return (
                <div
                  key={bar.ecosystem}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredEcosystem(bar.ecosystem)}
                  onMouseLeave={() => setHoveredEcosystem(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      }}
                    >
                      {bar.label}: {total} packages ({bar.current_count} current, {bar.minor_count} outdated)
                    </div>
                  )}

                  {/* Single rounded bar matching Screenshot 05 */}
                  <div
                    style={{
                      width: '24px',
                      height: `${heightPct}%`,
                      backgroundColor: barColor,
                      borderRadius: '4px 4px 0 0',
                      opacity: isHovered ? 1 : 0.85,
                      transform: isHovered ? 'scaleY(1.05)' : 'none',
                      transformOrigin: 'bottom',
                      transition: 'all 140ms ease',
                    }}
                  />

                  {/* Label */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isHovered ? 700 : 500,
                      color: isHovered ? '#0F172A' : '#64748B',
                      marginTop: '4px',
                    }}
                  >
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '10px',
              paddingTop: '8px',
            }}
          >
            {versionBars.map((b) => (
              <div key={b.ecosystem} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: BAR_COLORS[b.ecosystem] || b.color || '#3B82F6',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
