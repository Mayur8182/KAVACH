'use client';

/**
 * Thing Code — IaC Security Findings Suite (/code/iac/findings)
 * Section 2: Screens 2.1 through 2.8
 * 
 * Features:
 *   2.1 Findings Overview
 *   2.2 All Findings
 *   2.3 Findings by Provider
 *   2.4 Findings by Severity
 *   2.5 Findings by Category
 *   2.6 Findings by Framework
 *   2.7 Findings by Environment
 *   2.8 Filters & Search
 */

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { FindingsSuiteWorkspace, type FindingsSubView } from '@/components/code/iac/FindingsSuiteWorkspace';
import { useScope } from '@/context/ScopeContext';

export default function IaCFindingsPage() {
  const searchParams = useSearchParams();
  const { currentRepository } = useScope();
  const rawView = searchParams.get('view') as FindingsSubView | null;
  const initialView = rawView || 'overview';
  const initialFindingId = searchParams.get('id') || '';
  const repositoryName = currentRepository?.name || 'All Repositories';

  return (
    <FindingsSuiteWorkspace
      initialView={initialView}
      initialFindingId={initialFindingId}
      repositoryName={repositoryName}
    />
  );
}
