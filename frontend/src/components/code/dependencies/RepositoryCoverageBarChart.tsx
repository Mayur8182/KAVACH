'use client';

import React, { useState } from 'react';
import { RepositoryCoverageItem } from '@/types/api/dependencies';

interface RepositoryCoverageBarChartProps {
  data: RepositoryCoverageItem[];
  height?: number;
}

export const RepositoryCoverageBarChart: React.FC<RepositoryCoverageBarChartProps> = ({
  data,
  height = 180,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          fontSize: '13px',
        }}
      >
        No repositories connected for SCA coverage.
      </div>
    );
  }

  // Display top 8 repositories for visual clarity
  const displayItems = data.slice(0, 8);
  const maxDeps = Math.max(...displayItems.map((d) => d.dependencies_count), 20);

  const padding = { top: 15, right: 15, bottom: 35, left: 35 };
  const width = 500;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const barWidth = Math.min(plotWidth / displayItems.length - 12, 38);

  const hoveredItem = hoverIndex !== null && displayItems[hoverIndex] ? displayItems[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="repoBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
          <linearGradient id="repoVulnGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#FCA5A5" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = padding.top + plotHeight * pct;
          const val = Math.round(maxDeps * (1 - pct));
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#94A3B8"
                fontSize="10"
                textAnchor="end"
                fontFamily="system-ui"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {displayItems.map((item, idx) => {
          const slotWidth = plotWidth / displayItems.length;
          const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
          const totalBarHeight = (item.dependencies_count / maxDeps) * plotHeight;
          const y = padding.top + plotHeight - totalBarHeight;
          const isHovered = hoverIndex === idx;

          const repoLabel = item.repository_name.length > 8
            ? item.repository_name.slice(0, 7) + '…'
            : item.repository_name;

          return (
            <g
              key={item.repository_id || idx}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Background slot hover highlight */}
              {isHovered && (
                <rect
                  x={x - 4}
                  y={padding.top}
                  width={barWidth + 8}
                  height={plotHeight}
                  fill="#F8FAFC"
                  rx="6"
                />
              )}

              {/* Bar Rect */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(totalBarHeight, 4)}
                fill={isHovered ? '#3B82F6' : 'url(#repoBarGradient)'}
                rx="4"
                style={{ transition: 'all 120ms ease' }}
              />

              {/* Vulnerable indicator top segment if item has vulns */}
              {item.vulnerable_count > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max((item.vulnerable_count / maxDeps) * plotHeight, 3)}
                  fill="url(#repoVulnGradient)"
                  rx="3"
                />
              )}

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + plotHeight + 16}
                fill={isHovered ? '#0F172A' : '#64748B'}
                fontSize="10"
                fontWeight={isHovered ? 600 : 400}
                textAnchor="middle"
                fontFamily="system-ui"
              >
                {repoLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && hoverIndex !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: `${padding.left + (hoverIndex + 0.5) * (plotWidth / displayItems.length)}px`,
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px', color: '#E2E8F0' }}>
            {hoveredItem.repository_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93C5FD' }}>
            <span>Dependencies:</span>
            <strong>{hoveredItem.dependencies_count}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCA5A5' }}>
            <span>Vulnerabilities:</span>
            <strong>{hoveredItem.vulnerable_count}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A7F3D0' }}>
            <span>SCA Coverage:</span>
            <strong>{hoveredItem.coverage_pct}%</strong>
          </div>
        </div>
      )}
    </div>
  );
};
