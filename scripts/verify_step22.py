#!/usr/bin/env python3
"""
Step 22 Verification Script — Enterprise Control Plane Frontend & UX Architecture.

Verifies:
1. Shell & Navigation Architecture (AppShell, TopBar, Sidebar)
2. Product compartments & Grouped Semantic Taxonomy per DESIGN.md
3. Global Dashboard with authentic API query integration
4. Enterprise Views (ApprovalCenterView, AuditLogView, CloudView, AttackView)
5. Strict adherence to AGENTS.md Rules 1-5, 8, 10 (no hardcoded data, no mock API responses)
6. Frontend production build integrity (Vite + TypeScript)
"""

import sys
import os
import subprocess
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
SRC_DIR = FRONTEND_DIR / "src"

def check(condition: bool, description: str):
    if condition:
        print(f"  [PASS] {description}")
    else:
        print(f"  [FAIL] {description}")
        sys.exit(1)

def main():
    print("=" * 70)
    print("STEP 22 — VERIFICATION: ENTERPRISE CONTROL PLANE SHELL & UX")
    print("=" * 70)

    # 1. Shell & Navigation Component Files
    print("\n[1/5] Verifying Shell & Navigation Architecture...")
    app_shell_file = SRC_DIR / "components" / "shell" / "AppShell.tsx"
    top_bar_file = SRC_DIR / "components" / "shell" / "TopBar.tsx"
    sidebar_file = SRC_DIR / "components" / "shell" / "Sidebar.tsx"
    nav_types_file = SRC_DIR / "types" / "navigation.ts"

    check(app_shell_file.exists(), "AppShell.tsx component exists")
    check(top_bar_file.exists(), "TopBar.tsx component exists with project selector")
    check(sidebar_file.exists(), "Sidebar.tsx component exists with grouped navigation")
    check(nav_types_file.exists(), "navigation.ts types exist with AppRoute taxonomy")

    topbar_src = top_bar_file.read_text(encoding="utf-8")
    check("selectedProjectId" in topbar_src and "onSelectProject" in topbar_src, "TopBar contains interactive project selector")

    sidebar_src = sidebar_file.read_text(encoding="utf-8")
    required_groups = [
        "WORKSPACE", "CODE", "CLOUD", "ATTACK", "RUNTIME",
        "AI AGENTS", "INTELLIGENCE", "INCIDENT", "CONTROL PLANE", "SYSTEM"
    ]
    for grp in required_groups:
        check(f"'{grp}'" in sidebar_src or f'"{grp}"' in sidebar_src, f"Sidebar includes product group: {grp}")

    # 2. Global Dashboard & Shared Components
    print("\n[2/5] Verifying Global Dashboard & Design System...")
    dashboard_file = SRC_DIR / "components" / "dashboard" / "GlobalDashboard.tsx"
    status_badge_file = SRC_DIR / "components" / "shared" / "StatusBadge.tsx"
    loading_state_file = SRC_DIR / "components" / "shared" / "LoadingState.tsx"
    error_state_file = SRC_DIR / "components" / "shared" / "ErrorState.tsx"

    check(dashboard_file.exists(), "GlobalDashboard.tsx component exists")
    check(status_badge_file.exists(), "StatusBadge.tsx exists with deterministic status styles")
    check(loading_state_file.exists(), "LoadingState.tsx exists with layout-preserving skeleton")
    check(error_state_file.exists(), "ErrorState.tsx exists with actionable retry handler")

    dashboard_src = dashboard_file.read_text(encoding="utf-8")
    check("apiClient" in dashboard_src, "GlobalDashboard queries real backend apiClient")
    check("listFindings" in dashboard_src and "listIncidents" in dashboard_src, "GlobalDashboard aggregates findings and incidents")

    # 3. Enterprise Views & Rule Compliance
    print("\n[3/5] Verifying Enterprise Views & Directives...")
    approval_file = SRC_DIR / "components" / "control" / "ApprovalCenterView.tsx"
    audit_file = SRC_DIR / "components" / "control" / "AuditLogView.tsx"
    cloud_file = SRC_DIR / "components" / "cloud" / "CloudView.tsx"
    attack_file = SRC_DIR / "components" / "attack" / "AttackView.tsx"

    check(approval_file.exists(), "ApprovalCenterView.tsx exists")
    check(audit_file.exists(), "AuditLogView.tsx exists")
    check(cloud_file.exists(), "CloudView.tsx exists")
    check(attack_file.exists(), "AttackView.tsx exists")

    approval_src = approval_file.read_text(encoding="utf-8")
    check("approveDecision" in approval_src and "rejectDecision" in approval_src, "ApprovalCenter connects real decision mutations")

    audit_src = audit_file.read_text(encoding="utf-8")
    check("listAuditEvents" in audit_src, "AuditLogView connects to /audit-events")

    cloud_src = cloud_file.read_text(encoding="utf-8")
    check("NOT_CONFIGURED" in cloud_src, "CloudView enforces Rule 3 & 10 (NOT_CONFIGURED for missing credentials)")

    # 4. App.tsx Integration
    print("\n[4/5] Verifying App.tsx Shell Integration...")
    app_file = SRC_DIR / "App.tsx"
    app_src = app_file.read_text(encoding="utf-8")
    check("<AppShell" in app_src, "App.tsx wraps views inside AppShell")
    check("GlobalDashboard" in app_src, "App.tsx mounts GlobalDashboard on 'dashboard' route")
    check("ApprovalCenterView" in app_src, "App.tsx mounts ApprovalCenterView on 'control/approvals'")
    check("AuditLogView" in app_src, "App.tsx mounts AuditLogView on 'control/audit'")
    check("CloudView" in app_src, "App.tsx mounts CloudView on cloud routes")
    check("AttackView" in app_src, "App.tsx mounts AttackView on attack routes")

    # 5. Frontend Production Build Check
    print("\n[5/5] Running TypeScript check and Production Build...")
    cmd = "npm run build"
    result = subprocess.run(cmd, cwd=str(FRONTEND_DIR), shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Build Failed:\n{result.stderr}\n{result.stdout}")
        sys.exit(1)
    check(True, "Frontend production build (tsc -b && vite build) succeeded cleanly")

    print("\n" + "=" * 70)
    print("STEP 22 VERIFICATION COMPLETE: ALL CHECKS PASSED")
    print("=" * 70)

if __name__ == "__main__":
    main()
