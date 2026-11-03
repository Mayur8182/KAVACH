'use client';

import React from 'react';
import { TopPolicyViolationItem } from '@/types/api/dependencies';
import { AlertTriangle } from 'lucide-react';

interface TopPolicyViolationsListProps {
  data: TopPolicyViolationItem[];
  loading?: boolean;
}

export const TopPolicyViolationsList: React.FC<TopPolicyViolationsListProps> = ({
  data,
  loading = false,
}) => {
  const maxCount = Math.max(...data.map((d) => d.violation_count), 1);

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
        <div style={{ height: '18px', width: '160px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: '16px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
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
          Top Policy Violations
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          By frequency
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
        {data.map((item, idx) => {
          const widthPct = Math.max((item.violation_count / maxCount) * 100, 6);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '130px',
                  flexShrink: 0,
                  fontSize: '12px',
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                <AlertTriangle size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                <span
                  title={item.policy_name}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.policy_name}
                </span>
              </div>

              <div
                style={{
                  flexGrow: 1,
                  height: '8px',
                  backgroundColor: '#FEE2E2',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: '#F87171',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div
                style={{
                  width: '24px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#B91C1C',
                  flexShrink: 0,
                }}
              >
                {item.violation_count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
