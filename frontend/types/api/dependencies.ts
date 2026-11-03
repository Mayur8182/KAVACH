/**
 * Thing Code — Dependencies API Types
 * Typed contracts matching backend Pydantic models in `dependencies_schemas.py`
 */

export interface DependenciesMetrics {
  total_dependencies: number;
  vulnerable_dependencies: number;
  critical_dependencies: number;
  outdated_packages: number;
  ecosystems_count: number;
  repositories_scanned: number;
  repositories_total: number;
}

export interface DependencyRiskTrendPoint {
  date: string;
  total: number;
  vulnerable: number;
  critical: number;
  clean: number;
}

export interface TopRiskyDependencyItem {
  id: string;
  name: string;
  version: string;
  ecosystem: string;
  severity: string;
  vulnerability_count: number;
  vulnerabilities: string[];
  repository?: string | null;
  repository_id?: string | null;
  fix_version?: string | null;
  cve_id?: string | null;
  summary?: string | null;
}

export interface EcosystemDistributionItem {
  ecosystem: string;
  count: number;
  percentage: number;
  vulnerable_count: number;
  color: string;
}

export interface RepositoryCoverageItem {
  repository_id: string;
  repository_name: string;
  primary_language?: string | null;
  dependencies_count: number;
  vulnerable_count: number;
  critical_count: number;
  outdated_count: number;
  coverage_pct: number;
  status: 'HEALTHY' | 'VULNERABLE' | 'NOT_SCANNED' | string;
  last_scanned_at?: string | null;
  manifest_files: string[];
}

export interface DependenciesOverviewResponse {
  generated_at: string;
  project_id?: string | null;
  metrics: DependenciesMetrics;
  risk_trends: DependencyRiskTrendPoint[];
  top_risky_dependencies: TopRiskyDependencyItem[];
  ecosystem_distribution: EcosystemDistributionItem[];
  repository_coverage: RepositoryCoverageItem[];
}

export interface DependencyTrendsResponse {
  time_range: string;
  mttr_days: number;
  total_vulnerabilities_trend: number;
  trends: DependencyRiskTrendPoint[];
  new_vs_resolved: Array<{
    date: string;
    new_vulns: number;
    resolved_vulns: number;
  }>;
  severity_timeline: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  scan_history: Array<{
    id: string;
    timestamp: string;
    scanner: string;
    findings_count: number;
    status: string;
  }>;
}

export interface CriticalDependencyItem {
  id: string;
  package_name: string;
  installed_version: string;
  fixed_version?: string | null;
  vulnerability_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | string;
  cvss_score?: number | null;
  ecosystem: string;
  file_path?: string | null;
  repository?: string | null;
  repository_id?: string | null;
  detected_at?: string | null;
  has_autofix: boolean;
}

export interface CriticalDependenciesResponse {
  items: CriticalDependencyItem[];
  total: number;
  critical_count: number;
  high_count: number;
}

export interface OutdatedPackageItem {
  id: string;
  package_name: string;
  current_version: string;
  latest_version: string;
  drift_type: 'MAJOR' | 'MINOR' | 'PATCH' | string;
  upgrade_risk: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  ecosystem: string;
  repository_name?: string | null;
  repository_id?: string | null;
  file_path?: string | null;
  recommended_version?: string | null;
}

export interface OutdatedPackagesResponse {
  items: OutdatedPackageItem[];
  total: number;
  major_drift_count: number;
  minor_drift_count: number;
  patch_drift_count: number;
}

export interface DependencyCoveragePageResponse {
  repositories: RepositoryCoverageItem[];
  total_repositories: number;
  covered_repositories: number;
  coverage_percentage: number;
  total_dependencies_monitored: number;
  average_dependencies_per_repo: number;
}

export interface TriggerDependencyScanRequest {
  repository_id: string;
  branch?: string;
}

export interface TriggerDependencyScanResponse {
  job_id: string;
  status: string;
  message: string;
}

// =========================================================================
// INVENTORY TYPES (SCREENSHOT 02)
// =========================================================================

export interface DependencyInventoryMetrics {
  total_dependencies: number;
  direct_dependencies: number;
  transitive_dependencies: number;
  vulnerable_dependencies: number;
  licenses_count: number;
  duplicate_packages_count: number;
}

export interface DependencyUsageRef {
  file_path: string;
  line_number: number;
  reference_type: 'import' | 'require' | 'manifest' | 'link' | string;
  code_snippet?: string | null;
  repository_name?: string | null;
}

export interface DependencyInventoryItem {
  id: string;
  name: string;
  version: string;
  ecosystem: string;
  is_direct: boolean;
  license: string;
  security_status: 'SAFE' | 'VULNERABLE' | 'CRITICAL' | string;
  vulnerability_count: number;
  vulnerabilities: string[];
  highest_severity?: string | null;
  repository_id?: string | null;
  repository_name?: string | null;
  manifest_path?: string | null;
  introduced_by?: string | null;
  usage_count: number;
  last_updated_at?: string | null;
  is_outdated?: boolean;
  latest_version?: string | null;
}

