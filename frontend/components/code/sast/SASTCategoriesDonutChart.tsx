'use client';

import React, { useState } from 'react';

export interface SASTCategoryItem {
  category: string;
  count: number;
  critical?: number;
  high?: number;
  color?: string;
}

interface SASTCategoriesDonutChartProps {
  data: SASTCategoryItem[];
  height?: number;
}

const DEFAULT_COLORS = ['#EF4444', '#F97316', '#EAB308', '#3B82F6', '#8B5CF6', '#10B981', '#64748B'];

export const SASTCategoriesDonutChart: React.FC<SASTCategoriesDonutChartProps> = ({
  data,
  height = 220,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, d) => acc + d.count, 0);

  if (!data || data.length === 0 || total === 0) {
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
        <span style={{ fontWeight: 600 }}>No vulnerability categories</span>
        <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Scanned code rules will populate category classification.</span>
      </div>
    );
  }

  // Calculate donut segments
  const size = 150;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        minHeight: `${height}px`,
      }}
    >
      {/* Donut SVG Ring */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Base Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {data.map((item, idx) => {
            const percent = item.count / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={item.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-width 150ms ease, opacity 150ms ease',
                  opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Total Count */}
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
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
            {hoveredIdx !== null ? data[hoveredIdx].count : total}
          </span>
          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
            {hoveredIdx !== null ? data[hoveredIdx].category.substring(0, 10) : 'Findings'}
          </span>
        </div>
      </div>

      {/* Legend Breakdown */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexGrow: 1,
          maxHeight: `${height}px`,
          overflowY: 'auto',
        }}
      >
        {data.slice(0, 6).map((item, idx) => {
          const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const pct = Math.round((item.count / total) * 100);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 120ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1E293B',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.category}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  {item.count}
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8', width: '32px', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
