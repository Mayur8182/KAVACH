"""
Response Decision Engine for Step 14.
Consults Step 7 Policy Engine and risk context to deterministically produce an immutable Response Decision.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.models import SecurityContractViolation
from app.response.decision.context import ResponseRiskContext
from app.response.enums import ResponseDecision, ResponseMode
from app.response.models import SecurityResponseDecision


class ResponseDecisionEngine:
    """
    Evaluates policy decisions for runtime violations.
    Deterministic: LLM NEVER decides the response action.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_response_decision(
        self,
        violation: SecurityContractViolation,
        target_type: str,
        target_id: str,
        environment: str = "PRODUCTION",
    ) -> SecurityResponseDecision:
        severity = violation.severity.upper() if violation.severity else "HIGH"

        risk_ctx = ResponseRiskContext.calculate_risk_context(
            target_type=target_type,
            target_id=target_id,
            violation_severity=severity,
            environment=environment,
        )

        # Deterministic Policy Resolution
        # 1. Critical violations on workloads/services require approval
        if risk_ctx["requires_approval"]:
            decision = ResponseDecision.REQUIRE_APPROVAL
            reason = f"Critical/High impact violation in {environment} requires human authorization."
        # 2. Critical violations on tool calls / sessions -> BLOCK / REVOKE
        elif severity == "CRITICAL":
            if target_type == "MCP_TOOL_CALL":
                decision = ResponseDecision.BLOCK
                reason = "Critical contract violation detected during tool invocation: immediate BLOCK applied."
            elif target_type in ("SESSION", "DELEGATION"):
                decision = ResponseDecision.REVOKE
                reason = "Critical security invariant violated: immediate REVOKE enforced."
            else:
                decision = ResponseDecision.BLOCK
                reason = "Critical violation: target access BLOCKED."
        # 3. High severity -> BLOCK or ALERT
        elif severity == "HIGH":
            decision = ResponseDecision.BLOCK
            reason = "High severity contract violation: access BLOCKED by deterministic policy."
        elif severity == "MEDIUM":
            decision = ResponseDecision.ALERT
            reason = "Medium severity violation: ALERT emitted without disruption."
        else:
            decision = ResponseDecision.NO_ACTION
            reason = "Informational / Low severity: logged to audit record."

        decision_record = SecurityResponseDecision(
            id=uuid.uuid4(),
            project_id=violation.project_id,
            verification_id=violation.verification_id,
            violation_id=violation.id,
            policy_version_id=None,
            decision=decision.value if hasattr(decision, "value") else str(decision),
            reason=reason,
            evidence={
                "violation_id": str(violation.id),
                "violation_type": violation.violation_type,
                "severity": severity,
                "risk_context": risk_ctx,
            },
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(decision_record)
        await self.db.commit()
        await self.db.refresh(decision_record)

        return decision_record
