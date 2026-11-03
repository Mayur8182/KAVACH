'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Policies & Quality Gates (/code/iac/policies)
 * 
 * Screens:
 *   13.1 Policies Overview
 *   13.2 Policies
 *   13.3 Policy Detail
 *   13.4 Quality Gates
 *   13.5 Quality Gate Detail
 *   13.6 Violations
 *   13.7 Exceptions
 *   13.8 Settings
 * 
 * Sourced 100% from real backend APIs (/api/v1/iac/policies-gates/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PoliciesQualityGatesWorkspace, type PoliciesSubView } from '@/components/code/iac/PoliciesQualityGatesWorkspace';

import { useScope } from '@/context/ScopeContext';

function PoliciesQualityGatesContent() {
  const searchParams = useSearchParams();
  const { currentRepository } = useScope();
  const viewParam = (searchParams?.get('view') as PoliciesSubView) || 'overview';
  const policyId = searchParams?.get('policy_id') || 'POL-001';
  const gateId = searchParams?.get('gate_id') || 'QG-002';
  const repositoryName = currentRepository?.name || 'All Repositories';

  return (
    <PoliciesQualityGatesWorkspace
      initialSubView={viewParam}
      initialPolicyId={policyId}
      initialGateId={gateId}
      repositoryName={repositoryName}
    />
  );
}

export default function PoliciesQualityGatesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading Policies &amp; Quality Gates...</div>}>
      <PoliciesQualityGatesContent />
    </Suspense>
  );
}
