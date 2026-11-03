'use client';

import React from 'react';
import { RecentPolicyActivityItem } from '@/types/api/dependencies';
import { Clock } from 'lucide-react';

interface RecentPolicyActivityTimelineProps {
  data: RecentPolicyActivityItem[];
  loading?: boolean;
}

export const RecentPolicyActivityTimeline: React.FC<RecentPolicyActivityTimelineProps> = ({
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
          height: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, justifyContent: 'center' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '22px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    );
  }

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
          Recent Policy Activity
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          Audit Trail
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexGrow: 1,
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {data.slice(0, 4).map((activity, idx) => (
          <div
            key={activity.id || idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
            }}
          >
            {/* Status dot */}
            <div style={{ paddingTop: '4px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: activity.dot_color || '#3B82F6',
                  boxShadow: `0 0 0 3px ${activity.dot_color || '#3B82F6'}22`,
                }}
              />
            </div>

            {/* Content */}
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px',
                  }}
                >
                  {activity.title}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {activity.timestamp}
                </span>
              </div>
              <p
                style={{
                  margin: '2px 0 0 0',
                  color: '#64748B',
                  fontSize: '11.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '280px',
                }}
              >
                {activity.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
