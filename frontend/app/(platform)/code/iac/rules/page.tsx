'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Rules (/code/iac/rules)
 * 
 * Screens:
 *   6.1 Rules Overview
 *   6.2 All Rules
 *   6.3 Enabled Rules
 *   6.4 Disabled Rules
 *   6.5 Custom Rules
 *   6.6 Rule Packs
 *   6.7 Rule Filters & Search
 *   6.8 Rule Configuration
 * 
 * Sourced 100% from real backend APIs (/api/v1/iac/rules/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RulesWorkspace, type RulesSubView } from '@/components/code/iac/RulesWorkspace';

import { useScope } from '@/context/ScopeContext';

function IaCRulesContent() {
  const searchParams = useSearchParams();
  const { currentRepository } = useScope();
  const viewParam = (searchParams?.get('view') as RulesSubView) || 'overview';
  const ruleIdParam = searchParams?.get('rule_id') || 'IAC-001';
  const repositoryName = currentRepository?.name || 'All Repositories';

  return (
    <RulesWorkspace
      initialSubView={viewParam}
      initialRuleId={ruleIdParam}
      repositoryName={repositoryName}
    />
  );
}

export default function IaCRulesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading IaC Rules Workspace...</div>}>
      <IaCRulesContent />
    </Suspense>
  );
}
