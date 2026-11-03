'use client';

import React, { useState } from 'react';
import { RiskReductionTrendPoint } from '@/types/api/dependencies';
import { TrendingDown } from 'lucide-react';

interface RiskReductionTrendChartProps {
  data: RiskReductionTrendPoint[];
  loading?: boolean;
}

export const RiskReductionTrendChart: React.FC<RiskReductionTrendChartProps> = ({
  data,
  loading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '270px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '150px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ height: '160px', backgroundColor: '#F8FAFC', borderRadius: '8px' }} />
        <div style={{ height: '14px', width: '220px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
      </div>
    );
  }

  const chartHeight = 150;
  const chartWidth = 420;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(...data.map((d) => d.risk_score), 100);
  const minVal = 0;

  const points = data.map((d, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.risk_score - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  const initialScore = data.length > 0 ? data[0].risk_score : 0;
  const currentScore = data.length > 0 ? data[data.length - 1].risk_score : 0;
  const reductionPercent = initialScore > 0 ? Math.round(((initialScore - currentScore) / initialScore) * 100) : 0;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '270px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Risk Reduction Trend
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Historical vulnerability index over 30 days
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <TrendingDown size={14} />
          <span>-{reductionPercent}% Risk Score</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: '160px', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal guidelines */}
          {[0.25, 0.5, 0.75].map((pct, i) => {
            const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#blueAreaGradient)" />}

          {/* Line stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? 6 : 4}
                fill="#FFFFFF"
                stroke="#2563EB"
                strokeWidth="2.5"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <text
                x={p.x}
                y={chartHeight - 4}
                textAnchor="middle"
                fontSize="10"
                fill="#94A3B8"
                fontWeight="500"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
              top: `${(points[hoveredIndex].y / chartHeight) * 100}%`,
              transform: 'translate(-50%, -120%)',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600 }}>{points[hoveredIndex].date}</div>
            <div>Risk Score: <strong>{points[hoveredIndex].risk_score}</strong></div>
            <div style={{ color: '#94A3B8' }}>{points[hoveredIndex].open_items} Open Issues</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
          Current Security Score: <strong style={{ color: '#0F172A' }}>{currentScore}/100</strong>
        </span>
        <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 500 }}>
          Deterministic SCA Rescans active
        </span>
      </div>
    </div>
  );
};
