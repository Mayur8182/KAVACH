"""
Kavach Phase 5: Real Policy Enforcement Adapters
Translates deterministic policy decisions into real, auditable enforcement actions:
1. MCP Agent Tool Enforcement (server-side authorization and self-modification blocking)
2. GitHub Pull Request & Commit Check Enforcement (blocking PR merge on DENY)
3. CI/CD Deployment Enforcement (fail-closed release gating)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.policy import (
    SecurityPolicy,
    SecurityPolicyVersion,
    SecurityDecision,
    PolicyEnforcementEvent,
)
from app.models.user import User
from app.intelligence.policy.models import (
    DecisionOutcome,
    EnforcementPoint,
    EnforcementResult,
    PolicyContextSnapshot,
    PolicyDecisionRecord,
)
from app.intelligence.policy.evaluator_runtime import DeterministicPolicyEvaluator
from app.intelligence.policy.context_providers import PolicyContextResolver
from app.services.audit_service import AuditService

logger = logging.getLogger("kavach.policy.enforcement")


class MCPPolicyEnforcementAdapter:
    """
    Enforces policies on Agent MCP tool calls.
    Ensures agents cannot invoke unauthorized tools or tamper with governance.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)
        self.context_resolver = PolicyContextResolver(db)

    async def enforce_agent_tool_invocation(
        self,
        agent_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
        project_id: Optional[str] = None,
        is_write_action: bool = False,
    ) -> Tuple[bool, PolicyDecisionRecord]:
        """
        Evaluates policy on an agent MCP tool invocation.
        Returns: (is_allowed, decision_record)
        If DENY, tool execution must be halted immediately.
        """
        # Build context snapshot
        ctx = await self.context_resolver.resolve_context(
            project_id=project_id,
            actor={"type": "AI_AGENT", "id": agent_id, "roles": ["AGENT"]},
            operation={
                "type": "EXECUTE_TOOL",
                "resource_id": tool_name,
                "metadata": {"tool_name": tool_name, "is_write": is_write_action, "arguments": arguments},
            },
        )

        # Load active policies for project / global scope
        active_policies = await self._load_active_policies(project_id)

        # Evaluate deterministically
        decision = DeterministicPolicyEvaluator.evaluate_snapshot(
            context=ctx,
            active_policies=active_policies,
        )

        is_allowed = decision.decision in (DecisionOutcome.ALLOW, DecisionOutcome.WARN, DecisionOutcome.NOT_APPLICABLE)
        enforce_result = EnforcementResult.ALLOWED if is_allowed else EnforcementResult.BLOCKED

        # Persist PolicyEnforcementEvent if decision is associated with a DB decision
        await self._record_enforcement_event(
            decision_record=decision,
            enforcement_point=EnforcementPoint.MCP_GATEWAY,
            action_attempted=f"mcp_tool:{tool_name}",
            result=enforce_result,
            external_reference=f"agent:{agent_id}",
            project_id=project_id,
        )

        return is_allowed, decision

    async def authorize_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        tool_arguments: Dict[str, Any],
        current_user: Optional[User] = None,
        project_id: Optional[str] = None,
    ):
        """High-level authorization interface with agent self-modification prevention."""
        from dataclasses import dataclass

        @dataclass
        class AuthResult:
            allowed: bool
            reason: str

        # Enforce agent self-modification prevention
        if "policy" in tool_name.lower() and any(k in tool_name.lower() for k in ["update", "modify", "delete", "grant", "disable", "override"]):
            return AuthResult(allowed=False, reason="Agent self-modification of policies is strictly prohibited.")

        is_write = any(w in tool_name.lower() for w in ["write", "create", "delete", "apply", "update", "patch"])
        allowed, dec = await self.enforce_agent_tool_invocation(
            agent_id=agent_id,
            tool_name=tool_name,
            arguments=tool_arguments,
            project_id=project_id,
            is_write_action=is_write,
        )
        return AuthResult(allowed=allowed, reason=dec.reason)

    async def _load_active_policies(self, project_id: Optional[str]) -> List[Dict[str, Any]]:
        stmt = (
            select(SecurityPolicy, SecurityPolicyVersion)
            .join(SecurityPolicyVersion, SecurityPolicyVersion.policy_id == SecurityPolicy.id)
            .where(
                SecurityPolicyVersion.active == True,
                SecurityPolicy.status == "ACTIVE",
            )
        )
        if project_id:
            try:
                p_uuid = uuid.UUID(str(project_id))
                stmt = stmt.where((SecurityPolicy.project_id == p_uuid) | (SecurityPolicy.scope == "GLOBAL"))
            except Exception:
                pass

        results = (await self.db.execute(stmt)).all()
        active_list = []
        for pol, ver in results:
            active_list.append({
                "id": str(pol.id),
                "name": pol.name,
                "version": ver.version,
                "version_id": str(ver.id),
                "content_hash": ver.policy_content_hash,
                "definition": ver.definition,
                "scope": pol.scope,
                "priority": pol.priority,
            })
        return active_list

    async def _record_enforcement_event(
        self,
        decision_record: PolicyDecisionRecord,
        enforcement_point: EnforcementPoint,
        action_attempted: str,
        result: EnforcementResult,
        external_reference: str,
        project_id: Optional[str] = None,
    ):
        p_uuid = None
        if project_id:
            try:
                p_uuid = uuid.UUID(str(project_id))
            except Exception:
                pass

        # Create persistent SecurityDecision record in DB
        db_decision = SecurityDecision(
            project_id=p_uuid or uuid.uuid4(),
            actor_type="AI_AGENT",
            actor_id=external_reference,
            operation_type="EXECUTE_TOOL",
            resource_type="MCP_TOOL",
            resource_id=action_attempted,
            environment="production",
            decision=decision_record.decision.value.upper(),
            reason=decision_record.reason,
            policy_version_ids=decision_record.policy_version_ids,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(db_decision)
        await self.db.flush()

        event = PolicyEnforcementEvent(
            decision_id=db_decision.id,
            enforcement_point=enforcement_point.value,
            action_attempted=action_attempted,
            result=result.value,
            external_reference=external_reference,
            metadata_snapshot={
                "reason": decision_record.reason,
                "reason_codes": decision_record.reason_codes,
                "rule_count": len(decision_record.matched_rules),
            },
        )
        self.db.add(event)
        await self.db.commit()


class GitHubCheckEnforcementAdapter:
    """
    Enforces policy decisions on Pull Requests and commits.
    Translates DENY decisions into failing GitHub check runs to block merging.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def enforce_pull_request_check(
        self,
        repository: str,
        pr_number: int,
        commit_sha: str,
        decision_record: PolicyDecisionRecord,
        project_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Translates a policy decision into a GitHub check status.
        DENY -> failure (merge blocked)
        ALLOW -> success (merge permitted)
        WARN -> neutral (advisory warning displayed)
        """
        conclusion = "success"
        if decision_record.decision == DecisionOutcome.DENY:
            conclusion = "failure"
        elif decision_record.decision == DecisionOutcome.WARN:
            conclusion = "neutral"
        elif decision_record.decision == DecisionOutcome.INDETERMINATE:
            conclusion = "action_required"

        title = f"Kavach Security Policy: {decision_record.decision.value.upper()}"
        summary = decision_record.reason

        text_details = (
            f"### Kavach Policy Enforcement Summary\n\n"
            f"**Decision**: `{decision_record.decision.value.upper()}`\n"
            f"**Evaluated At**: `{decision_record.evaluated_at.isoformat()}`\n"
            f"**Evaluator Version**: `{decision_record.evaluator_version}`\n\n"
        )
        if decision_record.matched_rules:
            text_details += "#### Matched Security Rules:\n"
            for r in decision_record.matched_rules:
                text_details += f"- **[{r.decision.value.upper()}]** `{r.rule_name}` (`{r.rule_key}`): {r.rationale}\n"

        p_uuid = None
        if project_id:
            try:
                p_uuid = uuid.UUID(str(project_id))
            except Exception:
                pass

        # Persist decision & enforcement record
        db_decision = SecurityDecision(
            project_id=p_uuid or uuid.uuid4(),
            actor_type="SERVICE",
            actor_id="github_app",
            operation_type="MERGE",
            resource_type="PULL_REQUEST",
            resource_id=f"{repository}#{pr_number}",
            environment="production",
            decision=decision_record.decision.value.upper(),
            reason=decision_record.reason,
            policy_version_ids=decision_record.policy_version_ids,
        )
        self.db.add(db_decision)
        await self.db.flush()

        enforce_result = EnforcementResult.BLOCKED if conclusion == "failure" else EnforcementResult.ALLOWED
        event = PolicyEnforcementEvent(
            decision_id=db_decision.id,
            enforcement_point=EnforcementPoint.GITHUB_PR.value,
            action_attempted=f"pull_request_merge:{pr_number}",
            result=enforce_result.value,
            external_reference=f"commit:{commit_sha}",
            metadata_snapshot={"conclusion": conclusion, "title": title},
        )
        self.db.add(event)
        await self.db.commit()

        return {
            "check_name": "kavach/security-policy",
            "status": "completed",
            "conclusion": conclusion,
            "title": title,
            "summary": summary,
            "text": text_details,
            "is_merge_blocked": (conclusion == "failure"),
        }

    def map_decision_to_check_run(self, decision_record: PolicyDecisionRecord) -> Dict[str, Any]:
        """Translates PolicyDecisionRecord to check run data synchronously."""
        conclusion = "success"
        if decision_record.decision == DecisionOutcome.DENY:
            conclusion = "failure"
        elif decision_record.decision == DecisionOutcome.WARN:
            conclusion = "neutral"
        elif decision_record.decision == DecisionOutcome.INDETERMINATE:
            conclusion = "action_required"

        return {
            "conclusion": conclusion,
            "title": f"Kavach Security Policy: {decision_record.decision.value.upper()}",
            "summary": decision_record.reason,
            "is_merge_blocked": (conclusion == "failure"),
        }

    def should_block_merge(self, decision_record: PolicyDecisionRecord) -> bool:
        """Determines whether PR merge must be blocked based on decision."""
        return decision_record.decision == DecisionOutcome.DENY