export interface DependencyDetailResponse {
  id: string;
  name: string;
  version: string;
  latest_version?: string | null;
  ecosystem: string;
  is_direct: boolean;
  license: string;
  license_risk: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  security_status: 'SAFE' | 'VULNERABLE' | 'CRITICAL' | string;
  vulnerability_count: number;
  vulnerabilities: Array<{ id: string; title: string; severity: string }>;
  repository_id?: string | null;
  repository_name?: string | null;
  manifest_path?: string | null;
  introduced_by?: string | null;
  description?: string | null;
  homepage?: string | null;
  repository_url?: string | null;
  usage_references: DependencyUsageRef[];
  transitive_dependents: string[];
  last_scanned_at?: string | null;
}

export interface DependencyInventoryResponse {
  metrics: DependencyInventoryMetrics;
  items: DependencyInventoryItem[];
  total: number;
  page: number;
  page_size: number;
  selected_dependency?: DependencyDetailResponse | null;
}

export interface DuplicatePackageItem {
  id: string;
  name: string;
  ecosystem: string;
  installed_versions: string[];
  version_count: number;
  repositories_affected: string[];
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  remediation_suggestion: string;
  manifest_files: string[];
}

export interface DuplicatePackagesResponse {
  items: DuplicatePackageItem[];
  total_duplicates: number;
  affected_repositories_count: number;
  potential_risk_summary: string;
}

export interface DependencyUsageResponse {
  package_name: string;
  total_references: number;
  references: DependencyUsageRef[];
}

export interface VulnerabilityAnalysisMetrics {
  critical_high_count: number;
  actionable_vulnerabilities: number;
  fix_available_count: number;
  known_exploited_count: number;
  total_vulnerabilities: number;
  affected_packages_count: number;
}

export interface VulnerabilityItem {
  id: string;
  cve_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  cvss_score: number;
  ecosystem: string;
  package_name: string;
  affected_version: string;
  installed_version: string;
  fixed_version?: string | null;
  has_fix: boolean;
  is_known_exploited: boolean;
  cisa_kev_due_date?: string | null;
  published_date?: string | null;
  last_updated?: string | null;
  repository_name: string;
  manifest_path: string;
  scanner: string;
}

export interface VulnerabilityDetailResponse {
  id: string;
  cve_id: string;
  title: string;
  description: string;
  severity: string;
  cvss_score: number;
  vector_string?: string | null;
  epss_score?: number | null;
  epss_percentile?: number | null;
  ecosystem: string;
  package_name: string;
  affected_version: string;
  installed_version: string;
  fixed_version?: string | null;
  has_fix: boolean;
  is_known_exploited: boolean;
  cisa_kev_due_date?: string | null;
  exploit_available: boolean;
  published_date?: string | null;
  last_updated?: string | null;
  repository_name: string;
  manifest_path: string;
  scanner: string;
  patch_guidance?: string | null;
  references: string[];
  affected_packages: Array<{
    package_name: string;
    installed_version: string;
    fixed_version?: string | null;
    repository?: string | null;
    manifest?: string | null;
  }>;
}

export interface VulnerabilityAnalysisResponse {
  metrics: VulnerabilityAnalysisMetrics;
  items: VulnerabilityItem[];
  total: number;
  page: number;
  page_size: number;
  severity_distribution: Record<string, number>;
  timeline_trends: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  affected_packages_summary: Array<{
    package_name: string;
    installed_version: string;
    vulnerability_count: number;
    highest_severity: string;
    ecosystem: string;
    fixed_version?: string | null;
    cve_ids: string[];
  }>;
  selected_vulnerability?: VulnerabilityDetailResponse | null;
}

export interface AffectedPackageItem {
  id: string;
  package_name: string;
  ecosystem: string;
  vulnerability_count: number;
  highest_severity: string;
  cve_ids: string[];
  installed_version: string;
  fixed_version?: string | null;
  repositories: string[];
  manifest_files: string[];
}

export interface AffectedPackagesResponse {
  items: AffectedPackageItem[];
  total: number;
  total_packages_affected: number;
  critical_packages_count: number;
}

export interface KnownExploitedResponse {
  items: VulnerabilityItem[];
  total: number;
  cisa_kev_catalog_version: string;
}

// =========================================================================
// PACKAGE VERSIONS & UPGRADES TYPES (SCREENSHOT 04 & 5 SUBPAGES)
// =========================================================================

export interface PackageVersionsMetrics {
  total_packages: number;
  outdated_count: number;
  vulnerable_packages_count: number;
  eol_count: number;
}

