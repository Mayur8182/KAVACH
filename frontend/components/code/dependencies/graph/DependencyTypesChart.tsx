'use client';

import React, { useState } from 'react';
import { DependencyTypeSlice } from '@/types/api/dependencies';
import { Layers } from 'lucide-react';

interface DependencyTypesChartProps {
  data: DependencyTypeSlice[];
  loading?: boolean;
}

export const DependencyTypesChart: React.FC<DependencyTypesChartProps> = ({
  data,
  loading = false,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<DependencyTypeSlice | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // SVG Donut calculations
  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Dependency Types
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          {total} Total
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '10px solid #F1F5F9',
              borderTopColor: '#3B82F6',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          No dependency type data available.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flex: 1 }}>
          {/* Donut Chart SVG */}
          <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />

              {/* Segments */}
              {data.map((slice) => {
                const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += slice.percentage;

                const isHovered = hoveredSlice?.type === slice.type;

                return (
                  <circle
                    key={slice.type}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'all 200ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
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
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                {hoveredSlice ? hoveredSlice.count : total}
              </span>
              <span style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', textTransform: 'uppercase' }}>
                {hoveredSlice ? hoveredSlice.type : 'Packages'}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
            {data.map((slice) => {
              const isHovered = hoveredSlice?.type === slice.type;
              return (
                <div
                  key={slice.type}
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
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
                        color: isHovered ? '#0F172A' : '#475569',
                        fontWeight: isHovered ? 600 : 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {slice.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{slice.count}</span>
                    <span style={{ color: '#94A3B8', fontSize: '11px' }}>({slice.percentage}%)</span>
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
