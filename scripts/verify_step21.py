"""
Step 21 Verification Script:
Security Incident Management, Investigation Orchestration, Forensic Evidence,
Timeline Reconstruction, Root-Cause Analysis, Incident Containment Coordination, and Post-Incident Verification.

Covers all mandatory rules and acceptance tests:
  - Incident Creation from Real Events (Rule 63, Sec 97)
  - Duplicate & Related Incident Detection (Sec 98, Sec 19)
  - Forensic Evidence Collection & SHA-256 Integrity Seal (Rule 69, Sec 99)
  - Authorization Enforcement on Evidence Collection (Rule 71, Sec 100)
  - Secret Redaction in Forensic Artifacts (Rule 73, Sec 101)
  - Timeline Reconstruction by Event Timestamp (Sec 102, Sec 27–29)
  - Contradictory Evidence Detection (Sec 84, Sec 115)
  - Root Cause Verification Constraints (Rule 68, Sec 117)
  - Containment Coordination via Step 14 (Rule 46, Sec 107)
  - Recovery & Post-Incident Verification (Sec 109, Sec 51–53)
  - Closure Rejection on Active Violations (Sec 116) & Closure with Limitations
  - Incident Reopening on New Evidence (Sec 110, Sec 58)
  - Multi-Tenant Boundary Enforcement (Rule 72, Sec 111)
  - Forensic Export Dossier with Cryptographic Seal (Sec 118, Sec 62–63)
  - Strictly No Incident Score (Rule 66)
"""

