export interface SecretKpis {
  exposed_secrets: number;
  exposed_trend: string;
  exposed_trend_positive: boolean;
  high_severity: number;
  high_severity_trend: string;
  high_severity_positive: boolean;
  repositories: number;
  repositories_trend: string;
  repositories_positive: boolean;
  secrets_remediated: number;
  remediated_trend: string;
  remediated_positive: boolean;
}

export interface SecretSeverityDistribution {
  critical: number;
  critical_pct: number;
  high: number;
  high_pct: number;
  medium: number;
  medium_pct: number;
  low: number;
  low_pct: number;
  total: number;
}

export interface SecretTrendPoint {
  date: string;
  found: number;
  remediated: number;
}

export interface SecretTypeMetric {
  type_name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentSecretFindingItem {
  id: string;
  secret_type: string;
  brand: string;
  repository: string;
  repository_id?: string | null;
  file_path: string;
  line_number?: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detected_at: string;
  snippet?: string | null;
  status: string;
  rule_id?: string | null;
  raw_metadata?: Record<string, any>;
}

export interface TopRepositorySecretItem {
  repository_id: string;
  name: string;
  full_name: string;
  provider: string;
  secret_count: number;
  percentage: number;
  color: string;
}

export interface RemediationProgressMetric {
  remediated: number;
  total: number;
  percentage: number;
}

export interface SecretsOverviewResponse {
  generated_at: string;
  project_id?: string | null;
  repository_id?: string | null;
  date_range?: string | null;
  kpis: SecretKpis;
  severity_distribution: SecretSeverityDistribution;
  trend: SecretTrendPoint[];
  top_secret_types: SecretTypeMetric[];
  recent_findings: RecentSecretFindingItem[];
  top_repositories: TopRepositorySecretItem[];
  remediation_progress: RemediationProgressMetric;
}

export interface SecretInventoryItem {
  id: string;
  category: string;
  secret_type: string;
  occurrences: number;
  repositories_affected: number;
  severity: string;
  sample_file: string;
  last_detected: string;
  status: string;
}

export interface SecretPolicyItem {
  id: string;
  name: string;
  description: string;
  scanner: string;
  severity: string;
  action: string;
  enabled: boolean;
  rules_count: number;
  created_at: string;
}

// ─────────────────────────────────────────────
// Secret Scans (/code/secrets/scans) Types
// ─────────────────────────────────────────────

export interface SecretScanKpis {
  total_scans: number;
  total_scans_trend: string;
  total_scans_positive: boolean;
  scans_with_findings: number;
  scans_with_findings_trend: string;
  scans_with_findings_positive: boolean;
  clean_scans: number;
  clean_scans_trend: string;
  clean_scans_positive: boolean;
  avg_scan_time: string;
  avg_scan_time_trend: string;
  avg_scan_time_positive: boolean;
}

export interface SecretScanTrendPoint {
  date: string;
  findings: number;
  clean: number;
}

export interface SecretScanSeverityDonut {
  total: number;
  critical: number;
  critical_pct: number;
  high: number;
  high_pct: number;
  medium: number;
  medium_pct: number;
  low: number;
  low_pct: number;
}

export interface SecretScanCoverage {
  repositories_scanned: number;
  repositories_total: number;
  repositories_pct: number;
  branches_scanned: number;
  branches_total: number;
  branches_pct: number;
  commits_scanned: number;
  commits_total: number;
  commits_pct: number;
  files_scanned: number;
}

export interface SecretScanMetricsResponse {
  kpis: SecretScanKpis;
  trends: SecretScanTrendPoint[];
  severity: SecretScanSeverityDonut;
  coverage: SecretScanCoverage;
}

export interface SecretScanFindingsCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface SecretScanTableItem {
  id: string;
  repository: string;
  repository_provider?: string;
  branch: string;
  scan_type: string;
  status: string;
  findings: SecretScanFindingsCount;
  duration: string;
  started_at: string;
  commit_sha?: string | null;
  commit_hash?: string | null;
  triggered_by?: string;
  raw_status?: string;
  finding_count?: number;
  scanner?: string;
  duration_seconds?: number | null;
  created_at?: string;
}

export interface SecretScansTableResponse {
  items: SecretScanTableItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SecretScanConfig {
  scan_type: string;
  scope: string;
  include_paths: string;
  exclude_paths: string;
  detection_rules: string;
  scan_on_push: boolean;
  scan_on_pr: boolean;
  schedule: string;
}

export interface SecretScanIntegrationItem {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

export interface SecretScanActivityItem {
  id: string;
  message: string;
  status_color: 'blue' | 'orange' | 'green' | 'red' | string;
  time_ago: string;
  timestamp: string;
}

export interface TriggerNewSecretScanRequest {
  repository: string;
  branch?: string;
  scan_type?: string;
  scope?: string;
}

export interface ScheduleSecretScanRequest {
  repository: string;
  branch?: string;
  frequency: string;
  time: string;
}

// ─────────────────────────────────────────────
// Scan Detail (/code/secrets/scans/[id]) Types
// ─────────────────────────────────────────────

export interface RiskAnalysisInfo {
  risk_level: string;
  description: string;
  potential_impact: string[];
}

export interface CodeSnippetLine {
  line_number: number;
  content: string;
  is_highlighted: boolean;
}

export interface CodeContextInfo {
  file_path: string;
  start_line: number;
  highlight_line: number;
  lines: CodeSnippetLine[];
}

export interface FileMetadataInfo {
  file_path: string;
  file_size: string;
  language: string;
  last_modified: string;
  author: string;
  lines_of_code: number;
  sha: string;
}

export interface RemediationStepItem {
  step_number: number;
  title: string;
  description: string;
  action_label: string;
  action_type: 'revoke_key' | 'view_guide' | 'rotate_key' | 'create_pr' | string;
  is_danger?: boolean;
}

export interface ScanTimelineStepItem {
  step_id: string;
  title: string;
  time_or_detail: string;
  status: 'completed' | 'running' | 'findings' | 'pending' | string;
  color: 'green' | 'blue' | 'red' | string;
}

export interface RelatedFindingScanItem {
  id: string;
  brand: string;
  title: string;
  file_path: string;
  severity: string;
  date: string;
}

export interface ScanMetadataBlock {
  scanner_version: string;
  rules_version: string;
  files_scanned: string;
  run_type: string;
  configuration: string;
  triggered_by: string;
}

export interface SecretScanFindingDetailItem {
  index: number;
  id: string;
  secret_type: string;
  brand_icon: string;
  file_path: string;
  line_number: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'Resolved' | string;
  title: string;
  description: string;
  pattern: string;
  detected_value: string;
  repository: string;
  branch: string;
  commit: string;
  first_detected: string;
  last_seen: string;
  occurrences: number;
  risk_analysis: RiskAnalysisInfo;
  code_context: CodeContextInfo;
  file_info: FileMetadataInfo;
  remediation_suggestions: RemediationStepItem[];
}

export interface SecretScanFilesLocationItem {
  file_path: string;
  language: string;
  findings_count: number;
  critical_count: number;
  high_count: number;
  file_size: string;
}

export interface SecretScanTypeBreakdownItem {
  secret_type: string;
  brand: string;
  count: number;
  percentage: number;
  severity: string;
}

export interface SecretScanComparisonItem {
  metric: string;
  previous_scan: string;
  current_scan: string;
  delta: string;
  status: 'improved' | 'degraded' | 'neutral' | string;
}

export interface SecretScanLogItem {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  message: string;
}

export interface SecretScanDetailKpis {
  critical_count: number;
  critical_trend: string;
  critical_subtitle: string;
  high_count: number;
  high_trend: string;
  high_subtitle: string;
  medium_count: number;
  medium_trend: string;
  medium_subtitle: string;
  low_count: number;
  low_trend: string;
  low_subtitle: string;
  resolved_count: number;
  resolved_trend: string;
  resolved_subtitle: string;
}

export interface SecretScanDetailResponse {
  scan_id: string;
  repository: string;
  repository_type: string;
  repository_provider: string;
  branch: string;
  commit: string;
  scan_type: string;
  started_at: string;
  duration: string;
  status: string;
  kpis: SecretScanDetailKpis;
  findings: SecretScanFindingDetailItem[];
  files_and_locations: SecretScanFilesLocationItem[];
  secrets_by_type: SecretScanTypeBreakdownItem[];
  comparison: SecretScanComparisonItem[];
  scan_logs: SecretScanLogItem[];
  timeline: ScanTimelineStepItem[];
  related_findings: RelatedFindingScanItem[];
  scan_metadata: ScanMetadataBlock;
}

export interface RemediationPRResponse {
  pr_number: number;
  pr_url: string;
  branch_name: string;
  title: string;
  status: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Secret Remediation (/code/secrets/remediation) Types
// ─────────────────────────────────────────────

export interface SecretRemediationMetrics {
  open_findings: number;
  open_trend: string;
  remediated: number;
  remediated_trend: string;
  in_progress: number;
  in_progress_trend: string;
  prs_created: number;
  prs_trend: string;
}

export interface DiffSnippetLine {
  line_number: number;
  content: string;
  type: 'context' | 'removed' | 'added';
}

export interface SecretRemediationCodeDiff {
  file_path: string;
  language: string;
  before_lines: DiffSnippetLine[];
  after_lines: DiffSnippetLine[];
}

export interface SecretRemediationActionPlan {
  step_1_title: string;
  step_1_desc: string;
  step_1_action_url?: string;
  step_1_action_label: string;
  step_2_title: string;
  step_2_desc: string;
  step_2_snippet: string;
  step_3_title: string;
  step_3_desc: string;
  step_4_title: string;
  step_4_desc: string;
  step_4_action_url?: string;
  step_4_action_label: string;
  step_5_title: string;
  step_5_desc: string;
  step_5_action_label: string;
}

export interface SecretRemediationItem {
  id: string;
  title: string;
  masked_value: string;
  secret_type: string;
  brand_icon: string;
  type_label: string;
  repository: string;
  repository_provider: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'In Progress' | 'Remediated' | 'Ignored' | string;
  detected_at: string;
  recommended_action: string;
  action_type: 'create_pr' | 'view_diff' | 'view_details' | 'unignore' | string;
  file_path: string;
  line_number: number;
  pattern: string;
  detected_value: string;
  branch: string;
  commit: string;
  last_seen: string;
  occurrences: number;
  diff: SecretRemediationCodeDiff;
  actions: SecretRemediationActionPlan;
}

export interface SecretRemediationListResponse {
  items: SecretRemediationItem[];
  total: number;
  open_count: number;
  in_progress_count: number;
  remediated_count: number;
  ignored_count: number;
}

export type SecretRemediationFindingsResponse = SecretRemediationListResponse;

export interface UpdateRemediationStatusRequest {
  status: 'Open' | 'In Progress' | 'Remediated' | 'Ignored' | string;
  reason?: string;
}

export interface BulkRemediateRequest {
  finding_ids: string[];
  strategy?: string;
}

export interface BulkRemediateResponse {
  success: boolean;
  processed_count: number;
  prs_created: string[];
  message: string;
}

export interface RemediationSettings {
  auto_pr_enabled: boolean;
  require_approval: boolean;
  branch_prefix: string;
  default_reviewers: string[];
  secret_manager: string;
  auto_rescan_on_pr: boolean;
}

// ─────────────────────────────────────────────
// Secret Inventory (/code/secrets/inventory) Types
// ─────────────────────────────────────────────

export interface SecretInventoryMetrics {
  total_secrets: number;
  total_trend: string;
  critical: number;
  critical_trend: string;
  high: number;
  high_trend: string;
  medium: number;
  medium_trend: string;
  low: number;
  low_trend: string;
}

export interface SecretInventoryRow {
  id: string;
  secret_title: string;
  masked_value: string;
  brand_icon: string;
  type_label: string;
  repository: string;
  file_path: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'In Progress' | 'Resolved' | string;
  first_detected: string;
  last_seen: string;
  commit: string;
  branch: string;
  line_number: number;
  pattern: string;
  detected_value: string;
}

export interface SecretInventoryTableResponse {
  items: SecretInventoryRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UpdateInventoryStatusRequest {
  status: 'Open' | 'In Progress' | 'Resolved' | string;
  reason?: string;
}

export interface AddInventoryPolicyRequest {
  name: string;
  secret_type: string;
  severity?: string;
  action?: string;
  description?: string;
  enabled?: boolean;
}

export interface AddInventoryPolicyResponse {
  id: string;
  name: string;
  secret_type: string;
  severity: string;
  action: string;
  enabled: boolean;
  created_at: string;
  message: string;
}

// ─────────────────────────────────────────────
// Secret Detections (/code/secrets/detections) Types
// ─────────────────────────────────────────────

export interface SecretDetectionsKpis {
  total_findings: number;
  total_trend: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  resolved_count: number;
  resolved_trend: string;
  resolved_rate: string;
  open_count: number;
  open_trend: string;
  open_subtitle: string;
  repos_affected: number;
  repos_total: number;
  repos_trend: string;
}

export interface SecretDetectionsTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface SecretDetectionsTypeBreakdown {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SecretDetectionsSeverityBar {
  severity: string;
  count: number;
  color: string;
}

export interface SecretDetectionsAnalytics {
  trends: SecretDetectionsTrendPoint[];
  by_type: SecretDetectionsTypeBreakdown[];
  by_severity: SecretDetectionsSeverityBar[];
}

export interface SecretDetectionsOverviewResponse {
  kpis: SecretDetectionsKpis;
  analytics: SecretDetectionsAnalytics;
}

export interface SecretDetectionsItem {
  id: string;
  secret_title: string;
  masked_value: string;
  brand_icon: string;
  type_label: string;
  repository: string;
  file_path: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'In Progress' | 'Resolved' | string;
  first_detected: string;
  last_seen: string;
  commit: string;
  branch: string;
  line_number: number;
  pattern: string;
  detected_value: string;
}

export interface SecretDetectionsTableResponse {
  items: SecretDetectionsItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UpdateDetectionStatusRequest {
  status: 'Open' | 'In Progress' | 'Resolved' | string;
  reason?: string;
}

// ─────────────────────────────────────────────
// Secret Repositories & Mapping (/code/secrets/repositories) Types
// ─────────────────────────────────────────────

export interface SecretRepoKpis {
  total_repositories: number;
  repositories_with_secrets: number;
  repositories_with_secrets_trend: string;
  total_secrets_found: number;
  total_secrets_trend: string;
  high_risk_repositories: number;
  high_risk_trend: string;
  clean_repositories: number;
  clean_trend: string;
}

export interface SecretRepoBarItem {
  repository: string;
  count: number;
  color: string;
}

export interface SecretRepoTypeBreakdown {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SecretRepoRiskRank {
  rank: number;
  repository: string;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Clean' | string;
  secrets_count: number;
}

export interface SecretRepoAnalytics {
  by_secret_count: SecretRepoBarItem[];
  by_secret_type: SecretRepoTypeBreakdown[];
  top_risk_repositories: SecretRepoRiskRank[];
}

export interface SecretRepositoriesOverviewResponse {
  kpis: SecretRepoKpis;
  analytics: SecretRepoAnalytics;
}

export interface SecretRepositoryRow {
  id: string;
  name: string;
  organization: string;
  visibility: 'Private' | 'Public' | string;
  secret_count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  last_scan: string;
  status: 'Issues Found' | 'Clean' | string;
  default_branch: string;
  open_findings: number;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Clean' | string;
  top_secret_types: string[];
}

export interface SecretRepositoriesTableResponse {
  items: SecretRepositoryRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TriggerRepoScanRequest {
  repository: string;
  branch?: string;
}

export interface TriggerRepoScanResponse {
  scan_id: string;
  job_id?: string;
  repository: string;
  repository_id?: string;
  branch?: string;
  status: string;
  message: string;
}

export interface SecretRotationRuleItem {
  id: string;
  name: string;
  secret_type: string;
  repository_scope: string;
  rotation_interval_days: number;
  rotation_interval_label?: string;
  status: 'Active' | 'Paused' | 'Pending' | string;
  last_rotated?: string | null;
  next_rotation?: string | null;
  next_rotation_date?: string | null;
  compliance_rate?: number;
  icon_type?: string;
}

export interface CreateRotationRuleRequest {
  name: string;
  secret_type: string;
  repository_scope: string;
  rotation_interval_days: number;
  status?: string;
}

export interface UpdateRotationRuleRequest {
  rotation_interval_days?: number;
  status?: string;
  repository_scope?: string;
}

export interface TriggerRuleRotationResponse {
  success: boolean;
  message: string;
  rule_id: string;
  rotated_at?: string;
}

export interface ConnectedToolCard {
  id: string;
  name: string;
  category: string;
  icon?: string;
  connected: boolean;
  status: 'Connected' | 'Disconnected' | 'Syncing' | string;
  last_sync?: string | null;
  sync_frequency?: string;
  accounts_count?: number;
  description?: string;
}

export interface ConnectIntegrationRequest {
  tool_id: string;
  credentials_key?: string;
  enabled?: boolean;
}

export interface UpdateIntegrationConfigRequest {
  webhook_url?: string;
  notification_email?: string;
  [key: string]: any;
}

export interface SecretsIntegrationConfig {
  webhook_url: string;
  notification_email: string;
  auto_sync_enabled?: boolean;
  alert_on_unrotated?: boolean;
  enforce_strict_expiry?: boolean;
  [key: string]: any;
}

export interface RotationGlobalSettings {
  default_rotation_days: number;
  grace_period_days: number;
  notify_days_before: number;
  auto_disable_unrotated: boolean;
  default_rotation_interval_days?: number;
  failure_retry_limit?: number;
  slack_notifications_enabled?: boolean;
  email_alerts_enabled?: boolean;
}

export interface RecentRotationActivityItem {
  id: string;
  rule_id?: string;
  rule_name?: string;
  secret_name?: string;
  secret_type: string;
  repository: string;
  status: 'Success' | 'Failed' | 'In Progress' | string;
  rotated_at: string;
  executor: string;
  icon_type?: string;
  old_value_masked?: string;
  new_value_masked?: string;
}

export interface IntegrationActivityEvent {
  id: string;
  timestamp: string;
  event: string;
  tool: string;
  status: string;
  icon_type?: string;
  tool_name?: string;
  event_description?: string;
  repository?: string;
  time_ago?: string;
}

export interface SecretIntegrationsOverviewResponse {
  kpis: {
    active_integrations: number;
    rotation_rules_count: number;
    secrets_rotated_this_month: number;
    compliance_score: number;
    connected_tools?: number;
    connected_tools_subtitle?: string;
    auto_rotation_rules?: number;
    auto_rotation_rules_trend?: string;
    auto_rotation_rules_subtitle?: string;
    secrets_rotated?: number;
    secrets_rotated_trend?: string;
    secrets_rotated_subtitle?: string;
    integration_health_pct?: number;
    integration_health_subtitle?: string;
  };
  connected_tools: ConnectedToolCard[];
  rotation_rules: SecretRotationRuleItem[];
  recent_activity: RecentRotationActivityItem[];
  integration_activity?: IntegrationActivityEvent[];
  config: SecretsIntegrationConfig;
  rotation_stats?: {
    labels: string[];
    values: number[];
  };
}

export * from './policies';
export * from './secretDetail';
export * from './detectionDetail';








