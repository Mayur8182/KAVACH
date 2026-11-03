'use client';

/**
 * Thing Code — IaC Scans Suite (/code/iac/scans)
 * Production suite covering all 8 screens:
 *   8.1 Scans Overview
 *   8.2 Scan History
 *   8.3 Scheduled Scans
 *   8.4 On-Demand Scan (Run New Scan)
 *   8.5 Scan Configurations
 *   8.6 Results Comparison
 *   8.7 Scan Queue
 *   8.8 Scan Settings
 * Sourced 100% from real backend APIs (/api/v1/iac/scans-suite/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScansSuiteWorkspace, type ScansSubView } from '@/components/code/iac/ScansSuiteWorkspace';

import { useScope } from '@/context/ScopeContext';

function IaCScansSuiteContent() {
  const searchParams = useSearchParams();
  const { currentRepository } = useScope();
  const viewParam = (searchParams?.get('view') as ScansSubView) || 'overview';
  const repositoryName = currentRepository?.name || 'All Repositories';

  return (
    <ScansSuiteWorkspace
      initialSubView={viewParam}
      repositoryName={repositoryName}
    />
  );
}

export default function IaCScansPage() {
  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading IaC Scans Suite...</div>}>
        <IaCScansSuiteContent />
      </Suspense>
    </div>
  );
}
