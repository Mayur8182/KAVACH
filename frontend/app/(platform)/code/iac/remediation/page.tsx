'use client';

/**
 * Thing Code — IaC Security Remediation Suite (/code/iac/remediation)
 * Section 5: Screens 5.1 through 5.8
 * 
 * Features:
 *   5.1 Remediation Overview (KPIs, Status Trend, Top Categories)
 *   5.2 Fix Recommendations (Multi-filters, Matrix table, View Detail)
 *   5.3 Remediation Detail (Side-by-side diff, Terraform/CloudFormation/Helm switchers)
 *   5.4 Auto-Fix / AI Remediation (Beta, Available badge, Generate PR modal)
 *   5.5 PR Integration (PR list, status badges, PR Detail drawer)
 *   5.6 Suppressed Findings (Active/History, Waiver edit, Revoke waiver)
 *   5.7 Remediation Activity (Action & User filters, timeline table)
 *   5.8 Remediation Settings (Auto-Fix, PR integration, Notifications, Save/Reset)
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RemediationSuiteWorkspace, type RemediationSubView } from '@/components/code/iac/RemediationSuiteWorkspace';

function RemediationContent() {
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view') as RemediationSubView | null;
  const initialView = rawView || 'overview';
  const initialFindingId = searchParams.get('id') || 'IAC-001';

  return (
    <RemediationSuiteWorkspace
      initialView={initialView}
      initialFindingId={initialFindingId}
    />
  );
}

export default function IaCRemediationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] text-slate-600 p-8 font-mono text-sm">Loading Remediation Suite...</div>}>
      <RemediationContent />
    </Suspense>
  );
}
