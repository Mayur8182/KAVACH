'use client';

/**
 * Kavach Onboarding — Direct Streamlined Project Creation & Repository Linking
 * Direct authentication -> Create Project -> GitHub (validated) -> Link Repository -> Slack (optional) -> Kavach Product Selection
 */

import React, { Suspense } from 'react';
import { CreateProjectWorkflow } from '@/components/projects/CreateProjectWorkflow';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', color: '#64748B' }}>Loading setup...</div>}>
      <CreateProjectWorkflow />
    </Suspense>
  );
}
