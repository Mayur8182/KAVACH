'use client';

import React from 'react';
import { PolicyCoverageSlice } from '@/types/api/dependencies';

interface PolicyCoverageDonutProps {
  data: PolicyCoverageSlice[];
  loading?: boolean;
}

export const PolicyCoverageDonut: React.FC<PolicyCoverageDonutProps> = ({
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
          height: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '140px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '14px solid #F1F5F9' }} />
        </div>
      </div>
    );
  }

  const radius = 48;
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
        height: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Policy Coverage
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          {total} Total Rules
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', flexGrow: 1 }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: '125px', height: '125px', flexShrink: 0 }}>
          <svg width="125" height="125" viewBox="0 0 125 125" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="62.5"
              cy="62.5"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="15"
            />
            {total > 0 &&
              data.map((slice, index) => {
                const strokeLength = (slice.count / total) * circumference;
                const dashOffset = -accumulatedOffset;
                accumulatedOffset += strokeLength;

                return (
                  <circle
                    key={index}
                    cx="62.5"
                    cy="62.5"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="15"
                    strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease' }}
                  />
                );
              })}
          </svg>
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
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>{total}</span>
            <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rules</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '130px', flexGrow: 1 }}>
          {data.map((slice, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#475569',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: slice.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                  {slice.category}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{slice.count}</span>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>({slice.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
