'use client';

import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { EcosystemDistributionSlice } from '@/types/api/dependencies';

interface EcosystemDistributionDonutProps {
  distribution: EcosystemDistributionSlice[];
  totalPackages: number;
  isLoading?: boolean;
}

const DEFAULT_COLORS: Record<string, string> = {
  npm: '#3B82F6',
  python: '#60A5FA',
  java: '#C084FC',
  go: '#FBBF24',
  other: '#F87171',
};

export const EcosystemDistributionDonut: React.FC<EcosystemDistributionDonutProps> = ({
  distribution = [],
  totalPackages = 0,
  isLoading = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = 64;
  const strokeWidth = 24;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  // Compute slices
  let accumulatedOffset = 0;
  const slices = distribution.map((slice, idx) => {
    const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += (slice.percentage / 100) * circumference;
    const color = slice.color || DEFAULT_COLORS[slice.ecosystem] || '#3B82F6';
    return {
      ...slice,
      strokeDasharray,
      strokeDashoffset,
      color,
      idx,
    };
  });

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
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Ecosystem Distribution
        </h2>
        <button
          aria-label="Ecosystem distribution actions"
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '12px solid #F1F5F9',
              borderTopColor: '#3B82F6',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : slices.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '180px',
            color: '#94A3B8',
            fontSize: '13px',
          }}
        >
          <span>No ecosystem packages discovered yet</span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flex: 1,
          }}
        >
          {/* Donut SVG */}
          <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              {/* Data segments */}
              {slices.map((slice) => {
                const isHovered = hoveredIdx === slice.idx;
                return (
                  <circle
                    key={slice.ecosystem}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="butt"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-width 150ms ease, opacity 150ms ease',
                      cursor: 'pointer',
                      opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                    }}
                    onMouseEnter={() => setHoveredIdx(slice.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>
            {/* Center Summary */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {hoveredIdx !== null ? slices[hoveredIdx].count : totalPackages}
              </span>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                {hoveredIdx !== null ? slices[hoveredIdx].label : 'Packages'}
              </span>
            </div>
          </div>

          {/* Legend on right */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flex: 1,
              minWidth: 0,
            }}
          >
            {slices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              return (
                <div
                  key={slice.ecosystem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '3px 6px',
                    borderRadius: '6px',
                    backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 100ms ease',
                  }}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: slice.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: '#334155',
                        fontWeight: isHovered ? 600 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {slice.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ color: '#64748B', fontSize: '11px' }}>{slice.count}</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#0F172A',
                        minWidth: '36px',
                        textAlign: 'right',
                      }}
                    >
                      {slice.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
