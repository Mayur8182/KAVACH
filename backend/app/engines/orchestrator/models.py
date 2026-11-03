"""
Thing Scan Orchestrator — Domain Models & Schemas
Defines core data structures for Asset Discovery and Scan Planning.
Adheres to AGENTS.md: Zero fake data, deterministic evidence, real asset typing.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AssetType(str, Enum):
    SOURCE_CODE = "SOURCE_CODE"
    PACKAGE_MANIFEST = "PACKAGE_MANIFEST"
    IAC_TEMPLATE = "IAC_TEMPLATE"
    CONTAINER_DOCKERFILE = "CONTAINER_DOCKERFILE"
    CONTAINER_COMPOSE = "CONTAINER_COMPOSE"
    CONTAINER_IMAGE = "CONTAINER_IMAGE"
    SECRETS_TARGET = "SECRETS_TARGET"
    CI_CD_WORKFLOW = "CI_CD_WORKFLOW"
    CONFIG_FILE = "CONFIG_FILE"
    DOCUMENTATION = "DOCUMENTATION"


class DiscoveredAsset(BaseModel):
    """An individual file or artifact identified during asset discovery."""
    path: str = Field(description="Relative path of the asset within target")
    asset_type: AssetType = Field(description="Classified asset type")
    category: str = Field(description="Language or framework category (e.g. python, terraform, npm)")
    size_bytes: int = Field(default=0, description="Size of the asset on disk")
    line_count: Optional[int] = Field(default=None, description="Number of lines if text-based")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Scanner-relevant metadata")


class AssetProfile(BaseModel):
    """Authoritative profile of a inspected workspace or repository."""
    target_path: str = Field(description="Absolute path of the scanned target")
    target_name: str = Field(description="Basename or repository identifier")
    is_git_repository: bool = Field(default=False, description="Whether target has a .git directory")
    git_branch: Optional[str] = Field(default=None, description="Current Git branch if available")
    git_commit_sha: Optional[str] = Field(default=None, description="Current HEAD commit SHA")
    total_files_inspected: int = Field(default=0, description="Total files discovered")
    total_bytes_inspected: int = Field(default=0, description="Total size in bytes")
    
    # Categorized distributions
    languages: Dict[str, int] = Field(default_factory=dict, description="File counts by programming language")
    package_ecosystems: List[str] = Field(default_factory=list, description="Detected package managers (npm, pip, go, etc.)")
    manifest_files: List[str] = Field(default_factory=list, description="List of dependency manifest paths")
    iac_files: List[str] = Field(default_factory=list, description="List of IaC template paths")
    container_files: List[str] = Field(default_factory=list, description="List of Dockerfile / compose paths")
    ci_cd_files: List[str] = Field(default_factory=list, description="List of CI/CD pipeline definition paths")
    secret_risk_files: List[str] = Field(default_factory=list, description="Paths of high-risk credential files (.env, keys)")
    
    # Detailed assets sample
    discovered_assets: List[DiscoveredAsset] = Field(default_factory=list, description="Discovered asset descriptors")
    discovery_duration_ms: int = Field(default=0, description="Duration of discovery run in ms")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlanAction(str, Enum):
    RUN = "RUN"
    SKIP = "SKIP"


class ScannerPlanDecision(BaseModel):
    """Deterministic decision for a specific scanner tool in the scan plan."""
    scanner_name: str = Field(description="Identifier of the scanner (e.g. semgrep, gitleaks)")
    scanner_type: str = Field(description="Type: SAST, SECRETS, SCA, IAC, CONTAINER, SBOM")
    tool_name: str = Field(description="Human readable tool name")
    action: PlanAction = Field(description="RUN or SKIP")
    priority: int = Field(default=1, description="Execution priority (1 = highest)")
    reason: str = Field(description="Authoritative rationale for running or skipping")
    is_available_on_host: bool = Field(default=True, description="Whether binary exists in system PATH")
    host_status_message: Optional[str] = Field(default=None, description="Host environment probe status")
    matched_assets_count: int = Field(default=0, description="Number of assets this scanner targets")
    sample_assets: List[str] = Field(default_factory=list, description="Sample of matching asset paths")
    estimated_duration_seconds: int = Field(default=30, description="Estimated execution time in seconds")


class ExecutionPhase(BaseModel):
    """A parallel execution step containing compatible scanners."""
    phase_number: int = Field(description="Sequence order of the phase (1, 2, 3...)")
    name: str = Field(description="Descriptive name of the phase")
    scanners: List[str] = Field(description="List of scanner_names to run in this phase")
    run_in_parallel: bool = Field(default=True, description="Whether scanners run concurrently")
    description: str = Field(description="Purpose of this execution phase")


class ScanPlan(BaseModel):
    """Complete, deterministic execution plan produced by the Scan Planner."""
    plan_id: str = Field(description="Unique UUID for this scan plan")
    target_path: str = Field(description="Target directory or repository path")
    asset_profile: AssetProfile = Field(description="Profile of detected assets")
    decisions: List[ScannerPlanDecision] = Field(description="Decisions for all registered scanners")
    planned_scanners: List[str] = Field(description="Scanners selected to execute")
    skipped_scanners: List[str] = Field(description="Scanners skipped with rationales")
    execution_phases: List[ExecutionPhase] = Field(description="Phased execution workflow")
    total_estimated_duration_seconds: int = Field(default=60, description="Total estimated duration")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FindingEvidenceSource(BaseModel):
    """Specific evidence contributed by an individual scanner for a correlated finding."""
    scanner_name: str = Field(description="Source scanner name (e.g. gitleaks, semgrep, trivy)")
    scanner_type: str = Field(description="Source scanner type (e.g. SECRETS, SAST, SCA, IAC)")
    rule_id: str = Field(description="Tool-native rule or check ID")
    severity: str = Field(description="Severity reported by this specific scanner")
    title: str = Field(description="Finding title from this scanner")
    message: str = Field(description="Description or detail reported by this scanner")
    file_path: Optional[str] = Field(default=None, description="Reported file path")
    line_number: Optional[int] = Field(default=None, description="Reported line number")
    column_number: Optional[int] = Field(default=None, description="Reported column number")
    snippet: Optional[str] = Field(default=None, description="Extracted code/token snippet")
    fingerprint: str = Field(description="Original scanner fingerprint")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Original raw scanner metadata")


class CorrelatedFinding(BaseModel):
    """A unified, deduplicated finding combining evidence from multiple security scanners."""
    id: str = Field(description="Deterministic finding UUID")
    canonical_fingerprint: str = Field(description="Stable SHA-256 fingerprint for deduplication across rescans")
    rule_id: str = Field(description="Primary or canonical vulnerability rule identifier")
    title: str = Field(description="Consolidated finding title")
    description: str = Field(description="Comprehensive finding description")
    severity: str = Field(description="Harmonized severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL")
    category: str = Field(description="Taxonomy category (SECRETS, INJECTION, SCA, IAC, AUTH, CRYPTO, CONFIG, OTHER)")
    cwe_id: Optional[str] = Field(default=None, description="CWE taxonomy identifier (e.g. CWE-798, CWE-89)")
    owasp_category: Optional[str] = Field(default=None, description="OWASP Top 10 category (e.g. A03:2021-Injection)")
    file_path: Optional[str] = Field(default=None, description="Normalized relative file path")
    line_number: Optional[int] = Field(default=None, description="Primary line number")
    column_number: Optional[int] = Field(default=None, description="Primary column number")
    snippet: Optional[str] = Field(default=None, description="Representative snippet (secrets masked)")
    remediation: Optional[str] = Field(default=None, description="Actionable remediation advice")
    confidence: str = Field(default="MEDIUM", description="Confidence level: VERY_HIGH, HIGH, MEDIUM")
    verification_status: str = Field(
        default="SINGLE_SCANNER_VERIFIED",
        description="MULTI_SCANNER_VERIFIED if confirmed by 2+ independent scanners, else SINGLE_SCANNER_VERIFIED",
    )
    participating_scanners: List[str] = Field(default_factory=list, description="Names of all scanners that detected this issue")
    scanner_count: int = Field(default=1, description="Number of independent scanners corroborating this finding")
    evidence_sources: List[FindingEvidenceSource] = Field(default_factory=list, description="Detailed evidence from each tool")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Consolidated metadata including evidence sources")


class DeduplicationSummary(BaseModel):
    """Summary metrics of a deduplication and correlation run."""
    total_raw_findings: int = Field(description="Total raw findings emitted across all scanners")
    total_unique_findings: int = Field(description="Total deduplicated findings")
    duplicate_findings_merged: int = Field(description="Number of redundant finding instances consolidated")
    multi_scanner_corroborated_count: int = Field(description="Number of findings verified by 2+ independent tools")
    findings_by_severity: Dict[str, int] = Field(default_factory=dict, description="Count of findings per severity level")
    findings_by_category: Dict[str, int] = Field(default_factory=dict, description="Count of findings per taxonomy category")
