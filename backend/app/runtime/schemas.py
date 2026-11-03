"""
Pydantic schemas for Step 13 — Runtime Evidence & Continuous Verification Engine.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RuntimeEvidenceIngestRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    project_id: Optional[uuid.UUID] = Field(default=None, description="Project ID")
    event_id: Optional[str] = Field(default=None, description="Client event ID or None for deterministic generation")
    source_type: str = Field(description="MCP | APPLICATION | OPEN_TELEMETRY | AUDIT_LOG | CONTAINER | KUBERNETES | GITHUB etc.")
    source_id: str = Field(description="Component, agent, or gateway identifier")
    source_event_id: Optional[str] = Field(default=None, description="Original source event ID")
    event_type: str = Field(description="AUTHENTICATION | AUTHORIZATION | AGENT_ACTION | MCP_TOOL_CALL | API_REQUEST etc.")
    occurred_at: datetime = Field(description="Actual timestamp of event occurrence")

    subject: Dict[str, Any] = Field(default_factory=dict)
    action: Dict[str, Any] = Field(default_factory=dict)
    resource: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    result: Dict[str, Any] = Field(default_factory=dict)
    trace: Dict[str, Any] = Field(default_factory=dict, description="trace_id, span_id, parent_span_id")
    classification: str = Field(default="INTERNAL")
    trust_level: str = Field(default="VALIDATED")
    timestamp_quality: str = Field(default="SOURCE_REPORTED")
    environment: str = Field(default="production")
    raw_payload: Optional[Dict[str, Any]] = Field(default=None)


class RuntimeEvidenceIngestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    evidence_id: Optional[uuid.UUID] = None
    id: Optional[uuid.UUID] = None
    event_id: str
    status: str
    payload_hash: str
    is_duplicate: bool = False
    verifications_count: int = 0
    violations_count: int = 0
    message: str = "Runtime evidence processed and verified successfully"
    verification_results: List[Dict[str, Any]] = Field(default_factory=list)


class RuntimeEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    event_id: str
    source_type: str
    source_id: str
    source_event_id: Optional[str] = None
    event_type: str
    occurred_at: datetime
    received_at: datetime
    processed_at: Optional[datetime] = None
    subject_type: Optional[str] = None
    subject_id: Optional[str] = None
    action_type: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    environment: str
    classification: str
    trust_level: str = "VALIDATED"
    timestamp_quality: str = "SOURCE_REPORTED"
    normalized_payload: Dict[str, Any]
    payload_hash: str
    schema_version: str
    collector_version: str
    status: str
    created_at: datetime
    correlations: List[Dict[str, Any]] = Field(default_factory=list)


class RuntimeEvidenceSourceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    source_type: str = Field(description="MCP | OPEN_TELEMETRY | APPLICATION | GITHUB | CONTAINER | KUBERNETES")
    configuration: Dict[str, Any] = Field(default_factory=dict, description="Integration metadata (NO raw credentials)")
    status: str = Field(default="ACTIVE")


class RuntimeEvidenceSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    source_type: str
    configuration: Dict[str, Any]
    status: str
    last_seen_at: Optional[datetime] = None
    last_event_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class EvidenceCorrelationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    evidence_id: uuid.UUID
    correlation_type: str
    correlation_key: str
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[str] = None
    confidence: float
    created_at: datetime


class RuntimeHealthResponse(BaseModel):
    status: str
    collectors: Dict[str, str] = Field(description="Health status of each collector: active, degraded, not_configured")
    metrics: Dict[str, Any] = Field(default_factory=dict)


class RuntimeViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contract_version_id: uuid.UUID
    verification_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    severity: str
    violation_type: str
    description: str
    subject: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    evidence: Dict[str, Any]
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
