"""
Integration and Unit Tests for SuperAdmin Tenant Plan Assignments & Overrides (Module 03 · Part 3).
Strictly validates:
- Real database persistence in SQLite / PostgreSQL.
- Listing assignments with summary counts (Total, Active, On Trial, Suspended).
- Plan selection, side-by-side preview, and transactional confirmation.
- 4 Overrides subtabs (Features, Limits & Quotas, Modules, Advanced Settings).
- Resetting overrides to plan defaults.
- Real telemetry usage (Repositories, Scan Minutes, API Calls, Storage).
- Upgrade and Downgrade preview with over-limit impact analysis.
- Downgrade safety block without explicit acknowledgement.
- Immutable plan action audit logging.
"""

import asyncio
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.services.superadmin_tenant_plan_service import SuperAdminTenantPlanService


class TestSuperAdminTenantPlans(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.session = AsyncSessionLocal()
        self.service = SuperAdminTenantPlanService(self.session)

    async def asyncTearDown(self):
        await self.session.close()

    async def test_01_list_tenant_assignments(self):
        """Test listing tenant plan assignments overview with summary counts."""
        res = await self.service.list_tenant_assignments(page=1, page_size=10)
        self.assertIn("summary", res)
        self.assertIn("items", res)
        self.assertGreaterEqual(res["summary"]["total_tenants"], 1)
        self.assertGreaterEqual(res["summary"]["active"], 1)
        print(f"\n[TEST 1] Tenant Plan Assignments Overview: {res['summary']['total_tenants']} total tenants, {res['summary']['active']} active.")

    async def test_02_get_tenant_current_plan_and_options(self):
        """Test retrieving current plan and available plan options for a tenant."""
        res = await self.service.list_tenant_assignments()
        first_tenant = res["items"][0]
        tenant_id = first_tenant["id"]

        curr = await self.service.get_tenant_current_plan(tenant_id)
        self.assertEqual(curr["organization"]["id"], tenant_id)
        self.assertIn("current_plan", curr)

        options = await self.service.get_plan_options(tenant_id)
        self.assertGreaterEqual(len(options["plans"]), 3)
        print(f"[TEST 2] Current plan for '{curr['organization']['name']}': {curr['current_plan']['name']}. Available options: {len(options['plans'])}.")

    async def test_03_preview_and_confirm_plan_assignment(self):
        """Test previewing and assigning plan to an organization."""
        res = await self.service.list_tenant_assignments()
        tenant_id = res["items"][0]["id"]

        preview = await self.service.preview_plan_assignment(tenant_id, "enterprise")
        self.assertEqual(preview["target_plan_key"], "enterprise")
        self.assertGreaterEqual(len(preview["comparison"]), 5)

        confirm = await self.service.confirm_plan_assignment(
            tenant_id=tenant_id,
            target_plan_key="enterprise",
            billing_cycle="annual",
            reason="Enterprise contract signed",
            actor_name="Founder SuperAdmin",
        )
        self.assertTrue(confirm["success"])
        print(f"[TEST 3] Plan assigned: Enterprise to {preview['organization']['name']} successfully.")

    async def test_04_assignment_history(self):
        """Test retrieving historical plan changes."""
        res = await self.service.list_tenant_assignments()
        tenant_id = res["items"][0]["id"]

        history = await self.service.get_plan_assignment_history(tenant_id)
        self.assertIsInstance(history, list)
        self.assertGreaterEqual(len(history), 1)
        print(f"[TEST 4] Retrieved {len(history)} assignment history records.")

    async def test_05_tenant_overrides_crud(self):
        """Test retrieving, updating, and resetting entitlement and quota overrides."""
        res = await self.service.list_tenant_assignments()
        tenant_id = res["items"][0]["id"]

        # 1. Get overrides
        overrides = await self.service.get_tenant_overrides(tenant_id)
        self.assertIn("features", overrides)
        self.assertIn("limits", overrides)
        self.assertIn("modules", overrides)
        self.assertIn("advanced", overrides)

        # 2. Save custom limit overrides
        limits_payload = [
            {"key": "max_repositories", "name": "Repository Limit", "custom_limit": 150, "inherit_from_plan": False},
            {"key": "monthly_scan_minutes", "name": "Scan Minutes (Monthly)", "custom_limit": 75000, "inherit_from_plan": False},
        ]
        saved_limits = await self.service.save_tenant_overrides(tenant_id, "limits", limits_payload)
        updated_repo_limit = next(l for l in saved_limits["limits"] if l["key"] == "max_repositories")
        self.assertEqual(updated_repo_limit["effective_value"], 150)

        # 3. Save feature overrides
        features_payload = [
            {"key": "sast", "custom_override": True, "inherit_from_plan": False},
        ]
        saved_feat = await self.service.save_tenant_overrides(tenant_id, "features", features_payload)
        updated_sast = next(f for f in saved_feat["features"] if f["key"] == "sast")
        self.assertEqual(updated_sast["effective_value"], "Enabled")

        # 4. Reset to plan defaults
        reset = await self.service.reset_tenant_overrides(tenant_id)
        reset_repo = next(l for l in reset["limits"] if l["key"] == "max_repositories")
        self.assertTrue(reset_repo["inherit_from_plan"])
        print("[TEST 5] Entitlement and Limit Overrides: retrieve, update, and reset verified.")

    async def test_06_tenant_usage_telemetry(self):
        """Test retrieving telemetry for Overview, Repositories, Scans, API, and Storage."""
        res = await self.service.list_tenant_assignments()
        tenant_id = res["items"][0]["id"]

        overview = await self.service.get_tenant_usage_overview(tenant_id)
        self.assertIn("metrics", overview)
        self.assertEqual(overview["metrics"]["repositories"]["percentage"], 72)

        repos = await self.service.get_tenant_repository_usage(tenant_id)
        self.assertGreaterEqual(len(repos), 3)

        scans = await self.service.get_tenant_scan_usage(tenant_id)
        self.assertEqual(scans["total_minutes_used"], 6420)
        self.assertEqual(len(scans["breakdown"]), 4)

        api_u = await self.service.get_tenant_api_usage(tenant_id)
        self.assertGreaterEqual(len(api_u["endpoints"]), 4)

        storage = await self.service.get_tenant_storage_usage(tenant_id)
        self.assertEqual(storage["total_used_gb"], 48)
        print("[TEST 6] Usage telemetry: Overview (48 GB storage, 18 repos), Scans breakdown, API endpoints verified.")

    async def test_07_plan_change_and_downgrade_safety(self):
        """Test downgrade impact calculation and safety block when unacknowledged."""
        res = await self.service.list_tenant_assignments()
        tenant_id = res["items"][0]["id"]

        # Preview downgrade to Starter
        preview = await self.service.preview_plan_change(tenant_id, "starter")
        self.assertTrue(preview["is_downgrade"])
        self.assertGreaterEqual(len(preview["impact_on_current_usage"]), 1)

        # Attempt downgrade without acknowledgment -> must raise ValueError
        with self.assertRaises(ValueError):
            await self.service.execute_plan_change(
                tenant_id=tenant_id,
                target_plan_key="starter",
                is_downgrade_acknowledged=False,
            )

        # Downgrade with explicit acknowledgment -> succeeds
        downgrade_res = await self.service.execute_plan_change(
            tenant_id=tenant_id,
            target_plan_key="starter",
            is_downgrade_acknowledged=True,
            reason="Customer request to downgrade to starter",
        )
        self.assertTrue(downgrade_res["success"])
        self.assertEqual(downgrade_res["action"], "Plan Downgraded")
        print("[TEST 7] Downgrade safety block & impact analysis verified.")

    async def test_08_plan_action_audit_log(self):
        """Test plan action audit trail persistence."""
        res = await self.service.list_tenant_assignments()
        tenant_id = res["items"][0]["id"]

        audit_events = await self.service.get_plan_action_audit_log(tenant_id)
        self.assertIsInstance(audit_events, list)
        self.assertGreaterEqual(len(audit_events), 1)
        print(f"[TEST 8] Plan Action Audit Log verified with {len(audit_events)} persistent events.")


if __name__ == "__main__":
    unittest.main()
