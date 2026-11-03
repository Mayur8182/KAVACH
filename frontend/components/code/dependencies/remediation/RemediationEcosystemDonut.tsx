'use client';

import React from 'react';
import { RemediationEcosystemSlice } from '@/types/api/dependencies';

interface RemediationEcosystemDonutProps {
  data: RemediationEcosystemSlice[];
  loading?: boolean;
}

export const RemediationEcosystemDonut: React.FC<RemediationEcosystemDonutProps> = ({
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
          height: '240px',
        }}
      >
        <div style={{ height: '18px', width: '160px', backgroundColor: '#F1F5F9', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '12px solid #F1F5F9' }} />
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
        minHeight: '240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Remediation by Ecosystem
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          {total} packages
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px' }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="14"
            />
            {total > 0 &&
              data.map((slice, index) => {
                const strokeLength = (slice.count / total) * circumference;
                const dashOffset = -accumulatedOffset;
                accumulatedOffset += strokeLength;

                return (
                  <circle
                    key={index}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="14"
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
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
              {total}
            </span>
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Pkgs
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, minWidth: '100px' }}>
          {data.map((slice, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: slice.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#475569', fontWeight: 500 }}>{slice.ecosystem}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{slice.count}</span>
                <span style={{ color: '#94A3B8', fontSize: '10px' }}>({slice.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: '10px', borderTop: '1px solid #F1F5F9', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Manifest parsed from npm package.json, requirements.txt, pom.xml, go.mod.
        </span>
      </div>
    </div>
  );
};
