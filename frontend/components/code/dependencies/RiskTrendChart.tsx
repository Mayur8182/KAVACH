'use client';

import React, { useState } from 'react';
import { DependencyRiskTrendPoint } from '@/types/api/dependencies';

interface RiskTrendChartProps {
  data: DependencyRiskTrendPoint[];
  height?: number;
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({ data, height = 220 }) => {
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
        No trend records available for the selected range.
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 600; // viewBox internal width
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.total), 10);
  const maxVuln = Math.max(...data.map((d) => d.vulnerable), 5);
  const yMax = Math.max(maxTotal, 20);

  // Helper to convert point to x, y coords
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / yMax) * plotHeight;
  };

  // Generate smooth SVG path with cubic bezier
  const generateSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const totalPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.total) }));
  const vulnPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.vulnerable) }));

  const totalLine = generateSmoothPath(totalPoints);
  const totalArea = totalPoints.length > 0
    ? `${totalLine} L ${totalPoints[totalPoints.length - 1].x} ${padding.top + plotHeight} L ${totalPoints[0].x} ${padding.top + plotHeight} Z`
    : '';

  const vulnLine = generateSmoothPath(vulnPoints);
  const vulnArea = vulnPoints.length > 0
    ? `${vulnLine} L ${vulnPoints[vulnPoints.length - 1].x} ${padding.top + plotHeight} L ${vulnPoints[0].x} ${padding.top + plotHeight} Z`
    : '';

  const hoveredPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      {/* Top Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
          <span>Total Packages</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span>Vulnerabilities</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="vulnGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + plotHeight * pct;
          const val = Math.round(yMax * (1 - pct));
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray="4 4"
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

        {/* Total Packages Area & Line */}
        {totalArea && <path d={totalArea} fill="url(#totalGradient)" />}
        {totalLine && <path d={totalLine} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />}

        {/* Vulnerable Packages Area & Line */}
        {vulnArea && <path d={vulnArea} fill="url(#vulnGradient)" />}
        {vulnLine && <path d={vulnLine} fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />}

        {/* Points & Interactive Hover Columns */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cyTotal = getY(d.total);
          const cyVuln = getY(d.vulnerable);
          const isHovered = hoverIndex === i;

          return (
            <g key={i}>
              {/* Invisible touch column for hover */}
              <rect
                x={cx - plotWidth / (data.length * 2)}
                y={padding.top}
                width={plotWidth / data.length}
                height={plotHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />

              {isHovered && (
                <>
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + plotHeight}
                    stroke="#94A3B8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle cx={cx} cy={cyTotal} r="4.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx={cx} cy={cyVuln} r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                </>
              )}

              {/* X Axis labels (show every few points) */}
              {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
                <text
                  x={cx}
                  y={padding.top + plotHeight + 18}
                  fill="#94A3B8"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="system-ui"
                >
                  {d.date.length > 5 ? d.date.slice(5) : d.date}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && hoverIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: `${Math.min(Math.max((getX(hoverIndex) / width) * 100, 15), 85)}%`,
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
          <div style={{ fontWeight: 600, marginBottom: '4px', color: '#E2E8F0' }}>{hoveredPoint.date}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93C5FD' }}>
            <span>Total:</span>
            <strong>{hoveredPoint.total.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCA5A5' }}>
            <span>Vulnerabilities:</span>
            <strong>{hoveredPoint.vulnerable.toLocaleString()}</strong>
          </div>
          {hoveredPoint.critical > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171' }}>
              <span>Critical:</span>
              <strong>{hoveredPoint.critical.toLocaleString()}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
