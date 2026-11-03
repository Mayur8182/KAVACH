import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class RemediationReference(BaseModel):
    title: str
    url: str

class CodeDiff(BaseModel):
    original_code: str
    patched_code: str
    unified_diff: str

class RemediationSuggestion(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    diff: CodeDiff
    is_recommended: bool = False

class FindingEvidence(BaseModel):
    id: uuid.UUID
    snippet: str
    scan_output: str
    data_flow: Dict[str, Any]
    related_findings: List[Dict[str, Any]]
    dependencies: List[Dict[str, Any]]

class SecurityFindingDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scan_id: Optional[uuid.UUID] = None
    rule_id: str
    title: str
    description: str
    severity: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    snippet: Optional[str] = None
    status: Optional[str] = "Open"
    created_at: Optional[datetime] = None
    cwe: Optional[str] = None
    cvss_score: Optional[float] = None
    
    # UI Metadata
    language: Optional[str] = "Python"
    issue_type: Optional[str] = "SQL Injection"
    recommendation: Optional[str] = None
    first_detected_text: Optional[str] = "2 hours ago"
    last_seen_text: Optional[str] = "2 hours ago"
    occurrences: Optional[int] = 3
    finding_code: Optional[str] = "#F-2026-0929-0042"
    scanner_name: Optional[str] = "Trivy (SAST)"
    cvss_vector: Optional[str] = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    branch: Optional[str] = "main"
    commit_hash: Optional[str] = "a1b2c3d"
    owasp: Optional[str] = "A03:2021 - Injection"
    
    # Overview
    risk_summary: Dict[str, Any] = Field(default_factory=dict)
    risk_items: List[Dict[str, str]] = Field(default_factory=list)
    affected_assets: Dict[str, Any] = Field(default_factory=dict)
    remediation_description: Optional[str] = None
    references: List[RemediationReference] = Field(default_factory=list)
    similar_findings: List[Dict[str, Any]] = Field(default_factory=list)
    activity_logs: List[Dict[str, Any]] = Field(default_factory=list)
    vulnerable_code: Optional[str] = None
    fixed_code: Optional[str] = None

    # Remediation
    remediation_suggestions: List[RemediationSuggestion] = Field(default_factory=list)
    alternative_fixes: List[RemediationSuggestion] = Field(default_factory=list)
    manual_fix_instructions: Optional[str] = None
    secure_code_preview: Optional[str] = None

    # Evidence
    evidence: Optional[FindingEvidence] = None

class ApplyFixRequest(BaseModel):
    suggestion_id: Optional[Union[uuid.UUID, str]] = None
    mode: Optional[str] = None
    mode_str: Optional[str] = None

class ApplyFixResponse(BaseModel):
    success: bool
    message: str
    scan_triggered: bool = False
    scan_id: Optional[Union[uuid.UUID, str]] = None
    status: Optional[str] = None
    finding_resolved: Optional[bool] = None
    branch: Optional[str] = None
    pull_request_url: Optional[str] = None
    pull_request_number: Optional[int] = None
    push_error: Optional[str] = None
    reason: Optional[str] = None

class TestFixRequest(BaseModel):
    suggestion_id: Optional[Union[uuid.UUID, str]] = None

class TestFixResponse(BaseModel):
    success: bool
    status: str  # PASSED, FAILED
    message: str
    checks_run: int
    duration_ms: int
    details: Dict[str, Any]

class CreateRemediationPRRequest(BaseModel):
    suggestion_id: Optional[Union[uuid.UUID, str]] = None
    title: Optional[str] = None
    branch: Optional[str] = None
    body: Optional[str] = None

class CreateRemediationPRResponse(BaseModel):
    success: bool
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    message: str

