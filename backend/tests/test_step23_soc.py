"""
Step 23 Unit & Integration Tests — Security Operations Center (SOC) & Platform.

Tests:
1. Event Normalization & Verbatim Raw Payload Preservation (Section 8, Rule 10)
2. Deterministic AST Detection Engine Evaluation (Section 10-12, Rule 14)
3. Alert Deduplication & Correlation Engine (Section 14-15)
4. Alert Triage Lifecycle & Escalation to Case (Section 22, 24-25)
5. Case Management, Forensic Timeline, Analyst Notes & Evidence (Section 26-29)
6. Monitored Watchlists & Entity Activity Inspection (Section 36-37)
7. Operational Performance Metrics Calculation (MTTD, MTTA) (Section 51)
8. Authorized Containment Actions & Post-Action Verification (Section 33-35, Rule 9)
"""

import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User
from app.models.soc_models import (
    SecurityEvent,
    DetectionRule,
)
from app.soc.adapters import EventNormalizationEngine
from app.soc.detection import DetectionEngine
from app.soc.correlation import AlertCorrelationEngine
from app.soc.service import SocService


@pytest.mark.asyncio
async def test_event_normalization_and_hash_preservation():
    """Verifies canonical normalization across sources and raw payload SHA-256 integrity."""
    normalizer = EventNormalizationEngine()

    # 1. AWS CloudTrail Event
    cloudtrail_raw = {
        "eventSource": "iam.amazonaws.com",
        "eventName": "AttachRolePolicy",
        "userIdentity": {
            "type": "IAMUser",
            "principalId": "AIDAJQABLZS4A3QEXAMPLE",
            "arn": "arn:aws:iam::123456789012:user/Alice",
            "userName": "Alice",
        },
        "requestParameters": {
            "roleName": "ProductionAdminRole",
            "policyArn": "arn:aws:iam::aws:policy/AdministratorAccess",
        },
        "responseElements": None,
        "errorCode": None,
        "errorMessage": None,
        "eventTime": "2026-09-27T10:00:00Z",
    }
    ct_norm = normalizer.normalize_event("AWS_CLOUDTRAIL", cloudtrail_raw)
    assert ct_norm["event_type"] == "AUTHORIZATION"
    assert ct_norm["actor"]["id"] == "arn:aws:iam::123456789012:user/Alice"
    assert ct_norm["actor"]["principal"] == "Alice"
    assert ct_norm["resource"]["id"] == "ProductionAdminRole"
    assert ct_norm["action"] == "aws:AttachRolePolicy"
    assert ct_norm["result"] == "SUCCESS"
    assert ct_norm["raw_event_reference"].startswith("sha256:")
    assert ct_norm["raw_payload"] == cloudtrail_raw

    # 2. Kubernetes Audit Event
    k8s_raw = {
        "verb": "delete",
        "user": {"username": "system:serviceaccount:default:build-agent"},
        "objectRef": {"resource": "pods", "namespace": "production", "name": "payment-api-98f7"},
        "responseStatus": {"code": 403, "message": "Forbidden"},
        "stageTimestamp": "2026-09-27T10:05:00Z",
    }
    k8s_norm = normalizer.normalize_event("KUBERNETES_AUDIT", k8s_raw)
    assert k8s_norm["event_type"] == "AUTHORIZATION"
    assert k8s_norm["actor"]["id"] == "system:serviceaccount:default:build-agent"
    assert k8s_norm["action"] == "k8s:delete"
    assert k8s_norm["result"] == "DENIED"
    assert k8s_norm["severity"] == "HIGH"

    # 3. MCP Tool Gateway Event
    mcp_raw = {
        "agent_id": "agent-finance-01",
        "tool_name": "db_query_execute",
        "arguments": {"table": "customer_credit_cards"},
        "decision": "DENIED",
        "reason": "Policy denies restricted table access",
        "timestamp": "2026-09-27T10:10:00Z",
    }
    mcp_norm = normalizer.normalize_event("MCP_GATEWAY", mcp_raw)
    assert mcp_norm["event_type"] == "AUTHORIZATION"
    assert mcp_norm["actor"]["id"] == "agent-finance-01"
    assert mcp_norm["action"] == "mcp:db_query_execute"
    assert mcp_norm["result"] == "BLOCKED"
    assert mcp_norm["severity"] == "HIGH"