export interface PackageVersionItem {
  id: string;
  name: string;
  current_version: string;
  latest_version: string;
  version_status: 'CURRENT' | 'MINOR_DRIFT' | 'MAJOR_DRIFT' | 'EOL' | string;
  ecosystem: string;
  license: string;
  security_status: 'SAFE' | 'VULNERABLE' | 'CRITICAL' | string;
  repository_count: number;
  repository_name: string;
  is_direct: boolean;
  breaking_changes_risk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | string;
  recommended_version: string;
  manifest_path: string;
  last_updated_at?: string | null;
  description?: string | null;
  upgrade_path?: {
    current_version: string;
    target_version: string;
    safe?: boolean;
  } | null;
}

export interface PackageVersionsResponse {
  metrics: PackageVersionsMetrics;
  items: PackageVersionItem[];
  total: number;
  page: number;
  page_size: number;
  status_distribution: Record<string, number>;
  upgrade_opportunities: Array<{
    category: string;
    count: number;
    risk: string;
  }>;
  ecosystems_distribution: Array<{
    ecosystem: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  selected_package?: PackageVersionItem | null;
}

export interface BreakingChangeItem {
  id: string;
  package_name: string;
  ecosystem: string;
  current_version: string;
  target_version: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | string;
  breaking_changes_count: number;
  migration_guide_url?: string | null;
  affected_files_count: number;
  breaking_apis: string[];
  remediation_notes: string;
}

export interface BreakingChangesResponse {
  items: BreakingChangeItem[];
  total: number;
  high_risk_count: number;
}

export interface EolPackageItem {
  id: string;
  package_name: string;
  installed_version: string;
  ecosystem: string;
  eol_date?: string | null;
  days_past_eol: number;
  replacement_package?: string | null;
  recommended_action: string;
  support_status: 'ACTIVE' | 'MAINTENANCE' | 'EOL' | string;
}

export interface EolPackagesResponse {
  items: EolPackageItem[];
  total: number;
  critical_eol_count: number;
}

// =========================================================================
// PACKAGE ECOSYSTEMS TYPES (SCREENSHOT 05 & 6 SUBPAGES / ROUTE PATTERNS)
// =========================================================================

export interface EcosystemCardMetric {
  id: string; // 'npm' | 'python' | 'java' | 'go' | 'other'
  name: string; // 'npm & pnpm' | 'Python & pip' | 'Maven & Gradle' | 'Go Modules' | 'Cargo & NuGet'
  slug: string;
  href: string;
  total_packages: number;
  vulnerable_packages: number;
  outdated_packages: number;
  health_score: number;
  primary_language: string;
  icon_type: string;
  package_managers: string[];
}

export interface EcosystemDistributionSlice {
  ecosystem: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface EcosystemTopRiskyPackage {
  id: string;
  name: string;
  version: string;
  ecosystem: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  cve_id?: string | null;
  vulnerability_title?: string | null;
  repository_name?: string | null;
}

export interface EcosystemHealthItem {
  id: string;
  name: string;
  slug: string;
  href: string;
  health_score: number;
  status_label: 'Good' | 'Needs Review' | 'Critical' | string;
  color: string;
  package_count: number;
  vulnerability_count: number;
}

export interface EcosystemActivityItem {
  id: string;
  title: string;
  description: string;
  ecosystem: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS' | string;
  dot_color: string;
  timestamp: string;
}

export interface EcosystemVulnerabilityTrendPoint {
  date: string;
  npm: number;
  python: number;
  java: number;
  go: number;
  other: number;
}

export interface EcosystemVersionBar {
  label: string;
  ecosystem: string;
  current_count: number;
  minor_count: number;
  major_count: number;
  color: string;
}

export interface EcosystemsOverviewResponse {
  ecosystem_cards: EcosystemCardMetric[];
  distribution: EcosystemDistributionSlice[];
  total_packages: number;
  top_risky_packages: EcosystemTopRiskyPackage[];
  ecosystem_health: EcosystemHealthItem[];
  recent_activity: EcosystemActivityItem[];
  vulnerability_trends: EcosystemVulnerabilityTrendPoint[];
  ecosystem_versions: EcosystemVersionBar[];
}

export interface EcosystemDetailResponse {
  ecosystem: string;
  name: string;
  slug: string;
  primary_language: string;
  manifest_types: string[];
  metrics: {
    total_packages?: number;
    vulnerable_packages?: number;
    outdated_packages?: number;
    direct_packages?: number;
    health_score?: number;
    critical_vulnerabilities?: number;
    [key: string]: any;
  };
  items: DependencyInventoryItem[];
  total: number;
  risky_packages: EcosystemTopRiskyPackage[];
  health_score: number;
}

// =========================================================================
// DEPENDENCY GRAPH TYPES (SCREENSHOT 06 & 5 SUBPAGES / ROUTE PATTERNS)
// =========================================================================

export interface DependencyGraphNode {
  id: string;
  name: string;
  version: string;
  ecosystem: string;
  is_direct: boolean;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Safe' | string;
  vulnerability_count: number;
  depth: number;
  license: string;
  repository_name?: string | null;
  first_seen: string;
  last_updated: string;
  x: number;
  y: number;
}

export interface DependencyGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: 'direct' | 'transitive' | 'peer' | 'dev' | string;
  is_risk_path: boolean;
  severity?: string | null;
}

export interface DependencyGraphMetrics {
  total_packages: number;
  direct_dependencies: number;
  transitive_dependencies: number;
  vulnerable_packages: number;
  max_depth: number;
  total_edges: number;
  clean_packages: number;
}

export interface DependencyTypeSlice {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RiskDistributionBar {
  depth_label: string; // "Direct", "Depth 1", "Depth 2", "Depth 3", "Depth 4+"
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TopDependencyItem {
  id: string;
  name: string;
  version: string;
  dependents_count: number;
  risk_level: string;
  ecosystem: string;
}

export interface DependencyGraphResponse {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  metrics: DependencyGraphMetrics;
  dependency_types: DependencyTypeSlice[];
  risk_distribution: RiskDistributionBar[];
  top_dependencies: TopDependencyItem[];
  selected_package?: DependencyGraphNode | null;
}

export interface PackageRelationshipItem {
  id: string;
  source_package: string;
  source_version: string;
  target_package: string;
  target_version: string;
  relationship_type: 'direct' | 'transitive' | 'peer' | 'dev' | string;
  depth: number;
  ecosystem: string;
  has_vulnerability: boolean;
  severity?: string | null;
}

export interface PackageRelationshipsResponse {
  relationships: PackageRelationshipItem[];
  total: number;
  direct_count: number;
  transitive_count: number;
}

export interface TransitiveRiskPath {
  id: string;
  vulnerability_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string;
  title: string;
  cve_id: string;
  path_nodes: string[];
  direct_parent: string;
  vulnerable_package: string;
  depth: number;
  fix_suggestion: string;
}

export interface TransitiveRiskPathsResponse {
  risk_paths: TransitiveRiskPath[];
  total: number;
  critical_paths_count: number;
}

export interface BlastRadiusReport {
  package_id: string;
  package_name: string;
  version: string;
  ecosystem: string;
  blast_radius_tier: 'Severe' | 'High' | 'Moderate' | 'Isolated' | string;
  affected_repos_count: number;
  affected_services_count: number;
  downstream_packages_count: number;
  downstream_packages: string[];
  risk_score: number;
  containment_advice: string;
}

export interface BlastRadiusResponse {
  reports: BlastRadiusReport[];
  total: number;
  high_blast_count: number;
}

export interface UpgradeImpactItem {
  package_id: string;
  package_name: string;
  current_version: string;
  target_version: string;
  upgrade_type: 'PATCH' | 'MINOR' | 'MAJOR' | string;
  breaking_risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | string;
  conflicts_count: number;
  affected_downstream_count: number;
  safe_to_upgrade: boolean;
  notes: string;
}

export interface UpgradeImpactResponse {
  items: UpgradeImpactItem[];
  total: number;
  safe_count: number;
  breaking_count: number;
}

// =========================================================================
// LICENSE COMPLIANCE TYPES (SCREENSHOT 07 & 5 SUBPAGES)
// =========================================================================

export interface LicenseMetrics {
  total_licenses: number;
  license_violations: number;
  copyleft_restricted: number;
  compliant_packages: number;
}

export interface LicenseDistributionSlice {
  license_name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LicenseRiskBar {
  category: string; // "Prohibited", "Restricted", "Conditional", "Permissive", "Unknown"
  count: number;
  percentage: number;
  color: string;
}

export interface ComplianceStatusSlice {
  status: string; // "Compliant", "Violates Policy", "Review Required", "Exempt"
  count: number;
  percentage: number;
  color: string;
}

export interface LicenseInventoryItem {
  id: string;
  package_name: string;
  package_version: string;
  license_name: string;
  license_type: 'Permissive' | 'Copyleft' | 'Weak Copyleft' | 'Proprietary' | 'Unknown' | string;
  compliance_status: 'Compliant' | 'Prohibited' | 'Restricted' | 'Exempt' | 'Review Required' | string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  usage_type: 'Direct' | 'Transitive' | string;
  used_in_files_count: number;
  used_in_paths: string[];
  repository_name: string;
  ecosystem: string;
  package_url?: string | null;
  license_text?: string | null;
  last_scanned_at?: string | null;
}

export interface TopLicenseItem {
  license_name: string;
  package_count: number;
  percentage: number;
  license_type: string;
}

export interface LicenseTrendPoint {
  date: string;
  compliant: number;
  restricted: number;
  prohibited: number;
  unknown: number;
}

export interface LicenseOverviewResponse {
  metrics: LicenseMetrics;
  distribution: LicenseDistributionSlice[];
  risk_overview: LicenseRiskBar[];
  compliance_status: ComplianceStatusSlice[];
  recent_inventory: LicenseInventoryItem[];
  top_licenses: TopLicenseItem[];
  trends: LicenseTrendPoint[];
}

export interface LicenseInventoryResponse {
  items: LicenseInventoryItem[];
  total: number;
  page: number;
  page_size: number;
  filters_available: Record<string, string[]>;
}

export interface LicenseViolationItem {
  id: string;
  package_name: string;
  package_version: string;
  license_name: string;
  license_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string;
  violation_reason: string;
  policy_rule: string;
  usage_path: string;
  is_direct: boolean;
  parent_package?: string | null;
  remediation_options: string[];
  detected_at: string;
}

export interface LicenseViolationsResponse {
  violations: LicenseViolationItem[];
  total: number;
  high_severity_count: number;
}

export interface RestrictedLicenseItem {
  id: string;
  package_name: string;
  package_version: string;
  license_name: string;
  license_type: string;
  compliance_status: string;
  linking_requirement: string;
  file_locations: string[];
  approval_status: string;
  guidance: string;
}

export interface RestrictedLicensesResponse {
  restricted_packages: RestrictedLicenseItem[];
  total: number;
  requires_action_count: number;
}

export interface LicenseExceptionItem {
  id: string;
  package_name: string;
  package_version: string;
  license_name: string;
  status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'EXPIRED' | string;
  reason: string;
  conditions?: string | null;
  requested_by: string;
  approved_by?: string | null;
  created_at: string;
  expires_at?: string | null;
}

export interface LicenseExceptionsResponse {
  exceptions: LicenseExceptionItem[];
  total: number;
  pending_count: number;
  approved_count: number;
}

export interface CreateLicenseExceptionRequest {
  package_name: string;
  package_version: string;
  license_name: string;
  reason: string;
  conditions?: string | null;
  requested_by?: string;
}

// =========================================================================
// 08 PACKAGE HEALTH & MAINTENANCE TYPES (SCREENSHOT 08 & 5 SUBPAGES)
// =========================================================================

export interface PackageHealthMetrics {
  healthy_packages: number;
  actively_maintained: number;
  low_activity: number;
  abandoned_packages: number;
}

export interface HealthDistributionSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MaintenanceActivityBar {
  month: string;
  commits: number;
  releases: number;
  activity_score: number;
}

export interface PackageStatusSlice {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PackageHealthInventoryItem {
  id: string;
  package_name: string;
  version: string;
  ecosystem: string;
  health_status: 'Healthy' | 'Moderate' | 'Poor' | 'Critical' | string;
  health_score: number;
  last_release_date?: string | null;
  last_release_relative: string;
  github_activity: number[];
  maintenance_status: 'Active' | 'Low Activity' | 'Stale' | 'Abandoned' | string;
  trust_score: number;
  repository_name: string;
  open_issues_count: number;
  stars_count: number;
  commit_frequency_monthly: number;
  is_deprecated: boolean;
  deprecation_reason?: string | null;
  replacement_package?: string | null;
}

export interface TopPackageHealthRiskItem {
  package_name: string;
  risk_score: number;
  health_status: string;
  ecosystem: string;
  color: string;
}

export interface RecentMaintenanceEventItem {
  id: string;
  package_name: string;
  title: string;
  description: string;
  event_type: string;
  dot_color: string;
  timestamp: string;
}

export interface PackageHealthOverviewResponse {
  metrics: PackageHealthMetrics;
  distribution: HealthDistributionSlice[];
  maintenance_activity: MaintenanceActivityBar[];
  status_overview: PackageStatusSlice[];
  recent_inventory: PackageHealthInventoryItem[];
  top_health_risks: TopPackageHealthRiskItem[];
  recent_events: RecentMaintenanceEventItem[];
}

export interface MaintenanceReleaseActivityResponse {
  items: PackageHealthInventoryItem[];
  total: number;
  high_activity_count: number;
  monthly_activity: MaintenanceActivityBar[];
}

export interface AbandonedPackagesResponse {
  abandoned_packages: PackageHealthInventoryItem[];
  total: number;
  critical_abandoned_count: number;
}

export interface ReleaseVersionHistoryItem {
  version: string;
  release_date: string;
  relative_date: string;
  is_latest: boolean;
  is_breaking: boolean;
  changelog_summary: string;
  vulnerabilities_fixed: string[];
}

export interface ReleaseVersionHistoryResponse {
  package_name: string;
  current_version: string;
  latest_version: string;
  ecosystem: string;
  total_releases: number;
  releases: ReleaseVersionHistoryItem[];
}

export interface PackageTrustDetailResponse {
  package: PackageHealthInventoryItem;
  trust_breakdown: Record<string, number>;
  releases: ReleaseVersionHistoryItem[];
  advisories: Array<{
    id: string;
    severity: string;
    title: string;
    summary: string;
  }>;
  recommended_action: string;
  replacement_package?: string | null;
}

// =========================================================================
// 09 DEPENDENCY REMEDIATION TYPES (SCREENSHOT 09 & 5 SUBPAGES)
// =========================================================================

export interface RemediationMetrics {
  items_to_fix: number;
  in_progress: number;
  fixed: number;
  pending_verification: number;
}

export interface RemediationStatusSlice {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RiskReductionTrendPoint {
  date: string;
  risk_score: number;
  open_items: number;
}

export interface RemediationQueueItem {
  id: string;
  package_name: string;
  current_version: string;
  fixed_version: string;
  recommended_version?: string;
  ecosystem: string;
  dependency_type: 'DIRECT' | 'TRANSITIVE' | string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'PENDING_VERIFICATION' | 'IGNORED' | string;
  repository_name: string;
  repository?: string;
  branch: string;
  cve_id?: string | null;
  title: string;
  category: string;
  first_seen: string;
  last_seen: string;
  manifest_path: string;
  lockfile_path?: string | null;
  manifest_diff?: string | null;
  lockfile_diff?: string | null;
  pr_number?: number | null;
  pr_url?: string | null;
  pr_branch?: string | null;
  verification_status: string;
  breaking_change: boolean;
  breaking_change_notes?: string | null;
  remediation_step: number;
  confidence_score?: number;
  vulnerabilities_fixed?: number;
  days_behind?: number;
}

export type UpgradeRecommendationItem = RemediationQueueItem;

export interface TopRemediationCategoryItem {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RemediationEcosystemSlice {
  ecosystem: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RemediationRecentActivityItem {
  id: string;
  package_name: string;
  action_type: string;
  action?: string;
  title: string;
  description: string;
  details?: string;
  dot_color: string;
  timestamp: string;
}

export interface DependencyRemediationOverviewResponse {
  metrics: RemediationMetrics;
  status_distribution: RemediationStatusSlice[];
  risk_trend: RiskReductionTrendPoint[];
  risk_reduction_trend?: RiskReductionTrendPoint[];
  queue_items: RemediationQueueItem[];
  queue?: RemediationQueueItem[];
  top_categories: TopRemediationCategoryItem[];
  ecosystem_distribution: RemediationEcosystemSlice[];
  recent_activity: RemediationRecentActivityItem[];
  selected_item?: RemediationQueueItem | null;
}

export interface UpgradeRecommendationsResponse {
  recommendations: RemediationQueueItem[];
  total: number;
  safe_upgrades_count: number;
  safe_patch_count?: number;
  breaking_upgrades_count: number;
  breaking_count?: number;
}

export interface ManifestLockfileDiffResponse {
  remediation_id: string;
  package_name: string;
  current_version: string;
  target_version: string;
  fixed_version?: string;
  branch?: string;
  manifest_path: string;
  manifest_diff: string;
  lockfile_path?: string | null;
  lockfile_diff?: string | null;
}

export interface CreateFixPullRequestRequest {
  remediation_id: string;
  target_branch?: string;
  title?: string;
  body?: string;
}

export interface CreateFixPullRequestResponse {
  pr_number: number;
  pr_url: string;
  pr_branch: string;
  target_branch?: string;
  status: string;
  message: string;
}

export interface TriggerRemediationVerificationRequest {
  remediation_id: string;
  scanner?: string;
}

export interface RemediationVerificationResponse {
  verification_id: string;
  remediation_id: string;
  status: string;
  verification_status?: string;
  scanner: string;
  scanned_at: string;
  findings_resolved: number;
  remaining_findings: number;
  log: string;
  details?: string;
  evidence_hash?: string;
}

export interface UpdateRemediationStatusRequest {
  status: string;
  reason?: string;
  notes?: string;
}

// =========================================================================
// 10 SBOM & COMPONENT MAPPING (SCREENSHOT 10 & 5 SUBPAGES / ROUTE PATTERNS)
// =========================================================================

export interface SBOMMetrics {
  total_components: number;
  direct_dependencies: number;
  transitive_dependencies: number;
  components_with_issues: number;
}

export interface SBOMComponentTypeSlice {
  component_type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SBOMComponentsByEcosystem {
  ecosystem: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SBOMRelationshipNode {
  id: string;
  name: string;
  type: 'root' | 'direct' | 'transitive' | string;
  ecosystem: string;
  status: 'healthy' | 'warning' | 'critical' | string;
}

export interface SBOMRelationshipEdge {
  source: string;
  target: string;
}

export interface SBOMRelationshipMap {
  nodes: SBOMRelationshipNode[];
  edges: SBOMRelationshipEdge[];
}

export interface SBOMComponentRow {
  id: string;
  component_name: string;
  version: string;
  component_type: string;
  ecosystem: string;
  license_name: string;
  repository_name: string;
  dependency_type: 'DIRECT' | 'TRANSITIVE' | string;
  issues: 'CRITICAL' | 'HIGH' | 'CLEAN' | 'MEDIUM' | string;
  purl?: string | null;
  cpe?: string | null;
  first_seen?: string | null;
}

export interface RecentSBOMScanItem {
  id: string;
  repository_name: string;
  branch: string;
  scan_type: string;
  components_count: number;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | string;
  started_at: string;
}

export interface TopComponentUsageItem {
  name: string;
  ecosystem: string;
  repository_count: number;
  percentage: number;
}

export interface SBOMOverviewResponse {
  metrics: SBOMMetrics;
  type_distribution: SBOMComponentTypeSlice[];
  ecosystem_distribution: SBOMComponentsByEcosystem[];
  relationship_map: SBOMRelationshipMap;
  components: SBOMComponentRow[];
  total_components: number;
  recent_scans: RecentSBOMScanItem[];
  top_usage: TopComponentUsageItem[];
}

export interface SBOMComponentDetailResponse {
  id: string;
  component_name: string;
  version: string;
  component_type: string;
  ecosystem: string;
  license_name: string;
  repository_name: string;
  dependency_type: string;
  issues: string;
  purl?: string | null;
  cpe?: string | null;
  description?: string | null;
  author?: string | null;
  dependencies: string[];
  dependents: string[];
  vulnerabilities: any[];
  provenance_hash?: string | null;
  created_at?: string | null;
}

export interface RepositoryComponentMappingItem {
  repository_name: string;
  total_components: number;
  direct_count: number;
  transitive_count: number;
  vulnerable_count: number;
  unique_ecosystems: string[];
  last_scan_date: string;
}

export interface SBOMRepositoryMappingResponse {
  repositories: RepositoryComponentMappingItem[];
  total_repositories: number;
  shared_components_count: number;
}

export interface SBOMVersionDiffItem {
  component_name: string;
  ecosystem: string;
  repo_a_version: string;
  repo_b_version: string;
  drift_type: 'MATCH' | 'PATCH_UPDATE' | 'MINOR_DRIFT' | 'MAJOR_DRIFT' | 'MISSING' | string;
  security_impact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | string;
}

export interface SBOMVersionComparisonResponse {
  source_ref: string;
  target_ref: string;
  components_evaluated: number;
  differences_count: number;
  diff_items: SBOMVersionDiffItem[];
}

export interface SBOMExportDocumentItem {
  id: string;
  format: string;
  spec_version: string;
  repository_name: string;
  file_size_kb: number;
  generated_at: string;
  sha256_hash: string;
  download_url: string;
}

export interface SBOMExportsProvenanceResponse {
  slsa_level: string;
  builder_id: string;
  documents: SBOMExportDocumentItem[];
  cryptographic_signatures: any[];
}

// =========================================================================
// 11 DEPENDENCY POLICIES TYPES (SCREENSHOT 11 & 5 SUBPAGES / ROUTE PATTERNS)
// =========================================================================

export interface DependencyPolicyMetrics {
  total_policies: number;
  active_policies: number;
  policy_violations: number;
  pending_approvals: number;
}

export interface PolicyCoverageSlice {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PolicyEnforcementTrendPoint {
  date: string;
  evaluations: number;
  violations_blocked: number;
}

export interface ViolationByPolicyTypeItem {
  policy_type: string;
  count: number;
  percentage: number;
  color: string;
  icon_type: string;
}

export interface DependencyPolicyRow {
  id: string;
  policy_name: string;
  policy_code: string;
  type: string;
  description: string;
  scope: string;
  status: 'Active' | 'Warn-Only' | 'Inactive' | string;
  enforcement_mode: 'Block CI/CD' | 'Alert Only' | 'PR Comment' | string;
  last_updated: string;
  violation_count: number;
}

export interface TopPolicyViolationItem {
  policy_name: string;
  policy_code: string;
  violation_count: number;
  percentage: number;
}

export interface AllowedVsBlockedRatio {
  allowed_count: number;
  blocked_count: number;
  restricted_count: number;
}

export interface RecentPolicyActivityItem {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS' | string;
  dot_color: string;
  timestamp: string;
}

export interface DependencyPoliciesOverviewResponse {
  metrics: DependencyPolicyMetrics;
  coverage: PolicyCoverageSlice[];
  enforcement_trend: PolicyEnforcementTrendPoint[];
  violations_by_type: ViolationByPolicyTypeItem[];
  policies: DependencyPolicyRow[];
  total_policies: number;
  top_violations: TopPolicyViolationItem[];
  package_ratio: AllowedVsBlockedRatio;
  recent_activity: RecentPolicyActivityItem[];
}

export interface VulnerabilityThresholdItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  max_allowed: number;
  cvss_score_cap: number;
  epss_threshold: number;
  block_known_exploited: boolean;
  enforcement_action: string;
  scope: string;
  active: boolean;
}

export interface VulnerabilityThresholdsResponse {
  thresholds: VulnerabilityThresholdItem[];
  kev_zero_tolerance: boolean;
  active_enforcements_count: number;
}

export interface PackageRuleItem {
  id: string;
  package_name: string;
  ecosystem: string;
  rule_type: 'BLOCKED' | 'ALLOWED' | 'RESTRICTED' | string;
  reason: string;
  scope: string;
  enforcement_action: string;
  added_by: string;
  created_at: string;
}

export interface PackageRulesResponse {
  rules: PackageRuleItem[];
  total_rules: number;
  blocked_count: number;
  allowed_count: number;
  restricted_count: number;
}

export interface VersionRestrictionRuleItem {
  id: string;
  package_name: string;
  ecosystem: string;
  min_version?: string | null;
  max_version?: string | null;
  disallow_prereleases: boolean;
  max_drift_days: number;
  prohibit_eol: boolean;
  status: string;
  enforcement_action: string;
}

export interface VersionRestrictionsResponse {
  rules: VersionRestrictionRuleItem[];
  total_rules: number;
  eol_packages_blocked: number;
}

export interface PolicyExceptionItem {
  id: string;
  package_name: string;
  target_version: string;
  cve_id?: string | null;
  policy_name: string;
  reason: string;
  requested_by: string;
  approved_by?: string | null;
  status: 'Active' | 'Pending' | 'Expired' | 'Revoked' | string;
  created_at: string;
  expires_at?: string | null;
}

export interface PolicyExceptionsResponse {
  exceptions: PolicyExceptionItem[];
  total_exceptions: number;
  pending_count: number;
  active_count: number;
}

// =========================================================================
// 12 PULL REQUEST & CI/CD CHECKS TYPES (SCREENSHOT 12 & 5 SUBPAGES)
// =========================================================================

export interface DependencyCICDMetrics {
  total_pipelines: number;
  successful_builds: number;
  failed_builds: number;
  pull_requests_scanned: number;
}

export interface BuildStatusTrendBar {
  date: string;
  successful: number;
  failed: number;
  blocked: number;
  in_progress: number;
}

export interface DependencyIssuesTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface PRCheckResultSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentCICDRunRow {
  id: string;
  run_id: string;
  workflow_name: string;
  repository: string;
  branch: string;
  commit_sha: string;
  event: string;
  pr_number?: number | null;
  triggered_by: string;
  status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'RUNNING' | string;
  dependency_checks: string;
  security_issues: string;
  critical_issues: number;
  high_issues: number;
  started_at: string;
  duration: string;
}

export interface TopRepoByIssuesItem {
  repository: string;
  issue_count: number;
  critical_count: number;
  high_count: number;
  percentage: number;
  color: string;
}

export interface QualityGateResultSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PipelineStageItem {
  stage_key: string;
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'RUNNING' | 'PENDING' | string;
  icon_type: string;
  duration: string;
  order: number;
  details: string;
}

export interface DependencyCICDOverviewResponse {
  metrics: DependencyCICDMetrics;
  build_status_trend: BuildStatusTrendBar[];
  issues_trend: DependencyIssuesTrendPoint[];
  pr_check_results: PRCheckResultSlice[];
  runs: RecentCICDRunRow[];
  total_runs: number;
  top_repos_by_issues: TopRepoByIssuesItem[];
  quality_gate_results: QualityGateResultSlice[];
  pipeline_stages: PipelineStageItem[];
}

export interface PRDependencyCheckItem {
  id: string;
  pr_number: number;
  pr_title: string;
  repository: string;
  author: string;
  branch: string;
  target_branch: string;
  status: 'PASSED' | 'BLOCKED' | 'NEEDS_REVIEW' | 'SCANNING' | string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  dependencies_added: number;
  dependencies_removed: number;
  dependencies_updated: number;
  check_summary: string;
  updated_at: string;
}

export interface PRDependencyChecksResponse {
  checks: PRDependencyCheckItem[];
  total_checks: number;
  blocked_count: number;
  passed_count: number;
}

export interface BuildScanResultItem {
  id: string;
  build_id: string;
  repository: string;
  branch: string;
  commit_sha: string;
  scanner_name: string;
  scan_status: 'SUCCESS' | 'FAILED' | 'VIOLATIONS_FOUND' | string;
  total_dependencies: number;
  vulnerabilities_detected: number;
  critical_cves: number;
  high_cves: number;
  lockfile_path: string;
  execution_time_ms: number;
  completed_at: string;
}

export interface BuildScanResultsResponse {
  builds: BuildScanResultItem[];
  total_builds: number;
  clean_builds_count: number;
  failing_builds_count: number;
}

export interface QualityGateRuleItem {
  id: string;
  gate_name: string;
  gate_type: string;
  condition_expression: string;
  enforcement_action: string;
  scope: string;
  active: boolean;
  evaluations_count: number;
  failures_count: number;
  created_at: string;
}

export interface QualityGatesResponse {
  gates: QualityGateRuleItem[];
  total_gates: number;
  active_gates_count: number;
  pass_rate_percentage: number;
}

export interface PipelineConfigSettingItem {
  id: string;
  setting_key: string;
  name: string;
  description: string;
  category: string;
  value: string;
  value_type: string;
  options: string[];
  is_enabled: boolean;
  repository: string;
}

export interface PipelineConfigResponse {
  settings: PipelineConfigSettingItem[];
  webhook_status: string;
  runner_status: string;
  auto_pr_comments_enabled: boolean;
}










