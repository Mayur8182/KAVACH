"""
Pydantic Schemas for Infrastructure as Code (IaC) Remediation Suite — Section 5 (Screens 5.1 - 5.8).
Strict deterministic types for all Remediation endpoints.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── 5.1 Remediation Overview Schemas ──────────────────────────────────────────

class RemediationStatusPoint(BaseModel):
    date: str
    open_count: int
    in_progress_count: int
    fixed_count: int


class RemediationCategoryItem(BaseModel):
    category: str
    open_count: int
    in_progress_count: int
    fixed_count: int
    total_count: int


class IaCRemediationOverviewSuiteResponse(BaseModel):
    open_issues: int = Field(124, description="Total active open issues")
    fix_available: int = Field(86, description="Issues with guided or automated fix available")
    auto_fixable: int = Field(28, description="Issues capable of 1-click AI PR auto-fix")
    in_progress: int = Field(10, description="Issues currently being remediated")
    time_filter: str = Field("Last 30 days")
    status_trend: List[RemediationStatusPoint] = Field(default_factory=list)
    top_categories: List[RemediationCategoryItem] = Field(default_factory=list)


# ── 5.2 Fix Recommendations Schemas ───────────────────────────────────────────

class FixRecommendationItem(BaseModel):
    id: str
    finding_id: str
    finding: str
    resource: str
    severity: str  # Critical, High, Medium, Low
    recommendation: str
    framework: str  # Terraform, CloudFormation, Kubernetes, Helm
    provider: str   # AWS, Kubernetes, Azure, GCP
    auto_fixable: bool = True
    created_at: str
    status: str = "Open"


class FixRecommendationsPageResponse(BaseModel):
    items: List[FixRecommendationItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    severities: List[str] = Field(default_factory=lambda: ["All Severities", "Critical", "High", "Medium", "Low"])
    frameworks: List[str] = Field(default_factory=lambda: ["All Frameworks", "Terraform", "CloudFormation", "Kubernetes", "Helm"])
    providers: List[str] = Field(default_factory=lambda: ["All Providers", "AWS", "Kubernetes", "Azure", "GCP"])


# ── 5.3 Remediation Detail Schemas ────────────────────────────────────────────

class CodeSnippet(BaseModel):
    framework: str
    vulnerable_code: str
    remediated_code: str
    vulnerable_lines: Optional[str] = None
    remediated_lines: Optional[str] = None


class ComplianceReference(BaseModel):
    framework: str
    control_id: str
    title: str
    url: Optional[str] = None


class RemediationDetailResponse(BaseModel):
    id: str
    finding_id: str
    title: str
    resource: str
    severity: str
    status: str
    description: str
    impact: str
    fix_steps: List[str]
    code_examples: Dict[str, CodeSnippet]  # Keys: terraform, cloudformation, kubernetes
    references: List[ComplianceReference]
    auto_fixable: bool = True


# ── 5.4 Auto-Fix (AI Remediation) Schemas ─────────────────────────────────────

class AutoFixItem(BaseModel):
    id: str
    finding_id: str
    finding: str
    resource: str
    severity: str
    auto_fix_status: str = "Available"  # Available, In Progress, Generated, Failed
    framework: str
    provider: str
    recommended_pr_title: str
    target_branch: str = "main"


class AutoFixListResponse(BaseModel):
    items: List[AutoFixItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    beta_notice: str = "AI can automatically generate pull requests with fixes for supported issues."


class GeneratePRRequest(BaseModel):
    finding_id: str
    target_branch: Optional[str] = "main"
    custom_title: Optional[str] = None
    include_security_context: Optional[bool] = True
    auto_assign_reviewers: Optional[str] = "devsecops-team"


class GeneratePRResponse(BaseModel):
    pr_number: int
    pr_id: str
    title: str
    repository: str
    branch: str
    target_branch: str
    status: str
    html_url: str
    diff_summary: str
    created_at: str
    author: str
    checks_status: str


# ── 5.5 Pull Request Integration Schemas ──────────────────────────────────────

class RemediationPRItem(BaseModel):
    id: str
    pr_number: int
    title: str
    repository: str
    status: str  # Open, Merged, Closed
    created_at: str
    author: str
    branch: str
    target_branch: str = "main"
    checks_status: str = "passing"
    diff_preview: Optional[str] = None
    finding_id: Optional[str] = None
    resource: Optional[str] = None


class RemediationPRsPageResponse(BaseModel):
    items: List[RemediationPRItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    repositories: List[str] = Field(default_factory=lambda: ["All Repositories", "infra", "k8s-manifests", "terraform-module"])
    statuses: List[str] = Field(default_factory=lambda: ["All Statuses", "Open", "Merged", "Closed"])


# ── 5.6 Suppressed Findings Schemas ───────────────────────────────────────────

class SuppressedFindingItem(BaseModel):
    id: str
    finding: str
    resource: str
    reason: str
    expires_at: str
    suppressed_by: str
    created_at: str
    status: str = "Active"  # Active, Expired, Revoked


class SuppressedFindingsPageResponse(BaseModel):
    items: List[SuppressedFindingItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    reasons: List[str] = Field(
        default_factory=lambda: [
            "All Reasons",
            "Accepted risk (Legacy)",
            "Development environment",
            "Low risk",
            "Internal application",
            "Required for external API",
            "False positive",
        ]
    )
    resources: List[str] = Field(default_factory=list)


class UpdateSuppressionRequest(BaseModel):
    reason: Optional[str] = None
    expires_at: Optional[str] = None
    status: Optional[str] = None  # "Active" or "Revoked" (unsuppress)


# ── 5.7 Remediation Activity Schemas ──────────────────────────────────────────

class RemediationActivityItem(BaseModel):
    id: str
    timestamp: str
    action: str  # Auto-fix PR, PR merged, Manual fix, Closed PR, Suppressed, PR created, Unsuppressed
    finding: str
    resource: str
    user: str
    details: Optional[str] = None


class RemediationActivityPageResponse(BaseModel):
    items: List[RemediationActivityItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    actions: List[str] = Field(
        default_factory=lambda: [
            "All Actions",
            "Auto-fix PR",
            "PR merged",
            "Manual fix",
            "Closed PR",
            "Suppressed",
            "PR created",
        ]
    )
    users: List[str] = Field(
        default_factory=lambda: [
            "All Users",
            "mayur.bhanvad",
            "devops-team",
            "dev-team",
        ]
    )


# ── 5.8 Remediation Settings Schemas ──────────────────────────────────────────

class RemediationSettingsDTO(BaseModel):
    enable_ai_remediation: bool = True
    auto_create_prs: bool = True
    require_manual_approval_critical: bool = True
    include_test_validation: bool = False
    git_provider: str = "GitHub"
    repository: str = "frontend-app"
    base_branch: str = "main"
    auto_assign_reviewers: str = "devsecops-team"
    include_security_context: bool = True
    auto_close_on_merge: bool = True
    notify_pr_creation: bool = True
    notify_pr_merge: bool = True
    notify_failed_autofix: bool = True


class UpdateRemediationSettingsRequest(BaseModel):
    enable_ai_remediation: Optional[bool] = None
    auto_create_prs: Optional[bool] = None
    require_manual_approval_critical: Optional[bool] = None
    include_test_validation: Optional[bool] = None
    git_provider: Optional[str] = None
    repository: Optional[str] = None
    base_branch: Optional[str] = None
    auto_assign_reviewers: Optional[str] = None
    include_security_context: Optional[bool] = None
    auto_close_on_merge: Optional[bool] = None
    notify_pr_creation: Optional[bool] = None
    notify_pr_merge: Optional[bool] = None
    notify_failed_autofix: Optional[bool] = None
