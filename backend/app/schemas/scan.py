import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScanTriggerRequest(BaseModel):
    """Payload to trigger a real security verification scan."""
    target_type: str = Field(
        default="LOCAL_DIRECTORY",
        description="Target type: LOCAL_DIRECTORY, GIT_REPOSITORY, WORKSPACE, DOCKERFILE, CONTAINER_IMAGE",
    )
    target_path: Optional[str] = Field(
        default=None,
        description="Path to scan. If omitted, workspace root or project repository is used.",
    )
    blueprint_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional blueprint UUID to verify requirements against. If omitted, project's latest blueprint is used.",
    )
    selected_scanners: Optional[List[str]] = Field(
        default=None,
        description="Optional subset of scanners to run (e.g. ['semgrep', 'gitleaks']). If omitted, all registered scanners are executed.",
    )


class SecurityFindingResponse(BaseModel):
    """Normalized finding returned by an automated security scanner."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scan_id: uuid.UUID
    scanner_execution_id: uuid.UUID
    scanner_name: str
    rule_id: str
    title: str
    description: str
    severity: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    snippet: Optional[str] = None
    fingerprint: str
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class ScannerExecutionResponse(BaseModel):
    """Process execution log for a specific scanner tool."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scan_id: uuid.UUID
    scanner_name: str
    scanner_type: str
    status: str
    scanner_version: Optional[str] = None
    command: Optional[str] = None
    exit_code: Optional[int] = None
    stdout_summary: Optional[str] = None
    stderr_output: Optional[str] = None
    finding_count: int = 0
    duration_ms: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class RequirementVerificationResponse(BaseModel):
    """Deterministic requirement verification outcome."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scan_id: uuid.UUID
    requirement_id: uuid.UUID
    requirement_key: str
    status: str
    rationale: str
    evidence_summary: str
    contributing_findings_count: int
    created_at: datetime


class SecurityScanResponse(BaseModel):
    """Summary and details of a security scan."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    blueprint_id: Optional[uuid.UUID] = None
    intent_id: Optional[uuid.UUID] = None
    target_type: str
    target_path: str
    target_reference: Optional[str] = None
    status: str
    requested_by: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    scanner_count: int
    finding_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    executions: Optional[List[ScannerExecutionResponse]] = None
    findings: Optional[List[SecurityFindingResponse]] = None
    verifications: Optional[List[RequirementVerificationResponse]] = None


class ScannerHealthResponse(BaseModel):
    """Real-time operational status of an underlying scanner binary."""
    scanner_name: str
    scanner_type: str
    tool_name: str
    status: str
    version: Optional[str] = None
    message: str
