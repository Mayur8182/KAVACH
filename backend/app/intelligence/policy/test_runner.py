"""
Kavach Phase 5: Policy Test Runner
Executes positive and negative unit test fixtures against candidate policy definitions.
Ensures policy correctness before review, simulation, or activation.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.policy import SecurityPolicyVersion, PolicyTestCase
from app.intelligence.policy.models import DecisionOutcome, PolicyContextSnapshot
from app.intelligence.policy.evaluator_runtime import DeterministicPolicyEvaluator

logger = logging.getLogger("kavach.policy.test_runner")


class PolicyTestRunner:
    """
    Executes unit test cases for a policy version without side effects.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_version_tests(
        self,
        version_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Loads all PolicyTestCase fixtures for a version, evaluates each against the version,
        and records pass/fail status.
        """
        version = await self.db.get(SecurityPolicyVersion, version_id)
        if not version:
            raise ValueError(f"Policy version '{version_id}' not found.")

        stmt = select(PolicyTestCase).where(PolicyTestCase.policy_version_id == version_id)
        test_cases = (await self.db.execute(stmt)).scalars().all()

        policy_obj = [{
            "id": str(version.policy_id),
            "version": version.version,
            "version_id": str(version.id),
            "content_hash": version.policy_content_hash,
            "definition": version.definition,
            "scope": version.definition.get("scope", {}).get("environment", "GLOBAL"),
            "priority": 100,
        }]

        results = []
        total_passed = 0
        total_failed = 0

        for tc in test_cases:
            fixture = tc.input_fixture
            # Build mock context snapshot from fixture
            ctx = PolicyContextSnapshot(
                snapshot_id=f"fixture_{tc.id}",
                tenant_id=fixture.get("tenant_id"),
                project_id=fixture.get("project_id", "test_proj"),
                repository=fixture.get("repository", "test_repo"),
                environment=fixture.get("environment", "development"),
                actor=fixture.get("actor", {"type": "USER", "id": "test_user"}),
                operation=fixture.get("operation", {"type": "TEST", "environment": "development"}),
                findings=fixture.get("findings", []),
                cloud_resources=fixture.get("cloud_resources", []),
                active_exceptions=fixture.get("active_exceptions", []),
                is_fresh=True,
                missing_facts=[],
            )

            eval_res = DeterministicPolicyEvaluator.evaluate_snapshot(
                context=ctx,
                active_policies=policy_obj,
            )

            actual_decision = eval_res.decision.value
            expected_decision = tc.expected_decision

            passed = (actual_decision.upper() == expected_decision.upper())
            tc.last_run_at = datetime.now(timezone.utc)
            tc.last_actual_decision = actual_decision
            tc.status = "PASSED" if passed else "FAILED"

            if passed:
                total_passed += 1
            else:
                total_failed += 1

            results.append({
                "test_case_id": str(tc.id),
                "name": tc.name,
                "expected": expected_decision,
                "actual": actual_decision,
                "passed": passed,
                "reason": eval_res.reason,
            })

        await self.db.commit()

        # Update version status if tests were executed
        if test_cases:
            if total_failed == 0:
                version.status = "TESTED"
            await self.db.commit()

        return {
            "version_id": str(version_id),
            "total_tests": len(test_cases),
            "passed": total_passed,
            "failed": total_failed,
            "all_passed": (total_failed == 0 and len(test_cases) > 0),
            "test_results": results,
        }

