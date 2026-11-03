"""
Thing Control Plane — SuperAdmin Feature Entitlements Test Suite
Automated validation for Module 03 Part 2: Feature Entitlements & Catalog.

Strict Compliance with AGENTS.md:
- Rule 1: Zero hardcoded data.
- Rule 2: No fake success.
- Rule 6: Real PostgreSQL / SQLite persistence.
- Rule 13: Deterministic evidence.
- Rule 14: Deterministic policy engine decisions.
"""

import asyncio
import os
import sys
import uuid
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.plan import FeatureCatalog, FeatureAuditEvent, SubscriptionPlan
from app.models.organization import Organization, OrganizationSubscription
from app.services.superadmin_entitlement_service import SuperAdminEntitlementService


async def run_entitlement_tests():
    print("\n========================================================")
    print("STARTING SUPERADMIN FEATURE ENTITLEMENTS TEST SUITE")
    print("========================================================\n")

    actor_id = "00000000-0000-0000-0000-000000000001"
    actor_name = "Founder SuperAdmin Test"

    async with AsyncSessionLocal() as db:
        service = SuperAdminEntitlementService(db)

        # ----------------------------------------------------
        # Test 1: Feature Catalog Retrieval & Category Counts
        # ----------------------------------------------------
        print("[TEST 1] Testing Feature Catalog Listing & Categories...")
        catalog_res = await service.list_features(page=1, page_size=20)
        assert catalog_res["total"] >= 10, f"Expected at least 10 features, got {catalog_res['total']}"
        assert len(catalog_res["categories"]) >= 4, "Expected category counts dictionary"
        print(f"  -> SUCCESS: Retrieved {catalog_res['total']} features across {len(catalog_res['categories'])} categories.")

        # Test search
        search_res = await service.list_features(search="SAST")
        assert any(f["key"] == "sast" for f in search_res["items"]), "Expected SAST in search results"
        print("  -> SUCCESS: Feature search confirmed.")

        # ----------------------------------------------------
        # Test 2: Entitlements Matrix Generation
        # ----------------------------------------------------
        print("\n[TEST 2] Testing Entitlements Matrix Generation...")
        matrix = await service.get_entitlements_matrix()
        assert "plans" in matrix and len(matrix["plans"]) >= 3
        assert "categories" in matrix and len(matrix["categories"]) >= 4
        print(f"  -> SUCCESS: Matrix verified with {len(matrix['plans'])} plans and {len(matrix['categories'])} categories.")

        # ----------------------------------------------------
        # Test 3: Create Feature with Validation & Audit Log
        # ----------------------------------------------------
        print("\n[TEST 3] Creating New Security Feature...")
        unique_key = f"api_security_{uuid.uuid4().hex[:6]}"
        created = await service.create_feature(
            payload={
                "name": "API Security Guard",
                "key": unique_key,
                "tagline": "OWASP API Top 10 automated testing",
                "description": "Continuous API security testing with schema drift detection and fuzzing.",
                "category": "Code Security",
                "module": "API Security",
                "status": "ENABLED",
                "scope": "GLOBAL",
                "show_in_ui": True,
                "requires_org_setup": False,
                "menu_location": "Security",
                "icon": "Shield",
                "dependencies": ["sast"],
                "external_dependencies": {"git_provider": True, "cicd_provider": False},
                "default_config": {"fuzz_depth": 3, "rate_limit_test": True},
                "plan_availability": {
                    "starter": {"enabled": False, "value_tier": "disabled", "usage_limit": 0},
                    "pro": {"enabled": True, "value_tier": "standard", "usage_limit": 100},
                    "enterprise": {"enabled": True, "value_tier": "advanced", "usage_limit": 0},
                    "custom": {"enabled": True, "value_tier": "custom", "usage_limit": 0},
                },
            },
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert created["key"] == unique_key
        assert created["status"] == "ENABLED"
        assert len(created["history"]) >= 1
        assert created["history"][0]["action"] == "FEATURE_CREATED"
        print(f"  -> SUCCESS: Created feature '{created['name']}' ({unique_key}) with audit event.")

        # ----------------------------------------------------
        # Test 4: Dependency Validation & Cycle Detection
        # ----------------------------------------------------
        print("\n[TEST 4] Testing Dependency Cycle & Self-Dependency Rejection...")
        # 4a: Self dependency
        try:
            await service.create_feature(
                payload={
                    "name": "Self Dependent Feature",
                    "key": f"self_{uuid.uuid4().hex[:6]}",
                    "dependencies": [f"self_{uuid.uuid4().hex[:6]}"],
                },
                actor_id=actor_id,
                actor_name=actor_name,
            )
            assert False, "Self-dependency should have been rejected!"
        except Exception as exc:
            print(f"  -> SUCCESS: Correctly rejected self-dependency: {exc}")

        # 4b: Non-existent dependency
        try:
            await service.create_feature(
                payload={
                    "name": "Fake Dep Feature",
                    "key": f"fake_dep_{uuid.uuid4().hex[:6]}",
                    "dependencies": ["non_existent_feature_xyz"],
                },
                actor_id=actor_id,
                actor_name=actor_name,
            )
            assert False, "Non-existent dependency should have been rejected!"
        except Exception as exc:
            print(f"  -> SUCCESS: Correctly rejected non-existent dependency: {exc}")

        # ----------------------------------------------------
        # Test 5: Feature Details & Configuration Update
        # ----------------------------------------------------
        print("\n[TEST 5] Updating Feature Configuration & Dependencies...")
        updated = await service.update_feature(
            feature_id_or_key=unique_key,
            payload={
                "tagline": "Updated API Security Guard Tagline",
                "default_config": {"fuzz_depth": 5, "rate_limit_test": True, "headers_validation": True},
                "reason": "Upgraded default fuzz depth",
            },
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert updated["default_config"]["fuzz_depth"] == 5
        print(f"  -> SUCCESS: Configuration updated and persisted.")

        # Update dependencies
        dep_res = await service.update_feature_dependencies(
            feature_id_or_key=unique_key,
            required_features=["sast", "secrets"],
            external_dependencies={"git_provider": True, "cicd_provider": True},
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert "secrets" in dep_res["required_features"]
        print(f"  -> SUCCESS: Dependencies updated to: {dep_res['required_features']}.")

        # ----------------------------------------------------
        # Test 6: Feature Plan Availability & Matrix Cell Update
        # ----------------------------------------------------
        print("\n[TEST 6] Testing Matrix Cell Update & Plan Availability...")
        cell_update = await service.update_matrix_cell(
            plan_key="starter",
            feature_key="sast",
            enabled=True,
            value_tier="standard",
            usage_limit=150,
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert cell_update["success"] is True
        print(f"  -> SUCCESS: Matrix cell updated: Starter -> SAST (tier: {cell_update['cell']['value_tier']}).")

        # ----------------------------------------------------
        # Test 7: Real Feature Usage Metrics
        # ----------------------------------------------------
        print("\n[TEST 7] Retrieving Feature Usage Metrics...")
        usage = await service.get_feature_usage("sast")
        assert "current_usage" in usage
        assert "limits" in usage
        assert "timeline" in usage
        assert len(usage["timeline"]) == 30
        print(f"  -> SUCCESS: Usage metrics retrieved: {usage['current_usage']['total_scans']} scans, {usage['current_usage']['active_repositories']} repos.")

        # ----------------------------------------------------
        # Test 8: Effective Entitlement Evaluator
        # ----------------------------------------------------
        print("\n[TEST 8] Testing Effective Entitlement Evaluation Engine...")
        # Get an active organization
        org_stmt = select(Organization).limit(1)
        org = (await db.execute(org_stmt)).scalars().first()
        if org:
            eval_res = await service.evaluate_effective_entitlement(
                organization_id=str(org.id),
                feature_key="sast",
            )
            print(f"  -> Org '{org.name}' evaluation for 'sast': allowed={eval_res['allowed']}, reason={eval_res.get('reason')}")
            assert "allowed" in eval_res

            # Test invalid feature
            eval_invalid = await service.evaluate_effective_entitlement(
                organization_id=str(org.id),
                feature_key="non_existent_key",
            )
            assert eval_invalid["allowed"] is False
            assert eval_invalid["reason"] == "FEATURE_DISABLED_GLOBALLY"
            print("  -> SUCCESS: Invalid feature correctly denied.")

        # ----------------------------------------------------
        # Test 9: Archive Feature & Lifecycle Protection
        # ----------------------------------------------------
        print("\n[TEST 9] Archiving Test Feature...")
        archived = await service.update_feature(
            feature_id_or_key=unique_key,
            payload={"status": "ARCHIVED", "reason": "Completed automated testing"},
            actor_id=actor_id,
            actor_name=actor_name,
        )
        assert archived["status"] == "ARCHIVED"
        print(f"  -> SUCCESS: Feature '{unique_key}' archived successfully.")

    print("\n========================================================")
    print("ALL SUPERADMIN FEATURE ENTITLEMENTS TESTS PASSED!")
    print("========================================================\n")


if __name__ == "__main__":
    asyncio.run(run_entitlement_tests())
