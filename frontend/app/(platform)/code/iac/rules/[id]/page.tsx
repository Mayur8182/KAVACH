'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Rule Detail Suite (/code/iac/rules/[id])
 * Section 7: Screens 7.1 through 7.8
 * Sourced 100% from real backend APIs (/api/v1/iac/rule-detail-suite/*).
 */

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  RuleDetailSuiteWorkspace,
  RuleDetailTab,
} from '@/components/code/iac/RuleDetailSuiteWorkspace';

function RuleDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const ruleId = (params?.id as string) || 'IAC-AWS-001';
  const tab = (searchParams?.get('tab') as RuleDetailTab) || 'overview';

  return (
    <RuleDetailSuiteWorkspace
      initialRuleId={ruleId}
      initialTab={tab}
    />
  );
}

export default function IaCRuleDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] text-slate-600 p-8 font-mono text-sm">Loading rule workspace...</div>}>
      <RuleDetailContent />
    </Suspense>
  );
}
