import uuid
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from app.schemas.scan import SecurityFindingResponse, SecurityScanResponse
from app.schemas.github import GitHubPullRequestResponse

class PRCodeChange(BaseModel):
    file_path: str
    additions: int
    deletions: int
    patch: str
    status: str

class PRCheck(BaseModel):
    name: str
    status: str
    duration: str
    is_security_scan: bool = False

class PullRequestDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pr_info: GitHubPullRequestResponse
    scan_summary: Dict[str, Any]
    findings: List[SecurityFindingResponse]
    code_changes: List[PRCodeChange]
    checks: List[PRCheck]
    reviewers: List[Dict[str, str]]
    labels: List[str]
    related_issues: List[Dict[str, str]]
    security_checks: Optional[List[Dict[str, Any]]] = None
    changed_files_tree: Optional[List[Dict[str, Any]]] = None
    code_review_findings: Optional[List[Dict[str, Any]]] = None
    secret_findings_data: Optional[List[Dict[str, Any]]] = None
    cicd_check_details: Optional[Dict[str, Any]] = None
    review_approval_status: Optional[Dict[str, Any]] = None
    pr_timeline_history: Optional[List[Dict[str, Any]]] = None



# ── PR Activity Module Schemas (Screens 12.1 - 12.8) ──────────────────────────

class PRActivityOverviewStats(BaseModel):
    total_events: int = 42
    commits: int = 8
    reviews: int = 5
    comments: int = 12


class PRActivityTrendPoint(BaseModel):
    date: str
    commits: int
    reviews: int
    comments: int
    security: int


class PRRecentActivityItem(BaseModel):
    id: str
    event_type: str
    title: str
    subtitle: str
    time_ago: str
    icon_type: str
    status: Optional[str] = None


class PRTimelineCommit(BaseModel):
    hash: str
    message: str


class PRTimelineEventItem(BaseModel):
    id: str
    time: str
    author: str
    title: str
    description: Optional[str] = None
    event_type: str
    badges: List[Dict[str, str]] = []
    commits: List[PRTimelineCommit] = []
    action_label: Optional[str] = None
    action_type: Optional[str] = None


class PRTimelineDateGroup(BaseModel):
    date: str
    events: List[PRTimelineEventItem]


class PREventActionItem(BaseModel):
    id: str
    time: str
    event: str
    user: str
    details: str
    status: Optional[str] = None
    status_type: Optional[str] = None


class PRReviewerItem(BaseModel):
    id: str
    reviewer: str
    type: str
    status: str
    status_type: str
    comments: int
    time: str


class PRReviewCommentItem(BaseModel):
    id: str
    author: str
    initials: str
    avatar_color: str
    time: str
    status: Optional[str] = None
    status_type: Optional[str] = None
    text: str


class PRSecurityScanItem(BaseModel):
    id: str
    time: str
    event: str
    details: str
    severity: Optional[str] = None
    status: str
    status_type: str


class PRSecurityTrendPoint(BaseModel):
    date: str
    high: int
    medium: int
    low: int


class PRCICDRunItem(BaseModel):
    id: str
    time: str
    workflow: str
    status: str
    status_type: str
    duration: str
    details: str


class PRCICDCheckStatusItem(BaseModel):
    name: str
    percentage: int
    passed_count: int
    total_count: int
    status_color: str


class PRAuditLogItem(BaseModel):
    id: str
    time: str
    user: str
    action: str
    resource: str
    ip_address: str


class PRActivityFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pr_info: Dict[str, Any]
    overview_stats: PRActivityOverviewStats
    activity_trend: List[PRActivityTrendPoint]
    recent_activity: List[PRRecentActivityItem]
    timeline: List[PRTimelineDateGroup]
    events: List[PREventActionItem]
    reviewers: List[PRReviewerItem]
    review_comments: List[PRReviewCommentItem]
    security_stats: Dict[str, int]
    security_scans: List[PRSecurityScanItem]
    security_trend: List[PRSecurityTrendPoint]
    cicd_stats: Dict[str, int]
    cicd_runs: List[PRCICDRunItem]
    cicd_checks: List[PRCICDCheckStatusItem]
    audit_logs: List[PRAuditLogItem]


