/**
 * TypeScript Definitions for IaC Security Settings Suite — Section 15 (Screens 15.1 through 15.7)
 * Sourced directly from /api/v1/iac/settings-suite/*
 */

// ── 15.1 General Settings ──
export interface GeneralSettingsDTO {
  repository: string;
  default_branch: string;
  iac_working_directory: string;
  supported_iac_types: string[];
  auto_scan_on_push: boolean;
  scan_on_pr: boolean;
  scan_on_schedule: boolean;
}

export interface UpdateGeneralSettingsRequest {
  repository?: string;
  default_branch?: string;
  iac_working_directory?: string;
  supported_iac_types?: string[];
  auto_scan_on_push?: boolean;
  scan_on_pr?: boolean;
  scan_on_schedule?: boolean;
}

// ── 15.2 Scan Settings ──
export interface AdditionalToolsConfig {
  tfsec: boolean;
  kube_score: boolean;
  kube_linter: boolean;
  custom_scanner: boolean;
  custom_scanner_command: string;
}

export interface ScanSettingsDTO {
  iac_scanner: string;
  scanner_version: string;
  scanner_version_latest: boolean;
  additional_tools: AdditionalToolsConfig;
  file_extensions: string;
  max_file_size_mb: number;
  parallel_scans: number;
}

export interface UpdateScanSettingsRequest {
  iac_scanner?: string;
  scanner_version?: string;
  additional_tools?: Partial<AdditionalToolsConfig>;
  file_extensions?: string;
  max_file_size_mb?: number;
  parallel_scans?: number;
}

// ── 15.3 Rules & Policies ──
export interface PolicyPackItem {
  name: string;
  type: string;
  version: string;
  status: 'Enabled' | 'Disabled' | string;
}

export interface ToolSeverityMapping {
  critical: string;
  high: string;
  medium: string;
  low: string;
}

export interface RulesPoliciesSettingsDTO {
  policy_packs: PolicyPackItem[];
  severity_mappings: Record<string, ToolSeverityMapping>;
}

export interface UpdateRulesPoliciesRequest {
  policy_packs?: PolicyPackItem[];
  severity_mappings?: Record<string, ToolSeverityMapping>;
}

// ── 15.4 Exclusions ──
export interface ExclusionItem {
  id: string;
  pattern: string;
  type: 'Directory' | 'File' | 'Resource' | 'Rule' | string;
  description: string;
}

export interface ExclusionsSettingsDTO {
  active_tab: string;
  exclusions: ExclusionItem[];
}

export interface AddExclusionRequest {
  pattern: string;
  type: string;
  description: string;
}

export interface PreviewExclusionRequest {
  file_path: string;
}

export interface PreviewExclusionResponse {
  file_path: string;
  is_excluded: boolean;
  matched_pattern?: string | null;
  message: string;
}

// ── 15.5 Notifications ──
export interface NotificationChannelItem {
  id: string;
  channel: string;
  type: 'Slack' | 'Email' | 'Webhook' | 'Jira' | string;
  configuration: string;
  status: 'Active' | 'Inactive' | string;
}

export interface NotificationEventsConfig {
  scan_completed: boolean;
  critical_findings_detected: boolean;
  policy_violations: boolean;
  new_rules_available: boolean;
  scan_failed: boolean;
  high_severity_findings: boolean;
  drift_detected: boolean;
  compliance_status_changed: boolean;
}

export interface NotificationsSettingsDTO {
  enable_notifications: boolean;
  notify_on_scan_completion: boolean;
  notify_on_critical_findings: boolean;
  notify_on_policy_violations: boolean;
  channels: NotificationChannelItem[];
  events: NotificationEventsConfig;
}

export interface UpdateNotificationsRequest {
  enable_notifications?: boolean;
  notify_on_scan_completion?: boolean;
  notify_on_critical_findings?: boolean;
  notify_on_policy_violations?: boolean;
  events?: Partial<NotificationEventsConfig>;
}

export interface AddNotificationChannelRequest {
  channel: string;
  type: string;
  configuration: string;
  status: string;
}

// ── 15.6 Access & Permissions ──
export interface UserAccessItem {
  id: string;
  user: string;
  avatar_initials: string;
  role: 'Admin' | 'Editor' | 'Viewer' | 'Custom' | string;
  permissions: string;
  status: 'Active' | 'Inactive' | string;
}

export interface RoleDefinitionItem {
  role: string;
  description: string;
}

export interface AccessSettingsDTO {
  active_tab: string;
  users: UserAccessItem[];
  roles: RoleDefinitionItem[];
}

export interface AddUserAccessRequest {
  user: string;
  role: string;
  permissions?: string;
  status: string;
}

// ── 15.7 Advanced Settings ──
export interface EnvVariableItem {
  name: string;
  value: string;
}

export interface AdvancedSettingsDTO {
  scan_timeout_minutes: number;
  max_memory_usage_gb: number;
  cache_results: boolean;
  cache_ttl_days: number;
  checkov_arguments: string;
  tfsec_arguments: string;
  environment_variables: EnvVariableItem[];
}

export interface UpdateAdvancedSettingsRequest {
  scan_timeout_minutes?: number;
  max_memory_usage_gb?: number;
  cache_results?: boolean;
  cache_ttl_days?: number;
  checkov_arguments?: string;
  tfsec_arguments?: string;
  environment_variables?: EnvVariableItem[];
}

// ── Master Aggregate ──
export interface IaCSettingsSuiteMasterDTO {
  repository: string;
  general: GeneralSettingsDTO;
  scan: ScanSettingsDTO;
  rules_policies: RulesPoliciesSettingsDTO;
  exclusions: ExclusionsSettingsDTO;
  notifications: NotificationsSettingsDTO;
  access: AccessSettingsDTO;
  advanced: AdvancedSettingsDTO;
}
