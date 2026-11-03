'use client';

import React from 'react';
import { TableSkeleton } from '@/components/feedback/TableSkeleton';

export default function PlatformRouteLoading() {
  return (
    <div
      style={{
        padding: '24px 32px 40px 32px',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
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

      {/* 1. Breadcrumb shimmer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div className="skeleton-shimmer" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
        <div className="skeleton-shimmer" style={{ width: '12px', height: '14px', borderRadius: '4px' }} />
        <div className="skeleton-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
      </div>

      {/* 2. Header title & actions shimmer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-shimmer" style={{ width: '260px', height: '28px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ width: '420px', height: '14px', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="skeleton-shimmer" style={{ width: '90px', height: '36px', borderRadius: '8px' }} />
          <div className="skeleton-shimmer" style={{ width: '130px', height: '36px', borderRadius: '8px' }} />
        </div>
      </div>

      {/* 3. 4 KPI Metric Cards Shimmer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #EAECF0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton-shimmer" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              <div className="skeleton-shimmer" style={{ width: '48px', height: '12px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: '120px', height: '12px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '70px', height: '28px', borderRadius: '6px' }} />
            <div className="skeleton-shimmer" style={{ width: '140px', height: '12px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* 4. Table card container & Shimmer rows */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #EAECF0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div
          style={{
            height: '56px',
            padding: '0 20px',
            borderBottom: '1px solid #EAECF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="skeleton-shimmer" style={{ width: '100px', height: '16px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '90px', height: '16px', borderRadius: '4px' }} />
          </div>
          <div className="skeleton-shimmer" style={{ width: '220px', height: '32px', borderRadius: '6px' }} />
        </div>

        <TableSkeleton rows={7} showHeader={true} />
      </div>
    </div>
  );
}
