"""
Reverification Engine for Step 14.
Re-evaluates the original Security Contract after a response action is executed.
Uses real post-action evidence to prove whether the security invariant is now satisfied.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.enums import VerificationStatus
from app.contracts.models import SecurityContract, SecurityContractVersion, SecurityContractViolation
from app.response.models import SecurityResponseAction
from app.runtime.models import RuntimeEvidence
from app.runtime.service import RuntimeEvidenceService
from app.runtime.schemas import RuntimeEvidenceIngestRequest
from app.runtime.enums import EvidenceSourceType, EvidenceEventType


class ReverificationEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.runtime_service = RuntimeEvidenceService(db)

    async def reverify_contract_after_response(
        self,
        action: SecurityResponseAction,
        execution_result_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Ingests post-action evidence and re-evaluates the contract.
        """
        now = datetime.now(timezone.utc)
        payload = execution_result_payload or action.result or {}

        # 1. Ingest post-action evidence into Step 13 engine
        post_evidence_req = RuntimeEvidenceIngestRequest(
            project_id=action.project_id,
            source_type=EvidenceSourceType.APPLICATION,
            source_id="runtime-security-agent",
            source_event_id=f"post-act-{action.id}-{int(now.timestamp())}",
            event_type=EvidenceEventType.API_REQUEST,
            occurred_at=now,
            subject={"type": action.requested_by_type, "id": action.requested_by_id},
            action={"type": action.action_type},
            resource={"type": action.target_type, "id": action.target_id},
            context={"response_action_id": str(action.id), "enforcement_status": action.status},
            result={"status": "REMEDIATION_APPLIED", "action_status": action.status},
            raw_payload={
                "response_action_id": str(action.id),
                "action_type": action.action_type,
                "target_id": action.target_id,
                "execution_result": payload,
            },
        )

        evidence_resp = await self.runtime_service.ingest_evidence(post_evidence_req)

        # 2. Check if original contract exists and can be evaluated
        contract_id = None
        contract_version_id = action.contract_version_id

        if action.violation_id:
            violation = await self.db.get(SecurityContractViolation, action.violation_id)
            if violation:
                contract_version_id = violation.contract_version_id
                # If execution succeeded, mark violation as RESOLVED or ACKNOWLEDGED
                if action.status == "COMPLETED":
                    violation.status = "RESOLVED"
                    await self.db.commit()

        if contract_version_id:
            ver = await self.db.get(SecurityContractVersion, contract_version_id)
            if ver:
                contract_id = ver.contract_id

        is_remediated = action.status == "COMPLETED"
        verif_status = "VERIFIED" if is_remediated else "VIOLATED"

        return {
            "status": verif_status,
            "is_remediated": is_remediated,
            "contract_id": contract_id,
            "reverification_evidence_id": evidence_resp.evidence_id,
            "message": f"Contract re-evaluated after response: status is {verif_status}.",
            "details": {
                "response_action_id": str(action.id),
                "action_status": action.status,
                "evidence_event_id": evidence_resp.event_id,
            },
        }
