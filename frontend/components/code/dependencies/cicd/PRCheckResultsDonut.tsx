'use client';

import React from 'react';
import { PRCheckResultSlice } from '@/types/api/dependencies';

interface PRCheckResultsDonutProps {
  data: PRCheckResultSlice[];
  loading?: boolean;
}

export const PRCheckResultsDonut: React.FC<PRCheckResultsDonutProps> = ({
  data,
  loading = false,
}) => {
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
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
          <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '16px solid #F1F5F9' }} />
        </div>
      </div>
    );
  }

  const totalCount = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets
  let accumulatedPercent = 0;
  const segments = data.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Pull Request Check Results
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
          {totalCount} Total PRs
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', flexGrow: 1 }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="16"
            />
            {totalCount > 0 &&
              segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              ))}
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
              {data.find((d) => d.label.toLowerCase() === 'passed')?.percentage || 0}%
            </span>
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
              Passed
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '130px' }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                  {item.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  {item.percentage}%
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  ({item.count})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
