'use client';

import React from 'react';
import { MoreHorizontal, Activity } from 'lucide-react';
import { EcosystemActivityItem } from '@/types/api/dependencies';

interface EcosystemRecentActivityProps {
  activities: EcosystemActivityItem[];
  isLoading?: boolean;
}

export const EcosystemRecentActivity: React.FC<EcosystemRecentActivityProps> = ({
  activities = [],
  isLoading = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Recent Activity
        </h2>
        <button
          aria-label="Recent activity actions"
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: '24px',
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '180px',
            color: '#64748B',
            fontSize: '13px',
            gap: '8px',
          }}
        >
          <Activity size={24} color="#94A3B8" />
          <span>No recent package scan events</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {activities.map((act) => {
            const dotColor = act.dot_color || '#10B981';
            return (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '6px 0',
                  borderBottom: '1px solid #F8FAFC',
                }}
              >
                {/* Left: Dot + Title & Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1E293B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {act.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {act.description}
                    </div>
                  </div>
                </div>

                {/* Right: Timestamp */}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#94A3B8',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {act.timestamp}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
