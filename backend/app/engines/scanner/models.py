from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScanTarget(BaseModel):
    """Specifies the real code repository or artifact target to scan."""
    target_type: str = Field(
        default="LOCAL_DIRECTORY",
        description="LOCAL_DIRECTORY, GIT_REPOSITORY, WORKSPACE, DOCKERFILE, CONTAINER_IMAGE, TERRAFORM, KUBERNETES_MANIFEST",
    )
    path: str = Field(description="Absolute or workspace-relative path to inspect")
    repository_url: Optional[str] = None
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    image_reference: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NormalizedFindingCandidate(BaseModel):
    """A standardized vulnerability or security weakness finding emitted by any scanner."""
    rule_id: str = Field(description="Scanner-specific rule or vulnerability ID (e.g. CVE-..., gitleaks-rule-...)")
    title: str
    description: str
    severity: str = Field(description="CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL")
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    snippet: Optional[str] = None
    fingerprint: str = Field(description="Deterministic cryptographic or location hash for deduplication")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class ScannerExecutionResult(BaseModel):
    """Outcome of running an individual scanner process."""
    scanner_name: str
    scanner_type: str
    status: str = Field(description="COMPLETED, FAILED, NOT_CONFIGURED, NOT_AVAILABLE")
    scanner_version: Optional[str] = None
    command: Optional[str] = None
    exit_code: Optional[int] = None
    stdout_summary: Optional[str] = None
    stderr_output: Optional[str] = None
    findings: List[NormalizedFindingCandidate] = Field(default_factory=list)
    duration_ms: Optional[int] = None
    error_message: Optional[str] = None


class VerificationRequirementEvaluation(BaseModel):
    """Deterministic evaluation state mapping scanner findings back to a Step 5 Security Requirement."""
    requirement_id: str
    requirement_key: str
    status: str = Field(description="SATISFIED, VIOLATED, UNKNOWN, NOT_EVALUATED")
    rationale: str
    evidence_summary: str
    contributing_findings: List[NormalizedFindingCandidate] = Field(default_factory=list)


class FullScanVerificationResult(BaseModel):
    """Aggregate result from executing all selected scanners against a target."""
    scan_id: Optional[str] = None
    status: str = Field(description="COMPLETED, FAILED, PARTIAL")
    executions: List[ScannerExecutionResult]
    findings: List[NormalizedFindingCandidate]
    verifications: List[VerificationRequirementEvaluation]
    scanner_count: int
    finding_count: int
    error_message: Optional[str] = None
    correlated_findings: Optional[List[Any]] = Field(default=None, description="Enriched correlated findings with multi-source evidence")
    deduplication_summary: Optional[Dict[str, Any]] = Field(default=None, description="Summary of deduplication metrics")