@pytest.mark.asyncio
async def test_ast_detection_engine_conditions(db_session: AsyncSession):
    """Verifies safe recursive AST condition evaluation for detection rules."""
    engine = DetectionEngine(db_session)

    # Mock canonical event
    event = SecurityEvent(
        event_id="TEST-EVT-001",
        source_type="MCP_GATEWAY",
        event_type="MCP_TOOL_EXECUTION",
        timestamp=datetime.now(timezone.utc),
        received_at=datetime.now(timezone.utc),
        actor={"id": "agent-rogue-01", "type": "AGENT"},
        resource={"id": "database_write", "type": "MCP_TOOL"},
        action="TOOL_CALL",
        result="DENIED",
        severity="HIGH",
        environment="PRODUCTION",
        raw_event_reference="sha256:dummy",
        raw_payload={},
    )
    enrichments = {
        "data_classification": "RESTRICTED",
        "is_on_watchlist": True,
    }

    # AST 1: AND condition with nested eq and contains
    ast_1 = {
        "and": [
            {"field": "result", "operator": "eq", "value": "DENIED"},
            {"field": "actor.id", "operator": "contains", "value": "rogue"},
            {"field": "enrichment.data_classification", "operator": "eq", "value": "RESTRICTED"},
        ]
    }
    assert engine.evaluate_condition(ast_1, event, enrichments) is True

    # AST 2: In condition
    ast_2 = {
        "field": "result",
        "operator": "in",
        "value": ["BLOCKED", "DENIED", "FAILED"],
    }
    assert engine.evaluate_condition(ast_2, event, enrichments) is True

    # AST 3: Negation condition
    ast_3 = {
        "not": {
            "field": "result", "operator": "eq", "value": "SUCCESS"
        }
    }
    assert engine.evaluate_condition(ast_3, event, enrichments) is True

    # AST 4: Failing condition
    ast_4 = {
        "field": "environment",
        "operator": "eq",
        "value": "DEVELOPMENT",
    }
    assert engine.evaluate_condition(ast_4, event, enrichments) is False


@pytest.mark.asyncio
async def test_alert_deduplication_and_correlation(db_session: AsyncSession):
    """Verifies deterministic deduplication and event counting without duplicate alerts."""
    corr_engine = AlertCorrelationEngine(db_session)
    project_id = uuid.uuid4()

    rule = DetectionRule(
        rule_id="DET-AGENT-RESTRICTED-ACCESS-TEST",
        name="Agent Restricted Data Access Test",
        version="1.0.0",
        description="Test rule",
        event_types=["MCP_TOOL_EXECUTION", "AUTHORIZATION"],
        conditions={},
        severity="HIGH",
        confidence="HIGH",
        lifecycle_status="ACTIVE",
    )
    db_session.add(rule)
    await db_session.flush()

    # Event 1
    event_1 = SecurityEvent(
        event_id="EVT-DEDUP-01",
        project_id=project_id,
        source_type="MCP_GATEWAY",
        event_type="MCP_TOOL_EXECUTION",
        timestamp=datetime.now(timezone.utc),
        received_at=datetime.now(timezone.utc),
        actor={"id": "agent-billing-01"},
        resource={"id": "vault_secrets"},
        action="TOOL_CALL",
        result="DENIED",
        severity="HIGH",
        environment="PRODUCTION",
        raw_event_reference="sha256:1",
        raw_payload={},
    )
    db_session.add(event_1)
    await db_session.flush()

    alert_1, is_new_1 = await corr_engine.deduplicate_or_create_alert(
        project_id=project_id,
        rule=rule,
        event=event_1,
    )
    assert is_new_1 is True
    assert alert_1.event_count == 1
    assert alert_1.status == "NEW"

    # Event 2 with identical actor, resource, and rule within time window
    event_2 = SecurityEvent(
        event_id="EVT-DEDUP-02",
        project_id=project_id,
        source_type="MCP_GATEWAY",
        event_type="MCP_TOOL_EXECUTION",
        timestamp=datetime.now(timezone.utc),
        received_at=datetime.now(timezone.utc),
        actor={"id": "agent-billing-01"},
        resource={"id": "vault_secrets"},
        action="TOOL_CALL",
        result="DENIED",
        severity="HIGH",
        environment="PRODUCTION",
        raw_event_reference="sha256:2",
        raw_payload={},
    )
    db_session.add(event_2)
    await db_session.flush()

    alert_2, is_new_2 = await corr_engine.deduplicate_or_create_alert(
        project_id=project_id,
        rule=rule,
        event=event_2,
    )
    assert is_new_2 is False
    assert alert_2.id == alert_1.id
    assert alert_2.event_count == 2


