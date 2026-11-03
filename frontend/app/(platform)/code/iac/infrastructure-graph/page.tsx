'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Infrastructure Graph Suite (/code/iac/infrastructure-graph)
 * Section 12: Screens 12.1 through 12.8
 * Sourced 100% from real backend APIs (/api/v1/iac/graph-suite/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  InfrastructureGraphSuiteWorkspace,
  GraphSuiteTab,
} from '@/components/code/iac/InfrastructureGraphSuiteWorkspace';

function GraphSuiteContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab') || searchParams?.get('view') || 'overview';
  const resourceId = searchParams?.get('resourceId') || 'eks-prod-cluster';

  const validTabs: GraphSuiteTab[] = [
    'overview',
    'resource-graph',
    'resource-detail',
    'risk-view',
    'relationships',
    'blast-radius',
    'change-history',
    'settings',
  ];

  const activeTab = validTabs.includes(rawTab as GraphSuiteTab)
    ? (rawTab as GraphSuiteTab)
    : 'overview';

  return (
    <InfrastructureGraphSuiteWorkspace
      initialTab={activeTab}
      initialResourceId={resourceId}
    />
  );
}

export default function InfrastructureGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] text-slate-600 p-8 font-mono text-sm">
          Loading Infrastructure Graph workspace...
        </div>
      }
    >
      <GraphSuiteContent />
    </Suspense>
  );
}
