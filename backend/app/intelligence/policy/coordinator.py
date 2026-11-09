"""
Kavach Phase 5: Policy Control Plane Coordinator
High-level orchestrator binding Natural Language authoring, lifecycle management,
authoritative context resolution, deterministic evaluation, exceptions, and enforcement.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.policy import SecurityPolicy, SecurityPolicyVersion
from app.models.user import User
from app.intelligence.policy.models import (
    DecisionOutcome,
    PolicyContextSnapshot,
    PolicyDecisionRecord,
    PolicyStatus,
    SimulationImpactReport,
)
from app.intelligence.policy.evaluator_runtime import DeterministicPolicyEvaluator
from app.intelligence.policy.lifecycle_manager import PolicyLifecycleManager
from app.intelligence.policy.context_providers import PolicyContextResolver
from app.intelligence.policy.test_runner import PolicyTestRunner
from app.intelligence.policy.simulation_engine import PolicySimulationEngine
from app.intelligence.policy.exception_manager import PolicyExceptionManager
from app.intelligence.policy.nl_authoring_assistant import NaturalLanguagePolicyAssistant
from app.intelligence.policy.enforcement_adapters import (
    MCPPolicyEnforcementAdapter,
    GitHubCheckEnforcementAdapter,
)

logger = logging.getLogger("kavach.policy.coordinator")


class PolicyControlPlaneCoordinator:
    """
    Central Coordinator for Kavach Policy Engine & Governance Control Plane.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.lifecycle = PolicyLifecycleManager(db)
        self.context_resolver = PolicyContextResolver(db)
        self.test_runner = PolicyTestRunner(db)
        self.simulation = PolicySimulationEngine(db)
        self.exception_manager = PolicyExceptionManager(db)
        self.mcp_enforcer = MCPPolicyEnforcementAdapter(db)
        self.github_enforcer = GitHubCheckEnforcementAdapter(db)

    async def draft_policy_from_natural_language(
        self,
        prompt: str,
        author: User,
        project_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        scope: str = "PROJECT",
    ) -> Dict[str, Any]:
        """
        Translates a natural language requirement into a draft policy and persists it in DB.
        Rule: Output is strictly in DRAFT status and cannot self-activate.
        """
        draft_info = NaturalLanguagePolicyAssistant.draft_policy_from_natural_language(
            prompt=prompt,
            scope=scope,
        )

        definition = draft_info["definition"]
        policy_name = definition["name"]
        description = definition["description"]

        # Create SecurityPolicy in DB
        policy = SecurityPolicy(
            project_id=project_id,
            organization_id=organization_id,
            name=policy_name,
            description=description,
            scope=scope,
            domain=draft_info["domain"],
            status=PolicyStatus.DRAFT.value,
            priority=100,
            created_by=author.email,
        )
        self.db.add(policy)
        await self.db.flush()

        # Create initial draft version
        version = await self.lifecycle.create_draft_version(
            policy=policy,
            definition=definition,
            author=author,
            change_reason="Initial draft authored via Kavach AI Policy Assistant",
        )

        # Attach synthesized test fixtures to DB
        from app.models.policy import PolicyTestCase
        for tc in draft_info["test_cases"]:
            test_case = PolicyTestCase(
                policy_version_id=version.id,
                name=tc["name"],
                description=tc.get("description"),
                input_fixture=tc["input_fixture"],
                expected_decision=tc["expected_decision"].upper(),
                status="PENDING",
            )
            self.db.add(test_case)

        await self.db.commit()

        return {
            "policy_id": str(policy.id),
            "version_id": str(version.id),
            "version": version.version,
            "status": "DRAFT",
            "policy_content_hash": version.policy_content_hash,
            "domain": policy.domain,
            "scope": policy.scope,
            "explanation": draft_info["explanation"],
            "test_cases_count": len(draft_info["test_cases"]),
            "is_enforceable": False,
        }

    async def evaluate_operation(
        self,
        project_id: Optional[str],
        operation: Dict[str, Any],
        actor: Optional[Dict[str, Any]] = None,
        environment: str = "development",
        repository: Optional[str] = None,
    ) -> PolicyDecisionRecord:
        """
        Resolves ground truth facts and evaluates active policies deterministically.
        """
        ctx = await self.context_resolver.resolve_context(
            project_id=project_id,
            repository=repository,
            environment=environment,
            operation=operation,
            actor=actor,
        )

        active_policies = await self.mcp_enforcer._load_active_policies(project_id)

        decision = DeterministicPolicyEvaluator.evaluate_snapshot(
            context=ctx,
            active_policies=active_policies,
        )

        # Persist decision into DB if project is available
        proj_uuid = None
        if project_id:
            try:
                proj_uuid = uuid.UUID(str(project_id))
            except Exception:
                pass
        if not proj_uuid:
            from app.models.project import Project
            p_res = await self.db.execute(select(Project).limit(1))
            first_p = p_res.scalars().first()
            if first_p:
                proj_uuid = first_p.id

        if proj_uuid:
            try:
                from app.models.policy import SecurityDecision, DecisionEvidence
                sec_dec = SecurityDecision(
                    id=uuid.UUID(decision.decision_id),
                    project_id=proj_uuid,
                    actor_type=(actor or {}).get("type", "USER"),
                    actor_id=str((actor or {}).get("id", "system")),
                    operation_type=operation.get("type", "UNKNOWN"),
                    operation_id=str(operation.get("id", "") or ""),
                    resource_type=operation.get("resource_type", "APPLICATION"),
                    resource_id=str(operation.get("resource_id", repository or "") or ""),
                    environment=environment,
                    decision=decision.decision.value,
                    reason=decision.reason,
                    policy_version_ids=decision.policy_version_ids,
                    context_snapshot=ctx.model_dump(mode="json"),
                    created_at=decision.evaluated_at,
                )
                self.db.add(sec_dec)
                await self.db.flush()

                for ev in decision.evidence:
                    pv_uuid = None
                    if ev.policy_version_id:
                        try:
                            pv_uuid = uuid.UUID(str(ev.policy_version_id))
                        except Exception:
                            pass
                    dev = DecisionEvidence(
                        decision_id=sec_dec.id,
                        evidence_type=ev.evidence_type,
                        source_type=ev.source_type,
                        source_id=ev.source_id,
                        attribute=ev.attribute,
                        observed_value=ev.observed_value,
                        expected_condition=ev.expected_condition,
                        effect=ev.effect,
                        rule_name=ev.rule_key,
                        policy_version_id=pv_uuid,
                    )
                    self.db.add(dev)
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Failed to persist SecurityDecision: {e}")
                await self.db.rollback()

        return decision
