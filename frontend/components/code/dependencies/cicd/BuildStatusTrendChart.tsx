'use client';

import React, { useState } from 'react';
import { BuildStatusTrendBar } from '@/types/api/dependencies';

interface BuildStatusTrendChartProps {
  data: BuildStatusTrendBar[];
  loading?: boolean;
}

export const BuildStatusTrendChart: React.FC<BuildStatusTrendChartProps> = ({
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
        <div style={{ height: '18px', width: '150px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '180px', padding: '10px 0' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ flex: 1, height: `${20 + i * 14}%`, backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    );
  }

  // Calculate max total for scaling
  const maxTotal = Math.max(
    ...data.map((d) => (d.successful || 0) + (d.failed || 0) + (d.blocked || 0) + (d.in_progress || 0)),
    10
  );

  const colors = {
    successful: '#10B981',
    failed: '#EF4444',
    blocked: '#F59E0B',
    in_progress: '#8B5CF6',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Build Status Trend
          </h3>
        </div>
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
          Last 30 Days
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexGrow: 1, alignItems: 'center' }}>
        {/* Stacked Bar Chart Area */}
        <div
          style={{
            flex: 1,
            height: '170px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '12px',
            paddingBottom: '24px',
            position: 'relative',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          {/* Subtle horizontal grid lines */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '25%', height: '1px', backgroundColor: '#F8FAFC' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', backgroundColor: '#F8FAFC' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '75%', height: '1px', backgroundColor: '#F8FAFC' }} />

          {data.map((bar, idx) => {
            const successHeight = ((bar.successful || 0) / maxTotal) * 100;
            const failedHeight = ((bar.failed || 0) / maxTotal) * 100;
            const blockedHeight = ((bar.blocked || 0) / maxTotal) * 100;
            const inProgressHeight = ((bar.in_progress || 0) / maxTotal) * 100;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={bar.date || idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      marginBottom: '8px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                      zIndex: 30,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      lineHeight: '1.4',
                    }}
                  >
                    <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '3px', marginBottom: '3px' }}>
                      {bar.date}
                    </div>
                    <div style={{ color: '#34D399' }}>✓ Successful: {bar.successful}</div>
                    <div style={{ color: '#F87171' }}>✗ Failed: {bar.failed}</div>
                    <div style={{ color: '#FBBF24' }}>⊘ Blocked: {bar.blocked}</div>
                    <div style={{ color: '#C084FC' }}>↻ In Progress: {bar.in_progress}</div>
                  </div>
                )}

                {/* Stacked Bar */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '28px',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: '4px 4px 0 0',
                    overflow: 'hidden',
                    transform: isHovered ? 'scaleY(1.03)' : 'scaleY(1)',
                    transition: 'transform 0.15s ease',
                    boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <div style={{ height: `${successHeight}%`, backgroundColor: colors.successful, minHeight: bar.successful > 0 ? '4px' : 0 }} />
                  <div style={{ height: `${failedHeight}%`, backgroundColor: colors.failed, minHeight: bar.failed > 0 ? '3px' : 0 }} />
                  <div style={{ height: `${blockedHeight}%`, backgroundColor: colors.blocked, minHeight: bar.blocked > 0 ? '3px' : 0 }} />
                  <div style={{ height: `${inProgressHeight}%`, backgroundColor: colors.in_progress, minHeight: bar.in_progress > 0 ? '3px' : 0 }} />
                </div>

                {/* Date Label */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    fontSize: '10px',
                    color: isHovered ? '#0F172A' : '#94A3B8',
                    fontWeight: isHovered ? 600 : 400,
                  }}
                >
                  {bar.date.includes('-') ? bar.date.split('-').slice(1).join('/') : bar.date}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '95px', paddingLeft: '4px' }}>
          {[
            { label: 'Successful', color: colors.successful },
            { label: 'Failed', color: colors.failed },
            { label: 'Blocked', color: colors.blocked },
            { label: 'In Progress', color: colors.in_progress },
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
