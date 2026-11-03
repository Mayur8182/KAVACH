'use client';

import React from 'react';
import { AllowedVsBlockedRatio } from '@/types/api/dependencies';

interface AllowedVsBlockedDonutProps {
  data: AllowedVsBlockedRatio;
  loading?: boolean;
}

export const AllowedVsBlockedDonut: React.FC<AllowedVsBlockedDonutProps> = ({
  data,
  loading = false,
}) => {
  const allowed = data?.allowed_count || 0;
  const blocked = data?.blocked_count || 0;
  const restricted = data?.restricted_count || 0;
  const total = allowed + blocked + restricted;

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
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '14px solid #F1F5F9' }} />
        </div>
      </div>
    );
  }

  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  const allowedPct = total > 0 ? (allowed / total) * 100 : 0;
  const blockedPct = total > 0 ? (blocked / total) * 100 : 0;
  const restrictedPct = total > 0 ? (restricted / total) * 100 : 0;

  const allowedStroke = (allowed / (total || 1)) * circumference;
  const blockedStroke = (blocked / (total || 1)) * circumference;
  const restrictedStroke = (restricted / (total || 1)) * circumference;

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
          Allowed vs Blocked Packages
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          {total} Cataloged
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
            {total > 0 && (
              <>
                {/* Allowed (Green) */}
                <circle
                  cx="62.5"
                  cy="62.5"
                  r={radius}
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="15"
                  strokeDasharray={`${allowedStroke} ${circumference - allowedStroke}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                />
                {/* Blocked (Red/Coral) */}
                <circle
                  cx="62.5"
                  cy="62.5"
                  r={radius}
                  fill="transparent"
                  stroke="#F87171"
                  strokeWidth="15"
                  strokeDasharray={`${blockedStroke} ${circumference - blockedStroke}`}
                  strokeDashoffset={-allowedStroke}
                  strokeLinecap="round"
                />
                {/* Restricted (Amber) */}
                <circle
                  cx="62.5"
                  cy="62.5"
                  r={radius}
                  fill="transparent"
                  stroke="#FBBF24"
                  strokeWidth="15"
                  strokeDasharray={`${restrictedStroke} ${circumference - restrictedStroke}`}
                  strokeDashoffset={-(allowedStroke + blockedStroke)}
                  strokeLinecap="round"
                />
              </>
            )}
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
            <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Packages</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '130px', flexGrow: 1 }}>
          {/* Allowed */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ color: '#334155' }}>Allowed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{allowed}</span>
              <span style={{ color: '#94A3B8', fontSize: '11px' }}>({allowedPct.toFixed(0)}%)</span>
            </div>
          </div>

          {/* Blocked */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F87171' }} />
              <span style={{ color: '#334155' }}>Blocked</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{blocked}</span>
              <span style={{ color: '#94A3B8', fontSize: '11px' }}>({blockedPct.toFixed(0)}%)</span>
            </div>
          </div>

          {/* Restricted */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
              <span style={{ color: '#334155' }}>Restricted</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{restricted}</span>
              <span style={{ color: '#94A3B8', fontSize: '11px' }}>({restrictedPct.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
