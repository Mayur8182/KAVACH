'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Security Overview (/code/iac/overview)
 * 
 * Deep Terraform, Helm, and Kubernetes configuration scanning, policy enforcement,
 * environment posture, cloud provider distribution, resource inventory,
 * coverage analytics, compliance benchmarks, risk summary, and recent activity.
 * 
 * Sourced 100% from real backend APIs (/api/v1/iac/overview/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { IaCSecurityOverviewWorkspace, type IaCOverviewSubView } from '@/components/code/iac/IaCSecurityOverviewWorkspace';

import { useScope } from '@/context/ScopeContext';

function IaCSecurityOverviewContent() {
  const searchParams = useSearchParams();
  const { currentRepository } = useScope();
  const viewParam = (searchParams?.get('view') as IaCOverviewSubView) || 'overview';
  const repositoryName = currentRepository?.name || 'All Repositories';

  return (
    <IaCSecurityOverviewWorkspace
      initialSubView={viewParam}
      repositoryName={repositoryName}
    />
  );
}

export default function IaCSecurityOverviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading IaC Security Overview...</div>}>
      <IaCSecurityOverviewContent />
    </Suspense>
  );
}