# ── PR Security Policy Module Schemas (Screens 13.1 - 13.8) ───────────────────

class PRSecurityPolicyOverviewStats(BaseModel):
    policy_rules: int = 12
    required_checks: int = 8
    active_exceptions: int = 3
    merge_protection: str = "100%"


class PRSecurityPolicyCoverageItem(BaseModel):
    id: str
    name: str
    status: str = "Enabled"
    enabled: bool = True


class PRSecurityPolicyEventItem(BaseModel):
    id: str
    time: str
    event: str
    actor: str
    status: str = "Success"


class PRSecurityCheckItem(BaseModel):
    id: str
    name: str
    type: str
    required: bool
    status: str
    icon: Optional[str] = None


class PRVulnerabilityThresholdItem(BaseModel):
    id: str
    category: str
    severity: str
    threshold: int
    action: str  # "Block merge", "Allow with warning", "Allow"


class PRSecretTypeItem(BaseModel):
    id: str
    secret_type: str
    description: str
    status: str = "Enabled"
    action: str = "Enabled"


class PRCustomPatternItem(BaseModel):
    id: str
    name: str
    pattern: str
    status: str = "Enabled"


class PRIaCPolicyRuleItem(BaseModel):
    id: str
    rule: str
    severity: str
    status: str = "Enabled"
    action: str = "Block"


class PRLicenseItem(BaseModel):
    id: str
    license: str
    risk_level: str
    action: str


class PRMergeConditions(BaseModel):
    require_all_required_checks_to_pass: bool = True
    require_code_owner_approval: bool = True
    require_security_review_high_critical: bool = True
    require_linear_history: bool = False
    block_merge_on_policy_violations: bool = True
    require_up_to_date_branch: bool = True
    allow_merge_commit: bool = True
    allow_squash_merge: bool = True
    allow_rebase_and_merge: bool = False
    enforcement_scope: str = "specific"  # "all" or "specific"
    specific_branches: str = "main, release/*, develop"


class PRPolicyExceptionItem(BaseModel):
    id: str
    rule: str
    reason: str
    expires: str
    status: str  # "Active" or "Expired"


class PRPolicyAuditHistoryItem(BaseModel):
    id: str
    time: str
    event: str
    user: str
    details: str


class PRSecurityPolicyFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    repository: str = "frontend-app"
    branch: str = "main"
    overview_stats: PRSecurityPolicyOverviewStats
    policy_coverage: List[PRSecurityPolicyCoverageItem]
    recent_events: List[PRSecurityPolicyEventItem]
    required_checks: List[PRSecurityCheckItem]
    execution_order: List[str]
    vulnerability_thresholds: List[PRVulnerabilityThresholdItem]
    secret_detection_toggles: Dict[str, bool]
    secret_types: List[PRSecretTypeItem]
    custom_patterns: List[PRCustomPatternItem]
    iac_toggles: Dict[str, bool]
    iac_supported_frameworks: Dict[str, bool]
    iac_policy_rules: List[PRIaCPolicyRuleItem]
    license_toggles: Dict[str, bool]
    restricted_licenses: List[PRLicenseItem]
    allowed_licenses: List[PRLicenseItem]
    merge_conditions: PRMergeConditions
    exceptions: List[PRPolicyExceptionItem]
    audit_history: List[PRPolicyAuditHistoryItem]


# ── PR Compliance Module Schemas (Screens 11.1 - 11.8) ────────────────────────

class PRComplianceOverviewStats(BaseModel):
    prs_scanned: int = 128
    compliant: int = 96
    non_compliant: int = 24
    needs_review: int = 8


class PRComplianceTrendPoint(BaseModel):
    date: str
    compliant: int
    non_compliant: int
    needs_review: int


