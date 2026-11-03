'use client';

import React from 'react';
import { Box } from 'lucide-react';
import { TopComponentUsageItem } from '@/types/api/dependencies';

interface TopComponentsUsageListProps {
  items: TopComponentUsageItem[];
  loading?: boolean;
}

export const TopComponentsUsageList: React.FC<TopComponentsUsageListProps> = ({
  items,
  loading = false,
}) => {
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
        minHeight: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Top Components by Usage
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          Shared dependencies
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, justifyContent: 'center' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: '22px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
          ))
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', padding: '24px 0' }}>
            No shared components found across repositories.
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Cube Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  flexShrink: 0,
                }}
              >
                <Box size={14} />
              </div>

              {/* Component Name and Ecosystem */}
              <div style={{ width: '130px', flexShrink: 0, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {item.ecosystem}
                </div>
              </div>

              {/* Distribution Bar */}
              <div
                style={{
                  flexGrow: 1,
                  height: '10px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(item.percentage, 100)}%`,
                    height: '100%',
                    backgroundColor: '#93C5FD',
                    borderRadius: '5px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Repo Count / Percentage Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '70px', justifyContent: 'flex-end', fontSize: '11.5px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {item.repository_count} {item.repository_count === 1 ? 'repo' : 'repos'}
                </span>
                <span style={{ color: '#94A3B8', fontSize: '10.5px' }}>
                  ({item.percentage}%)
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Identifies critical central dependencies for cross-cutting upgrade planning.
        </span>
      </div>
    </div>
  );
};
