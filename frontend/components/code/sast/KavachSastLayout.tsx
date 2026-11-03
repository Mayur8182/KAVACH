'use client';

import React from 'react';

export interface KavachSastLayoutProps {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function KavachSastLayout({ children }: KavachSastLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        minHeight: 0,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>{children}</div>
    </div>
  );
}

export default KavachSastLayout;
