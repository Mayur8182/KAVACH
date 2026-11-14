'use client';

import React from 'react';
import { KavachBrandLoader } from '@/components/feedback/KavachBrandLoader';

export default function PlatformRouteLoading() {
  return (
    <div
      style={{
        padding: '32px 32px 48px 32px',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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

      {/* Signature Animated Logo & Pedestal Loader */}
      <KavachBrandLoader
        size="lg"
        message="Loading Platform Workspace..."
        submessage="Synchronizing real-time security telemetry, scans, and OPA policy engine..."
      />

      {/* Supporting Subtle Shimmer Cards Grid */}
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          marginTop: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          opacity: 0.7,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
              <div className="skeleton-shimmer" style={{ width: '40px', height: '12px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: '100px', height: '12px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '60px', height: '22px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
