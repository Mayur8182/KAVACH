'use client';

/**
 * Kavach — IaC Security: Infrastructure Graph (/code/iac/graph)
 * Screen 06: Resource relationship visualization, network connections, security groups,
 * IAM relationships, dependencies, and blast radius calculation.
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
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '32px', color: '#64748B' }}>
          Loading Infrastructure Graph workspace...
        </div>
      }
    >
      <GraphSuiteContent />
    </Suspense>
  );
}
