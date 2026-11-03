'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Run Suite (/code/iac/run)
 * Section 7: Screens 7.1 through 7.8
 * Sourced 100% from real backend APIs (/api/v1/iac/run-suite/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RunSuiteWorkspace, RunSuiteTab } from '@/components/code/iac/RunSuiteWorkspace';

function RunSuiteContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab') || searchParams?.get('view') || 'overview';
  const clusterId = searchParams?.get('cluster') || searchParams?.get('clusterId') || undefined;

  const validTabs: RunSuiteTab[] = [
    'overview',
    'workloads',
    'containers',
    'kubernetes',
    'threats',
    'vulnerabilities',
    'network',
    'policies',
  ];

  const activeTab = validTabs.includes(rawTab as RunSuiteTab)
    ? (rawTab as RunSuiteTab)
    : 'overview';

  return (
    <RunSuiteWorkspace
      initialTab={activeTab}
      initialClusterId={clusterId}
    />
  );
}

export default function IaCRunPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] text-slate-600 p-8 font-mono text-sm">
          Loading Run Suite workspace...
        </div>
      }
    >
      <RunSuiteContent />
    </Suspense>
  );
}
