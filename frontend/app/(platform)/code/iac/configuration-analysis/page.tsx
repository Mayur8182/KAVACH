'use client';

/**
 * Thing Code — Infrastructure as Code Configuration Analysis (/code/iac/configuration-analysis)
 * 
 * Deep Terraform, Helm, and Kubernetes configuration scanning, policy enforcement,
 * resource inventory, security misconfigurations, secure configurations, drift,
 * compliance benchmarks, configuration deep-dive, and side-by-side comparison view.
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConfigurationAnalysisView, type ConfigAnalysisSubView } from '@/components/code/iac/ConfigurationAnalysisView';

function ConfigurationAnalysisContent() {
  const searchParams = useSearchParams();
  const viewParam = (searchParams?.get('view') as ConfigAnalysisSubView) || 'overview';
  const resourceParam = searchParams?.get('resource') || 'my-app-bucket';

  return (
    <ConfigurationAnalysisView
      initialSubView={viewParam}
      initialResourceId={resourceParam}
    />
  );
}

export default function ConfigurationAnalysisPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading Configuration Analysis...</div>}>
      <ConfigurationAnalysisContent />
    </Suspense>
  );
}
