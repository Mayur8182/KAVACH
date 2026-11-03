'use client';

/**
 * Thing Code — Infrastructure as Code (IaC) Settings Suite (/code/iac/settings)
 * Section 15: Screens 15.1 through 15.7
 * Sourced 100% from real backend APIs (/api/v1/iac/settings-suite/*).
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  SettingsSuiteWorkspace,
  SettingsSection,
} from '@/components/code/iac/SettingsSuiteWorkspace';
import { useScope } from '@/context/ScopeContext';

function SettingsContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab') || searchParams?.get('section') || 'general';

  const { currentRepository } = useScope();
  const validSections: SettingsSection[] = [
    'general',
    'scan',
    'rules',
    'exclusions',
    'notifications',
    'access',
    'advanced',
  ];

  const section = validSections.includes(rawTab as SettingsSection)
    ? (rawTab as SettingsSection)
    : 'general';

  const repositoryName = currentRepository?.name || 'All Repositories';

  return <SettingsSuiteWorkspace initialSection={section} repositoryName={repositoryName} />;
}

export default function IaCSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] text-slate-600 p-8 font-mono text-sm">Loading settings workspace...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
