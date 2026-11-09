'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  minHeight?: string | number;
}

export function LoadingState({
  message = 'Loading data from security database...',
  subtext = 'Synchronizing real-time telemetry and scanner states',
  minHeight = '320px',
}: LoadingStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        minHeight,
        textAlign: 'center',
        color: '#64748B',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <RefreshCw size={26} className="animate-spin" style={{ color: '#4F46E5', marginBottom: '14px' }} />
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
        {message}
      </div>
      {subtext && (
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', maxWidth: '380px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

export default LoadingState;

