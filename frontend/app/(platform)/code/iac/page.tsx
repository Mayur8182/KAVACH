'use client';

/**
 * Kavach – Infrastructure as Code (IaC) Security Workspace (/code/iac)
 * 100% Pixel-Perfect Reference Design Implementation
 * 10-Step Interactive Security Flow:
 * 1. Add target
 * 2. Configure scan
 * 3. Run scan
 * 4. Findings
 * 5. Finding details
 * 6. Auto fix (AI)
 * 7. Pull request
 * 8. Auto merge
 * 9. Verify
 * 10. Resolved
 *
 * Backed by 100% Real PostgreSQL Data & Live Scanners (Zero Fake Data).
 */

import React, { Suspense } from 'react';
import { KavachIaCFlowWorkspace } from '@/components/code/iac/KavachIaCFlowWorkspace';

export default function IaCSecurityPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading Kavach IaC Security Flow...</div>}>
      <KavachIaCFlowWorkspace />
    </Suspense>
  );
}
