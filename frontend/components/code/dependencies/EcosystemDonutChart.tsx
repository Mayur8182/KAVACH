'use client';

import React, { useState } from 'react';
import { EcosystemDistributionItem } from '@/types/api/dependencies';

interface EcosystemDonutChartProps {
  items: EcosystemDistributionItem[];
  size?: number;
}

export const EcosystemDonutChart: React.FC<EcosystemDonutChartProps> = ({ items, size = 180 }) => {
  const [hoveredEcosystem, setHoveredEcosystem] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (!items || items.length === 0 || total === 0) {
    return (
      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
        No ecosystem packages detected.
      </div>
    );
  }

  const radius = size / 2;
  const strokeWidth = 26;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Compute strokeDasharray and strokeDashoffset for each segment
  let cumulativePercentage = 0;
  const segments = items.map((item) => {
    const pct = item.percentage / 100;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercentage * circumference;
    cumulativePercentage += pct;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = hoveredEcosystem
    ? items.find((i) => i.ecosystem === hoveredEcosystem)
    : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
      {/* Donut SVG */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {segments.map((seg) => {
            const isHovered = hoveredEcosystem === seg.ecosystem;
            return (
              <circle
                key={seg.ecosystem}
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-width 150ms ease, opacity 150ms ease',
                  cursor: 'pointer',
                  opacity: hoveredEcosystem && !isHovered ? 0.45 : 1,
                }}
                onMouseEnter={() => setHoveredEcosystem(seg.ecosystem)}
                onMouseLeave={() => setHoveredEcosystem(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
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
          {activeItem ? (
            <>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                {activeItem.ecosystem}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {activeItem.percentage}%
              </span>
              <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                {activeItem.count} pkgs
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {total.toLocaleString()}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, minWidth: '160px' }}>
        {items.map((item) => {
          const isHovered = hoveredEcosystem === item.ecosystem;
          return (
            <div
              key={item.ecosystem}
              onMouseEnter={() => setHoveredEcosystem(item.ecosystem)}
              onMouseLeave={() => setHoveredEcosystem(null)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155', textTransform: 'uppercase' }}>
                  {item.ecosystem}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  {item.count}
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8', minWidth: '32px', textAlign: 'right' }}>
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
