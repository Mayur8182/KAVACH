import React from 'react';
import { KavachBrandLoader } from '@/components/feedback/KavachBrandLoader';

export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '70vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <KavachBrandLoader
        size="lg"
        message="Initializing Kavach Security..."
        submessage="Connecting cryptographic policy engines and verifying posture..."
      />
    </div>
  );
}

