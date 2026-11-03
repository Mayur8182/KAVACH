'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Integrations Suite (/code/iac/integrations)
 * Section 14: Screens 14.1 through 14.8
 * Sourced 100% from real backend APIs (/api/v1/iac/integrations-suite/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IntegrationsSuiteWorkspace,
  IntegrationsSuiteTab,
} from '@/components/code/iac/IntegrationsSuiteWorkspace';

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab') || searchParams?.get('view') || 'overview';
  const integrationId = searchParams?.get('id') || searchParams?.get('integrationId') || 'github';

  const validTabs: IntegrationsSuiteTab[] = [
    'overview',
    'connected',
    'add',
    'detail',
    'repositories',
    'webhooks',
    'scan-settings',
    'sync-logs',
  ];

  const activeTab = validTabs.includes(rawTab as IntegrationsSuiteTab)
    ? (rawTab as IntegrationsSuiteTab)
    : 'overview';

  return (
    <IntegrationsSuiteWorkspace
      initialTab={activeTab}
      initialIntegrationId={integrationId}
    />
  );
}

export default function IaCIntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] text-slate-600 p-8 font-mono text-sm">
          Loading Integrations workspace...
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
