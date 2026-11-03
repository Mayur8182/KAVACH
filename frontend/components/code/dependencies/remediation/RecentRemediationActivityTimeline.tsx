'use client';

import React from 'react';
import { RemediationRecentActivityItem } from '@/types/api/dependencies';
import { GitPullRequest, CheckCircle2, ShieldCheck, Activity, Clock } from 'lucide-react';

interface RecentRemediationActivityTimelineProps {
  activities: RemediationRecentActivityItem[];
  loading?: boolean;
}

export const RecentRemediationActivityTimeline: React.FC<RecentRemediationActivityTimelineProps> = ({
  activities,
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
          height: '240px',
        }}
      >
        <div style={{ height: '18px', width: '140px', backgroundColor: '#F1F5F9', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: '36px', backgroundColor: '#F8FAFC', borderRadius: '6px' }} />
          ))}
        </div>
      </div>
    );
  }

  const getNodeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'FIXED':
      case 'RESOLVED':
      case 'VERIFICATION_PASSED':
        return '#10B981';
      case 'PR_CREATED':
        return '#3B82F6';
      case 'VERIFICATION_TRIGGERED':
      case 'IN_PROGRESS':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
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
        minHeight: '240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Recent Activity
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          Live remediation stream
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activities.length === 0 ? (
          <span style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
            No recent activity recorded.
          </span>
        ) : (
          activities.slice(0, 4).map((act, index) => {
            const nodeColor = getNodeColor(act.action);

            return (
              <div key={act.id || index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: nodeColor,
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.title}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {act.timestamp}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>
                    {act.details}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Audit entries persisted with cryptographic hash chain.
        </span>
      </div>
    </div>
  );
};
