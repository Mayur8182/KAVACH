'use client';

import React, { useState } from 'react';
import { PolicyEnforcementTrendPoint } from '@/types/api/dependencies';

interface PolicyEnforcementTrendChartProps {
  data: PolicyEnforcementTrendPoint[];
  loading?: boolean;
}

export const PolicyEnforcementTrendChart: React.FC<PolicyEnforcementTrendChartProps> = ({
  data,
  loading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (loading || !data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ height: '170px', backgroundColor: '#F8FAFC', borderRadius: '8px' }} />
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.evaluations, d.violations_blocked)),
    10
  );

  const svgWidth = 380;
  const svgHeight = 150;
  const paddingX = 25;
  const paddingY = 20;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const pointsEval = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.evaluations / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const pointsBlocked = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.violations_blocked / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const pathEval = pointsEval.reduce(
    (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ''
  );

  const areaEval = `${pathEval} L ${pointsEval[pointsEval.length - 1].x} ${paddingY + chartHeight} L ${pointsEval[0].x} ${paddingY + chartHeight} Z`;

  const pathBlocked = pointsBlocked.reduce(
    (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ''
  );

  const areaBlocked = `${pathBlocked} L ${pointsBlocked[pointsBlocked.length - 1].x} ${paddingY + chartHeight} L ${pointsBlocked[0].x} ${paddingY + chartHeight} Z`;

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
        height: '260px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Policy Enforcement Trend
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#64748B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
            <span>Evaluations</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span>Blocked</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '160px', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = paddingY + chartHeight * (1 - pct);
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={paddingX + chartWidth}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area Fills */}
          <path d={areaEval} fill="url(#evalGradient)" />
          <path d={areaBlocked} fill="url(#blockedGradient)" />

          {/* Lines */}
          <path d={pathEval} fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
          <path d={pathBlocked} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

          {/* Interactive dots */}
          {pointsEval.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 5 : 3}
                fill="#FFFFFF"
                stroke="#3B82F6"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <circle
                cx={pointsBlocked[i].x}
                cy={pointsBlocked[i].y}
                r={hoveredIndex === i ? 5 : 3}
                fill="#FFFFFF"
                stroke="#EF4444"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: `${Math.min(Math.max((hoveredIndex / (data.length - 1)) * 80 + 10, 15), 75)}%`,
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              pointerEvents: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '2px', color: '#94A3B8' }}>
              {data[hoveredIndex].date}
            </div>
            <div style={{ color: '#60A5FA' }}>
              Evaluations: <strong>{data[hoveredIndex].evaluations}</strong>
            </div>
            <div style={{ color: '#F87171' }}>
              Blocked: <strong>{data[hoveredIndex].violations_blocked}</strong>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', padding: '0 6px' }}>
        <span>{data[0]?.date || 'Day 1'}</span>
        <span>{data[Math.floor(data.length / 2)]?.date || 'Mid'}</span>
        <span>{data[data.length - 1]?.date || 'Today'}</span>
      </div>
    </div>
  );
};
