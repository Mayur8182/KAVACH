"""
Thing Code — Dependencies Schemas
Pydantic contracts for the 5 Dependencies subpages:
  1. /code/dependencies (Overview Dashboard)
  2. /code/dependencies/trends (Dependency Risk Trends)
  3. /code/dependencies/critical (Critical Dependencies)
  4. /code/dependencies/outdated (Outdated Packages)
  5. /code/dependencies/coverage (Repository Coverage)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DependenciesMetrics(BaseModel):
    total_dependencies: int = 0
    vulnerable_dependencies: int = 0
    critical_dependencies: int = 0
    outdated_packages: int = 0
    ecosystems_count: int = 0
    repositories_scanned: int = 0
    repositories_total: int = 0


class DependencyRiskTrendPoint(BaseModel):
    date: str
    total: int = 0
    vulnerable: int = 0
    critical: int = 0
    clean: int = 0


class TopRiskyDependencyItem(BaseModel):
    id: str
    name: str
    version: str
    ecosystem: str
    severity: str
    vulnerability_count: int = 1
    vulnerabilities: List[str] = []
    repository: Optional[str] = None
    repository_id: Optional[str] = None
    fix_version: Optional[str] = None
    cve_id: Optional[str] = None
    summary: Optional[str] = None


class EcosystemDistributionItem(BaseModel):
    ecosystem: str
    count: int = 0
    percentage: float = 0.0
    vulnerable_count: int = 0
    color: str = "#3B82F6"


class RepositoryCoverageItem(BaseModel):
    repository_id: str
    repository_name: str
    primary_language: Optional[str] = None
    dependencies_count: int = 0
    vulnerable_count: int = 0
    critical_count: int = 0
    outdated_count: int = 0
    coverage_pct: float = 0.0
    status: str = "NOT_SCANNED"  # HEALTHY | VULNERABLE | NOT_SCANNED
    last_scanned_at: Optional[datetime] = None
    manifest_files: List[str] = []


class DependenciesOverviewResponse(BaseModel):
    generated_at: datetime
    project_id: Optional[str] = None
    metrics: DependenciesMetrics
    risk_trends: List[DependencyRiskTrendPoint]
    top_risky_dependencies: List[TopRiskyDependencyItem]
    ecosystem_distribution: List[EcosystemDistributionItem]
    repository_coverage: List[RepositoryCoverageItem]


class DependencyTrendsResponse(BaseModel):
    time_range: str
    mttr_days: float = 0.0
    total_vulnerabilities_trend: float = 0.0
    trends: List[DependencyRiskTrendPoint]
    new_vs_resolved: List[Dict[str, Any]] = []
    severity_timeline: List[Dict[str, Any]] = []
    scan_history: List[Dict[str, Any]] = []


class CriticalDependencyItem(BaseModel):
    id: str
    package_name: str
    installed_version: str
    fixed_version: Optional[str] = None
    vulnerability_id: str
    title: str
    description: str
    severity: str  # CRITICAL | HIGH
    cvss_score: Optional[float] = None
    ecosystem: str
    file_path: Optional[str] = None
    repository: Optional[str] = None
    repository_id: Optional[str] = None
    detected_at: Optional[datetime] = None
    has_autofix: bool = False


class CriticalDependenciesResponse(BaseModel):
    items: List[CriticalDependencyItem]
    total: int = 0
    critical_count: int = 0
    high_count: int = 0


class OutdatedPackageItem(BaseModel):
    id: str
    package_name: str
    current_version: str
    latest_version: str
    drift_type: str  # MAJOR | MINOR | PATCH
    upgrade_risk: str  # HIGH | MEDIUM | LOW
    ecosystem: str
    repository_name: Optional[str] = None
    repository_id: Optional[str] = None
    file_path: Optional[str] = None
    recommended_version: Optional[str] = None


class OutdatedPackagesResponse(BaseModel):
    items: List[OutdatedPackageItem]
    total: int = 0
    major_drift_count: int = 0
    minor_drift_count: int = 0
    patch_drift_count: int = 0


class DependencyCoveragePageResponse(BaseModel):
    repositories: List[RepositoryCoverageItem]
    total_repositories: int = 0
    covered_repositories: int = 0
    coverage_percentage: float = 0.0
    total_dependencies_monitored: int = 0
    average_dependencies_per_repo: float = 0.0


class TriggerDependencyScanRequest(BaseModel):
    repository_id: str
    branch: Optional[str] = "main"


class TriggerDependencyScanResponse(BaseModel):
    job_id: str
    status: str
    message: str


# =========================================================================
# DEPENDENCY INVENTORY SCHEMAS (SCREENSHOT 02)
# =========================================================================

class DependencyInventoryMetrics(BaseModel):
    total_dependencies: int = 0
    direct_dependencies: int = 0
    transitive_dependencies: int = 0
    vulnerable_dependencies: int = 0
    licenses_count: int = 0
    duplicate_packages_count: int = 0


class DependencyUsageRef(BaseModel):
    file_path: str
    line_number: int = 1
    reference_type: str = "import"  # import | require | manifest | link
    code_snippet: Optional[str] = None
    repository_name: Optional[str] = None


class DependencyInventoryItem(BaseModel):
    id: str
    name: str
    version: str
    ecosystem: str  # npm | pypi | maven | go | cargo
    is_direct: bool = True  # Direct vs Transitive
    license: str = "Unknown"
    security_status: str = "SAFE"  # SAFE | VULNERABLE | CRITICAL
    vulnerability_count: int = 0
    vulnerabilities: List[str] = []
    highest_severity: Optional[str] = None
    repository_id: Optional[str] = None
    repository_name: Optional[str] = None
    manifest_path: Optional[str] = None
    introduced_by: Optional[str] = None
    usage_count: int = 0
    last_updated_at: Optional[datetime] = None


class DependencyDetailResponse(BaseModel):
    id: str
    name: str
    version: str
    latest_version: Optional[str] = None
    ecosystem: str
    is_direct: bool = True
    license: str = "Unknown"
    license_risk: str = "LOW"  # LOW | MEDIUM | HIGH
    security_status: str = "SAFE"
    vulnerability_count: int = 0
    vulnerabilities: List[Dict[str, Any]] = []
    repository_id: Optional[str] = None
    repository_name: Optional[str] = None
    manifest_path: Optional[str] = None
    introduced_by: Optional[str] = None
    description: Optional[str] = None
    homepage: Optional[str] = None
    repository_url: Optional[str] = None
    usage_references: List[DependencyUsageRef] = []
    transitive_dependents: List[str] = []
    last_scanned_at: Optional[datetime] = None


class DependencyInventoryResponse(BaseModel):
    metrics: DependencyInventoryMetrics
    items: List[DependencyInventoryItem]
    total: int = 0
    page: int = 1
    page_size: int = 50
    selected_dependency: Optional[DependencyDetailResponse] = None


class DuplicatePackageItem(BaseModel):
    id: str
    name: str
    ecosystem: str
    installed_versions: List[str] = []
    version_count: int = 0
    repositories_affected: List[str] = []
    risk_level: str = "MEDIUM"  # HIGH | MEDIUM | LOW
    remediation_suggestion: str
    manifest_files: List[str] = []


class DuplicatePackagesResponse(BaseModel):
    items: List[DuplicatePackageItem]
    total_duplicates: int = 0
    affected_repositories_count: int = 0
    potential_risk_summary: str = "Conflicting package versions detected across repository manifests."


class DependencyUsageResponse(BaseModel):
    package_name: str
    total_references: int = 0
    references: List[DependencyUsageRef] = []


# =========================================================================
# VULNERABILITY ANALYSIS SCHEMAS (SCREENSHOT 03 & 6 SUBPAGES)
# =========================================================================

class VulnerabilityAnalysisMetrics(BaseModel):
    critical_high_count: int = 0
    actionable_vulnerabilities: int = 0
    fix_available_count: int = 0
    known_exploited_count: int = 0
    total_vulnerabilities: int = 0
    affected_packages_count: int = 0


class VulnerabilityItem(BaseModel):
    id: str
    cve_id: str
    title: str
    description: str
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW
    cvss_score: float = 7.5
    ecosystem: str  # npm | pypi | cargo | go | maven
    package_name: str
    affected_version: str
    installed_version: str
    fixed_version: Optional[str] = None
    has_fix: bool = True
    is_known_exploited: bool = False
    cisa_kev_due_date: Optional[str] = None
    published_date: Optional[str] = None
    last_updated: Optional[str] = None
    repository_name: str = "workspace"
    manifest_path: str = "package.json"
    scanner: str = "OSV-Scanner"


class VulnerabilityDetailResponse(BaseModel):
    id: str
    cve_id: str
    title: str
    description: str
    severity: str
    cvss_score: float = 7.5
    vector_string: Optional[str] = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    epss_score: Optional[float] = 0.042
    epss_percentile: Optional[float] = 89.2
    ecosystem: str
    package_name: str
    affected_version: str
    installed_version: str
    fixed_version: Optional[str] = None
    has_fix: bool = True
    is_known_exploited: bool = False
    cisa_kev_due_date: Optional[str] = None
    exploit_available: bool = False
    published_date: Optional[str] = None
    last_updated: Optional[str] = None
    repository_name: str = "workspace"
    manifest_path: str = "package.json"
    scanner: str = "OSV-Scanner"
    patch_guidance: Optional[str] = None
    references: List[str] = []
    affected_packages: List[Dict[str, Any]] = []


class VulnerabilityAnalysisResponse(BaseModel):
    metrics: VulnerabilityAnalysisMetrics
    items: List[VulnerabilityItem]
    total: int = 0
    page: int = 1
    page_size: int = 50
    severity_distribution: Dict[str, int] = {}
    timeline_trends: List[Dict[str, Any]] = []
    affected_packages_summary: List[Dict[str, Any]] = []
    selected_vulnerability: Optional[VulnerabilityDetailResponse] = None


class AffectedPackageItem(BaseModel):
    id: str
    package_name: str
    ecosystem: str
    vulnerability_count: int
    highest_severity: str
    cve_ids: List[str]
    installed_version: str
    fixed_version: Optional[str] = None
    repositories: List[str]
    manifest_files: List[str]


class AffectedPackagesResponse(BaseModel):
    items: List[AffectedPackageItem]
    total: int = 0
    total_packages_affected: int = 0
    critical_packages_count: int = 0


class KnownExploitedResponse(BaseModel):
    items: List[VulnerabilityItem]
    total: int = 0
    cisa_kev_catalog_version: str = "CISA-KEV-2026.1"


# =========================================================================
# PACKAGE VERSIONS & UPGRADES SCHEMAS (SCREENSHOT 04 & 5 SUBPAGES)
# =========================================================================

class PackageVersionsMetrics(BaseModel):
    total_packages: int = 0
    outdated_count: int = 0
    vulnerable_packages_count: int = 0
    eol_count: int = 0


class PackageVersionItem(BaseModel):
    id: str
    name: str
    current_version: str
    latest_version: str
    version_status: str  # "CURRENT" | "MINOR_DRIFT" | "MAJOR_DRIFT" | "EOL"
    ecosystem: str  # "npm" | "pypi" | "maven" | "cargo" | "go"
    license: str = "MIT"
    security_status: str = "SAFE"  # "SAFE" | "VULNERABLE" | "CRITICAL"
    repository_count: int = 1
    repository_name: str = "workspace"
    is_direct: bool = True
    breaking_changes_risk: str = "NONE"  # "NONE" | "LOW" | "MEDIUM" | "HIGH"
    recommended_version: str = ""
    manifest_path: str = "package.json"
    last_updated_at: Optional[datetime] = None
    description: Optional[str] = None


class PackageVersionsResponse(BaseModel):
    metrics: PackageVersionsMetrics
    items: List[PackageVersionItem] = []
    total: int = 0
    page: int = 1
    page_size: int = 50
    status_distribution: Dict[str, int] = {}
    upgrade_opportunities: List[Dict[str, Any]] = []
    ecosystems_distribution: List[Dict[str, Any]] = []
    selected_package: Optional[PackageVersionItem] = None


class BreakingChangeItem(BaseModel):
    id: str
    package_name: str
    ecosystem: str
    current_version: str
    target_version: str
    risk_level: str  # "HIGH" | "MEDIUM" | "LOW"
    breaking_changes_count: int = 0
    migration_guide_url: Optional[str] = None
    affected_files_count: int = 0
    breaking_apis: List[str] = []
    remediation_notes: str = ""


class BreakingChangesResponse(BaseModel):
    items: List[BreakingChangeItem] = []
    total: int = 0
    high_risk_count: int = 0


class EolPackageItem(BaseModel):
    id: str
    package_name: str
    installed_version: str
    ecosystem: str
    eol_date: Optional[str] = None
    days_past_eol: int = 0
    replacement_package: Optional[str] = None
    recommended_action: str = ""
    support_status: str = "ACTIVE"  # "ACTIVE" | "MAINTENANCE" | "EOL"


class EolPackagesResponse(BaseModel):
    items: List[EolPackageItem] = []
    total: int = 0
    critical_eol_count: int = 0


# =========================================================================
# PACKAGE ECOSYSTEMS (SCREENSHOT 05 & 6 SUBPAGES / ROUTE PATTERNS)
# =========================================================================

class EcosystemCardMetric(BaseModel):
    id: str  # "npm", "python", "java", "go", "other"
    name: str  # "npm & pnpm", "Python & pip", "Maven & Gradle", "Go Modules", "Cargo & NuGet"
    slug: str  # "npm", "python", "java", "go", "other"
    href: str  # "/code/dependencies/ecosystems/npm"
    total_packages: int = 0
    vulnerable_packages: int = 0
    outdated_packages: int = 0
    health_score: int = 100  # 0-100%
    primary_language: str = ""
    icon_type: str = "npm"
    package_managers: List[str] = []


class EcosystemDistributionSlice(BaseModel):
    ecosystem: str
    label: str
    count: int = 0
    percentage: float = 0.0
    color: str = "#3B82F6"


class EcosystemTopRiskyPackage(BaseModel):
    id: str
    name: str
    version: str
    ecosystem: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    cve_id: Optional[str] = None
    vulnerability_title: Optional[str] = None
    repository_name: Optional[str] = None


class EcosystemHealthItem(BaseModel):
    id: str
    name: str
    slug: str
    href: str
    health_score: int = 100
    status_label: str = "Good"  # "Good", "Needs Review", "Critical"
    color: str = "#10B981"
    package_count: int = 0
    vulnerability_count: int = 0


class EcosystemActivityItem(BaseModel):
    id: str
    title: str
    description: str
    ecosystem: str
    severity: str = "INFO"  # "INFO", "WARNING", "CRITICAL", "SUCCESS"
    dot_color: str = "#10B981"
    timestamp: str = "Just now"


class EcosystemVulnerabilityTrendPoint(BaseModel):
    date: str
    npm: int = 0
    python: int = 0
    java: int = 0
    go: int = 0
    other: int = 0


class EcosystemVersionBar(BaseModel):
    label: str
    ecosystem: str
    current_count: int = 0
    minor_count: int = 0
    major_count: int = 0
    color: str = "#3B82F6"


class EcosystemsOverviewResponse(BaseModel):
    ecosystem_cards: List[EcosystemCardMetric] = []
    distribution: List[EcosystemDistributionSlice] = []
    total_packages: int = 0
    top_risky_packages: List[EcosystemTopRiskyPackage] = []
    ecosystem_health: List[EcosystemHealthItem] = []
    recent_activity: List[EcosystemActivityItem] = []
    vulnerability_trends: List[EcosystemVulnerabilityTrendPoint] = []
    ecosystem_versions: List[EcosystemVersionBar] = []


class EcosystemDetailResponse(BaseModel):
    ecosystem: str
    name: str
    slug: str
    primary_language: str
    manifest_types: List[str] = []
    metrics: Dict[str, Any] = {}
    items: List[DependencyInventoryItem] = []
    total: int = 0
    risky_packages: List[EcosystemTopRiskyPackage] = []
    health_score: int = 100


# =========================================================================
# DEPENDENCY GRAPH (SCREENSHOT 06 & 5 SUBPAGES / ROUTE PATTERNS)
# =========================================================================

class DependencyGraphNode(BaseModel):
    id: str
    name: str
    version: str
    ecosystem: str
    is_direct: bool = True
    risk_level: str = "Low"  # "Critical", "High", "Medium", "Low", "Safe"
    vulnerability_count: int = 0
    depth: int = 0
    license: str = "MIT"
    repository_name: Optional[str] = "root"
    first_seen: str = "2026-08-14"
    last_updated: str = "2 hours ago"
    x: float = 0.0
    y: float = 0.0


class DependencyGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship_type: str = "direct"  # "direct", "transitive", "peer", "dev"
    is_risk_path: bool = False
    severity: Optional[str] = None


class DependencyGraphMetrics(BaseModel):
    total_packages: int = 0
    direct_dependencies: int = 0
    transitive_dependencies: int = 0
    vulnerable_packages: int = 0
    max_depth: int = 1
    total_edges: int = 0
    clean_packages: int = 0


class DependencyTypeSlice(BaseModel):
    type: str
    count: int = 0
    percentage: float = 0.0
    color: str = "#3B82F6"


class RiskDistributionBar(BaseModel):
    depth_label: str  # "Direct", "Depth 1", "Depth 2", "Depth 3", "Depth 4+"
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class TopDependencyItem(BaseModel):
    id: str
    name: str
    version: str
    dependents_count: int = 0
    risk_level: str = "Safe"
    ecosystem: str = "npm"


class DependencyGraphResponse(BaseModel):
    nodes: List[DependencyGraphNode] = []
    edges: List[DependencyGraphEdge] = []
    metrics: DependencyGraphMetrics
    dependency_types: List[DependencyTypeSlice] = []
    risk_distribution: List[RiskDistributionBar] = []
    top_dependencies: List[TopDependencyItem] = []
    selected_package: Optional[DependencyGraphNode] = None


class PackageRelationshipItem(BaseModel):
    id: str
    source_package: str
    source_version: str
    target_package: str
    target_version: str
    relationship_type: str = "direct"  # "direct", "transitive", "peer", "dev"
    depth: int = 1
    ecosystem: str = "npm"
    has_vulnerability: bool = False
    severity: Optional[str] = None


class PackageRelationshipsResponse(BaseModel):
    relationships: List[PackageRelationshipItem] = []
    total: int = 0
    direct_count: int = 0
    transitive_count: int = 0


class TransitiveRiskPath(BaseModel):
    id: str
    vulnerability_id: str
    severity: str = "CRITICAL"  # "CRITICAL", "HIGH", "MEDIUM"
    title: str
    cve_id: str
    path_nodes: List[str] = []
    direct_parent: str
    vulnerable_package: str
    depth: int = 2
    fix_suggestion: str = ""


class TransitiveRiskPathsResponse(BaseModel):
    risk_paths: List[TransitiveRiskPath] = []
    total: int = 0
    critical_paths_count: int = 0


class BlastRadiusReport(BaseModel):
    package_id: str
    package_name: str
    version: str
    ecosystem: str
    blast_radius_tier: str = "Moderate"  # "Severe", "High", "Moderate", "Isolated"
    affected_repos_count: int = 1
    affected_services_count: int = 1
    downstream_packages_count: int = 0
    downstream_packages: List[str] = []
    risk_score: int = 50
    containment_advice: str = ""


class BlastRadiusResponse(BaseModel):
    reports: List[BlastRadiusReport] = []
    total: int = 0
    high_blast_count: int = 0


class UpgradeImpactItem(BaseModel):
    package_id: str
    package_name: str
    current_version: str
    target_version: str
    upgrade_type: str = "MINOR"  # "PATCH", "MINOR", "MAJOR"
    breaking_risk: str = "LOW"   # "CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"
    conflicts_count: int = 0
    affected_downstream_count: int = 0
    safe_to_upgrade: bool = True
    notes: str = ""


class UpgradeImpactResponse(BaseModel):
    items: List[UpgradeImpactItem] = []
    total: int = 0
    safe_count: int = 0
    breaking_count: int = 0


# =========================================================================
# LICENSE COMPLIANCE SCHEMAS (SCREENSHOT 07 & 5 SUBPAGES)
# =========================================================================

class LicenseMetrics(BaseModel):
    total_licenses: int = 0
    license_violations: int = 0
    copyleft_restricted: int = 0
    compliant_packages: int = 0


class LicenseDistributionSlice(BaseModel):
    license_name: str
    count: int = 0
    percentage: float = 0.0
    color: str = "#3B82F6"


class LicenseRiskBar(BaseModel):
    category: str  # "Prohibited", "Restricted", "Conditional", "Permissive", "Unknown"
    count: int = 0
    percentage: float = 0.0
    color: str = "#EF4444"


class ComplianceStatusSlice(BaseModel):
    status: str  # "Compliant", "Violates Policy", "Review Required", "Exempt"
    count: int = 0
    percentage: float = 0.0
    color: str = "#10B981"


class LicenseInventoryItem(BaseModel):
    id: str
    package_name: str
    package_version: str
    license_name: str
    license_type: str = "Permissive"  # "Permissive", "Copyleft", "Weak Copyleft", "Proprietary", "Unknown"
    compliance_status: str = "Compliant"  # "Compliant", "Prohibited", "Restricted", "Exempt", "Unknown"
    risk_level: str = "Low"  # "Low", "Medium", "High", "Critical"
    usage_type: str = "Direct"  # "Direct", "Transitive"
    used_in_files_count: int = 1
    used_in_paths: List[str] = []
    repository_name: str = "frontend-app"
    ecosystem: str = "npm"
    package_url: Optional[str] = None
    license_text: Optional[str] = None
    last_scanned_at: Optional[str] = None


class TopLicenseItem(BaseModel):
    license_name: str
    package_count: int = 0
    percentage: float = 0.0
    license_type: str = "Permissive"


class LicenseTrendPoint(BaseModel):
    date: str
    compliant: int = 0
    restricted: int = 0
    prohibited: int = 0
    unknown: int = 0


class LicenseOverviewResponse(BaseModel):
    metrics: LicenseMetrics
    distribution: List[LicenseDistributionSlice] = []
    risk_overview: List[LicenseRiskBar] = []
    compliance_status: List[ComplianceStatusSlice] = []
    recent_inventory: List[LicenseInventoryItem] = []
    top_licenses: List[TopLicenseItem] = []
    trends: List[LicenseTrendPoint] = []


class LicenseInventoryResponse(BaseModel):
    items: List[LicenseInventoryItem] = []
    total: int = 0
    page: int = 1
    page_size: int = 50
    filters_available: Dict[str, List[str]] = {}


class LicenseViolationItem(BaseModel):
    id: str
    package_name: str
    package_version: str
    license_name: str
    license_type: str
    severity: str = "HIGH"  # "CRITICAL", "HIGH", "MEDIUM"
    violation_reason: str
    policy_rule: str
    usage_path: str
    is_direct: bool = True
    parent_package: Optional[str] = None
    remediation_options: List[str] = []
    detected_at: str


class LicenseViolationsResponse(BaseModel):
    violations: List[LicenseViolationItem] = []
    total: int = 0
    high_severity_count: int = 0


class RestrictedLicenseItem(BaseModel):
    id: str
    package_name: str
    package_version: str
    license_name: str
    license_type: str  # "Weak Copyleft", "Conditional"
    compliance_status: str
    linking_requirement: str  # "Dynamic Linking Only", "Source Code Disclosure on Modification"
    file_locations: List[str] = []
    approval_status: str = "Conditionally Allowed"
    guidance: str


class RestrictedLicensesResponse(BaseModel):
    restricted_packages: List[RestrictedLicenseItem] = []
    total: int = 0
    requires_action_count: int = 0


class LicenseExceptionItem(BaseModel):
    id: str
    package_name: str
    package_version: str
    license_name: str
    status: str = "APPROVED"  # "APPROVED", "PENDING_REVIEW", "REJECTED", "EXPIRED"
    reason: str
    conditions: Optional[str] = None
    requested_by: str = "Security Engineer"
    approved_by: Optional[str] = None
    created_at: str
    expires_at: Optional[str] = None


class LicenseExceptionsResponse(BaseModel):
    exceptions: List[LicenseExceptionItem] = []
    total: int = 0
    pending_count: int = 0
    approved_count: int = 0


class CreateLicenseExceptionRequest(BaseModel):
    package_name: str
    package_version: str
    license_name: str
    reason: str
    conditions: Optional[str] = None
    requested_by: Optional[str] = "Security Engineer"


# =========================================================================
# PACKAGE HEALTH & MAINTENANCE SCHEMAS (SCREENSHOT 08 & 5 SUBPAGES)
# =========================================================================

class PackageHealthMetrics(BaseModel):
    healthy_packages: int = 0
    actively_maintained: int = 0
    low_activity: int = 0
    abandoned_packages: int = 0


class HealthDistributionSlice(BaseModel):
    label: str  # "Healthy", "Moderate", "Poor", "Critical"
    count: int = 0
    percentage: float = 0.0
    color: str = "#10B981"


class MaintenanceActivityBar(BaseModel):
    month: str  # "May", "Jun", "Jul", "Aug", "Sep", "Oct"
    commits: int = 0
    releases: int = 0
    activity_score: int = 0


class PackageStatusSlice(BaseModel):
    status: str  # "Active", "Low Activity", "Stale", "Abandoned"
    count: int = 0
    percentage: float = 0.0
    color: str = "#3B82F6"


class PackageHealthInventoryItem(BaseModel):
    id: str
    package_name: str
    version: str
    ecosystem: str = "npm"
    health_status: str = "Healthy"  # "Healthy", "Moderate", "Poor", "Critical"
    health_score: int = 85
    last_release_date: Optional[str] = None
    last_release_relative: str = "2 weeks ago"
    github_activity: List[int] = [3, 5, 8, 12, 10, 15, 14, 18]
    maintenance_status: str = "Active"  # "Active", "Low Activity", "Stale", "Abandoned"
    trust_score: int = 90
    repository_name: str = "web-api"
    open_issues_count: int = 12
    stars_count: int = 14500
    commit_frequency_monthly: float = 12.5
    is_deprecated: bool = False
    deprecation_reason: Optional[str] = None
    replacement_package: Optional[str] = None


class TopPackageHealthRiskItem(BaseModel):
    package_name: str
    risk_score: int
    health_status: str
    ecosystem: str
    color: str = "#EF4444"


class RecentMaintenanceEventItem(BaseModel):
    id: str
    package_name: str
    title: str
    description: str
    event_type: str = "RELEASE"
    dot_color: str = "#10B981"
    timestamp: str


class PackageHealthOverviewResponse(BaseModel):
    metrics: PackageHealthMetrics
    distribution: List[HealthDistributionSlice] = []
    maintenance_activity: List[MaintenanceActivityBar] = []
    status_overview: List[PackageStatusSlice] = []
    recent_inventory: List[PackageHealthInventoryItem] = []
    top_health_risks: List[TopPackageHealthRiskItem] = []
    recent_events: List[RecentMaintenanceEventItem] = []


class MaintenanceReleaseActivityResponse(BaseModel):
    items: List[PackageHealthInventoryItem] = []
    total: int = 0
    high_activity_count: int = 0
    monthly_activity: List[MaintenanceActivityBar] = []


class AbandonedPackagesResponse(BaseModel):
    abandoned_packages: List[PackageHealthInventoryItem] = []
    total: int = 0
    critical_abandoned_count: int = 0


class ReleaseVersionHistoryItem(BaseModel):
    version: str
    release_date: str
    relative_date: str
    is_latest: bool = False
    is_breaking: bool = False
    changelog_summary: str
    vulnerabilities_fixed: List[str] = []


class ReleaseVersionHistoryResponse(BaseModel):
    package_name: str
    current_version: str
    latest_version: str
    ecosystem: str
    total_releases: int = 0
    releases: List[ReleaseVersionHistoryItem] = []


class PackageTrustDetailResponse(BaseModel):
    package: PackageHealthInventoryItem
    trust_breakdown: Dict[str, int] = {}
    releases: List[ReleaseVersionHistoryItem] = []
    advisories: List[Dict[str, Any]] = []
    recommended_action: str
    replacement_package: Optional[str] = None


# =========================================================================
# 09 DEPENDENCY REMEDIATION SCHEMAS (SCREENSHOT 09 & 5 SUBPAGES)
# =========================================================================

class RemediationMetrics(BaseModel):
    items_to_fix: int = 0
    in_progress: int = 0
    fixed: int = 0
    pending_verification: int = 0


class RemediationStatusSlice(BaseModel):
    status: str
    count: int
    percentage: float
    color: str


class RiskReductionTrendPoint(BaseModel):
    date: str
    risk_score: int
    open_items: int


class RemediationQueueItem(BaseModel):
    id: str
    package_name: str
    current_version: str
    fixed_version: str
    ecosystem: str = "npm"
    dependency_type: str = "DIRECT"  # DIRECT, TRANSITIVE
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    status: str = "OPEN"  # OPEN, IN_PROGRESS, FIXED, PENDING_VERIFICATION, IGNORED
    repository_name: str = "web-api"
    branch: str = "main"
    cve_id: Optional[str] = None
    title: str = "Security Vulnerability"
    category: str = "Vulnerability"
    first_seen: str = "2 days ago"
    last_seen: str = "1 hour ago"
    manifest_path: str = "package.json"
    lockfile_path: Optional[str] = "package-lock.json"
    manifest_diff: Optional[str] = None
    lockfile_diff: Optional[str] = None
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    pr_branch: Optional[str] = None
    verification_status: str = "NOT_STARTED"
    breaking_change: bool = False
    breaking_change_notes: Optional[str] = None
    remediation_step: int = 1  # 1: Review Issue, 2: Apply Fix, 3: Create PR, 4: Verify Fix


class TopRemediationCategoryItem(BaseModel):
    category: str
    count: int
    percentage: float
    color: str


class RemediationEcosystemSlice(BaseModel):
    ecosystem: str
    count: int
    percentage: float
    color: str


class RemediationRecentActivityItem(BaseModel):
    id: str
    package_name: str
    action_type: str
    title: str
    description: str
    dot_color: str
    timestamp: str


class DependencyRemediationOverviewResponse(BaseModel):
    metrics: RemediationMetrics
    status_distribution: List[RemediationStatusSlice] = []
    risk_trend: List[RiskReductionTrendPoint] = []
    queue_items: List[RemediationQueueItem] = []
    top_categories: List[TopRemediationCategoryItem] = []
    ecosystem_distribution: List[RemediationEcosystemSlice] = []
    recent_activity: List[RemediationRecentActivityItem] = []
    selected_item: Optional[RemediationQueueItem] = None


class UpgradeRecommendationsResponse(BaseModel):
    recommendations: List[RemediationQueueItem] = []
    total: int = 0
    safe_upgrades_count: int = 0
    breaking_upgrades_count: int = 0


class ManifestLockfileDiffResponse(BaseModel):
    remediation_id: str
    package_name: str
    current_version: str
    target_version: str
    manifest_path: str
    manifest_diff: str
    lockfile_path: Optional[str] = None
    lockfile_diff: Optional[str] = None


class CreateFixPullRequestRequest(BaseModel):
    remediation_id: str
    target_branch: Optional[str] = "main"
    title: Optional[str] = None
    body: Optional[str] = None


class CreateFixPullRequestResponse(BaseModel):
    pr_number: int
    pr_url: str
    pr_branch: str
    status: str
    message: str


class TriggerRemediationVerificationRequest(BaseModel):
    remediation_id: str


class RemediationVerificationResponse(BaseModel):
    verification_id: str
    remediation_id: str
    status: str  # QUEUED, RUNNING, PASSED, FAILED
    scanner: str  # "Semgrep / Trivy"
    scanned_at: str
    findings_resolved: int = 1
    remaining_findings: int = 0
    log: str


class UpdateRemediationStatusRequest(BaseModel):
    status: str  # OPEN, IN_PROGRESS, FIXED, PENDING_VERIFICATION, IGNORED
    reason: Optional[str] = None


# =========================================================================
# 10 SBOM & COMPONENT MAPPING (SCREENSHOT 10 & 5 SUBPAGES / ROUTE PATTERNS)
# =========================================================================

class SBOMMetrics(BaseModel):
    total_components: int = 0
    direct_dependencies: int = 0
    transitive_dependencies: int = 0
    components_with_issues: int = 0


class SBOMComponentTypeSlice(BaseModel):
    component_type: str
    count: int
    percentage: float
    color: str


class SBOMComponentsByEcosystem(BaseModel):
    ecosystem: str
    count: int
    percentage: float
    color: str


class SBOMRelationshipNode(BaseModel):
    id: str
    name: str
    type: str  # "root" | "direct" | "transitive"
    ecosystem: str
    status: str  # "healthy" | "warning" | "critical"


class SBOMRelationshipEdge(BaseModel):
    source: str
    target: str


class SBOMRelationshipMap(BaseModel):
    nodes: List[SBOMRelationshipNode] = []
    edges: List[SBOMRelationshipEdge] = []


class SBOMComponentRow(BaseModel):
    id: str
    component_name: str
    version: str
    component_type: str
    ecosystem: str
    license_name: str
    repository_name: str
    dependency_type: str  # "DIRECT" | "TRANSITIVE"
    issues: str  # "CRITICAL" | "HIGH" | "CLEAN" | "MEDIUM"
    purl: Optional[str] = None
    cpe: Optional[str] = None
    first_seen: Optional[str] = None


class RecentSBOMScanItem(BaseModel):
    id: str
    repository_name: str
    branch: str
    scan_type: str
    components_count: int
    status: str  # "COMPLETED" | "RUNNING" | "FAILED"
    started_at: str


class TopComponentUsageItem(BaseModel):
    name: str
    ecosystem: str
    repository_count: int
    percentage: float


class SBOMOverviewResponse(BaseModel):
    metrics: SBOMMetrics
    type_distribution: List[SBOMComponentTypeSlice] = []
    ecosystem_distribution: List[SBOMComponentsByEcosystem] = []
    relationship_map: SBOMRelationshipMap = SBOMRelationshipMap()
    components: List[SBOMComponentRow] = []
    total_components: int = 0
    recent_scans: List[RecentSBOMScanItem] = []
    top_usage: List[TopComponentUsageItem] = []


class SBOMComponentDetailResponse(BaseModel):
    id: str
    component_name: str
    version: str
    component_type: str
    ecosystem: str
    license_name: str
    repository_name: str
    dependency_type: str
    issues: str
    purl: Optional[str] = None
    cpe: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    dependencies: List[str] = []
    dependents: List[str] = []
    vulnerabilities: List[Dict[str, Any]] = []
    provenance_hash: Optional[str] = None
    created_at: Optional[str] = None


class RepositoryComponentMappingItem(BaseModel):
    repository_name: str
    total_components: int
    direct_count: int
    transitive_count: int
    vulnerable_count: int
    unique_ecosystems: List[str] = []
    last_scan_date: str


class SBOMRepositoryMappingResponse(BaseModel):
    repositories: List[RepositoryComponentMappingItem] = []
    total_repositories: int = 0
    shared_components_count: int = 0


class SBOMVersionDiffItem(BaseModel):
    component_name: str
    ecosystem: str
    repo_a_version: str
    repo_b_version: str
    drift_type: str  # "MATCH" | "MINOR_DRIFT" | "MAJOR_DRIFT" | "MISSING"
    security_impact: str  # "NONE" | "LOW" | "HIGH"


class SBOMVersionComparisonResponse(BaseModel):
    source_ref: str
    target_ref: str
    components_evaluated: int
    differences_count: int
    diff_items: List[SBOMVersionDiffItem] = []


class SBOMExportDocumentItem(BaseModel):
    id: str
    format: str  # "CycloneDX 1.5 JSON", "SPDX 2.3 JSON", "In-toto Attestation"
    spec_version: str
    repository_name: str
    file_size_kb: int
    generated_at: str
    sha256_hash: str
    download_url: str


class SBOMExportsProvenanceResponse(BaseModel):
    slsa_level: str  # "SLSA Level 3"
    builder_id: str  # "https://github.com/thing/actions/syft@v1"
    documents: List[SBOMExportDocumentItem] = []
    cryptographic_signatures: List[Dict[str, Any]] = []


# =========================================================================
# 11 DEPENDENCY POLICIES (SCREENSHOT 11 & 5 SUBPAGES / ROUTE PATTERNS)
# =========================================================================

class DependencyPolicyMetrics(BaseModel):
    total_policies: int = 24
    active_policies: int = 19
    policy_violations: int = 14
    pending_approvals: int = 3


class PolicyCoverageSlice(BaseModel):
    category: str
    count: int
    percentage: float
    color: str


class PolicyEnforcementTrendPoint(BaseModel):
    date: str
    evaluations: int
    violations_blocked: int


class ViolationByPolicyTypeItem(BaseModel):
    policy_type: str
    count: int
    percentage: float
    color: str
    icon_type: str


class DependencyPolicyRow(BaseModel):
    id: str
    policy_name: str
    policy_code: str
    type: str
    description: str
    scope: str
    status: str  # "Active", "Warn-Only", "Inactive"
    enforcement_mode: str  # "Block CI/CD", "Alert Only", "PR Comment"
    last_updated: str
    violation_count: int = 0


class TopPolicyViolationItem(BaseModel):
    policy_name: str
    policy_code: str
    violation_count: int
    percentage: float


class AllowedVsBlockedRatio(BaseModel):
    allowed_count: int = 142
    blocked_count: int = 28
    restricted_count: int = 14


class RecentPolicyActivityItem(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # "CRITICAL", "WARNING", "INFO", "SUCCESS"
    dot_color: str
    timestamp: str


class DependencyPoliciesOverviewResponse(BaseModel):
    metrics: DependencyPolicyMetrics
    coverage: List[PolicyCoverageSlice] = []
    enforcement_trend: List[PolicyEnforcementTrendPoint] = []
    violations_by_type: List[ViolationByPolicyTypeItem] = []
    policies: List[DependencyPolicyRow] = []
    total_policies: int = 0
    top_violations: List[TopPolicyViolationItem] = []
    package_ratio: AllowedVsBlockedRatio
    recent_activity: List[RecentPolicyActivityItem] = []


class VulnerabilityThresholdItem(BaseModel):
    id: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    max_allowed: int = 0
    cvss_score_cap: float = 7.0
    epss_threshold: float = 0.10
    block_known_exploited: bool = True
    enforcement_action: str = "Block Merge & Deployment"
    scope: str = "Production"
    active: bool = True


class VulnerabilityThresholdsResponse(BaseModel):
    thresholds: List[VulnerabilityThresholdItem] = []
    kev_zero_tolerance: bool = True
    active_enforcements_count: int = 4


class PackageRuleItem(BaseModel):
    id: str
    package_name: str
    ecosystem: str
    rule_type: str  # "BLOCKED", "ALLOWED", "RESTRICTED"
    reason: str
    scope: str = "All Repositories"
    enforcement_action: str = "Block Build"
    added_by: str = "Security Lead"
    created_at: str = "2026-09-12"


class PackageRulesResponse(BaseModel):
    rules: List[PackageRuleItem] = []
    total_rules: int = 0
    blocked_count: int = 0
    allowed_count: int = 0
    restricted_count: int = 0


class VersionRestrictionRuleItem(BaseModel):
    id: str
    package_name: str
    ecosystem: str
    min_version: Optional[str] = None
    max_version: Optional[str] = None
    disallow_prereleases: bool = True
    max_drift_days: int = 365
    prohibit_eol: bool = True
    status: str = "Active"
    enforcement_action: str = "Block CI/CD"


class VersionRestrictionsResponse(BaseModel):
    rules: List[VersionRestrictionRuleItem] = []
    total_rules: int = 0
    eol_packages_blocked: int = 0


class PolicyExceptionItem(BaseModel):
    id: str
    package_name: str
    target_version: str
    cve_id: Optional[str] = None
    policy_name: str
    reason: str
    requested_by: str
    approved_by: Optional[str] = None
    status: str  # "Active", "Pending", "Expired", "Revoked"
    created_at: str
    expires_at: Optional[str] = None


class PolicyExceptionsResponse(BaseModel):
    exceptions: List[PolicyExceptionItem] = []
    total_exceptions: int = 0
    pending_count: int = 0
    active_count: int = 0


# =========================================================================
# 12 PULL REQUEST & CI/CD CHECKS (SCREENSHOT 12 & 5 SUBPAGES / ROUTE PATTERNS)
# =========================================================================

class DependencyCICDMetrics(BaseModel):
    total_pipelines: int = 18
    successful_builds: int = 142
    failed_builds: int = 9
    pull_requests_scanned: int = 84


class BuildStatusTrendBar(BaseModel):
    date: str
    successful: int = 0
    failed: int = 0
    blocked: int = 0
    in_progress: int = 0


class DependencyIssuesTrendPoint(BaseModel):
    date: str
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class PRCheckResultSlice(BaseModel):
    label: str  # "Passed", "Blocked by Policy", "Warnings", "Pending"
    count: int = 0
    percentage: float = 0.0
    color: str = "#10B981"


class RecentCICDRunRow(BaseModel):
    id: str
    run_id: str  # e.g. "RUN-8421"
    workflow_name: str = "CI Security Gate"
    repository: str  # "web-api"
    branch: str  # "main"
    commit_sha: str  # "7f8a9b2"
    event: str  # "Pull Request #142", "Push", "Scheduled"
    pr_number: Optional[int] = None
    triggered_by: str = "github-actions[bot]"
    status: str  # "PASSED", "FAILED", "BLOCKED", "RUNNING"
    dependency_checks: str  # "12 / 12 Passed"
    security_issues: str  # "0 Issues", "1 Critical, 2 High"
    critical_issues: int = 0
    high_issues: int = 0
    started_at: str  # "10m ago"
    duration: str  # "1m 42s"


class TopRepoByIssuesItem(BaseModel):
    repository: str
    issue_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    percentage: float = 0.0
    color: str = "#EF4444"


class QualityGateResultSlice(BaseModel):
    label: str  # "Passed", "Blocked", "Waived", "In Review"
    count: int = 0
    percentage: float = 0.0
    color: str = "#10B981"


class PipelineStageItem(BaseModel):
    stage_key: str  # "source", "build", "scan", "gates", "deploy"
    name: str  # "Source", "Build", "Dependency Scan", "Quality Gates", "Deploy"
    status: str  # "SUCCESS", "FAILED", "BLOCKED", "RUNNING", "PENDING"
    icon_type: str = "source"
    duration: str = "15s"
    order: int = 1
    details: str = ""


class DependencyCICDOverviewResponse(BaseModel):
    metrics: DependencyCICDMetrics
    build_status_trend: List[BuildStatusTrendBar] = []
    issues_trend: List[DependencyIssuesTrendPoint] = []
    pr_check_results: List[PRCheckResultSlice] = []
    runs: List[RecentCICDRunRow] = []
    total_runs: int = 0
    top_repos_by_issues: List[TopRepoByIssuesItem] = []
    quality_gate_results: List[QualityGateResultSlice] = []
    pipeline_stages: List[PipelineStageItem] = []


class PRDependencyCheckItem(BaseModel):
    id: str
    pr_number: int
    pr_title: str
    repository: str
    author: str
    branch: str
    target_branch: str = "main"
    status: str  # "PASSED", "BLOCKED", "NEEDS_REVIEW", "SCANNING"
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    dependencies_added: int = 0
    dependencies_removed: int = 0
    dependencies_updated: int = 0
    check_summary: str = "No critical CVEs or license violations detected."
    updated_at: str = "15m ago"


class PRDependencyChecksResponse(BaseModel):
    checks: List[PRDependencyCheckItem] = []
    total_checks: int = 0
    blocked_count: int = 0
    passed_count: int = 0


class BuildScanResultItem(BaseModel):
    id: str
    build_id: str
    repository: str
    branch: str
    commit_sha: str
    scanner_name: str = "Trivy / OSV"
    scan_status: str  # "SUCCESS", "FAILED", "VIOLATIONS_FOUND"
    total_dependencies: int = 0
    vulnerabilities_detected: int = 0
    critical_cves: int = 0
    high_cves: int = 0
    lockfile_path: str = "package-lock.json"
    execution_time_ms: int = 1420
    completed_at: str = "25m ago"


class BuildScanResultsResponse(BaseModel):
    builds: List[BuildScanResultItem] = []
    total_builds: int = 0
    clean_builds_count: int = 0
    failing_builds_count: int = 0


class QualityGateRuleItem(BaseModel):
    id: str
    gate_name: str
    gate_type: str  # "VULNERABILITY", "LICENSE", "PACKAGE_RULE", "DRIFT"
    condition_expression: str
    enforcement_action: str  # "BLOCK_MERGE", "BLOCK_BUILD", "WARN_PR"
    scope: str
    active: bool = True
    evaluations_count: int = 0
    failures_count: int = 0
    created_at: str


class QualityGatesResponse(BaseModel):
    gates: List[QualityGateRuleItem] = []
    total_gates: int = 0
    active_gates_count: int = 0
    pass_rate_percentage: float = 94.2


class PipelineConfigSettingItem(BaseModel):
    id: str
    setting_key: str
    name: str
    description: str
    category: str  # "ENFORCEMENT", "SCAN_TRIGGERS", "NOTIFICATIONS", "FAIL_SAFE"
    value: str
    value_type: str  # "boolean", "string", "number", "select"
    options: List[str] = []
    is_enabled: bool = True
    repository: str = "All Repositories"


class PipelineConfigResponse(BaseModel):
    settings: List[PipelineConfigSettingItem] = []
    webhook_status: str = "Connected (GitHub App)"
    runner_status: str = "Healthy (3 active runners)"
    auto_pr_comments_enabled: bool = True