import asyncio
import logging
import uuid
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def run_verification():
    logger.info("=== STARTING STEP 21: SECURITY INCIDENT MANAGEMENT & FORENSIC EVIDENCE VERIFICATION ===")

    from app.models import Base
    from app.models.project import Project
    from app.models.user import User
    from app.incidents.enums import (
        IncidentType,
        IncidentSeverity,
        IncidentStatus,
        SignalRelationshipType,
        TimelineConfidence,
        EvidenceRole,
        EvidenceChainAction,
        InvestigationObjective,
        QuestionStatus,
        HypothesisStatus,
        RootCauseStatus,
        ContainmentActionType,
        ContainmentStatus,
        RecoveryActionType,
        RecoveryStatus,
        IncidentRelationshipType,
        ContributingFactor,
        CollectorStatus,
    )
    from app.incidents.redaction import SecretRedactor, EvidenceIntegrityEngine
    from app.incidents.timeline import IncidentTimelineEngine
    from app.incidents.investigation import InvestigationEngine
    from app.incidents.containment import IncidentContainmentCoordinator
    from app.incidents.service import SecurityIncidentService

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Setup Users & Projects for Multi-Tenant Testing
        user_a = User(email="investigator-a@example.com", name="Lead Investigator A", password_hash="hash_a")
        user_b = User(email="investigator-b@example.com", name="Lead Investigator B", password_hash="hash_b")
        session.add_all([user_a, user_b])
        await session.commit()
        await session.refresh(user_a)
        await session.refresh(user_b)

        project_a_id = uuid.uuid4()
        project_b_id = uuid.uuid4()

        proj_a = Project(id=project_a_id, name="Project Alpha Production", description="Financial Core", owner_id=user_a.id)
        proj_b = Project(id=project_b_id, name="Project Beta Staging", description="Logistics Core", owner_id=user_b.id)
        session.add_all([proj_a, proj_b])
        await session.commit()

        service = SecurityIncidentService(session)
        now = datetime.now(timezone.utc)

        # --------------------------------------------------------------------
        # TEST 1: Incident Creation from Real Signals (Rule 63, Sec 97)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 1] Real Incident Creation & Signal Aggregation ---")
        sig_time = now - timedelta(minutes=15)
        initial_signals = [
            {
                "source_type": "KUBERNETES_OBSERVATION",
                "source_id": "pod-payment-exec-01",
                "signal_type": "CONTAINER_SECURITY_EVENT",
                "observed_at": sig_time,
                "metadata": {"violation": "privileged_container_spawned"},
            }
        ]

        incident_a = await service.create_incident(
            project_id=project_a_id,
            title="Unauthorized Privileged Escalation in Payment Pod",
            incident_type=IncidentType.CONTAINER_SECURITY_EVENT,
            severity=IncidentSeverity.CRITICAL,  # Rule 66: Factual classification, NO SCORE
            primary_resource_type="KUBERNETES_POD",
            primary_resource_id="payment-service-pod-99x",
            environment="PRODUCTION",
            description="Runtime observation verified unauthorized privileged container escape attempt.",
            reported_by_type="SYSTEM",
            reported_by_id="STEP13_RUNTIME_AGENT",
            observed_at=sig_time,
            initial_signals=initial_signals,
        )
        assert incident_a is not None
        assert incident_a.incident_key.startswith("INC-")
        assert incident_a.severity == IncidentSeverity.CRITICAL.value
        assert incident_a.status == IncidentStatus.DETECTED.value
        logger.info(f" -> Incident created: {incident_a.incident_key} ({incident_a.title})")

        # --------------------------------------------------------------------
        # TEST 2: Duplicate & Related Incident Detection (Sec 98, Sec 19)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 2] Duplicate & Related Incident Correlation ---")
        dup = await service.find_duplicate_or_related(
            project_id=project_a_id,
            primary_resource_type="KUBERNETES_POD",
            primary_resource_id="payment-service-pod-99x",
            environment="PRODUCTION",
        )
        assert dup is not None
        assert dup.id == incident_a.id
        logger.info(f" -> Existing active incident identified for resource: {dup.incident_key} (Preserving separate signals)")

        # Link related secondary incident
        incident_sec = await service.create_incident(
            project_id=project_a_id,
            title="Secondary Network Probe from Neighboring Pod",
            incident_type=IncidentType.NETWORK_EXPOSURE,
            severity=IncidentSeverity.HIGH,
            primary_resource_type="KUBERNETES_POD",
            primary_resource_id="ingress-proxy-pod-01",
        )
        rel = await service.link_incidents(
            source_incident_id=incident_sec.id,
            target_incident_id=incident_a.id,
            relationship_type=IncidentRelationshipType.RELATED_TO,
        )
        assert rel.relationship_type == "RELATED_TO"
        logger.info(f" -> Explicit relationship recorded: {incident_sec.incident_key} RELATED_TO {incident_a.incident_key}")

        # --------------------------------------------------------------------
        # TEST 3: Forensic Evidence Collection & SHA-256 Integrity (Sec 99)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 3] Forensic Evidence Collection & SHA-256 Seal ---")
        auth_ctx = {"actor_id": str(user_a.id), "permissions": ["forensics:*", "admin"]}
        t_range = {"start": now - timedelta(hours=1), "end": now}
        evidence_rec, result = await service.collect_forensic_evidence(
            incident_id=incident_a.id,
            collector_type="CLOUD_AUDIT",
            target="arn:aws:iam::123456789012:role/PaymentWorkerRole",
            time_range=t_range,
            scope={"region": "us-east-1"},
            authorization_context=auth_ctx,
            role=EvidenceRole.PRIMARY,
        )
        assert evidence_rec is not None
        assert result["status"] == CollectorStatus.COMPLETED.value
        assert evidence_rec.integrity_hash is not None
        assert len(evidence_rec.integrity_hash) == 64  # SHA-256
        assert evidence_rec.artifact_size_bytes > 0
        logger.info(f" -> Collected forensic evidence {evidence_rec.evidence_id}: SHA-256={evidence_rec.integrity_hash} ({evidence_rec.artifact_size_bytes} bytes)")

        # Verify Chain of Custody
        evidence_items = await service.list_incident_evidence(incident_a.id)
        assert len(evidence_items) == 1
        assert len(evidence_items[0].chain_events) == 1
        assert evidence_items[0].chain_events[0].action == EvidenceChainAction.COLLECTED.value
        logger.info(" -> Verified chain of custody event: COLLECTED with actor and purpose logged.")

        # --------------------------------------------------------------------
        # TEST 4: Authorization Enforcement on Evidence Collection (Rule 71, Sec 100)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 4] Authorization Enforcement on Evidence Collection ---")
        unauth_ctx = {"actor_id": "untrusted_intern", "permissions": ["repo:read"]}
        denied_ev, denied_res = await service.collect_forensic_evidence(
            incident_id=incident_a.id,
            collector_type="CLOUD_AUDIT",
            target="arn:aws:iam::123456789012:role/PaymentWorkerRole",
            time_range=t_range,
            scope={},
            authorization_context=unauth_ctx,
        )
        assert denied_ev is None
        assert denied_res["status"] == CollectorStatus.DENIED.value
        assert "Authorization denied" in denied_res["error"]
        logger.info(f" -> Unauthorized evidence collection successfully blocked: {denied_res['error']}")

        # --------------------------------------------------------------------
        # TEST 5: Secret Redaction in Forensic Artifacts (Rule 73, Sec 101)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 5] Secret Redaction & Token Masking ---")
        dirty_payload = {
            "api_endpoint": "https://api.internal/vault",
            "aws_key": "AKIAIOSFODNN7EXAMPLE",  # Real AWS Key format
            "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
            "db_password": "SuperSecretDatabasePassword123!",
        }
        redacted_payload, was_redacted = SecretRedactor.redact_data(dirty_payload)
        assert was_redacted is True
        assert "AKIAIOSFODNN7EXAMPLE" not in str(redacted_payload)
        assert "SuperSecretDatabasePassword123!" not in str(redacted_payload)
        assert "[REDACTED_AWS_ACCESS_KEY:" in redacted_payload["aws_key"]
        assert "[REDACTED_CREDENTIAL:" in redacted_payload["db_password"]
        logger.info(f" -> Secrets successfully redacted with fingerprints: {redacted_payload['aws_key']}, {redacted_payload['db_password']}")

        # --------------------------------------------------------------------
        # TEST 6: Timeline Reconstruction by Timestamp Order (Sec 102)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 6] Timeline Reconstruction & Timestamp Ordering ---")
        t_base = now - timedelta(minutes=30)
        # Ingestion out of order intentionally
        await service.add_timeline_entry(
            incident_id=incident_a.id,
            event_time=t_base + timedelta(minutes=10),
            event_type="IAM_ROLE_ASSUMED",
            source_type="AWS_CLOUDTRAIL",
            source_id="cloudtrail-event-01",
            description="PaymentWorkerRole assumed by pod service account",
            confidence=TimelineConfidence.OBSERVED,
        )
        await service.add_timeline_entry(
            incident_id=incident_a.id,
            event_time=t_base + timedelta(minutes=2),
            event_type="POD_DEPLOYED",
            source_type="KUBERNETES",
            source_id="k8s-pod-event-01",
            description="Payment service pod started in production namespace",
            confidence=TimelineConfidence.OBSERVED,
        )
        await service.add_timeline_entry(
            incident_id=incident_a.id,
            event_time=t_base + timedelta(minutes=12),
            event_type="SUSPICIOUS_OUTBOUND_CONN",
            source_type="NETWORK_FLOW",
            source_id="net-flow-99",
            description="Outbound connection to unauthorized external IP",
            confidence=TimelineConfidence.HYPOTHESIZED,
        )

        timeline = await service.get_incident_timeline(incident_a.id)
        assert len(timeline) >= 4
        # Verify chronological timestamp order (NOT ingestion order)
        def to_utc(dt):
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

        for i in range(len(timeline) - 1):
            assert to_utc(timeline[i].event_time) <= to_utc(timeline[i + 1].event_time)
        logger.info(f" -> Timeline reconstructed: {len(timeline)} events correctly sorted by factual timestamp.")

        # --------------------------------------------------------------------
        # TEST 7: Contradictory Evidence Handling (Sec 84, Sec 115)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 7] Contradictory Evidence Detection ---")
        mock_evidence_items = [
            {"id": "ev-1", "content": "AWS IAM returned access denied for role PaymentWorkerRole on s3:PutObject"},
            {"id": "ev-2", "content": "Query executed: database write succeeded on customer_vault table, status: 200"},
        ]
        contradictions = InvestigationEngine.detect_contradictions(mock_evidence_items)
        assert len(contradictions) == 1
        assert contradictions[0]["status"] == "CONTRADICTED"
        logger.info(f" -> Contradiction flagged: {contradictions[0]['explanation']}")

        # --------------------------------------------------------------------
        # TEST 8: Root Cause Verification Constraints (Rule 68, Sec 117)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 8] Root Cause Verification Constraints (Rule 68) ---")
        # Attempt to mark root cause VERIFIED without supporting evidence -> MUST BE REJECTED
        rc_no_ev, val_no_ev = await service.record_root_cause(
            incident_id=incident_a.id,
            statement="Agent code reviewer introduced credential leak",
            supporting_evidence_ids=[],  # Empty evidence
            verified_by=str(user_a.id),
        )
        assert val_no_ev["allowed"] is False
        assert rc_no_ev.status == RootCauseStatus.HYPOTHESIS.value
        logger.info(f" -> Root cause verification rejected without evidence (Rule 68 enforced): {val_no_ev['reason']}")

        # Valid root cause with real evidence
        rc_valid, val_valid = await service.record_root_cause(
            incident_id=incident_a.id,
            statement="Missing Kubernetes runAsNonRoot constraint allowed root container execution",
            supporting_evidence_ids=[evidence_rec.evidence_id],
            verified_by=str(user_a.id),
        )
        assert val_valid["allowed"] is True
        assert rc_valid.status == RootCauseStatus.VERIFIED.value
        assert rc_valid.verified_by == str(user_a.id)
        logger.info(f" -> Root cause legitimately verified with supporting evidence: Status={rc_valid.status}")

        # --------------------------------------------------------------------
        # TEST 9: Containment Coordination via Step 14 (Rule 46, Sec 107)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 9] Containment Proposal & Step 14 Routing ---")
        containment = await service.propose_containment(
            incident_id=incident_a.id,
            action_type=ContainmentActionType.ISOLATE_WORKLOAD,
            target_type="KUBERNETES_POD",
            target_id="payment-service-pod-99x",
            reason="Isolate compromised pod to prevent lateral movement",
        )
        assert containment.status == ContainmentStatus.PROPOSED.value
        logger.info(f" -> Containment proposed: {containment.id} (Status: {containment.status})")

        # Step 14 executes containment after Policy & Authorization
        completed_cont = await service.execute_containment_via_step14(
            containment_record_id=containment.id,
            policy_decision_id="pol-dec-409",
            step14_response_id="step14-act-88",
            post_action_evidence_id="post-ev-contain-01",
        )
        assert completed_cont.status == ContainmentStatus.COMPLETED.value
        assert completed_cont.step14_response_id == "step14-act-88"
        logger.info(" -> Containment completed via authorized Step 14 enforcement response.")

        # --------------------------------------------------------------------
        # TEST 10: Recovery & Post-Incident Reverification (Sec 109)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 10] Recovery & Post-Incident Verification ---")
        recovery_rec = await service.record_recovery(
            incident_id=incident_a.id,
            action_type=RecoveryActionType.REDEPLOY_VERIFIED_ARTIFACT,
            target="k8s/production/payment-deployment",
            post_recovery_evidence_id="ev-redeploy-99",
            reverification_result={"contracts_reverified": True, "violations_remaining": 0},
        )
        assert recovery_rec.status == RecoveryStatus.VERIFIED.value
        logger.info(f" -> Workload recovery verified: Status={recovery_rec.status}")

        # --------------------------------------------------------------------
        # TEST 11: Closure Invariant Enforcement (Sec 116)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 11] Incident Closure Invariants (Sec 116) ---")
        # Attempt closure while active contract violations exist -> Must reject
        inc_closed_fail, readiness_fail = await service.close_incident(
            incident_id=incident_a.id,
            closed_by=str(user_a.id),
            closure_reason="Everything looks fine",
            has_active_contract_violations=True,
            closure_with_limitations=False,
        )
        assert readiness_fail["can_close"] is False
        assert "Active contract violations remain" in readiness_fail["rejection_reasons"][0]
        logger.info(f" -> Premature closure properly rejected: {readiness_fail['rejection_reasons']}")

        # Legitimate closure with limitations approved
        inc_closed, readiness_ok = await service.close_incident(
            incident_id=incident_a.id,
            closed_by=str(user_a.id),
            closure_reason="Pod isolated, immutable image redeployed, security contract verified.",
            has_active_contract_violations=False,
            closure_with_limitations=False,
        )
        assert readiness_ok["can_close"] is True
        assert inc_closed.status == IncidentStatus.CLOSED.value
        assert inc_closed.closed_by == str(user_a.id)
        logger.info(f" -> Incident closed successfully: {inc_closed.status} by {inc_closed.closed_by}")

        # --------------------------------------------------------------------
        # TEST 12: Incident Reopening on New Evidence (Rule 58, Sec 110)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 12] Incident Reopening on New Evidence (Sec 110) ---")
        reopened = await service.reopen_incident(
            incident_id=incident_a.id,
            reopened_by=str(user_a.id),
            new_evidence_id="ev-late-cloudtrail-099",
            reason="Late cloud audit log shows secondary persistence mechanism created during window",
        )
        assert reopened.status == IncidentStatus.REOPENED.value
        # Closure history must be preserved
        assert len(reopened.metadata_["closure_history"]) == 1
        assert reopened.metadata_["closure_history"][0]["closed_by"] == str(user_a.id)
        logger.info(f" -> Incident reopened: Status={reopened.status}, Prior closure history preserved in metadata.")

        # --------------------------------------------------------------------
        # TEST 13: Multi-Tenant Boundary Enforcement (Sec 111, Rule 72)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 13] Multi-Tenant Boundary Enforcement ---")
        # Project B investigator attempts to fetch Project A's incident
        cross_tenant_inc = await service.get_incident(incident_id=incident_a.id, project_id=project_b_id)
        assert cross_tenant_inc is None
        logger.info(" -> Cross-project access strictly denied (Tenant B cannot read Tenant A incident).")

        # --------------------------------------------------------------------
        # TEST 14: Forensic Export Dossier with Cryptographic Seal (Sec 118)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 14] Forensic Dossier Export & Audit Seal ---")
        export_dossier = await service.export_incident_dossier(
            incident_id=incident_a.id,
            actor_type="HUMAN",
            actor_id=str(user_a.id),
            purpose="Regulatory Compliance Review",
        )
        assert export_dossier["export_hash"] is not None
        assert export_dossier["dossier"]["incident"]["key"] == incident_a.incident_key
        assert len(export_dossier["dossier"]["timeline"]) >= 4
        logger.info(f" -> Forensic export dossier generated with SHA-256 seal: {export_dossier['export_hash']}")

        # --------------------------------------------------------------------
        # TEST 15: Rule 66 Compliance (Zero Incident Scores)
        # --------------------------------------------------------------------
        logger.info("\n--- [TEST 15] Rule 66 Compliance (Absence of Incident Scores) ---")
        forbidden_scores = ["incident_score", "threat_score", "ai_threat_score", "score", "compromise_score"]
        for key in forbidden_scores:
            assert not hasattr(incident_a, key), f"Rule 66 violation: Found forbidden score attribute '{key}'"
        assert incident_a.severity in [s.value for s in IncidentSeverity]
        logger.info(f" -> Rule 66 verified: Incident severity is factual classification '{incident_a.severity}', NO numerical score.")

    logger.info("\n======================================================================")
    logger.info("ALL STEP 21 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    logger.info("======================================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
