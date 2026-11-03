"""
Runtime Security Contract Verification Engine.
Evaluates concrete runtime evidence against compiled security contracts.
Produces immutable SecurityContractVerification records and SecurityContractViolation alerts.
Integrates with Step 12 ContractEvaluator and Step 7 Policy Engine.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.contracts.dsl.ast import SecurityContractDefinition
from app.contracts.dsl.parser import SecurityContractDSL
from app.contracts.enums import EvaluationTruthValue
from app.contracts.evaluator.context import EvidenceContext
from app.contracts.evaluator.evaluator import ContractEvaluator
from app.contracts.models import (
    SecurityContractVersion,
    SecurityContractVerification,
    SecurityContractViolation,
)
from app.runtime.enums import RuntimeVerificationStatus, ViolationStatus
from app.runtime.models import RuntimeEvidence
from app.runtime.verification.temporal import TemporalEvaluator


class RuntimeContractVerificationEngine:
    VERIFIER_NAME = "runtime-contract-verifier"
    VERIFIER_VERSION = "1.0.0"

    @classmethod
    def build_evidence_context(
        cls,
        evidence: RuntimeEvidence,
        related_evidence: Optional[List[RuntimeEvidence]] = None,
    ) -> EvidenceContext:
        """
        Adapts normalized RuntimeEvidence into an authoritative EvidenceContext for contract evaluation.
        Populates subject, action, resource, context, authorization, delegation, and dot paths.
        """
        payload = evidence.normalized_payload or {}
        subject = payload.get("subject", {}) or {}
        action = payload.get("action", {}) or {}
        resource = payload.get("resource", {}) or {}
        ctx_data = payload.get("context", {}) or {}
        result_data = payload.get("result", {}) or {}

        ctx = EvidenceContext(
            subject=subject,
            action=action,
            resource=resource,
            context=ctx_data,
            decision=result_data,
            authorization=ctx_data.get("authorization", {}),
            delegation=ctx_data.get("delegation", {}),
            data_flow=ctx_data.get("data_flow", {}),
            mcp=ctx_data.get("mcp", {}),
            audit_event=ctx_data.get("audit_event", {}),
            evidence={
                "id": str(evidence.id),
                "event_id": evidence.event_id,
                "event_type": evidence.event_type,
                "source_type": evidence.source_type,
                "occurred_at": evidence.occurred_at.isoformat() if evidence.occurred_at else None,
                "received_at": evidence.received_at.isoformat() if evidence.received_at else None,
                "environment": evidence.environment,
                "classification": evidence.classification,
                "payload_hash": evidence.payload_hash,
            },
        )

        # Populate top-level fields for ergonomic DSL invariant matching
        # 1. Tenant isolation attributes
        tenant_id = (
            ctx_data.get("tenant_id")
            or subject.get("tenant_id")
            or ctx_data.get("user_tenant_id")
        )
        if tenant_id:
            ctx.set("subject.tenant_id", tenant_id)
            ctx.set("tenant_id", tenant_id)

        resource_tenant_id = (
            ctx_data.get("resource_tenant_id")
            or resource.get("tenant_id")
            or ctx_data.get("target_tenant_id")
        )
        if resource_tenant_id:
            ctx.set("resource.tenant_id", resource_tenant_id)
            ctx.set("target_tenant_id", resource_tenant_id)

        # 2. Agent authority and delegation
        if ctx_data.get("delegated_authority"):
            ctx.set("delegation.authority", ctx_data["delegated_authority"])
        if ctx_data.get("agent_authority"):
            ctx.set("agent.authority", ctx_data["agent_authority"])
        if ctx_data.get("delegation_status"):
            ctx.set("delegation.status", ctx_data["delegation_status"])
        if ctx_data.get("delegation_expired") is not None:
            ctx.set("delegation.is_expired", ctx_data["delegation_expired"])

        # 3. Environment
        if evidence.environment:
            ctx.set("environment", evidence.environment)

        # 4. Map related evidence if provided (e.g. prior authorization or approval)
        if related_evidence:
            auth_events = [e for e in related_evidence if "AUTH" in (e.event_type or "")]
            if auth_events:
                latest_auth = auth_events[-1]
                auth_payload = latest_auth.normalized_payload or {}
                ctx.set("prior_authorization", auth_payload)
                ctx.set("authorization.occurred_at", latest_auth.occurred_at.isoformat())

        return ctx

    @classmethod
    def evaluate_contract(
        cls,
        contract_version: SecurityContractVersion,
        evidence: RuntimeEvidence,
        related_evidence: Optional[List[RuntimeEvidence]] = None,
    ) -> Tuple[SecurityContractVerification, Optional[SecurityContractViolation]]:
        """
        Deterministically evaluates contract_version against evidence.
        Returns (verification_record, violation_record_if_any).
        """
        started_at = datetime.now(timezone.utc)
        
        # 1. Parse or retrieve AST definition
        definition: Optional[SecurityContractDefinition] = None
        compiled = getattr(contract_version, "compiled_definition", None) or getattr(contract_version, "normalized_definition", None)
        if compiled and isinstance(compiled, dict):
            try:
                definition = SecurityContractDefinition.model_validate(compiled)
            except Exception:
                pass

        if definition is None and getattr(contract_version, "definition", None):
            try:
                raw_def = contract_version.definition
                if isinstance(raw_def, dict):
                    dsl_text = raw_def.get("dsl") or raw_def.get("raw")
                    if dsl_text:
                        definition = SecurityContractDSL.parse_text(dsl_text)
                    else:
                        definition = SecurityContractDefinition.model_validate(raw_def)
                elif isinstance(raw_def, str):
                    definition = SecurityContractDSL.parse_text(raw_def)
            except Exception as e:
                # Verification failed due to unparseable definition
                completed_at = datetime.now(timezone.utc)
                verif = SecurityContractVerification(
                    id=uuid.uuid4(),
                    contract_version_id=contract_version.id,
                    project_id=evidence.project_id,
                    status=RuntimeVerificationStatus.FAILED.value,
                    evaluation_result={"error": f"Failed to parse contract definition: {str(e)}"},
                    evidence_summary={"evidence_ids": [str(evidence.id)]},
                    verifier_type=cls.VERIFIER_NAME,
                    verifier_version=cls.VERIFIER_VERSION,
                    evaluated_at=completed_at,
                    evaluation_started_at=started_at,
                    evaluation_completed_at=completed_at,
                    error_message=str(e),
                )
                return verif, None

        # 2. Build Evidence Context
        ctx = cls.build_evidence_context(evidence, related_evidence)
        evidence_summary = {
            "primary_evidence_id": str(evidence.id),
            "evidence_ids": [str(evidence.id)] + [str(e.id) for e in (related_evidence or [])],
            "event_type": evidence.event_type,
            "source_type": evidence.source_type,
            "occurred_at": evidence.occurred_at.isoformat() if evidence.occurred_at else None,
            "payload_hash": evidence.payload_hash,
        }

        # 3. Deterministic Evaluation via ContractEvaluator
        eval_result = ContractEvaluator.evaluate(
            definition=definition,
            definition_hash=contract_version.definition_hash,
            context=ctx,
            version=contract_version.version,
            evidence_summary=evidence_summary,
        )

        completed_at = datetime.now(timezone.utc)

        # 4. Map truth value to RuntimeVerificationStatus
        if eval_result.truth_value == EvaluationTruthValue.TRUE:
            status = RuntimeVerificationStatus.VERIFIED.value
        elif eval_result.truth_value == EvaluationTruthValue.FALSE:
            status = RuntimeVerificationStatus.VIOLATED.value
        elif eval_result.truth_value == EvaluationTruthValue.NOT_APPLICABLE:
            status = RuntimeVerificationStatus.NOT_APPLICABLE.value
        else:
            status = RuntimeVerificationStatus.UNKNOWN.value

        verification = SecurityContractVerification(
            id=uuid.uuid4(),
            contract_version_id=contract_version.id,
            project_id=evidence.project_id,
            status=status,
            evaluation_result={
                "truth_value": eval_result.truth_value.value,
                "is_satisfied": eval_result.is_satisfied,
                "is_violated": eval_result.is_violated,
                "trace": eval_result.evaluation_trace,
                "definition_hash": contract_version.definition_hash,
                "contract_key": definition.key,
            },
            evidence_summary=evidence_summary,
            verifier_type=cls.VERIFIER_NAME,
            verifier_version=cls.VERIFIER_VERSION,
            evaluated_at=completed_at,
            evaluation_started_at=started_at,
            evaluation_completed_at=completed_at,
            error_message=None,
        )

        # 5. Generate violation if status is VIOLATED
        violation: Optional[SecurityContractViolation] = None
        if status == RuntimeVerificationStatus.VIOLATED.value:
            sev = definition.violation.severity if definition.violation else "HIGH"
            sev_str = sev.value if hasattr(sev, "value") else str(sev)
            violation = SecurityContractViolation(
                id=uuid.uuid4(),
                contract_version_id=contract_version.id,
                verification_id=verification.id,
                project_id=evidence.project_id,
                severity=sev_str,
                violation_type=f"CONTRACT_VIOLATION:{definition.key}",
                description=f"Runtime invariant violation detected for contract '{definition.name}': {definition.description or 'Invariant evaluated to FALSE'}",
                subject=f"{evidence.subject_type}:{evidence.subject_id}" if evidence.subject_id else evidence.subject_type,
                resource=f"{evidence.resource_type}:{evidence.resource_id}" if evidence.resource_id else evidence.resource_type,
                action=evidence.action_type,
                evidence={
                    "evidence_id": str(evidence.id),
                    "event_type": evidence.event_type,
                    "payload_hash": evidence.payload_hash,
                    "evaluation_trace": eval_result.evaluation_trace,
                },
                status=ViolationStatus.OPEN.value,
                detected_at=completed_at,
            )

        return verification, violation
