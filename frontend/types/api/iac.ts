/**
 * TypeScript interfaces for Thing Code — IaC Security Workspace
 */

export interface IaCDistributionItem {
  label: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface IaCTopResourceItem {
  resource_type: string;
  count: number;
}

export interface IaCTopRuleItem {
  rule_id: string;
  count: number;
  provider?: string;
  severity?: string;
}

export interface IaCStatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface IaCSummaryResponse {
  total_issues: number;
  delta_percentage: number;
  critical: number;
  critical_new: number;
  high: number;
  high_new: number;
  medium: number;
  medium_fixed: number;
  low: number;
  low_fixed: number;
  info?: number;
  by_severity: IaCDistributionItem[];
  by_provider: IaCDistributionItem[];
  by_category?: IaCDistributionItem[];
  by_framework: IaCDistributionItem[];
  top_resources: IaCTopResourceItem[];
  top_rules: IaCTopRuleItem[];
  status_overview: IaCStatusDistributionItem[];
  last_scanned_at?: string;
  scanner_name: string;
  scanned_resources?: number;
}

export interface IaCFindingItem {
  id: string;
  scan_id?: string;
  rule_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | string;
  provider: 'AWS' | 'Kubernetes' | 'Azure' | 'GCP' | 'Docker' | 'Helm' | string;
  framework: 'Terraform' | 'Helm' | 'Kubernetes' | 'CloudFormation' | 'Docker' | string;
  file_path: string;
  line_number?: number;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Suppressed' | string;
  category?: string;
  first_seen: string;
  first_seen_relative: string;
  resource?: string;
  guideline?: string;
  snippet?: string;
  raw_metadata?: Record<string, any>;
  occurrences_count?: number;
  suggested_fix?: string;
  fixed_code_snippet?: string;
}

export interface IaCFindingsPageResponse {
  items: IaCFindingItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_providers: string[];
  available_frameworks: string[];
  available_severities: string[];
  available_statuses: string[];
  available_categories?: string[];
}

export interface TriggerIaCScanRequest {
  repository_id: string;
  branch?: string;
  frameworks?: string[];
}

export interface IaCScanJobResponse {
  job_id: string;
  repository_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  findings_count: number;
  message?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface IaCScanConfig {
  repository_id: string;
  enabled_frameworks: string[];
  fail_on_severity: string;
  custom_policies_dir?: string;
  auto_scan_on_push: boolean;
}

export interface IaCScanHistoryItem {
  id: string;
  scan_id: string;
  target_reference: string;
  status: string;
  scanner_name: string;
  scanner_version: string;
  finding_count: number;
  duration_ms?: number;
  started_at: string;
  completed_at?: string;
  trigger_type: string;
  commit_sha?: string;
}

export interface IaCScansListResponse {
  items: IaCScanHistoryItem[];
  total: number;
}

export interface IaCFileItem {
  file_path: string;
  file_name: string;
  framework: string;
  provider: string;
  lines_of_code: number;
  size_bytes: number;
  finding_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  is_valid_syntax: boolean;
  last_scanned_at: string;
}

export interface IaCFilesListResponse {
  items: IaCFileItem[];
  total: number;
}

export interface IaCFileContentResponse {
  file_path: string;
  file_name: string;
  content: string;
  lines_count: number;
  framework: string;
  findings: IaCFindingItem[];
}

export interface IaCPolicyItem {
  rule_id: string;
  title: string;
  description: string;
  provider: string;
  framework: string;
  severity: string;
  category: string;
  status: 'ENFORCED' | 'AUDIT_ONLY' | 'DISABLED' | string;
  violation_count: number;
  benchmark_reference: string;
  remediation_summary: string;
}

export interface IaCPoliciesListResponse {
  items: IaCPolicyItem[];
  total: number;
  enforced_count: number;
  audit_only_count: number;
  disabled_count: number;
}

export interface UpdatePolicyStatusRequest {
  status: 'ENFORCED' | 'AUDIT_ONLY' | 'DISABLED' | string;
}

export interface IaCComplianceControlItem {
  id: string;
  title: string;
  framework: string;
  severity: string;
  status: 'PASSED' | 'FAILED' | 'UNDER_REVIEW' | string;
  affected_resources_count: number;
  rule_id?: string;
}

export interface IaCComplianceBenchmarkItem {
  benchmark_name: string;
  framework_code: string;
  version: string;
  compliance_score: number;
  passing_controls: number;
  total_controls: number;
  critical_violations: number;
  controls: IaCComplianceControlItem[];
}

export interface IaCTopFailedControlItem {
  control_id: string;
  name: string;
  count: number;
}

export interface IaCScanInfo {
  last_scan_relative: string;
  last_scan_duration: string;
  scanner_name: string;
  status: string;
  timestamp?: string;
}

export interface IaCComplianceCheckItem {
  id: string;
  control_id: string;
  control_name: string;
  framework: string;
  provider: string;
  severity: string;
  status: string;
  compliant_resources: number;
  total_resources: number;
  resource_count: string;
  failed_resources_count: number;
  is_new?: boolean;
  rule_id?: string;
  description?: string;
  remediation_guideline?: string;
  rationale?: string;
  audit_procedure?: string;
  last_scanned_at?: string;
}

export interface IaCComplianceResponse {
  benchmarks: IaCComplianceBenchmarkItem[];
  overall_score: number;
  total_controls_audited: number;
  passing_controls_count: number;
  failing_controls_count: number;

