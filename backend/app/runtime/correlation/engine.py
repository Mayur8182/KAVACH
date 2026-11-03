"""
Deterministic Evidence Correlation Engine.
Extracts correlation links from normalized runtime evidence using strict deterministic identifiers:
Trace ID, Span ID, Request ID, Agent ID, Delegation ID, MCP Tool Execution ID, Commit SHA, Deployment ID.
Avoids fuzzy or non-deterministic correlation.
"""

import uuid
from typing import Any, Dict, List, Optional
from app.runtime.enums import CorrelationType
from app.runtime.models import EvidenceCorrelation, RuntimeEvidence


class CorrelationEngine:
    """
    Extracts and manages deterministic correlation records for runtime evidence.
    """

    @staticmethod
    def extract_correlations(evidence: RuntimeEvidence) -> List[EvidenceCorrelation]:
        """
        Extracts all deterministic correlation links from an ingested RuntimeEvidence record.
        """
        correlations: List[EvidenceCorrelation] = []
        payload = evidence.normalized_payload or {}
        context = payload.get("context", {}) or {}
        subject = payload.get("subject", {}) or {}
        resource = payload.get("resource", {}) or {}
        
        # 1. Trace ID
        trace_id = (
            evidence.trace_id
            or context.get("trace_id")
            or payload.get("trace", {}).get("trace_id")
        )
        if trace_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.TRACE.value,
                    correlation_key=str(trace_id),
                    related_resource_type="TRACE",
                    related_resource_id=str(trace_id),
                    confidence=1.0,
                )
            )

        # 2. Span ID
        span_id = (
            evidence.span_id
            or context.get("span_id")
            or payload.get("trace", {}).get("span_id")
        )
        if span_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.SPAN.value,
                    correlation_key=str(span_id),
                    related_resource_type="SPAN",
                    related_resource_id=str(span_id),
                    confidence=1.0,
                )
            )

        # 3. Request ID
        request_id = (
            context.get("request_id")
            or payload.get("request_id")
            or context.get("http_request_id")
        )
        if request_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.REQUEST.value,
                    correlation_key=str(request_id),
                    related_resource_type="HTTP_REQUEST",
                    related_resource_id=str(request_id),
                    confidence=1.0,
                )
            )

        # 4. Agent Action / Agent ID
        if evidence.subject_type == "AGENT" and evidence.subject_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.AGENT_ACTION.value,
                    correlation_key=str(evidence.subject_id),
                    related_resource_type="AGENT",
                    related_resource_id=str(evidence.subject_id),
                    confidence=1.0,
                )
            )
        elif context.get("agent_id"):
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.AGENT_ACTION.value,
                    correlation_key=str(context["agent_id"]),
                    related_resource_type="AGENT",
                    related_resource_id=str(context["agent_id"]),
                    confidence=1.0,
                )
            )

        # 5. Delegation ID
        delegation_id = (
            context.get("delegation_id")
            or payload.get("delegation_id")
            or context.get("delegation", {}).get("delegation_id")
        )
        if delegation_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.DELEGATION.value,
                    correlation_key=str(delegation_id),
                    related_resource_type="DELEGATION",
                    related_resource_id=str(delegation_id),
                    confidence=1.0,
                )
            )

        # 6. MCP Execution ID
        tool_exec_id = (
            context.get("tool_execution_id")
            or context.get("execution_id")
            or (resource.get("id") if resource.get("type") == "MCP_TOOL" else None)
        )
        if tool_exec_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.MCP_EXECUTION.value,
                    correlation_key=str(tool_exec_id),
                    related_resource_type="MCP_TOOL_EXECUTION",
                    related_resource_id=str(tool_exec_id),
                    confidence=1.0,
                )
            )

        # 7. GitHub Commit SHA
        commit_sha = (
            context.get("commit_sha")
            or context.get("head_commit", {}).get("id")
            or payload.get("commit_sha")
        )
        if commit_sha:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.GITHUB_COMMIT.value,
                    correlation_key=str(commit_sha),
                    related_resource_type="GITHUB_COMMIT",
                    related_resource_id=str(commit_sha),
                    confidence=1.0,
                )
            )

        # 8. Deployment ID
        deployment_id = context.get("deployment_id") or payload.get("deployment_id")
        if deployment_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.DEPLOYMENT.value,
                    correlation_key=str(deployment_id),
                    related_resource_type="DEPLOYMENT",
                    related_resource_id=str(deployment_id),
                    confidence=1.0,
                )
            )

        # 9. Container ID
        container_id = context.get("container_id") or (
            evidence.subject_id if evidence.subject_type == "CONTAINER" else None
        )
        if container_id:
            correlations.append(
                EvidenceCorrelation(
                    id=uuid.uuid4(),
                    project_id=evidence.project_id,
                    evidence_id=evidence.id,
                    correlation_type=CorrelationType.CONTAINER.value,
                    correlation_key=str(container_id),
                    related_resource_type="CONTAINER",
                    related_resource_id=str(container_id),
                    confidence=1.0,
                )
            )

        return correlations
