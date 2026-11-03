'use client';

import React from 'react';
import Link from 'next/link';
import { RecentMaintenanceEventItem } from '@/types/api/dependencies';
import { GitCommit, Tag, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RecentMaintenanceTimelineProps {
  events: RecentMaintenanceEventItem[];
  loading?: boolean;
}

export const RecentMaintenanceTimeline: React.FC<RecentMaintenanceTimelineProps> = ({
  events = [],
  loading = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Recent Maintenance Activity
        </h3>
        <span
          style={{
            fontSize: '11.5px',
            color: '#64748B',
            backgroundColor: '#F1F5F9',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 500,
          }}
        >
          Live Telemetry
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: '32px', backgroundColor: '#F1F5F9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
          No recent maintenance events recorded.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '8px 10px',
                borderRadius: '8px',
                transition: 'background-color 100ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {/* Dot / Icon */}
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: ev.dot_color || '#10B981',
                  marginTop: '6px',
                  flexShrink: 0,
                  boxShadow: `0 0 0 3px ${ev.dot_color || '#10B981'}20`,
                }}
              />

              {/* Event Content */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <Link
                      href={`/code/dependencies/health/${encodeURIComponent(ev.package_name)}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0F172A',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                    >
                      {ev.package_name}
                    </Link>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>·</span>
                    <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                      {ev.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {ev.timestamp}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {ev.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
