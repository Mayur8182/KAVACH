'use client';

import React, { useState } from 'react';
import { DependencyIssuesTrendPoint } from '@/types/api/dependencies';

interface DependencyIssuesTrendChartProps {
  data: DependencyIssuesTrendPoint[];
  loading?: boolean;
}

export const DependencyIssuesTrendChart: React.FC<DependencyIssuesTrendChartProps> = ({
  data,
  loading = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '160px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ height: '180px', backgroundColor: '#F8FAFC', borderRadius: '6px' }} />
      </div>
    );
  }

  const colors = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#3B82F6',
    low: '#14B8A6',
  };

  // Find max value across all series for scaling
  const allValues = data.flatMap((d) => [d.critical || 0, d.high || 0, d.medium || 0, d.low || 0]);
  const maxValue = Math.max(...allValues, 10);

  // SVG coordinates calculation
  const width = 360;
  const height = 150;
  const paddingX = 20;
  const paddingY = 15;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const pointsCount = Math.max(data.length, 1);
  const getX = (index: number) =>
    paddingX + (index / Math.max(pointsCount - 1, 1)) * chartWidth;
  const getY = (val: number) =>
    height - paddingY - (Math.min(val, maxValue) / maxValue) * chartHeight;

  // Generate SVG path for a series
  const generatePath = (key: 'critical' | 'high' | 'medium' | 'low') => {
    if (data.length === 0) return '';
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[key] || 0).toFixed(1)}`)
      .join(' ');
  };

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
        height: '280px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Dependency Issues Trend
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#64748B',
            backgroundColor: '#F8FAFC',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
          }}
        >
          Weekly
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexGrow: 1, alignItems: 'center' }}>
        {/* SVG Multi-Line Chart */}
        <div style={{ flex: 1, height: '170px', position: 'relative' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Grid lines */}
            {[0, 0.33, 0.66, 1].map((pct, i) => {
              const y = paddingY + pct * chartHeight;
              return (
                <line
                  key={i}
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={pct === 1 ? 'none' : '3 3'}
                />
              );
            })}

            {/* Lines */}
            <path d={generatePath('low')} fill="none" stroke={colors.low} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={generatePath('medium')} fill="none" stroke={colors.medium} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={generatePath('high')} fill="none" stroke={colors.high} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={generatePath('critical')} fill="none" stroke={colors.critical} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Points & Hover targets */}
            {data.map((d, i) => {
              const x = getX(i);
              return (
                <g key={i}>
                  {/* Subtle vertical indicator on hover */}
                  {hoveredIdx === i && (
                    <line
                      x1={x}
                      y1={paddingY}
                      x2={x}
                      y2={height - paddingY}
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}

                  <circle cx={x} cy={getY(d.low)} r="3" fill="#FFFFFF" stroke={colors.low} strokeWidth="2" />
                  <circle cx={x} cy={getY(d.medium)} r="3" fill="#FFFFFF" stroke={colors.medium} strokeWidth="2" />
                  <circle cx={x} cy={getY(d.high)} r="3" fill="#FFFFFF" stroke={colors.high} strokeWidth="2" />
                  <circle cx={x} cy={getY(d.critical)} r="3.5" fill="#FFFFFF" stroke={colors.critical} strokeWidth="2" />

                  {/* Invisible hover area */}
                  <rect
                    x={x - 12}
                    y={0}
                    width="24"
                    height={height}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredIdx !== null && data[hoveredIdx] && (
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: `${(hoveredIdx / Math.max(data.length - 1, 1)) * 80 + 10}%`,
                transform: 'translateX(-50%)',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '11px',
                borderRadius: '6px',
                padding: '6px 10px',
                zIndex: 30,
                pointerEvents: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                lineHeight: '1.4',
              }}
            >
              <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '3px', marginBottom: '3px' }}>
                {data[hoveredIdx].date}
              </div>
              <div style={{ color: '#F87171' }}>Critical: {data[hoveredIdx].critical}</div>
              <div style={{ color: '#FB923C' }}>High: {data[hoveredIdx].high}</div>
              <div style={{ color: '#60A5FA' }}>Medium: {data[hoveredIdx].medium}</div>
              <div style={{ color: '#2DD4BF' }}>Low: {data[hoveredIdx].low}</div>
            </div>
          )}

          {/* X-axis date labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingLeft: `${paddingX}px`,
              paddingRight: `${paddingX}px`,
              marginTop: '4px',
            }}
          >
            {data.map((d, i) => (
              <span
                key={i}
                style={{
                  fontSize: '10px',
                  color: hoveredIdx === i ? '#0F172A' : '#94A3B8',
                  fontWeight: hoveredIdx === i ? 600 : 400,
                }}
              >
                {d.date.includes('-') ? d.date.split('-').slice(1).join('/') : d.date}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '80px', paddingLeft: '4px' }}>
          {[
            { label: 'Critical', color: colors.critical },
            { label: 'High', color: colors.high },
            { label: 'Medium', color: colors.medium },
            { label: 'Low', color: colors.low },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
