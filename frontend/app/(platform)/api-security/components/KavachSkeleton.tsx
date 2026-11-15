'use client';

import React from 'react';

/**
 * Kavach API Security — World-Class Left-to-Right Skeleton Shimmer
 * Adheres strictly to the warm ivory (#FAF9F6) and crisp white design system.
 * Shimmer sweeps smoothly from left to right.
 */

export function KavachShimmer({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  style,
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#F1F5F9',
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-block',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(241, 245, 249, 0) 0%, rgba(255, 255, 255, 0.85) 50%, rgba(241, 245, 249, 0) 100%)',
          animation: 'kavachShimmer 1.5s infinite linear',
        }}
      />
      <style jsx>{`
        @keyframes kavachShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Metric Card Skeleton (for 4-metric grid on Dashboard, Inventory, Analysis)
 */
export function KavachSkeletonMetricCard() {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '16px 18px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <KavachShimmer width="60%" height="13px" />
        <KavachShimmer width="16px" height="16px" borderRadius="50%" />
      </div>
      <KavachShimmer width="45%" height="28px" borderRadius="6px" style={{ margin: '4px 0' }} />
      <KavachShimmer width="80%" height="11px" />
    </div>
  );
}

/**
 * 4-Grid Metric Skeleton
 */
export function KavachSkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        gap: '14px',
        marginBottom: '20px',
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <KavachSkeletonMetricCard key={idx} />
      ))}
    </div>
  );
}

/**
 * Table Skeleton (Header + N Rows with Shimmering Columns)
 */
export function KavachSkeletonTable({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Table Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          padding: '12px 18px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          gap: '12px',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <KavachShimmer key={i} width={i === 0 ? '40%' : '65%'} height="12px" />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            padding: '14px 18px',
            borderBottom: rIdx === rows - 1 ? 'none' : '1px solid #F1F5F9',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cIdx === 0 && <KavachShimmer width="16px" height="16px" borderRadius="4px" />}
              <KavachShimmer
                width={cIdx === 0 ? '75%' : cIdx === columns - 1 ? '50%' : '80%'}
                height="14px"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Detail Header Skeleton (Page Title, Subtitle, Action Buttons)
 */
export function KavachSkeletonHeader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <KavachShimmer width="220px" height="26px" borderRadius="6px" />
        <KavachShimmer width="360px" height="13px" />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <KavachShimmer width="120px" height="34px" borderRadius="8px" />
        <KavachShimmer width="130px" height="34px" borderRadius="8px" />
      </div>
    </div>
  );
}

/**
 * Card / Panel Skeleton
 */
export function KavachSkeletonCard({ height = '160px' }: { height?: string }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '20px',
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <KavachShimmer width="40%" height="16px" />
        <KavachShimmer width="70%" height="12px" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <KavachShimmer width="90%" height="12px" />
        <KavachShimmer width="80%" height="12px" />
      </div>
    </div>
  );
}

/**
 * Full Page Skeleton for API Security views
 */
export function KavachSkeletonPage() {
  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <KavachSkeletonHeader />
      <KavachSkeletonMetricGrid count={4} />
      <KavachSkeletonTable rows={6} columns={5} />
    </div>
  );
}