  total_checks: number;
  new_checks_count: number;
  passed_count: number;
  passed_pct: number;
  failed_count: number;
  failed_pct: number;
  skipped_count: number;
  skipped_pct: number;

  by_framework: IaCDistributionItem[];
  by_status: IaCStatusDistributionItem[];
  top_failed_controls: IaCTopFailedControlItem[];
  scan_info: IaCScanInfo;

  checks: IaCComplianceCheckItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_frameworks: string[];
  available_statuses: string[];
  available_providers: string[];
}

export interface IaCRemediationItem {
  finding_id: string;
  rule_id: string;
  title: string;
  resource: string;
  file_path: string;
  line_number?: number;
  severity: string;
  status: string;
  suggested_fix: string;
  fixed_code_snippet: string;
  recommended_fix?: string;
  owner_name?: string;
  owner_initials?: string;
  due_date?: string;
  provider?: string;
  pr_number?: number;
  pr_url?: string;
  resolved_at?: string;
}

export interface IaCRemediationKpis {
  total_issues: number;
  new_issues: number;
  fixed_issues: number;
  fixed_pct: number;
  in_progress_issues: number;
  in_progress_pct: number;
  open_issues: number;
  open_pct: number;
  avg_remediation_time: string;
  remediation_time_trend: string;
}

export interface IaCRemediationStatusDistribution {
  fixed_count: number;
  fixed_pct: number;
  in_progress_count: number;
  in_progress_pct: number;
  open_count: number;
  open_pct: number;
  ignored_count: number;
  ignored_pct: number;
}

export interface IaCRemediationSeverityDistribution {
  critical_count: number;
  critical_pct: number;
  high_count: number;
  high_pct: number;
  medium_count: number;
  medium_pct: number;
  low_count: number;
  low_pct: number;
  info_count: number;
  info_pct: number;
}

export interface IaCRemediationOwnerItem {
  name: string;
  initials: string;
  count: number;
  percentage: number;
}

export interface IaCRemediationTimelineItem {
  date: string;
  fixed: number;
  in_progress: number;
  open: number;
}

export interface IaCRemediationOverviewResponse {
  items: IaCRemediationItem[];
  total: number;
  pending_fixes_count: number;
  pr_created_count: number;
  resolved_count: number;
  automated_remediation_rate: number;
  kpis?: IaCRemediationKpis;
  status_distribution?: IaCRemediationStatusDistribution;
  severity_distribution?: IaCRemediationSeverityDistribution;
  top_owners?: IaCRemediationOwnerItem[];
  timeline?: IaCRemediationTimelineItem[];
}

export * from './iac_drift';
export * from './iac_findings_suite';

// ─────────────────────────────────────────────────────────────────────────────
// 9.1 - 9.8 Scan Detail TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface IaCScanSummary {
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCScanTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface IaCScanFindingRow {
  id: string;
  title: string;
  severity: string;
  resource: string;
  status: string;
  file_path?: string;
  line_number?: number;
  rule_id?: string;
  description?: string;
  suggested_fix?: string;
}

export interface IaCScanResourceRow {
  id: string;
  name: string;
  type: string;
  file: string;
  findings_count: number;
  risk: string; // High, Medium, Low
}

export interface IaCScanRuleRow {
  rule_id: string;
  rule_name: string;
  framework: string;
  severity: string;
  triggered_count: number;
}

export interface IaCComplianceFrameworkScore {
  framework: string;
  score_percentage: number;
  status: string;
}

export interface IaCComplianceControlRow {
  control: string;
  title: string;
  status_percentage: number;
  passed: number;
  failed: number;
  not_applicable: number;
}

export interface IaCComplianceFindingRow {
  id: string;
  control: string;
  title: string;
  severity: string;
}

export interface IaCScanComplianceSection {
  framework_scores: IaCComplianceFrameworkScore[];
  framework_results: IaCComplianceControlRow[];
  compliance_findings: IaCComplianceFindingRow[];
}

export interface IaCScanLogRow {
  id: string;
  time: string;
  level: string; // INFO, WARN, ERROR
  message: string;
}

export interface IaCScanEnvVar {
  name: string;
  value: string;
}

export interface IaCScanConfigDetails {
  scanner: string;
  frameworks: string;
  directories: string;
  file_extensions: string;
  exclude_paths: string;
  max_file_size: string;
  parallel_scans: number;
  custom_rules: string;
  env_vars: IaCScanEnvVar[];
}

export interface IaCScanRunDetails {
  scan_id: string;
  trigger_type: string;
  workflow: string;
  run_id: string;
  commit: string;
  commit_full?: string;
  branch: string;
  triggered_by: string;
  start_time: string;
  end_time: string;
  duration: string;
  status: string;
  scanner_versions: Record<string, string>;
}

export interface IaCScanDetailResponse {
  id: string;
  scan_id_display: string;
  status: string;
  scan_type: string;
  environment: string;
  repository: string;
  branch: string;
  commit: string;
  commit_url?: string;
  triggered_by: string;
  start_time: string;
  end_time: string;
  duration: string;
  files_scanned: number;
  resources_detected: number;
  rules_executed: number;
  summary: IaCScanSummary;
  trend: IaCScanTrendPoint[];
  findings: IaCScanFindingRow[];
  resources: IaCScanResourceRow[];
  rules: IaCScanRuleRow[];
  compliance: IaCScanComplianceSection;
  logs: IaCScanLogRow[];
  configuration: IaCScanConfigDetails;
  run_details: IaCScanRunDetails;
}

export interface IaCUpdateScanConfigRequest {
  frameworks?: string;
  directories?: string;
  file_extensions?: string;
  exclude_paths?: string;
  max_file_size?: string;
  parallel_scans?: number;
  env_vars?: IaCScanEnvVar[];
}

// ============================================================================
// Section 4: Configuration Analysis Types (Screens 4.1 to 4.8)
// ============================================================================

export interface IaCConfigIssuesTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCConfigIssuesResourceTypeItem {
  resource_type: string;
  percentage: number;
  count: number;
  color: string;
}

export interface IaCConfigAnalysisOverviewResponse {
  total_resources: number;
  misconfigurations: number;
  compliant: number;
  best_practice_violations: number;
  time_range: string;
  issues_trend: IaCConfigIssuesTrendPoint[];
  issues_by_resource_type: IaCConfigIssuesResourceTypeItem[];
  last_scanned_at: string;
}

export interface IaCInventoryResourceItem {
  id: string;
  name: string;
  resource_type: string;
  provider: string;
  environment: string;
  status: 'Compliant' | 'Non-Compliant';
  issues_count: number;
  file_path?: string;
  line_number?: number;
}

export interface IaCInventoryPageResponse {
  items: IaCInventoryResourceItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_providers: string[];
  available_types: string[];
  available_environments: string[];
}

export interface IaCConfigMisconfigurationItem {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  resource: string;
  rule_id: string;
  title: string;
  provider: string;
  resource_type: string;
  line_number?: number;
  description?: string;
  remediation_guide?: string;
}

export interface IaCMisconfigurationsPageResponse {
  items: IaCConfigMisconfigurationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_severities: string[];
  available_providers: string[];
  available_types: string[];
}

export interface IaCSecureConfigItem {
  id: string;
  name: string;
  resource_type: string;
  provider: string;
  status: string;
  checked_at: string;
  rules_passed_count: number;
  encryption_enabled?: boolean;
}

export interface IaCSecureConfigsPageResponse {
  items: IaCSecureConfigItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_providers: string[];
  available_types: string[];
}

export interface IaCConfigDriftItem {
  id: string;
  resource: string;
  resource_type: string;
  provider: string;
  drift_status: 'Drifted' | 'In Sync';
  last_checked: string;
  diff_count: number;
  can_reconcile?: boolean;
}

export interface IaCConfigDriftPageResponse {
  items: IaCConfigDriftItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_statuses: string[];
  available_providers: string[];
  available_types: string[];
}

export interface IaCBestPracticeCheckItem {
  control_id: string;
  control_name: string;
  status: 'Passed' | 'Failed' | 'Warning';
  resources_ratio: string;
  resources_passed: number;
  resources_total: number;
  framework: string;
  description?: string;
  remediation?: string;
}

export interface IaCBestPracticesResponse {
  framework: string;
  last_scanned_at: string;
  total_checks: number;
  passed: number;
  failed: number;
  warning: number;
  items: IaCBestPracticeCheckItem[];
}

export interface IaCDetectedIssueItem {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  rule_id: string;
  line_number?: number;
  line_display: string;
  description?: string;
  remediation_code?: string;
}

export interface IaCResourceAnalysisDetailResponse {
  resource_id: string;
  name: string;
  resource_type: string;
  provider: string;
  status: string;
  environment: string;
  file_path: string;
  terraform_code: string;
  highlighted_line: number;
  last_scanned_at: string;
  detected_issues: IaCDetectedIssueItem[];
  total_issues: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  security_score: number;
  arn?: string;
  created_at?: string;
}

export interface IaCDifferencePropertyItem {
  property: string;
  declared_value: string;
  actual_value: string;
  status: 'Modified' | 'Missing' | 'Disabled';
}

export interface IaCComparisonDiffResponse {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  provider: string;
  view_mode: string;
  declared_iac: string;
  actual_state: string;
  differences: IaCDifferencePropertyItem[];
  last_checked: string;
  reconcile_status: string;
}

// ============================================================================
// Section 1: IaC Security Overview Interfaces (Screens 1.1 to 1.8)
// ============================================================================

export interface IaCOverviewTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCOverviewTypeBreakdownItem {
  iac_type: string;
  percentage: number;
  findings_count: number;
}

export interface IaCSecurityOverviewDashboardResponse {
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  time_range: string;
  findings_trend: IaCOverviewTrendPoint[];
  findings_by_severity: Record<string, number>;
  findings_by_type: IaCOverviewTypeBreakdownItem[];
}

export interface IaCEnvironmentOverviewItem {
  environment: string;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  compliance_score: number;
}

export interface IaCEnvironmentTrendPoint {
  date: string;
  production: number;
  staging: number;
  development: number;
  qa: number;
}

export interface IaCEnvironmentOverviewResponse {
  environments: IaCEnvironmentOverviewItem[];
  trend: IaCEnvironmentTrendPoint[];
}

export interface IaCProviderOverviewItem {
  provider: string;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resources_count: number;
  resource_percentage: number;
}

export interface IaCProviderOverviewResponse {
  providers: IaCProviderOverviewItem[];
}

export interface IaCOverviewResourceItem {
  id: string;
  name: string;
  resource_type: string;
  provider: string;
  environment: string;
  status: string;
  findings_count: number;
}

export interface IaCOverviewResourcesResponse {
  items: IaCOverviewResourceItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_providers: string[];
  available_environments: string[];
  available_types: string[];
}

export interface IaCCoverageRepoItem {
  id: string;
  repository_name: string;
  iac_files_count: number;
  coverage_percentage: number;
  last_scanned: string;
}

export interface IaCCoverageFileTypeItem {
  extension: string;
  percentage: number;
  file_count: number;
}

export interface IaCCoverageResponse {
  total_repositories: number;
  total_iac_files: number;
  coverage_percentage: number;
  not_scanned_count: number;
  scanned_count: number;
  repositories: IaCCoverageRepoItem[];
  file_types: IaCCoverageFileTypeItem[];
}

export interface IaCOverviewComplianceStandardItem {
  standard: string;
  compliance_percentage: number;
  status: string;
}

export interface IaCOverviewComplianceTrendPoint {
  date: string;
  cis: number;
  nist: number;
  pci_dss: number;
  iso_27001: number;
}

export interface IaCOverviewComplianceFailureItem {
  control: string;
  title: string;
  standard: string;
  findings_count: number;
  severity: string;
}

export interface IaCOverviewComplianceResponse {
  standards: IaCOverviewComplianceStandardItem[];
  trend: IaCOverviewComplianceTrendPoint[];
  top_failures: IaCOverviewComplianceFailureItem[];
}

export interface IaCRiskBreakdownItem {
  category: string;
  percentage: number;
  color: string;
}

export interface IaCRiskTrendPoint {
  date: string;
  score: number;
}

export interface IaCRiskSummaryResponse {
  risk_score: number;
  risk_level: string;
  risk_description: string;
  breakdown: IaCRiskBreakdownItem[];
  trend: IaCRiskTrendPoint[];
}

export interface IaCRecentActivityItem {
  id: string;
  title: string;
  description: string;
  time_relative: string;
  activity_type: string;
  severity?: string;
  user_name?: string;
}

export interface IaCRecentActivityResponse {
  activities: IaCRecentActivityItem[];
  available_activity_types: string[];
  available_users: string[];
}

// =============================================================================
// SECTION 13: POLICIES & QUALITY GATES INTERFACES (13.1 - 13.8)
// =============================================================================

export interface IaCPoliciesOverviewViolationsTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCTopPolicyViolationItem {
  id: string;
  policy_name: string;
  severity: string;
  violations: number;
  repositories: number;
}

export interface IaCPoliciesQualityGatesOverviewResponse {
  total_policies: number;
  enforced: number;
  draft: number;
  disabled: number;
  policy_compliance_total: number;
  policy_compliance_compliant: number;
  policy_compliance_non_compliant: number;
  policy_compliance_not_evaluated: number;
  quality_gate_total: number;
  quality_gate_passed: number;
  quality_gate_failed: number;
  quality_gate_skipped: number;
  violations_trend: IaCPoliciesOverviewViolationsTrendPoint[];
  top_violations: IaCTopPolicyViolationItem[];
}

export interface IaCPolicyCatalogItem {
  id: string;
  name: string;
  type: string;
  severity: string;
  status: string;
  framework: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IaCPoliciesCatalogResponse {
  items: IaCPolicyCatalogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_types: string[];
  available_statuses: string[];
  available_frameworks: string[];
}

export interface IaCPolicyDetailRuleItem {
  rule_id: string;
  rule_name: string;
  severity: string;
  provider: string;
}

export interface IaCPolicyDetailExceptionItem {
  id: string;
  title: string;
  repository: string;
  valid_until: string;
  status: string;
}

export interface IaCPolicyDetailRepoItem {
  repository_name: string;
  violations_count: number;
  last_scanned: string;
}

export interface IaCPolicyDetailAuditItem {
  id: string;
  action: string;
  performed_by: string;
  timestamp: string;
  details: string;
}

export interface IaCPolicyDetailResponse {
  id: string;
  name: string;
  subtitle: string;
  status: string;
  severity: string;
  type: string;
  framework: string;
  description: string;
  scope_frameworks: string[];
  scope_resources: string[];
  evaluation_logic: string;
  remediation_text: string;
  remediation_guide_url?: string;
  rules: IaCPolicyDetailRuleItem[];
  exceptions: IaCPolicyDetailExceptionItem[];
  affected_repos: IaCPolicyDetailRepoItem[];
  audit_logs: IaCPolicyDetailAuditItem[];
}

export interface CreatePolicyRequest {
  name: string;
  type: string;
  severity: string;
  status?: string;
  framework: string;
  description: string;
  scope_frameworks?: string[];
  scope_resources?: string[];
  evaluation_logic: string;
  remediation_text: string;
}

export interface IaCQualityGateItem {
  id: string;
  name: string;
  description: string;
  status: string;
  fail_condition: string;
  affected_repos: number;
}

export interface IaCQualityGatesListResponse {
  items: IaCQualityGateItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_statuses: string[];
  available_repositories: string[];
}

export interface IaCQualityGateRuleItem {
  rule_id: string;
  rule_name: string;
  severity: string;
}

export interface IaCQualityGateRepoItem {
  name: string;
  status: string;
  last_checked: string;
}

export interface IaCQualityGatePipelineItem {
  provider: string;
  snippet: string;
  status: string;
}

export interface IaCQualityGateDetailResponse {
  id: string;
  name: string;
  subtitle: string;
  status: string;
  fail_condition: string;
  applied_to_count: number;
  created_by: string;
  last_updated: string;
  rules: IaCQualityGateRuleItem[];
  repositories: IaCQualityGateRepoItem[];
  pipelines: IaCQualityGatePipelineItem[];
  notifications: string[];
  audit_logs: IaCPolicyDetailAuditItem[];
}

export interface CreateQualityGateRequest {
  name: string;
  description: string;
  status?: string;
  fail_condition: string;
  rules?: string[];
  repositories?: string[];
}

export interface AddQualityGateRuleRequest {
  rule_id: string;
  rule_name: string;
  severity: string;
}

export interface IaCPolicyViolationItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  repository: string;
  detected: string;
  rule_id?: string;
  file_path?: string;
  line_number?: number;
}

export interface IaCPolicyViolationsResponse {
  items: IaCPolicyViolationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_severities: string[];
  available_statuses: string[];
  available_repositories: string[];
  available_ranges: string[];
}

export interface IaCPolicyExceptionItem {
  id: string;
  title: string;
  policy_rule: string;
  repository: string;
  valid_until: string;
  status: string;
  reason?: string;
  created_by?: string;
}

export interface IaCPolicyExceptionsResponse {
  items: IaCPolicyExceptionItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_statuses: string[];
}

export interface CreatePolicyExceptionRequest {
  title: string;
  policy_rule: string;
  repository: string;
  valid_until: string;
  reason?: string;
}

export interface IaCPoliciesSettings {
  enable_policy_enforcement: boolean;
  block_merge_on_gate_failure: boolean;
  evaluate_on_pull_request: boolean;
  evaluate_on_branch_push: boolean;
  include_deleted_resources: boolean;
  show_policy_hints: boolean;
  default_quality_gate: string;
  available_gates: string[];
  last_saved?: string;
}

// =============================================================================
// SECTION 6: IAC RULES INTERFACES (SCREENS 6.1 TO 6.8)
// =============================================================================

export interface IaCRulesSeverityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCRulesFrameworkDistributionItem {
  framework: string;
  percentage: number;
  count: number;
  color: string;
}

export interface IaCRulesOverviewResponse {
  total_rules: number;
  enabled_rules: number;
  disabled_rules: number;
  custom_rules: number;
  severity_distribution: IaCRulesSeverityDistribution;
  framework_distribution: IaCRulesFrameworkDistributionItem[];
}

export interface IaCRuleItem {
  id: string;
  name: string;
  provider: string;
  severity: string;
  status: 'Enabled' | 'Disabled';
  framework: string;
  version: string;
  description?: string;
  category?: string;
  rule_type?: string;
  is_custom: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IaCRulesListResponse {
  items: IaCRuleItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_frameworks: string[];
  available_providers: string[];
  available_severities: string[];
  available_statuses: string[];
}

export interface IaCRuleDetailResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  severity: string;
  rule_type: string;
  frameworks: string[];
  status: 'Enabled' | 'Disabled';
  rego_code: string;
  remediation_text: string;
  mappings: string[];
  exceptions: string[];
  version: string;
  is_custom: boolean;
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  category?: string;
  provider?: string;
  severity?: string;
  rule_type?: string;
  frameworks?: string[];
  status?: 'Enabled' | 'Disabled';
  rego_code?: string;
  remediation_text?: string;
  is_custom?: boolean;
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  category?: string;
  provider?: string;
  severity?: string;
  rule_type?: string;
  frameworks?: string[];
  status?: 'Enabled' | 'Disabled';
  rego_code?: string;
  remediation_text?: string;
}

export interface ValidateRegoRequest {
  rego_code: string;
}

export interface ValidateRegoResponse {
  valid: boolean;
  errors: string[];
  package_name?: string;
  rules_defined: string[];
}

export interface IaCRulePackItem {
  name: string;
  framework: string;
  rules_count: number;
  version: string;
  description: string;
  status: 'Enabled' | 'Disabled';
  is_custom: boolean;
}

export interface IaCRulePacksListResponse {
  items: IaCRulePackItem[];
  total: number;
  builtin_count: number;
  custom_count: number;
}

// ============================================================================
// Section 8: Scans Suite Types (Screens 8.1 to 8.8)
// ============================================================================

export interface IaCTopRepoFindingsItem {
  repository: string;
  scans: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCScansOverviewResponse {
  total_scans: number;
  succeeded_scans: number;
  failed_scans: number;
  in_progress_scans: number;
  results_trend: IaCScanTrendPoint[];
  top_repositories: IaCTopRepoFindingsItem[];
  time_range: string;
}

export interface IaCScanHistoryRow {
  scan_id: string;
  repository: string;
  environment: string;
  triggered_by: string;
  status: 'Succeeded' | 'Failed' | 'In Progress';
  findings_count: number;
  started_at: string;
  duration?: string;
}

export interface IaCScanHistoryResponse {
  items: IaCScanHistoryRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_repositories: string[];
  available_environments: string[];
}

export interface IaCScheduledScanItem {
  id: string;
  name: string;
  repository: string;
  frequency: 'Daily' | 'Weekly' | 'On Push';
  next_run: string;
  status: 'Active' | 'Inactive';
  branch: string;
  environment: string;
}

export interface IaCScheduledScansResponse {
  items: IaCScheduledScanItem[];
  total: number;
}

export interface CreateScheduledScanRequest {
  name: string;
  repository: string;
  frequency: string;
  next_run?: string;
  status?: 'Active' | 'Inactive';
  branch?: string;
  environment?: string;
}

export interface TriggerOnDemandScanRequest {
  repository: string;
  branch: string;
  environment: string;
  scan_type: 'Full Scan' | 'Changed Files Only' | 'Custom Paths';
  custom_paths?: string;
  include_terraform?: boolean;
  include_cloudformation?: boolean;
  include_kubernetes?: boolean;
  include_custom_templates?: boolean;
}

export interface TriggerOnDemandScanResponse {
  scan_id: string;
  repository: string;
  branch: string;
  environment: string;
  status: string;
  queued_at: string;
  message: string;
}

export interface IaCScanConfigurationsDTO {
  name: string;
  description: string;
  scanners: string[];
  scan_depth: 'Standard' | 'Deep' | 'Fast';
  max_file_size: string;
  parallel_scans: number;
  custom_rules_enabled?: boolean;
}

export interface IaCComparisonSeverityDiff {
  severity: string;
  current_count: number;
  previous_count: number;
  delta: number;
  direction: 'up' | 'down' | 'same';
}

export interface IaCChangedResourceItem {
  resource: string;
  change_type: 'New' | 'Improved' | 'Worsened' | 'Resolved' | 'Unchanged';
  previous_severity: string;
  current_severity: string;
}

export interface IaCResultsComparisonResponse {
  scan_1_id: string;
  scan_1_label: string;
  scan_2_id: string;
  scan_2_label: string;
  available_scans: Array<{ id: string; label: string; date: string }>;
  critical: IaCComparisonSeverityDiff;
  high: IaCComparisonSeverityDiff;
  medium: IaCComparisonSeverityDiff;
  low: IaCComparisonSeverityDiff;
  top_changed_resources: IaCChangedResourceItem[];
  chart_data: Array<{ severity: string; previous: number; current: number }>;
}

export interface IaCQueueScanItem {
  scan_id: string;
  repository: string;
  environment: string;
  progress: number;
  status: 'Running' | 'Queued' | 'Cancelled';
  started_at: string;
  eta?: string;
}

export interface IaCScanQueueResponse {
  running: IaCQueueScanItem[];
  queued: IaCQueueScanItem[];
  running_count: number;
  queued_count: number;
}

export interface IaCScanGlobalSettings {
  configuration_preset: string;
  notify_on_completion: boolean;
  notify_on_failure: boolean;
  notify_on_critical: boolean;
  notification_channels: string[];
  scan_retention_days: number;
  concurrent_scans: number;
  scan_timeout_minutes: number;
  upload_to_dashboard: boolean;
  store_scan_logs: boolean;
  enable_incremental_scanning: boolean;
}

// ============================================================================
// SECTION 11: COMPLIANCE & BENCHMARKS SUITE (SCREENS 11.1 THROUGH 11.8)
// ============================================================================

export interface IaCComplianceOverviewKpis {
  frameworks: number;
  total_controls: number;
  compliant_controls: number;
  non_compliant_controls: number;
  not_evaluated_controls: number;
  compliance_percentage: number;
}

export interface IaCFrameworkCoverageItem {
  name: string;
  version: string;
  passing_controls: number;
  total_controls: number;
  passing_percentage: number;
  status: 'Passing' | 'Warning' | 'Failing';
}

export interface IaCComplianceTrendPoint {
  date: string;
  compliant: number;
  non_compliant: number;
  not_evaluated: number;
}

export interface IaCComplianceOverviewResponse {
  kpis: IaCComplianceOverviewKpis;
  framework_coverages: IaCFrameworkCoverageItem[];
  trend: IaCComplianceTrendPoint[];
  repository: string;
  available_repositories: string[];
}

export interface IaCComplianceFrameworkItem {
  id: string;
  name: string;
  version: string;
  description: string;
  controls_count: number;
  compliance_percentage: number;
  last_scanned: string;
  status: string;
  is_custom: boolean;
}

export interface IaCComplianceFrameworksResponse {
  items: IaCComplianceFrameworkItem[];
  total: number;
}

export interface CreateFrameworkRequest {
  name: string;
  version?: string;
  description: string;
  controls_count?: number;
}

export interface IaCComplianceControlMappingItem {
  control_id: string;
  control_name: string;
  framework: string;
  status: 'Compliant' | 'Non-Compliant';
  findings_count: number;
  severity: string;
}

export interface IaCComplianceControlsResponse {
  items: IaCComplianceControlMappingItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_frameworks: string[];
  available_statuses: string[];
  available_severities: string[];
}

export interface IaCControlFindingItem {
  finding_id: string;
  title: string;
  resource: string;
  severity: string;
  file_path: string;
  status: string;
}

export interface IaCControlDetailResponse {
  control_id: string;
  control_name: string;
  framework: string;
  version: string;
  category: string;
  severity: string;
  status: 'Compliant' | 'Non-Compliant';
  last_evaluated: string;
  summary: string;
  description: string;
  documentation_url: string;
  remediation_guide: string;
  findings: IaCControlFindingItem[];
  findings_by_severity: Record<string, number>;
  evidence_count: number;
}

export interface GenerateComplianceReportRequest {
  frameworks: string[];
  repository: string;
  date_range: string;
  format: 'PDF' | 'CSV' | 'JSON';
  include_executive_summary: boolean;
  include_control_status: boolean;
  include_findings_details: boolean;
  include_remediation: boolean;
  include_evidence: boolean;
  include_appendices: boolean;
}

export interface ComplianceReportGeneratedResponse {
  report_id: string;
  report_name: string;
  generated_at: string;
  download_url: string;
  summary_findings_count: number;
  frameworks: string[];
  format: string;
  file_size: string;
}

export interface ComplianceReportHistoryResponse {
  items: ComplianceReportGeneratedResponse[];
  total: number;
}

export interface IaCComplianceEvidenceItem {
  evidence_id: string;
  control_id: string;
  description: string;
  type: string;
  status: 'Valid' | 'Pending' | 'Expired';
  updated: string;
  file_url?: string;
}

export interface IaCComplianceEvidenceResponse {
  items: IaCComplianceEvidenceItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_frameworks: string[];
  available_controls: string[];
  available_statuses: string[];
}

export interface CreateEvidenceRequest {
  control_id: string;
  description: string;
  type?: string;
  status?: string;
}

export interface IaCComplianceExceptionItem {
  exception_id: string;
  control_id: string;
  reason: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  valid_until: string;
  created_by: string;
}

export interface IaCComplianceExceptionsResponse {
  items: IaCComplianceExceptionItem[];
  total: number;
}

export interface CreateComplianceExceptionRequest {
  control_id: string;
  reason: string;
  valid_until?: string;
  status?: string;
}

export interface IaCComplianceAuditLogItem {
  id: string;
  time: string;
  event: string;
  user: string;
  details: string;
}

export interface IaCComplianceAuditLogsResponse {
  items: IaCComplianceAuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_events: string[];
  available_users: string[];
}

export interface IaCComplianceSettings {
  auto_evaluate_on_scan: boolean;
  enforce_strict_benchmarks: boolean;
  notify_on_non_compliance: boolean;
  notification_channels: string[];
  default_framework: string;
  evidence_retention_days: number;
}

export * from './iac_findings_suite';
export * from './iac_remediation_suite';
export * from './iac_rule_detail_suite';
export * from './iac_settings_suite';
export * from './iac_graph_suite';
export * from './iac_integrations_suite';
export * from './iac_run_suite';
