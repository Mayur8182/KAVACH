'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Security Workspace (/code/iac)
 * 
 * Deep Terraform, Helm, and Kubernetes configuration scanning, policy enforcement,
 * environment posture, cloud provider distribution, resource inventory,
 * coverage analytics, compliance benchmarks, risk summary, and recent activity.
 * 
 * Sourced 100% from real backend APIs (/api/v1/iac/*).
 */

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IaCSecurityOverviewWorkspace, type IaCOverviewSubView } from '@/components/code/iac/IaCSecurityOverviewWorkspace';
import { KavachSecurityDomainCard } from '@/components/security/KavachSecurityDomainCard';
import { useScope } from '@/context/ScopeContext';

function IaCSecurityContent() {
  const searchParams = useSearchParams();
  const { currentRepository, currentProject } = useScope();
  const viewParam = (searchParams?.get('view') as IaCOverviewSubView) || 'overview';
  const repositoryName = currentRepository?.name || 'All Repositories';
  const [showConnectBanner, setShowConnectBanner] = useState<boolean>(!currentRepository);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {showConnectBanner && (
        <div style={{ padding: '24px 24px 0' }}>
          <KavachSecurityDomainCard
            domain="iac"
            theme="light"
            onConnect={() => {
              // Open connect or toggle
              alert('Connecting IaC repository... Choose GitHub, GitLab, or Bitbucket.');
              setShowConnectBanner(false);
            }}
          />
        </div>
      )}
      <IaCSecurityOverviewWorkspace
        initialSubView={viewParam}
        repositoryName={repositoryName}
      />
    </div>
  );
}

export default function IaCSecurityPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading IaC Security Overview...</div>}>
      <IaCSecurityContent />
    </Suspense>
  );
}
