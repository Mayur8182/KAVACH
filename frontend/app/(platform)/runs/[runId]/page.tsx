'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveRunWorkspace } from '@/components/runs/LiveRunWorkspace';

export default function LiveRunWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const runId = (params?.runId as string) || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <LiveRunWorkspace
        runId={runId}
        isEmbedded={false}
      />
    </div>
  );
}
