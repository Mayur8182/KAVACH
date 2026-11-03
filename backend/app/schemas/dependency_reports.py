"""
Pydantic schemas for Module 14: Dependency Reports & Analytics.
Authoritative response models for:
- Analytics Overview
- Vulnerability Trends
- Upgrade & Remediation Metrics
- License Reports
- Repository Comparison
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Filter Options ──
class TimeframeOption(BaseModel):
    id: str
    label: str


class ReportFilterOptionsResponse(BaseModel):
    repositories: List[str] = Field(default_factory=list)
    branches: List[str] = Field(default_factory=list)
    timeframes: List[TimeframeOption] = Field(default_factory=list)


# ── 1. Analytics Overview Schemas ──
class OverviewMetrics(BaseModel):
    total_dependencies: int = 0
    total_dependencies_change: str = "+0%"
    vulnerable_dependencies: int = 0
    vulnerable_dependencies_change: str = "+0%"
    outdated_dependencies: int = 0
    outdated_dependencies_change: str = "+0%"
    license_violations: int = 0
    license_violations_change: str = "+0%"
    remediated_issues: int = 0
    remediated_issues_change: str = "+0%"


class RiskDistributionItem(BaseModel):
    name: str
    count: int = 0
    percentage: float = 0.0
    color: str


class VulnerabilityTrendPoint(BaseModel):
    date: str
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0


class LicenseComplianceTrendPoint(BaseModel):
    date: str
    compliant: int = 0
    warning: int = 0
    violations: int = 0


class TopVulnerableRepoItem(BaseModel):
    repository: str
    vulnerabilities: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class TopOutdatedPackageItem(BaseModel):
    package: str
    ecosystem: str
    current_version: str
    latest_version: str
    repositories: int = 1
    risk: str = "Low"
    days_outdated: int = 0


class RemediationMetricsPoint(BaseModel):
    date: str
    fixed: int = 0
    remaining: int = 0


class EcosystemDistributionItem(BaseModel):
    name: str
    count: int = 0
    percentage: float = 0.0
    color: str


class RepositorySecurityScoreItem(BaseModel):
    repository: str
    score: int = 100
    color: str = "#10B981"


class DependencyReportsOverviewResponse(BaseModel):
    metrics: OverviewMetrics
    dependency_risk_distribution: List[RiskDistributionItem] = Field(default_factory=list)
    vulnerability_trend: List[VulnerabilityTrendPoint] = Field(default_factory=list)
    license_compliance_trend: List[LicenseComplianceTrendPoint] = Field(default_factory=list)
    top_vulnerable_repositories: List[TopVulnerableRepoItem] = Field(default_factory=list)
    top_outdated_packages: List[TopOutdatedPackageItem] = Field(default_factory=list)
    remediation_metrics: List[RemediationMetricsPoint] = Field(default_factory=list)
    ecosystem_distribution: List[EcosystemDistributionItem] = Field(default_factory=list)
    repository_security_scores: List[RepositorySecurityScoreItem] = Field(default_factory=list)


# ── 2. Vulnerability Trends Schemas ──
class VulnerabilitySummaryMetrics(BaseModel):
    total_active: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    avg_mttr_days: float = 0.0
    fix_rate_pct: float = 0.0


class EcosystemExposureItem(BaseModel):
    ecosystem: str
    count: int = 0
    critical: int = 0
    high: int = 0
    percentage: float = 0.0


class TopCveItem(BaseModel):
    cve_id: str
    title: str
    severity: str
    package_name: str
    repository: str
    status: str
    detected_at: str


class AgeDistribution(BaseModel):
    less_than_7d: int = 0
    d7_to_30: int = 0
    d30_to_90: int = 0
    over_90d: int = 0


class VulnerabilityTrendsReportResponse(BaseModel):
    summary: VulnerabilitySummaryMetrics
    trend_history: List[VulnerabilityTrendPoint] = Field(default_factory=list)
    ecosystem_exposure: List[EcosystemExposureItem] = Field(default_factory=list)
    top_cves: List[TopCveItem] = Field(default_factory=list)
    age_distribution: AgeDistribution


# ── 3. Upgrade & Remediation Metrics Schemas ──
class RemediationSummaryMetrics(BaseModel):
    open_items: int = 0
    in_progress: int = 0
    fixed_count: int = 0
    automated_prs: int = 0
    sla_compliance_pct: float = 100.0


class RemediationVelocityPoint(BaseModel):
    date: str
    opened: int = 0
    resolved: int = 0
    verified: int = 0


class UpgradeTypeDistribution(BaseModel):
    major_breaking: int = 0
    minor: int = 0
    patch: int = 0


class RemediationPrTrackerItem(BaseModel):
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    repository: str
    package: str
    from_version: str
    to_version: str
    status: str
    verification_status: str
    created_at: str


class SeverityRemediationBreakdown(BaseModel):
    severity: str
    open_count: int = 0
    fixed_count: int = 0
    fix_rate_pct: float = 0.0


class RemediationMetricsReportResponse(BaseModel):
    summary: RemediationSummaryMetrics
    velocity_trend: List[RemediationVelocityPoint] = Field(default_factory=list)
    upgrade_types: UpgradeTypeDistribution
    pr_tracker: List[RemediationPrTrackerItem] = Field(default_factory=list)
    by_severity: List[SeverityRemediationBreakdown] = Field(default_factory=list)


# ── 4. License Reports Schemas ──
class LicenseSummaryMetrics(BaseModel):
    total_licenses: int = 0
    permissive_count: int = 0
    copyleft_count: int = 0
    violations_count: int = 0
    pending_exceptions: int = 0


class LicenseDistributionItem(BaseModel):
    license_name: str
    count: int = 0
    percentage: float = 0.0
    risk_level: str = "Low"


class LicenseRiskBreakdownItem(BaseModel):
    risk_level: str
    count: int = 0
    percentage: float = 0.0
    color: str


class RestrictedLicensePackageItem(BaseModel):
    package: str
    version: str
    license_name: str
    repository: str
    compliance_status: str
    risk_level: str
    action_recommended: str = "Review"


class LicenseReportsResponse(BaseModel):
    summary: LicenseSummaryMetrics
    licenses_distribution: List[LicenseDistributionItem] = Field(default_factory=list)
    risk_breakdown: List[LicenseRiskBreakdownItem] = Field(default_factory=list)
    restricted_packages: List[RestrictedLicensePackageItem] = Field(default_factory=list)


# ── 5. Repository Comparison Schemas ──
class RepositoryComparisonSummary(BaseModel):
    total_repositories: int = 0
    most_secure_repo: Optional[str] = None
    highest_risk_repo: Optional[str] = None
    fleet_average_score: int = 100


class RepositoryComparisonRow(BaseModel):
    repository: str
    default_branch: str = "main"
    security_score: int = 100
    score_color: str = "#10B981"
    total_dependencies: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total_vulnerabilities: int = 0
    outdated_count: int = 0
    license_violations: int = 0
    remediation_rate: float = 100.0
    last_scanned: Optional[str] = None


class RepositoryComparisonResponse(BaseModel):
    summary: RepositoryComparisonSummary
    repositories: List[RepositoryComparisonRow] = Field(default_factory=list)