class PRComplianceStandardBreakdown(BaseModel):
    name: str
    percentage: int
    count: int
    total: int = 128


class PRComplianceStandard(BaseModel):
    id: str
    name: str
    description: str
    status: str = "Enabled"
    coverage: int = 92


class PRComplianceRule(BaseModel):
    id: str
    name: str
    standard: str
    severity: str  # "High", "Medium", "Low"
    status: str = "Enabled"


class PRComplianceScanResult(BaseModel):
    id: str
    pr_number: int
    pr_title: str
    repository: str
    standards: List[str]
    status: str  # "Compliant", "Non-Compliant", "Needs Review"


class PRComplianceViolation(BaseModel):
    id: str
    rule: str
    pr_number: int
    repository: str
    severity: str  # "High", "Medium", "Low"
    status: str  # "Open", "In Progress", "Resolved"


class PRComplianceReportRequest(BaseModel):
    report_type: str = "Compliance Summary"
    standard: str = "All Standards"
    date_range: str = "Last 30 days"


class PRComplianceReportResponse(BaseModel):
    report_type: str
    standard: str
    date_range: str
    generated_at: str
    title: str = "Pull Request Compliance Report"
    period: str = "Sep 01, 2026 - Sep 30, 2026"
    summary_stats: PRComplianceOverviewStats
    breakdown_by_standard: List[Dict[str, Any]]


class PRComplianceEvidenceItem(BaseModel):
    id: str
    evidence_name: str
    pr_number: int
    standard: str
    type: str  # "Scan Result", "Approval", "Report", "Log", "Document"
    status: str = "Available"
    download_url: Optional[str] = None


class PRComplianceSettings(BaseModel):
    enable_compliance_checks: bool = True
    block_non_compliant_prs: bool = False
    require_evidence: bool = True
    notify_on_violations: bool = True
    default_standards: List[str] = ["SOC 2", "PCI DSS", "CIS"]


class PRComplianceFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    overview_stats: PRComplianceOverviewStats
    trend: List[PRComplianceTrendPoint]
    standards_breakdown: List[PRComplianceStandardBreakdown]
    standards: List[PRComplianceStandard]
    rules: List[PRComplianceRule]
    scan_results: List[PRComplianceScanResult]
    violations: List[PRComplianceViolation]
    evidence_list: List[PRComplianceEvidenceItem]
    settings: PRComplianceSettings


# ── PR Security Hub & Finding Details Schemas (Screens 7.1 - 7.8) ─────────────

class PRSecurityOverviewStats(BaseModel):
    total: int = 12
    critical: int = 2
    high: int = 5
    medium: int = 3
    low: int = 2


class PRScanCoverageItem(BaseModel):
    name: str
    status: str = "Completed"
    completed_at: str


class PRSecurityFindingItem(BaseModel):
    id: str
    title: str
    tool: str
    severity: str  # "Critical", "High", "Medium", "Low"
    status: str    # "Open", "In Progress", "Resolved"
    file: str
    line: Optional[int] = None


class PRFindingEvidence(BaseModel):
    raw_request: str
    formatted_request: str
    raw_response: str
    formatted_response: str
    detected_pattern: str
    confidence: str


class PRFindingFixRecommendation(BaseModel):
    recommendation_text: str
    secure_code: str
    alternative_code: Optional[str] = None
    additional_resources: List[Dict[str, str]]


class PRFindingRemediation(BaseModel):
    current_status: str = "Open"
    assigned_to: str = "@mayur.bharvad"
    due_date: str = "Oct 06, 2026"
    workflow: List[Dict[str, Any]]


class PRFindingActivityItem(BaseModel):
    id: str
    type: str  # "detected", "assigned", "comment", "status_change", "code_fix"
    title: str
    details: Optional[str] = None
    timestamp: str
    user: Optional[str] = None


class PRSecuritySuiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pr_info: Dict[str, Any]
    overview_stats: PRSecurityOverviewStats
    severity_breakdown: Dict[str, int]
    scan_coverage: List[PRScanCoverageItem]
    findings: List[PRSecurityFindingItem]
    selected_finding: Dict[str, Any]
    related_findings: Dict[str, List[PRSecurityFindingItem]]


# ── PR Settings Suite Schemas (Screens 14.1 - 14.8) ───────────────────────────

class PRGeneralSettings(BaseModel):
    title_template: str = "{{type}}: {{title}}"
    description_template: str = "## Summary\n- What changes are made?\n\n## Type of change\n- [ ] Feature\n- [ ] Bug fix\n- [ ] Refactor\n\n## Checklist\n"
    default_assignees: List[str] = []
    default_reviewers: List[str] = []
    auto_add_code_owners: bool = True
    link_related_issues: bool = True
    require_pr_template: bool = False


class PRReviewSettings(BaseModel):
    min_reviewers: int = 2
    require_code_owner_review: bool = True
    dismiss_stale_reviews: bool = False
    require_draft_approval: bool = False
    comment_resolution_required: bool = True
    review_request_behavior: str = "Allow multiple reviewers"
    default_reviewers_list: List[Dict[str, Any]] = [
        {"name": "frontend-team", "type": "Team", "required": True},
        {"name": "@mayur.bharvad", "type": "User", "required": True},
        {"name": "security-team", "type": "Team", "required": False},
    ]


class PRMergeSettings(BaseModel):
    allow_merge_commit: bool = True
    allow_squash_merge: bool = True
    allow_rebase_merge: bool = False
    require_linear_history: bool = False
    require_signed_commits: bool = True
    delete_source_branch: bool = True
    allow_auto_merge: bool = False
    require_all_checks_pass: bool = True
    default_commit_message: str = "PR title and description"


class PRBranchProtectionRule(BaseModel):
    id: str
    pattern: str
    requirements: str
    status: str = "Active"
    require_pr: bool = True
    min_reviewers: int = 2
    require_code_owner_review: bool = True
    require_status_checks: bool = True
    require_linear_history: bool = False
    restrict_push: bool = False


class PRSecurityQualityGate(BaseModel):
    check: str
    type: str  # "Security", "CI", "Quality"
    required: bool
    status: str = "Passing"  # "Passing", "Optional"


class PRNotificationEvent(BaseModel):
    event: str
    email: bool
    in_app: bool
    slack: bool
    webhook: bool


class PRNotificationSettings(BaseModel):
    events: List[PRNotificationEvent]
    recipients: List[Dict[str, str]]


class PRRolePermission(BaseModel):
    role: str
    create_pr: bool
    review: bool
    approve: bool
    merge: bool
    manage_settings: bool


class PRUserTeamAccess(BaseModel):
    name: str
    role: str
    permission_level: str  # "Full access", "Write", "Read"


class PRAccessPermissionsSettings(BaseModel):
    role_permissions: List[PRRolePermission]
    user_team_access: List[PRUserTeamAccess]


class PRAutoLabelRule(BaseModel):
    id: str
    condition: str
    label: str
    status: bool = True


class PRAutoAssignRule(BaseModel):
    id: str
    condition: str
    assignee: str
    status: bool = True


class PRAdvancedSettings(BaseModel):
    auto_label_rules: List[PRAutoLabelRule]
    auto_assign_rules: List[PRAutoAssignRule]
    enable_pr_templates: bool = True
    allow_fork_prs: bool = False
    enable_auto_close_keywords: bool = True
    enable_dependency_update_prs: bool = True
    enable_draft_prs: bool = True


class PRSettingsSuiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    general: PRGeneralSettings
    review: PRReviewSettings
    merge: PRMergeSettings
    branch_protection: List[PRBranchProtectionRule]
    security_quality_gates: List[PRSecurityQualityGate]
    notifications: PRNotificationSettings
    access_permissions: PRAccessPermissionsSettings
    advanced: PRAdvancedSettings