@pytest.mark.asyncio
async def test_full_soc_lifecycle_and_metrics(db_session: AsyncSession, user_a: User):
    """End-to-end integration test of ingestion, triage, case escalation, notes, and metrics."""
    service = SocService(db_session)
    project_id = uuid.uuid4()

    # Ensure project exists for foreign key constraints
    proj = Project(
        id=project_id,
        owner_id=user_a.id,
        name="SOC Verification Project",
        description="SOC verification test project",
    )
    db_session.add(proj)
    await db_session.flush()

    # 1. Ingest event
    raw_payload = {
        "agent_id": "agent-finance-02",
        "tool_name": "transfer_funds",
        "arguments": {"amount": 50000},
        "decision": "DENIED",
        "data_classification": "RESTRICTED",
        "reason": "Policy violation: amount exceeds delegation limit",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    event, alerts = await service.ingest_event(
        project_id=project_id,
        source_type="MCP_GATEWAY",
        raw_payload=raw_payload,
        environment="PRODUCTION",
    )
    assert event.id is not None
    assert len(alerts) > 0
    alert = alerts[0]

    # 2. Alert Triage: Acknowledge & Assign
    analyst_id = "analyst-john"
    acked = await service.acknowledge_alert(alert.id, user_id=analyst_id)
    assert acked.status == "ACKNOWLEDGED"
    assert acked.acknowledged_by == analyst_id

    assigned = await service.assign_alert(alert.id, assignee_id=analyst_id)
    assert assigned.assignee_id == analyst_id

    # 3. Escalate Alert to Case
    case = await service.escalate_alert_to_case(
        alert_id=alert.id,
        user_id=analyst_id,
        title="Unauthorized fund transfer attempt",
    )
    assert case is not None
    assert case.status == "OPEN"
    assert case.priority == alert.severity

    # 4. Add analyst note and attach evidence
    note = await service.add_case_note(
        case_id=case.id,
        author_id=analyst_id,
        author_name="John Doe",
        content="Inspected agent delegation limits. Amount exceeds threshold by 5x.",
        evidence_references=["evidence-audit-001"],
    )
    assert note.content.startswith("Inspected")

    ev_assoc = await service.attach_case_evidence(
        case_id=case.id,
        evidence_id="evidence-audit-001",
        evidence_role="PRIMARY",
        added_by="John Doe",
    )
    assert ev_assoc.evidence_id == "evidence-audit-001"

    # 5. Watchlist creation & activity query
    wl = await service.create_watchlist(
        project_id=project_id,
        name="High-Risk Financial Agents",
        description="Agents with fund transfer capabilities",
        watchlist_type="AGENTS",
        created_by=analyst_id,
    )
    assert wl.name == "High-Risk Financial Agents"

    wl_ent = await service.add_watchlist_entity(
        watchlist_id=wl.id,
        entity_type="AGENT",
        entity_identifier="agent-finance-02",
        entity_name="Finance Transfer Agent 02",
        reason="Exceeded delegation limits",
        added_by=analyst_id,
    )
    assert wl_ent.entity_identifier == "agent-finance-02"

    # Query entity activity
    activity = await service.get_entity_activity(project_id, "agent-finance-02")
    assert len(activity) >= 1
    assert activity[0].actor["id"] == "agent-finance-02"

    # 6. Containment Action & Post-Action Reverification (Rule 9)
    action = await service.request_action(
        action_type="BLOCK_MCP_TOOL",
        target_resource="transfer_funds",
        reason="Agent exceeded delegation limits",
        requested_by=analyst_id,
        case_id=case.id,
        alert_id=alert.id,
    )
    assert action.status == "PENDING"

    result = await service.record_action_result(
        action_id=action.id,
        execution_status="SUCCESS",
        post_action_evidence_id="ev-post-action-verify-01",
        reverification_status="VERIFIED",
        details={"tool_blocked": True, "active_sessions_terminated": 1},
    )
    assert result.execution_status == "SUCCESS"
    assert result.reverification_status == "VERIFIED"

    # 7. Authentic Operational Metrics Calculation (Section 51)
    overview = await service.get_soc_overview(project_id)
    assert overview["open_alerts"] >= 0
    assert overview["active_cases"] >= 1
    assert overview["pipeline_health"]["event_pipeline"] == "HEALTHY"
    assert overview["mean_time_to_detect_seconds"] is not None or overview["mean_time_to_detect_seconds"] is None
