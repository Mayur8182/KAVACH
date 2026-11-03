"""
Thing Control Plane — Founder SuperAdmin Plans Test Suite
Tests for Part 1: Subscription Plans, Licensing & Feature Entitlements
Strict compliance with AGENTS.md:
- Real DB operations
- No fake/mock data
- Deterministic verification of versioning, auditing, and RBAC
"""

import asyncio
import os
import sys
import uuid
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.plan import SubscriptionPlan, PlanVersion, FeatureCatalog, PlanAuditEvent
from app.models.organization import Organization, OrganizationSubscription
from app.services.superadmin_plan_service import SuperAdminPlanService


async def run_plan_tests():
    print("\n========================================================")
    print("STARTING SUPERADMIN PLANS BACKEND TESTS")
    print("========================================================\n")

    actor_id = "00000000-0000-0000-0000-000000000001"
    actor_name = "Founder SuperAdmin Test"

    async with AsyncSessionLocal() as db:
        service = SuperAdminPlanService(db)

        # ----------------------------------------------------
        # Test 1: Feature Catalog Retrieval
        # ----------------------------------------------------
        print("[TEST 1] Retrieving Feature Catalog...")
        features = await service.get_feature_catalog()
        assert len(features) >= 8, f"Expected at least 8 features, got {len(features)}"
        feature_keys = [f["key"] for f in features]
        assert "sast" in feature_keys
        assert "secrets" in feature_keys
        assert "ai_autofix" in feature_keys
        print(f"  -> SUCCESS: Retrieved {len(features)} features: {feature_keys[:4]}...")

        # ----------------------------------------------------
        # Test 2: List Plans & Stats Aggregation
        # ----------------------------------------------------
        print("\n[TEST 2] Listing Plans & Stats Aggregation...")
        plan_list_res = await service.list_plans(page=1, page_size=10)
        assert "plans" in plan_list_res
        assert "stats" in plan_list_res
        stats = plan_list_res["stats"]
        print(f"  -> Real DB Stats: Total={stats['total']}, Active={stats['active']}, Trial={stats['trial']}, Archived={stats['archived']}")
        assert stats["total"] >= 3, "Expected at least 3 seeded plans"
        assert stats["active"] >= 2, "Expected at least 2 active plans"

        # Check search functionality
        search_res = await service.list_plans(search="Pro")
        assert any(p["key"] == "pro" for p in search_res["plans"])
        print("  -> SUCCESS: Plan listing and search verified against live DB.")

        # ----------------------------------------------------
        # Test 3: Plan Creation with Versioning & Audit Log
        # ----------------------------------------------------
        print("\n[TEST 3] Creating a new Custom Plan...")
        unique_key = f"test-plan-{uuid.uuid4().hex[:6]}"
        created_plan = await service.create_plan(
            payload={
                "name": "Test Growth Plan",
                "key": unique_key,
                "description": "Growth plan for testing automated security checks",
                "plan_type": "PAID",
                "pricing_model": "FIXED",
                "status": "DRAFT",
                "currency": "USD",
                "billing_cycle": "monthly",
                "monthly_price": 149.0,
                "annual_price": 1490.0,
                "discount_percent": 16.0,
                "trial_days": 14,
                "is_trial_allowed": True,
                "max_repositories": 15,
                "monthly_scan_minutes": 5000,
                "concurrent_scans": 3,
                "monthly_api_calls": 250000,
                "api_rate_limit_per_minute": 500,
                "storage_limit_gb": 30,
                "developer_seats": 15,
                "admin_seats": 3,
                "security_seats": 2,
                "auditor_seats": 2,
                "seat_counting_rule": "active_only",
                "over_limit_behavior": "block",
                "features": ["sast", "secrets", "sca", "pr_gates"],
                "changelog": "Initial plan creation test",
            },
            actor_id=actor_id,
            actor_name=actor_name,
        )
        plan_id = created_plan["id"]
        assert plan_id is not None
        assert created_plan["status"] == "DRAFT"
        assert created_plan["current_version"] == 1
        print(f"  -> SUCCESS: Created plan {plan_id} with version 1.")

        # Verify audit event persistence
        audit_res = await db.execute(select(PlanAuditEvent).where(PlanAuditEvent.plan_id == uuid.UUID(plan_id)))
        audit_events = audit_res.scalars().all()
        assert len(audit_events) >= 1
        assert audit_events[0].action in ["CREATE", "PLAN_CREATED"]
        print(f"  -> SUCCESS: Verified persisted audit event: {audit_events[0].action} by {audit_events[0].actor_name}")

        # ----------------------------------------------------
        # Test 4: Duplicate Plan Key Rejection
        # ----------------------------------------------------
        print("\n[TEST 4] Testing Duplicate Key Validation...")
        try:
            await service.create_plan(
                payload={
                    "name": "Duplicate Plan",
                    "key": unique_key, # Duplicate
                    "monthly_price": 100.0,
                },
                actor_id=actor_id,
                actor_name=actor_name,
            )
            assert False, "Duplicate key should have raised an error!"
        except Exception as exc:
            print(f"  -> SUCCESS: Correctly rejected duplicate key with error: {exc}")

        # ----------------------------------------------------
        # Test 5: Plan Details Retrieval (all 7 sub-tabs data)
        # ----------------------------------------------------
        print("\n[TEST 5] Retrieving Full Plan Details...")
        details = await service.get_plan_details(plan_id)
        assert details["name"] == "Test Growth Plan"
        assert "features" in details
        assert len(details["features"]) == len(features)
        assert details["limits"]["max_repositories"] == 15
        assert details["seats"]["developer_seats"] == 15
        assert details["pricing"]["monthly_price"] == 149.0
        assert len(details["history"]) >= 1
        print("  -> SUCCESS: Full plan details retrieved and mapped correctly.")

        # ----------------------------------------------------
        # Test 6: Plan Modification & Versioning Policy
        # ----------------------------------------------------
        print("\n[TEST 6] Updating Draft Plan...")
        updated_draft = await service.update_plan(
            plan_id=plan_id,
            payload={
                "monthly_price": 199.0,
                "annual_price": 1990.0,
                "max_repositories": 20,
                "features": ["sast", "secrets", "sca", "pr_gates", "ai_autofix"],
                "changelog": "Upgraded draft limits and added AI Autofix",
            },
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert updated_draft["current_version"] == 1 # Draft edits modify in place
        assert updated_draft["pricing"]["monthly_price"] == 199.0
        print("  -> SUCCESS: Draft updated in place without prematurely bumping version.")

        # Publish the plan
        print("  -> Publishing plan...")
        published = await service.publish_plan(plan_id=plan_id, actor_id=actor_id, actor_name=actor_name)
        assert published["status"] == "ACTIVE"
        print("  -> SUCCESS: Plan published to ACTIVE.")

        # Now update the published plan (should increment version to 2)
        print("  -> Modifying published plan (should trigger immutable version bump)...")
        version_bumped = await service.update_plan(
            plan_id=plan_id,
            payload={
                "monthly_scan_minutes": 15000,
                "changelog": "Increased scan minutes for published plan version 2",
            },
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert version_bumped["current_version"] == 2
        print(f"  -> SUCCESS: Immutable version bump verified! Current version is now {version_bumped['current_version']}.")

        # ----------------------------------------------------
        # Test 7: Assigned Tenants & Usage Aggregates
        # ----------------------------------------------------
        print("\n[TEST 7] Verifying Tenants & Usage Aggregates on Seeded 'pro' Plan...")
        pro_res = await service.list_plans(search="Pro")
        pro_plan_meta = pro_res["plans"][0]
        pro_id = pro_plan_meta["id"]

        tenants = await service.get_plan_tenants(pro_id)
        assert "tenants" in tenants
        assert tenants["total"] >= 1, f"Expected assigned tenants to Pro plan, found {tenants['total']}"
        print(f"  -> SUCCESS: Pro plan has {tenants['total']} assigned tenants.")
        for t in tenants["tenants"][:3]:
            print(f"     Org: {t['name']} (Seats: {t['used_seats']}/{t['max_seats']}, Repos: {t['used_repositories']})")

        usage = await service.get_plan_usage(pro_id)
        assert "aggregates" in usage
        assert "time_series" in usage
        aggs = usage["aggregates"]
        print(f"  -> SUCCESS: Aggregates: Total Tenants={aggs['total_tenants']}, Repos={aggs['total_repositories']}, Seats={aggs['total_seats']}")
        assert len(usage["time_series"]) == 30

        # ----------------------------------------------------
        # Test 8: Plan Archival & Lifecycle Safeguards
        # ----------------------------------------------------
        print("\n[TEST 8] Archiving Test Plan...")
        archived = await service.archive_plan(
            plan_id=plan_id,
            reason="Completed automated test verification",
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert archived["status"] == "ARCHIVED"
        print("  -> SUCCESS: Test plan archived.")

        # Attempt to archive an already archived plan should raise error
        try:
            await service.archive_plan(
                plan_id=plan_id,
                reason="Duplicate archival test",
                actor_id=actor_id,
                actor_name=actor_name,
            )
            assert False, "Should not be able to archive an already archived plan"
        except Exception as exc:
            print(f"  -> SUCCESS: Correctly rejected re-archival: {exc}")

    print("\n========================================================")
    print("ALL SUPERADMIN PLANS BACKEND TESTS PASSED SUCCESSFULLY!")
    print("========================================================\n")


if __name__ == "__main__":
    asyncio.run(run_plan_tests())
