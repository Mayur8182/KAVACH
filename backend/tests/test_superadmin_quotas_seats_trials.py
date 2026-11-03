"""
Automated Integration and Production Tests for
THING / SecuLayer — Founder SuperAdmin
Module 03 · Part 4: Quotas, Developer Seats & Trial Management

Verifies:
1. Quota overview aggregation, KPI counters (total, over quota, near limit, healthy), and filtering.
2. Repository limits and rules toggles.
3. Scan limits, concurrent execution rules, and quota settings.
4. API usage quotas, rate limits, and throttling settings.
5. Storage quotas and artifact retention policies.
6. Tenant quota overrides CRUD and 30-day historical usage trends.
7. Quota alert rules and notification dispatch configuration.
8. Developer seat limits overview, tenant role allocation (Developers, Security Engineers, Auditors), and seat policies.
9. Seat limit overrides CRUD.
10. Trial lifecycle management: list, create, details, extension, conversion to paid, cancellation, and history.
"""

import asyncio
import os
import sys
import unittest
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.services.superadmin_quota_seat_trial_service import SuperAdminQuotaSeatTrialService


class TestSuperAdminQuotasSeatsTrials(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        self.session = AsyncSessionLocal()
        self.service = SuperAdminQuotaSeatTrialService(self.session)

    async def asyncTearDown(self):
        await self.session.close()

    async def test_01_quota_overview(self):
        """Test Screen 1: Quota Overview and KPI counts."""
        res = await self.service.get_quota_overview()
        self.assertIn("summary", res)
        self.assertIn("items", res)

        summary = res["summary"]
        self.assertGreaterEqual(summary["total_tenants"], 5)
        self.assertIn("over_quota", summary)
        self.assertIn("near_limit", summary)
        self.assertIn("healthy", summary)

        # Verify filtering by plan
        pro_res = await self.service.get_quota_overview(plan_filter="Pro")
        for item in pro_res["items"]:
            self.assertEqual(item["plan"].lower(), "pro")

        print(f"[TEST 1] Quota Overview verified: {summary['total_tenants']} tenants, "
              f"Over Quota: {summary['over_quota']}, Near Limit: {summary['near_limit']}, Healthy: {summary['healthy']}")

    async def test_02_repository_limits_and_rules(self):
        """Test Screen 2: Repository Limits & Rules."""
        res = await self.service.get_repository_limits_and_rules()
        self.assertIn("plan_limits", res)
        self.assertIn("repository_rules", res)

        plan_limits = res["plan_limits"]
        self.assertTrue(any(p["plan"] == "Starter" for p in plan_limits))
        self.assertTrue(any(p["plan"] == "Enterprise" for p in plan_limits))

        # Update rules
        updated = await self.service.update_repository_rules({
            "block_at_limit": True,
            "allow_temporary_overage": True,
            "notify_admins_at_80": True,
            "include_archived": False,
        })
        self.assertTrue(updated["success"])
        self.assertTrue(updated["rules"]["allow_temporary_overage"])
        print("[TEST 2] Repository Limits & Rules verified.")

    async def test_03_scan_and_api_limits(self):
        """Test Screens 3 & 4: Scan Quotas and API Usage Settings."""
        # Scans
        scan_data = await self.service.get_scan_limits_and_settings()
        self.assertIn("plan_limits", scan_data)
        self.assertIn("scan_quota_settings", scan_data)

        scan_up = await self.service.update_scan_settings({
            "block_scans_when_limit_reached": True,
            "allow_burst_usage": True,
            "notify_admins_at_80": True,
            "reset_period": "Monthly",
        })
        self.assertTrue(scan_up["success"])

        # API
        api_data = await self.service.get_api_limits_and_settings()
        self.assertIn("plan_limits", api_data)
        self.assertIn("api_usage_settings", api_data)

        api_up = await self.service.update_api_settings({
            "enforce_rate_limits": True,
            "block_requests_when_nearly_limit_reached": True,
            "allow_whitelisted_ip_ranges": True,
            "log_all_blocked_requests": True,
        })
        self.assertTrue(api_up["success"])
        print("[TEST 3] Scan & API limits and configuration verified.")

    async def test_04_storage_quotas_and_overrides(self):
        """Test Screens 5 & 6: Storage Quotas and Tenant Quota Overrides."""
        # Storage
        storage_data = await self.service.get_storage_limits_and_settings()
        self.assertIn("plan_limits", storage_data)
        self.assertIn("storage_settings", storage_data)

        # Quota Overrides
        overrides = await self.service.list_quota_overrides()
        self.assertIsInstance(overrides, list)
        self.assertGreaterEqual(len(overrides), 3)

        # Create new override
        created = await self.service.create_quota_override(
            organization_name="Globex Inc",
            quota_type="Repositories",
            override_limit="75",
            valid_till="31 Dec 2026",
            reason="Enterprise scale-up expansion",
        )
        self.assertTrue(created["success"])
        print(f"[TEST 4] Storage quotas and {len(overrides)} quota overrides verified.")

    async def test_05_usage_history_and_alerts(self):
        """Test Screens 7 & 8: Usage History Trends and Quota Alerts."""
        history = await self.service.get_quota_usage_history()
        self.assertIn("trend_points", history)
        self.assertIn("recent_events", history)
        self.assertEqual(len(history["trend_points"]), 30)

        # Alerts
        rules = await self.service.list_quota_alert_rules()
        self.assertGreaterEqual(len(rules), 3)

        # Toggle rule
        rule_id = rules[0]["id"]
        toggled = await self.service.toggle_quota_alert_rule(rule_id)
        self.assertIn(toggled["status"], ["Active", "Disabled"])

        # Notifications
        notif = await self.service.get_quota_notification_settings()
        self.assertIn("notify_tenant_admins", notif)
        print(f"[TEST 5] Usage history 30-day trends and {len(rules)} alert rules verified.")

    async def test_06_seat_limits_and_allocation(self):
        """Test Screens 9 & 10: Seat Limits Overview and Role Allocation."""
        overview = await self.service.get_seat_limits_overview()
        self.assertIn("summary", overview)
        self.assertIn("items", overview)

        summary = overview["summary"]
        self.assertGreater(summary["total_seats"], 0)
        self.assertGreater(summary["used_seats"], 0)

        # Screen 10: Allocation for Acme Corp
        allocation = await self.service.get_tenant_seat_usage_and_allocation("Acme Corp")
        self.assertEqual(allocation["total_seats"], 25)
        self.assertEqual(allocation["used_seats"], 18)
        self.assertIn("role_allocations", allocation)
        self.assertEqual(len(allocation["role_allocations"]), 3)  # Developers, Security Engineers, Auditors
        print(f"[TEST 6] Seat Limits Overview ({summary['total_seats']} seats) and Acme Corp role allocations verified.")

    async def test_07_seat_policies_and_overrides(self):
        """Test Screens 11 & 12: Seat Policies and Seat Overrides CRUD."""
        policies = await self.service.get_seat_policies_and_plan_defaults()
        self.assertIn("plan_defaults", policies)
        self.assertIn("seat_policies", policies)

        # Update seat policy
        up = await self.service.update_seat_policies({
            "allow_invite_beyond_limit": True,
            "default_role_mapping": "Security Engineer",
        })
        self.assertTrue(up["success"])

        # Seat Overrides CRUD
        overrides = await self.service.list_seat_overrides()
        self.assertGreaterEqual(len(overrides), 2)

        # Create new override
        new_ovr = await self.service.create_seat_override(
            organization_name="Wayne Enterprises",
            role="Developers",
            override_limit=45,
            valid_till_days=60,
            reason="Temporary Q4 project hiring",
        )
        self.assertEqual(new_ovr["override_limit"], 45)

        # Delete override
        del_res = await self.service.delete_seat_override(new_ovr["id"])
        self.assertTrue(del_res["success"])
        print("[TEST 7] Seat Policies & Seat Overrides CRUD verified.")

    async def test_08_trial_management_lifecycle(self):
        """Test Screens 13, 14, 15, 16: Complete Trial Lifecycle."""
        # 1. Screen 13: All Trials
        trials_res = await self.service.list_trials()
        self.assertIn("summary", trials_res)
        self.assertIn("items", trials_res)
        self.assertGreaterEqual(trials_res["summary"]["total_trials"], 4)

        # 2. Screen 14: Create Trial
        test_org_name = f"Test Trial Corp {uuid.uuid4().hex[:6]}"
        created = await self.service.create_trial(
            organization_name=test_org_name,
            plan_key="pro",
            duration_days=14,
            auto_convert=False,
            send_reminders=True,
        )
        self.assertTrue(created["success"])
        trial_id = created["trial"]["id"]

        # 3. Screen 15: Trial Details
        details = await self.service.get_trial_details(trial_id)
        self.assertEqual(details["organization_name"], test_org_name)
        self.assertIn("usage_during_trial", details)
        self.assertIn("repositories", details["usage_during_trial"])

        # Extend Trial
        extended = await self.service.extend_trial(trial_id, extension_days=7)
        self.assertTrue(extended["success"])
        self.assertEqual(extended["trial"]["duration_days"], 21)

        # Convert Trial to Paid
        converted = await self.service.convert_trial_to_paid(trial_id, target_plan_key="pro")
        self.assertTrue(converted["success"])
        self.assertEqual(converted["trial"]["status"], "Converted")

        # 4. Screen 16: Trial History
        history = await self.service.get_trial_history()
        self.assertIn("expired_trials", history)
        self.assertIn("conversions", history)
        self.assertTrue(any(c["organization"] == test_org_name for c in history["conversions"]))
        print(f"[TEST 8] Complete Trial lifecycle (Create -> Details -> Extend -> Convert -> History) verified.")


if __name__ == "__main__":
    unittest.main()
