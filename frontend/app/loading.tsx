import React from 'react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';

export default function GlobalLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px',
      }}
    >
      <div style={{ width: '400px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Loading security control plane...
        </div>
        <LoadingSkeleton rows={4} height="24px" />
      </div>
    </div>
  );
}
