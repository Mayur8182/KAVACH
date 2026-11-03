'use client';

import React from 'react';
import { RemediationStatusSlice } from '@/types/api/dependencies';

interface RemediationStatusDonutProps {
  data: RemediationStatusSlice[];
  loading?: boolean;
}

export const RemediationStatusDonut: React.FC<RemediationStatusDonutProps> = ({
  data,
  loading = false,
}) => {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

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
        <div style={{ height: '18px', width: '140px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: '14px solid #F1F5F9' }} />
        </div>
        <div style={{ height: '14px', width: '200px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
      </div>
    );
  }

  // SVG Donut calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Remediation Status
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          {total} Total Items
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: '136px', height: '136px', flexShrink: 0 }}>
          <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="68"
              cy="68"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="16"
            />
            {total > 0 &&
              data.map((slice, index) => {
                const strokeLength = (slice.count / total) * circumference;
                const dashOffset = -accumulatedOffset;
                accumulatedOffset += strokeLength;

                return (
                  <circle
                    key={index}
                    cx="68"
                    cy="68"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="16"
                    strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                  />
                );
              })}
          </svg>
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
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
              {total}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Items
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, minWidth: '120px' }}>
          {data.map((slice, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: slice.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#475569', fontWeight: 500 }}>{slice.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{slice.count}</span>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>({slice.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: '10px', borderTop: '1px solid #F1F5F9', marginTop: '10px' }}>
        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
          Deterministic triage based on active pull requests and SCA verification runs.
        </span>
      </div>
    </div>
  );
};
