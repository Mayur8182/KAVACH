'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Quality Gates Route (/code/iac/quality-gates)
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PoliciesQualityGatesWorkspace, type PoliciesSubView } from '@/components/code/iac/PoliciesQualityGatesWorkspace';

import { useScope } from '@/context/ScopeContext';

function QualityGatesContent() {
  const searchParams = useSearchParams();
  const { currentRepository } = useScope();
  const viewParam = (searchParams?.get('view') as PoliciesSubView) || 'quality-gates';
  const gateId = searchParams?.get('gate_id') || 'QG-002';
  const repositoryName = currentRepository?.name || 'All Repositories';

  return (
    <PoliciesQualityGatesWorkspace
      initialSubView={viewParam}
      initialGateId={gateId}
      repositoryName={repositoryName}
    />
  );
}

export default function QualityGatesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading Quality Gates...</div>}>
      <QualityGatesContent />
    </Suspense>
  );
}
