'use client';

/**
 * Thing Code — Compliance & Benchmarks Suite (/code/iac/compliance)
 * Production suite covering all 8 reference screens:
 *   11.1 Compliance Overview
 *   11.2 Frameworks
 *   11.3 Controls Mapping
 *   11.4 Control Detail
 *   11.5 Compliance Report
 *   11.6 Evidence
 *   11.7 Exceptions
 *   11.8 Audit Logs
 * Sourced 100% from real backend APIs (/api/v1/iac/compliance-suite/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ComplianceWorkspace, type ComplianceSubView } from '@/components/code/iac/ComplianceWorkspace';

function IaCComplianceSuiteContent() {
  const searchParams = useSearchParams();
  const viewParam = (searchParams?.get('view') as ComplianceSubView) || 'overview';
  const controlIdParam = searchParams?.get('control_id') || 'CIS-1.2';

  return (
    <ComplianceWorkspace
      initialSubView={viewParam}
      initialControlId={controlIdParam}
      repositoryName="All Repositories"
    />
  );
}

export default function IaCCompliancePage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '0px' }}>
      <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading Compliance &amp; Benchmarks Suite...</div>}>
        <IaCComplianceSuiteContent />
      </Suspense>
    </div>
  );
}
