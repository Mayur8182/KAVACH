"""
Pydantic Schemas for IaC Findings Suite (Section 2: Screens 2.1 through 2.8)
Matches exact UI requirements from reference specifications:
  2.1 Findings Overview (KPIs: 328 Total, 76 Critical, 124 High, 86 Medium, 42 Low, Trend, Donut, Top Affected Resources)
  2.2 All Findings (Search, Multi-Filters, Export, Pagination, Checkboxes)
  2.3 Findings by Provider (AWS 214, Kubernetes 68, Azure 32, GCP 14, Others 0)
  2.4 Findings by Severity (Critical 76, High 124, Medium 86, Low 42)
  2.5 Findings by Category (Access Control 66, Encryption 52, Network Security 46, etc.)
  2.6 Findings by Framework (CIS AWS 132, NIST 800-53 88, PCI DSS 42, ISO 27001 32, Others 34)
  2.7 Findings by Environment (Production 142, Staging 86, Development 68, QA 32)
  2.8 Filters & Search (Advanced Checkbox Facets, Framework & Category Selectors)
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ── 2.1 Overview Schemas ─────────────────────────────────────────────────────────

class IaCFindingsKpis(BaseModel):
    total_findings: int = 328
    critical: int = 76
    high: int = 124
    medium: int = 86
    low: int = 42


class IaCFindingsTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int


class IaCTopAffectedResourceItem(BaseModel):
    resource: str
    count: int


class IaCTopCategoryCountItem(BaseModel):
    category: str
    count: int


class IaCFindingsOverviewResponse(BaseModel):
    kpis: IaCFindingsKpis
    trend: List[IaCFindingsTrendPoint] = Field(default_factory=list)
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)
    status_breakdown: Dict[str, int] = Field(default_factory=dict)
    top_affected_resources: List[IaCTopAffectedResourceItem] = Field(default_factory=list)
    top_findings_by_category: List[IaCTopCategoryCountItem] = Field(default_factory=list)


# ── 2.2 All Findings Schemas ─────────────────────────────────────────────────────

class IaCFindingRowItem(BaseModel):
    id: str  # e.g. FND-328
    title: str
    severity: str  # Critical, High, Medium, Low
    resource: str  # e.g. aws_s3_bucket
    provider: str  # AWS, Kubernetes, Azure, GCP
    framework: str  # CIS AWS, NIST 800-53, PCI DSS, ISO 27001
    environment: str  # Production, Staging, Development, QA
    status: str  # Open, In Progress, Resolved
    detected_at: str  # e.g. Sep 30, 10:12


class IaCFindingsAllResponse(BaseModel):
    items: List[IaCFindingRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_severities: List[str] = Field(
        default_factory=lambda: ["All Severities", "Critical", "High", "Medium", "Low"]
    )
    available_providers: List[str] = Field(
        default_factory=lambda: ["All Providers", "AWS", "Kubernetes", "Azure", "GCP"]
    )
    available_frameworks: List[str] = Field(
        default_factory=lambda: ["All Frameworks", "CIS AWS", "NIST 800-53", "PCI DSS", "ISO 27001"]
    )
    available_statuses: List[str] = Field(
        default_factory=lambda: ["All Statuses", "Open", "In Progress", "Resolved"]
    )


# ── 2.3 Findings by Provider ────────────────────────────────────────────────────

class IaCProviderCountItem(BaseModel):
    provider: str
    count: int


class IaCFindingsByProviderResponse(BaseModel):
    providers: List[IaCProviderCountItem] = Field(default_factory=list)
    active_provider: str = "AWS"
    items: List[IaCFindingRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


# ── 2.4 Findings by Severity ────────────────────────────────────────────────────

class IaCSeverityCountItem(BaseModel):
    severity: str
    count: int


class IaCFindingsBySeverityResponse(BaseModel):
    severities: List[IaCSeverityCountItem] = Field(default_factory=list)
    active_severity: str = "Critical"
    items: List[IaCFindingRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


# ── 2.5 Findings by Category ────────────────────────────────────────────────────

class IaCCategoryRowItem(BaseModel):
    category: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class IaCFindingsByCategoryResponse(BaseModel):
    categories: List[IaCCategoryRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


# ── 2.6 Findings by Framework ───────────────────────────────────────────────────

class IaCFrameworkCountItem(BaseModel):
    framework: str
    count: int


class IaCFrameworkRuleRowItem(BaseModel):
    rule_id: str
    title: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class IaCFindingsByFrameworkResponse(BaseModel):
    frameworks: List[IaCFrameworkCountItem] = Field(default_factory=list)
    active_framework: str = "CIS AWS"
    rules: List[IaCFrameworkRuleRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


# ── 2.7 Findings by Environment ─────────────────────────────────────────────────

class IaCEnvironmentCountItem(BaseModel):
    environment: str
    count: int


class IaCFindingsByEnvironmentResponse(BaseModel):
    environments: List[IaCEnvironmentCountItem] = Field(default_factory=list)
    active_environment: str = "Production"
    items: List[IaCFindingRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


# ── Actions & Exports ───────────────────────────────────────────────────────────

class ExportFindingsRequest(BaseModel):
    format: str = "CSV"  # or JSON
    severity: Optional[str] = None
    provider: Optional[str] = None
    status: Optional[str] = None
    environment: Optional[str] = None
    framework: Optional[str] = None
    category: Optional[str] = None
    search: Optional[str] = None


class ExportFindingsResponse(BaseModel):
    format: str
    exported_count: int
    download_content: str
    filename: str


class UpdateSuiteFindingStatusRequest(BaseModel):
    status: str  # Open, In Progress, Resolved


# ── 3.3 Finding Detail Schemas ───────────────────────────────────────────────────

class FindingEvidenceSnippet(BaseModel):
    file_path: str
    line_start: int
    line_end: int
    code_content: str
    diff_patch: Optional[str] = None


class FindingRemediationGuidance(BaseModel):
    summary: str
    terraform_snippet: str
    steps: List[str] = Field(default_factory=list)
    applied: bool = False
    pr_url: Optional[str] = None


class FindingCommentItem(BaseModel):
    id: str
    author: str
    avatar: str
    comment: str
    created_at: str


class FindingActivityItem(BaseModel):
    id: str
    event: str
    user: str
    timestamp: str
    badge_variant: str = "info"


class IaCFindingDetailResponse(BaseModel):
    id: str  # FND-328
    title: str
    description: str
    severity: str
    status: str
    resource: str
    provider: str
    rule_id: str
    category: str
    frameworks: str
    detected_at: str
    first_seen: str
    last_seen: str
    environment: str
    region: str
    resource_tags: str
    cvss_score: str
    assignee: Optional[str] = "Unassigned"
    evidence: FindingEvidenceSnippet
    remediation: FindingRemediationGuidance
    comments: List[FindingCommentItem] = Field(default_factory=list)
    activity: List[FindingActivityItem] = Field(default_factory=list)


class AssignFindingRequest(BaseModel):
    assignee: str


class CommentFindingRequest(BaseModel):
    comment: str
    author: Optional[str] = "Dev Security Admin"


class RemediateFindingRequest(BaseModel):
    action: str = "apply"  # "apply" or "revert"


# ── 3.4 Findings Triage Schemas ──────────────────────────────────────────────────

class IaCFindingsTriageItem(BaseModel):
    id: str
    title: str
    severity: str
    assignee: str
    status: str
    resource: str
    provider: str
    detected_at: str


class IaCFindingsTriageResponse(BaseModel):
    status_counts: Dict[str, int] = Field(
        default_factory=lambda: {"Open": 214, "In Progress": 46, "Resolved": 52, "Suppressed": 16}
    )
    items: List[IaCFindingsTriageItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    assignees: List[str] = Field(
        default_factory=lambda: ["Unassigned", "mayur.bhavsar", "dev-team", "devops-team", "security-team"]
    )


class BulkFindingActionRequest(BaseModel):
    action: str  # "assign", "set_status", "suppress"
    finding_ids: List[str]
    value: str  # assignee name or status


# ── 3.5 Findings Trends Schemas ──────────────────────────────────────────────────

class IaCProviderTrendCount(BaseModel):
    provider: str
    count: int


class IaCEnvironmentTrendPct(BaseModel):
    environment: str
    percentage: int
    count: int


class IaCFindingsTrendsResponse(BaseModel):
    time_range: str = "Last 90 days"
    trend: List[IaCFindingsTrendPoint] = Field(default_factory=list)
    provider_breakdown: List[IaCProviderTrendCount] = Field(default_factory=list)
    environment_breakdown: List[IaCEnvironmentTrendPct] = Field(default_factory=list)


# ── 3.6 Findings by Resource Schemas ─────────────────────────────────────────────

class IaCResourceFindingsRowItem(BaseModel):
    resource_type: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class IaCFindingsByResourceResponse(BaseModel):
    items: List[IaCResourceFindingsRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    providers: List[str] = Field(default_factory=lambda: ["All Providers", "AWS", "Kubernetes", "Azure", "GCP"])
    environments: List[str] = Field(default_factory=lambda: ["All Environments", "Production", "Staging", "Development", "Sandbox"])


# ── 3.7 Findings by Framework (Compliance Summary) Schemas ───────────────────────

class IaCFrameworkSummaryRowItem(BaseModel):
    framework: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class IaCFindingsByFrameworkSummaryResponse(BaseModel):
    items: List[IaCFrameworkSummaryRowItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


# ── 3.8 Export & Reports Schemas ─────────────────────────────────────────────────

class ExportFindingsAdvancedRequest(BaseModel):
    format: str = "CSV"  # CSV, JSON, PDF
    include_details: bool = True
    include_resource_config: bool = True
    include_remediation: bool = True
    include_evidence: bool = False
    include_activity: bool = False
    status: Optional[str] = None
    severity: Optional[str] = None
    provider: Optional[str] = None
    date_range: str = "Last 30 days"


class ScheduledReportItem(BaseModel):
    id: str
    name: str
    frequency: str
    format: str
    recipients: str
    status: str  # Active, Paused
    next_run: str


class ScheduledReportCreateRequest(BaseModel):
    name: str
    frequency: str = "Weekly"
    format: str = "PDF"
    recipients: str


class ReportHistoryItem(BaseModel):
    id: str
    name: str
    format: str
    generated_at: str
    size: str
    generated_by: str
    download_content: str
