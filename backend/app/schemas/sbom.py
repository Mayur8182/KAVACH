"""
SBOM Pydantic schemas — request/response contracts for the SBOM API.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ── Request ────────────────────────────────────────────────────────────────────

class SBOMGenerateRequest(BaseModel):
    """Trigger a new Syft SBOM generation job for a project or repository."""
    project_id: Optional[uuid.UUID] = Field(None, description="Target project UUID")
    repository_id: Optional[str] = Field(None, description="Target repository UUID")
    target_path: Optional[str] = Field(
        None,
        description="Filesystem path or image reference to scan. "
                    "If omitted, the project's connected repository is used.",
    )
    sbom_format: str = Field(
        default="cyclonedx-json",
        description="Output format: cyclonedx-json | spdx-json | syft-json",
    )


class SBOMComponentFilter(BaseModel):
    """Server-side filter applied to the component list."""
    search: Optional[str] = Field(None, description="Full-text search on name / version")
    component_type: Optional[str] = Field(
        None, description="Filter by type: npm | docker | git | pypi | other"
    )
    license_name: Optional[str] = Field(None, description="Filter by exact license")
    risk_level: Optional[str] = Field(
        None, description="Filter by risk: Critical | High | Medium | Low"
    )
    component_status: Optional[str] = Field(
        None, description="Filter by status: Vulnerable | Needs Review | Safe"
    )


# ── Response ───────────────────────────────────────────────────────────────────

class SBOMJobResponse(BaseModel):
    """Real-time job status for an SBOM generation run."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    requested_by: str
    status: str  # QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED
    sbom_format: str
    syft_version: Optional[str] = None
    syft_command: Optional[str] = None
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class SBOMSummaryResponse(BaseModel):
    """Aggregated counters for the four metric cards in the SBOM UI."""
    total_components: int
    vulnerable_components: int
    open_source_licenses: int
    high_risk_licenses: int
    # Deltas
    total_delta: Optional[str] = "↓ 12 from last scan"
    vuln_delta: Optional[str] = "↑ 4 new"
    license_delta: Optional[str] = "↑ 2 new"
    high_risk_delta: Optional[str] = "↑ 1 new"
    # Severity donut chart
    critical: int
    high: int
    medium: int
    low: int
    info: int
    by_severity: Optional[List[Dict[str, Any]]] = None
    # Component type breakdown for sidebar
    type_breakdown: Dict[str, int]  # {"npm": 92, "docker": 18, ...}
    by_type: Optional[List[Dict[str, Any]]] = None
    # Top 5 vulnerable components
    top_vulnerable: List[Dict[str, Any]]
    # Last scan info
    last_scan_at: Optional[datetime]
    duration_ms: Optional[int]
    duration_formatted: Optional[str] = "1m 24s"
    sbom_format: Optional[str]
    job_status: Optional[str]


class SBOMComponentResponse(BaseModel):
    """One normalized component row for the paginated table."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    name: str
    version: Optional[str] = None
    component_type: str
    purl: Optional[str] = None
    license_name: Optional[str] = None
    is_high_risk_license: bool
    vuln_count: int
    vuln_critical: int
    vuln_high: int
    vuln_medium: int
    vuln_low: int
    risk_level: str
    component_status: str
    direct_or_transitive: Optional[str] = "Direct"
    dependency_path: Optional[List[str]] = Field(default_factory=lambda: ["frontend-app"])
    vulnerabilities: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    raw_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime


class SBOMComponentPageResponse(BaseModel):
    """Server-side paginated component list."""
    items: List[SBOMComponentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_types: Optional[List[str]] = None
    available_licenses: Optional[List[str]] = None
    available_risk_levels: Optional[List[str]] = None


class SBOMDocumentResponse(BaseModel):
    """SBOM document header used in the list view."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    project_id: uuid.UUID
    sbom_format: str
    sbom_spec_version: Optional[str] = None
    source_name: Optional[str] = None
    source_version: Optional[str] = None
    total_components: int
    vulnerable_components: int
    open_source_licenses: int
    high_risk_licenses: int
    critical_vulns: int
    high_vulns: int
    medium_vulns: int
    low_vulns: int
    info_vulns: int
    created_at: datetime
    updated_at: datetime
