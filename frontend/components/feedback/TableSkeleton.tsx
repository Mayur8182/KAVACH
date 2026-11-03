'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

/**
 * Enterprise shimmer skeleton for data tables and list views.
 * Eliminates layout shift and visual delays during Next.js route transitions.
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 8,
  columns = 8,
  showHeader = true,
}) => {
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes shimmer-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: shimmer-sweep 1.5s infinite ease-in-out;
        }
      `}</style>

      {showHeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#FAFAFA',
            borderBottom: '1px solid #EAECF0',
            gap: '16px',
          }}
        >
          <div className="skeleton-shimmer" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '80px', height: '12px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '90px', height: '12px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '70px', height: '12px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '90px', height: '12px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '60px', height: '12px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ marginLeft: 'auto', width: '50px', height: '12px', borderRadius: '4px' }} />
        </div>
      )}

      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              borderBottom: '1px solid #F1F5F9',
              gap: '16px',
              height: '68px',
            }}
          >
            {/* Checkbox */}
            <div className="skeleton-shimmer" style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0 }} />

            {/* Repository or Finding title + subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: 1 }}>
              <div className="skeleton-shimmer" style={{ width: `${60 + (i % 3) * 15}%`, height: '14px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ width: '40%', height: '10px', borderRadius: '4px' }} />
            </div>

            {/* Branch Badge */}
            <div className="skeleton-shimmer" style={{ width: '70px', height: '20px', borderRadius: '12px', flexShrink: 0 }} />

            {/* Environment Badge */}
            <div className="skeleton-shimmer" style={{ width: '85px', height: '20px', borderRadius: '12px', flexShrink: 0 }} />

            {/* Last Scan Time */}
            <div className="skeleton-shimmer" style={{ width: '65px', height: '12px', borderRadius: '4px', flexShrink: 0 }} />

            {/* Findings Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div className="skeleton-shimmer" style={{ width: '75px', height: '8px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ width: '16px', height: '12px', borderRadius: '3px' }} />
            </div>

            {/* Risk Badge */}
            <div className="skeleton-shimmer" style={{ width: '55px', height: '20px', borderRadius: '12px', flexShrink: 0 }} />

            {/* Status Badge */}
            <div className="skeleton-shimmer" style={{ width: '65px', height: '20px', borderRadius: '12px', flexShrink: 0 }} />

            {/* Action Button */}
            <div className="skeleton-shimmer" style={{ width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TableSkeletonRows: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      <style>{`
        @keyframes shimmer-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: shimmer-sweep 1.5s infinite ease-in-out;
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', height: '68px' }}>
          <td style={{ padding: '14px 16px' }}>
            <div className="skeleton-shimmer" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton-shimmer" style={{ width: `${140 + (i % 4) * 30}px`, height: '14px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ width: '90px', height: '10px', borderRadius: '4px' }} />
            </div>
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div className="skeleton-shimmer" style={{ width: '65px', height: '20px', borderRadius: '12px' }} />
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div className="skeleton-shimmer" style={{ width: '80px', height: '20px', borderRadius: '12px' }} />
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div className="skeleton-shimmer" style={{ width: '55px', height: '12px', borderRadius: '4px' }} />
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="skeleton-shimmer" style={{ width: '75px', height: '8px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ width: '16px', height: '12px', borderRadius: '3px' }} />
            </div>
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div className="skeleton-shimmer" style={{ width: '55px', height: '20px', borderRadius: '12px' }} />
          </td>
          <td style={{ padding: '14px 16px' }}>
            <div className="skeleton-shimmer" style={{ width: '65px', height: '20px', borderRadius: '12px' }} />
          </td>
          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
            <div className="skeleton-shimmer" style={{ width: '28px', height: '28px', borderRadius: '6px', marginLeft: 'auto' }} />
          </td>
        </tr>
      ))}
    </>
  );
};
