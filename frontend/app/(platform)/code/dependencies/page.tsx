'use client';

/**
 * Kavach Code — Dependencies Findings & Automated Remediation Workspace (/code/dependencies)
 *
 * Unified End-to-End Workflow:
 * 1. Dependency Findings Dashboard: 5 real-time summary cards, last scan info bar, search & filters
 * 2. Findings Table: Package, Type, Severity, Version -> Fixed, Status, Action (+ Auto Fix, ...)
 * 3. New Dependency Scan Modal: Full scan, Lockfiles only, Custom, Discovered manifests, live scanner execution
 * 4. Finding Details Side Drawer: Reachability call sites, exploitation risk %, evidence snippet, hierarchy
 * 5. AI Auto Fix Modal: Risk confirmed, Proposed changes BEFORE/AFTER diff, validation checklist
 * 6. Auto PR Modal: PR Title, branch, vulnerability explanation, validation results, security references
 * 7. Verification & PR Lifecycle: Verify Fix (rescan & mark Fixed), Undo, and CycloneDX SBOM download
 *
 * 100% Backed by PostgreSQL & Live Scanners per AGENTS.md Directives.
 */

import React from 'react';
import { KavachDependenciesFlowWorkspace } from '@/components/code/dependencies/KavachDependenciesFlowWorkspace';

export default function DependenciesPage() {
  return <KavachDependenciesFlowWorkspace />;
}
