/**
 * TypeScript definitions for IaC Drift Detection workspace.
 * Matches backend schemas from app/schemas/iac_drift.py.
 */

export interface IaCDriftEventItem {
  id: string;
  resource_id: string;
  timestamp: string;
  event_type: 'Configuration' | 'Rule Change' | 'Deleted' | 'In Sync' | 'Tags Updated' | string;
  title: string;
  description: string;
  status: 'Drifted' | 'In Sync' | 'Ignored' | string;
  severity: 'error' | 'warning' | 'info' | 'success' | string;
  diff_payload?: Record<string, any>;
}

export interface IaCDriftOverviewResponse {
  monitored_count: number;
  drifted_count: number;
  in_sync_count: number;
  ignored_count: number;
  in_sync_percent: number;
  drifted_percent: number;
  ignored_percent: number;
  time_filter: string;
  recent_events: IaCDriftEventItem[];
}

export interface IaCDriftResourceItem {
  id: string;
  name: string;
  resource_id: string;
  provider: 'AWS' | 'Kubernetes' | 'Azure' | 'GCP' | string;
  resource_type: string;
  drift_status: 'Drifted' | 'In Sync' | 'Ignored' | string;
  region: string;
  workspace: string;
  last_detected: string;
  last_detected_relative: string;
  desired_hcl: string;
  actual_hcl: string;
  diff_summary?: string | null;
  remediation_plan?: string | null;
  is_ignored: boolean;
  ignore_reason?: string | null;
}

export interface IaCDriftResourcesPage {
  items: IaCDriftResourceItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface IaCDriftConfigDTO {
  resource_id: string;
  enable_drift_detection: boolean;
  compare_terraform_state: boolean;
  include_tags: boolean;
  ignore_metadata_changes: boolean;
  auto_resolve_known: boolean;
  scan_frequency: string;
  scope_configuration: boolean;
  scope_tags: boolean;
  scope_permissions: boolean;
  scope_network: boolean;
  scope_encryption: boolean;
  scope_lifecycle: boolean;
  notify_on_detection: boolean;
  notify_on_resolution: boolean;
  severity_threshold: string;
  notification_channels: string[];
}

export interface IaCBaselineStateDTO {
  workspace: string;
  comparison_source: string;
  state_file: string;
  last_updated_at: string;
  resources_tracked: number;
  normalize_values: boolean;
  ignore_computed_fields: boolean;
  custom_ignore_rules: string;
  available_state_files: string[];
}

export interface IaCBaselineCompareRequest {
  state_file: string;
  workspace?: string;
  normalize_values?: boolean;
  ignore_computed_fields?: boolean;
  custom_ignore_rules?: string;
}

export interface IaCBaselineCompareResult {
  compared_at: string;
  state_file: string;
  total_resources: number;
  drift_count: number;
  in_sync_count: number;
  summary_message: string;
  diff_details: Array<{
    resource: string;
    attribute: string;
    baseline_value: any;
    target_state_value: any;
    action: string;
  }>;
}

export interface IaCRemediationPlanResponse {
  resource_id: string;
  resource_name: string;
  provider: string;
  plan_hcl: string;
  target_action: string;
  generated_at: string;
}

export interface IaCApplyRemediationResponse {
  success: boolean;
  resource_id: string;
  status: string;
  message: string;
  applied_at: string;
  updated_resource: IaCDriftResourceItem;
}

export interface IaCIgnoredResourceItem {
  id: string;
  resource_pattern: string;
  reason: string;
  added_by: string;
  created_at: string;
}

export interface IaCDriftGlobalSettingsDTO {
  enable_drift_globally: boolean;
  default_scan_frequency: string;
  parallel_scanning: boolean;
  retry_on_failure: boolean;
  max_retries: number;
  timeout_minutes: number;
  notify_on_new_drift: boolean;
  notify_on_drift_resolution: boolean;
  daily_summary_report: boolean;
  weekly_compliance_report: boolean;
  ignored_resources: IaCIgnoredResourceItem[];
}

// =========================================================================
// SECTION 10: DRIFT DETECTION SUITE (SCREENS 10.1 THROUGH 10.8)
// =========================================================================

export interface IaCDriftSuiteKpis {
  total_resources: number;
  drifted: number;
  in_sync: number;
  not_tracked: number;
}

export interface IaCDriftTrendPoint {
  date: string;
  drifted: number;
  in_sync: number;
  not_tracked: number;
}

export interface IaCDriftRecentEvent {
  time: string;
  resource: string;
  environment: string;
  change_type: string;
  status: string;
}

export interface IaCDriftSuiteOverviewResponse {
  kpis: IaCDriftSuiteKpis;
  trend: IaCDriftTrendPoint[];
  recent_events: IaCDriftRecentEvent[];
  available_environments: string[];
}

export interface IaCDriftEnvironmentItem {
  name: string;
  provider: string;
  region: string;
  status: string;
  last_scan: string;
}

export interface IaCDriftEnvironmentsResponse {
  items: IaCDriftEnvironmentItem[];
  total: number;
}

export interface CreateDriftEnvironmentRequest {
  name: string;
  provider?: string;
  region?: string;
}

export interface IaCDriftChangeItem {
  id: string;
  resource: string;
  resource_type: string;
  environment: string;
  change_type: string;
  status: string;
  detected: string;
}

export interface IaCDriftChangesResponse {
  items: IaCDriftChangeItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_environments: string[];
  available_change_types: string[];
  available_statuses: string[];
}

export interface IaCDriftResourceDetailResponse {
  name: string;
  resource_type: string;
  environment: string;
  region: string;
  created: string;
  last_modified: string;
  status: string;
  drift_detected: string;
  change_type: string;
  changed_fields_count: number;
  severity: string;
  last_scan: string;
  deployed_terraform: string;
  deployed_json: string;
  deployed_yaml: string;
}

export interface IaCDriftRemediationItem {
  id: string;
  resource: string;
  issue: string;
  severity: string;
  recommendation: string;
  status: string;
}

export interface IaCDriftRemediationResponse {
  items: IaCDriftRemediationItem[];
  total: number;
  available_environments: string[];
  available_severities: string[];
  available_statuses: string[];
}

export interface ApplyDriftRemediationResponse {
  id: string;
  resource: string;
  status: string;
  message: string;
}

export interface IaCDriftHistoryItem {
  id: string;
  time: string;
  resource: string;
  change_type: string;
  changed_by: string;
  status: string;
}

export interface IaCDriftHistoryResponse {
  items: IaCDriftHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_resources: string[];
}

export interface IaCDriftSettingsDTO {
  enable_drift_detection: boolean;
  auto_scan_on_schedule: boolean;
  notify_on_drift: boolean;
  include_tags: boolean;
  ignore_computed: boolean;
  scan_frequency: string;
  scan_time: string;
  environments: string[];
  email_notifications: boolean;
  slack_notifications: boolean;
}

export interface IaCDriftCompareResponse {
  resource: string;
  git_terraform: string;
  git_json: string;
  git_yaml: string;
  deployed_terraform: string;
  deployed_json: string;
  deployed_yaml: string;
  differences_count: number;
  diff_summary: string[];
}

