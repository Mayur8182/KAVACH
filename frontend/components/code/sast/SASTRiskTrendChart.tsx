'use client';

import React, { useState } from 'react';

export interface SASTRiskTrendPoint {
  date: string;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  total?: number;
}

interface SASTRiskTrendChartProps {
  data: SASTRiskTrendPoint[];
  height?: number;
}

export const SASTRiskTrendChart: React.FC<SASTRiskTrendChartProps> = ({ data, height = 220 }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
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
        <span style={{ fontWeight: 600 }}>No trend records available</span>
        <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Scans will record AST vulnerability progression over time.</span>
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 600;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxCritical = Math.max(...data.map((d) => d.critical || 0), 1);
  const maxHigh = Math.max(...data.map((d) => d.high || 0), 1);
  const maxTotal = Math.max(...data.map((d) => (d.total || ((d.critical || 0) + (d.high || 0) + (d.medium || 0) + (d.low || 0)))), 10);
  const yMax = Math.max(maxTotal, 15);

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / yMax) * plotHeight;
  };

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

  const critPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.critical || 0) }));
  const highPoints = data.map((d, i) => ({ x: getX(i), y: getY((d.critical || 0) + (d.high || 0)) }));
  const totalPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY((d.total || ((d.critical || 0) + (d.high || 0) + (d.medium || 0) + (d.low || 0)))),
  }));

  const totalPath = generateSmoothPath(totalPoints);
  const highPath = generateSmoothPath(highPoints);
  const critPath = generateSmoothPath(critPoints);

  const totalArea =
    totalPoints.length > 0
      ? `${totalPath} L ${totalPoints[totalPoints.length - 1].x} ${padding.top + plotHeight} L ${totalPoints[0].x} ${padding.top + plotHeight} Z`
      : '';

  const critArea =
    critPoints.length > 0
      ? `${critPath} L ${critPoints[critPoints.length - 1].x} ${padding.top + plotHeight} L ${critPoints[0].x} ${padding.top + plotHeight} Z`
      : '';

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="sastTotalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="sastCritGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + plotHeight * pct;
          const val = Math.round(yMax * (1 - pct));
          return (
            <g key={pct}>
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
                fontSize="9"
                fill="#94A3B8"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Shaded Areas */}
        {totalArea && <path d={totalArea} fill="url(#sastTotalGrad)" />}
        {critArea && <path d={critArea} fill="url(#sastCritGrad)" />}

        {/* Lines */}
        {totalPath && <path d={totalPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" />}
        {highPath && <path d={highPath} fill="none" stroke="#F97316" strokeWidth="2" strokeDasharray="3 3" />}
        {critPath && <path d={critPath} fill="none" stroke="#EF4444" strokeWidth="2.5" />}

        {/* Hover vertical crosshair */}
        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={padding.top}
            x2={getX(hoverIndex)}
            y2={padding.top + plotHeight}
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}

        {/* Interactive capture points */}
        {data.map((pt, i) => (
          <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
            <circle
              cx={getX(i)}
              cy={getY(pt.critical || 0)}
              r={hoverIndex === i ? 5 : 3}
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r 120ms ease' }}
            />
            <rect
              x={getX(i) - 15}
              y={padding.top}
              width={30}
              height={plotHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((pt, i) => {
          if (data.length > 8 && i % 2 !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={padding.top + plotHeight + 18}
              fontSize="9"
              fill="#94A3B8"
              textAnchor="middle"
            >
              {pt.date}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hovered && hoverIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: `${Math.min(Math.max(10, (getX(hoverIndex) / width) * 100), 75)}%`,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '3px' }}>
            {hovered.date}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: '#FCA5A5' }}>Critical: {hovered.critical || 0}</span>
            <span style={{ color: '#FDBA74' }}>High: {hovered.high || 0}</span>
            <span style={{ color: '#FDE047' }}>Medium: {hovered.medium || 0}</span>
            <span style={{ color: '#93C5FD' }}>Total: {hovered.total || ((hovered.critical || 0) + (hovered.high || 0) + (hovered.medium || 0) + (hovered.low || 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
};
