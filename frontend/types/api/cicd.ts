/**
 * CI/CD Pipeline TypeScript API Types.
 */

export interface CICDRunStage {
  name: string;
  status: 'Success' | 'Failed' | 'Running' | 'Pending' | 'Skipped' | string;
  duration_seconds: number;
}

export interface CICDPipelineRunItem {
  id: string;
  pipeline_id?: string | null;
  pipeline_name: string;
  branch: string;
  trigger: string;
  status: 'Success' | 'Failed' | 'Running' | 'Cancelled' | string;
  duration_seconds: number;
  duration_formatted: string;
  started_at: string;
  started_at_relative: string;
  completed_at?: string | null;
  commit_sha: string;
  author: string;
  security_issues_count: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  stages?: CICDRunStage[] | null;
  logs?: string[] | null;
  evidence?: {
    runner?: string;
    execution_sha256?: string;
    policy_evaluated?: string;
    verified?: boolean;
    [key: string]: any;
  } | null;
}

export interface CICDPipelineListResponse {
  items: CICDPipelineRunItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_branches: string[];
  available_statuses: string[];
}

export interface CICDTrendBucket {
  date: string;
  label: string;
  successful: number;
  failed: number;
  running: number;
  total: number;
}

export interface CICDStatusBreakdown {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CICDStageAverage {
  stage: string;
  duration_seconds: number;
  duration_formatted: string;
  color: string;
}

export interface CICDEnvironmentItem {
  id: string;
  name: string;
  status: 'Healthy' | 'Degraded' | 'Inactive' | string;
  icon_type: string;
  commit_sha?: string | null;
  last_deployed_at?: string | null;
  last_deployed_relative: string;
  url?: string | null;
}

export interface CICDFindingsSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface CICDIntegrationItem {
  name: string;
  provider_key: string;
  status: 'Connected' | 'Not Connected' | string;
  icon_key: string;
}

export interface CICDSummaryResponse {
  total_pipelines: number;
  total_change_pct: number;
  successful_runs: number;
  success_rate: number;
  success_change_pct: number;
  failed_runs: number;
  failure_rate: number;
  failure_change_pct: number;
  running_runs: number;
  running_rate: number;
  avg_build_time_seconds: number;
  avg_build_time_formatted: string;
  avg_build_time_change_pct: number;
  security_issues_count: number;
  security_change_pct: number;
  security_critical_count: number;
  security_high_count: number;
  trend_series: CICDTrendBucket[];
  status_breakdown: CICDStatusBreakdown[];
  stage_averages: CICDStageAverage[];
  environments: CICDEnvironmentItem[];
  findings_summary: CICDFindingsSummary;
  integrations: CICDIntegrationItem[];
}

export interface TriggerPipelineRunRequest {
  repository_id: string;
  pipeline_name?: string;
  branch?: string;
  workflow_file?: string;
  environment?: string;
  trigger_type?: string;
}

export interface TriggerPipelineRunResponse {
  run_id: string;
  pipeline_name: string;
  branch: string;
  status: string;
  message: string;
}

export interface WorkflowYAMLResponse {
  repository_id: string;
  workflow_file: string;
  branch: string;
  content: string;
}

// =============================================================================
// PIPELINES TAB TYPES
// =============================================================================

export interface CICDPipelineCreateRequest {
  repository_id: string;
  name: string;
  workflow_file?: string;
  default_branch?: string;
  description?: string;
}

export interface CICDArtifactItem {
  name: string;
  size_bytes: number;
  size_formatted: string;
  file_type: string;
  created_at: string;
  download_url: string;
}

export interface CICDPipelineRunDetailResponse {
  id: string;
  pipeline_name: string;
  run_number: number;
  branch: string;
  trigger: string;
  status: string;
  duration_seconds: number;
  duration_formatted: string;
  started_at: string;
  started_at_formatted: string;
  completed_at?: string | null;
  commit_sha: string;
  commit_message?: string | null;
  author: string;
  workflow_file: string;
  runs_on: string;
  environment: string;
  stages: CICDRunStage[];
  completed_stages_count: number;
  total_stages_count: number;
  logs: string[];
  security_issues_count: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  findings: any[];
  artifacts: CICDArtifactItem[];
  evidence?: any;
}

// =============================================================================
// ENVIRONMENTS TAB TYPES
// =============================================================================

export interface CICDEnvironmentDetail {
  id: string;
  name: string;
  status: 'Healthy' | 'Degraded' | 'Inactive' | 'Failed' | string;
  icon_type: string;
  version: string;
  branch: string;
  region: string;
  url?: string | null;
  last_deployed_at?: string | null;
  last_deployed_relative: string;
  uptime_str: string;
  auto_deploy: boolean;
  commit_sha?: string | null;
  response_time_ms: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  pods_ready: number;
  pods_total: number;
  deployments_history: Array<{
    version: string;
    deployed_at: string;
    branch: string;
    status: string;
    commit_sha?: string;
  }>;
  variables: Array<{
    key: string;
    value: string;
  }>;
  secrets: Array<{
    key: string;
    value: string;
  }>;
}

export interface CICDEnvironmentCreateRequest {
  repository_id: string;
  name: string;
  branch?: string;
  region?: string;
  url?: string;
  auto_deploy?: boolean;
}

export interface CICDEnvironmentDeployRequest {
  environment_id: string;
  version?: string;
  branch?: string;
}

export interface CICDEnvironmentTrendPoint {
  date: string;
  label: string;
  successful_deployments: number;
  failed_deployments: number;
  response_time_ms: number;
}

export interface CICDEnvironmentsOverviewResponse {
  environments: CICDEnvironmentDetail[];
  total_environments: number;
  healthy_count: number;
  degraded_count: number;
  failed_count: number;
  inactive_count: number;
  trend_series: CICDEnvironmentTrendPoint[];
  status_distribution: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  comparison_table: Array<{
    id: string;
    name: string;
    status: string;
    version: string;
    response_time_ms: number;
    cpu_usage_percent: number;
    memory_usage_percent: number;
    pods: string;
    region: string;
  }>;
}

// =============================================================================
// INTEGRATIONS TAB TYPES
// =============================================================================

export interface CICDIntegrationDetail {
  id: string;
  name: string;
  provider_key: string;
  status: 'Connected' | 'Failed' | 'Degraded' | string;
  icon_key: string;
  category: string;
  subtext?: string | null;
  connection_endpoint?: string | null;
  account: string;
  repository_name: string;
  branch: string;
  url?: string | null;
  last_sync_at?: string | null;
  last_sync_relative: string;
  webhook_status: string;
  events: string[];
  webhook_events: Array<{
    name: string;
    status: 'Active' | 'Inactive' | string;
  }>;
  created_by: string;
  created_at_formatted: string;
  permissions: string[];
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

export interface CICDIntegrationCreateRequest {
  project_id?: string;
  name: string;
  provider_key: string;
  category?: string;
  subtext?: string;
  connection_endpoint?: string;
  url?: string;
  account?: string;
  repository_name?: string;
}

export interface CICDIntegrationTestResponse {
  integration_id: string;
  status: string;
  latency_ms: number;
  message: string;
  tested_at: string;
}

export interface CICDIntegrationSyncResponse {
  integration_id: string;
  status: string;
  message: string;
  last_sync_at: string;
  last_sync_relative: string;
}

export interface CICDIntegrationsOverviewResponse {
  integrations: CICDIntegrationDetail[];
  total_connected: number;
  connected_pct_change: number;
  total_active: number;
  active_rate_pct: number;
  total_failed: number;
  failed_change_pct: number;
  failure_rate_pct: number;
  last_sync_relative: string;
  total_webhooks: number;
  active_webhooks: number;
  inactive_webhooks: number;
  categories: Array<{
    key: string;
    label: string;
    count: number;
  }>;
}

// =============================================================================
// TEMPLATES TAB TYPES
// =============================================================================

export interface CICDTemplateDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  framework: string;
  description: string;
  is_official: boolean;
  is_custom: boolean;
  is_popular: boolean;
  tags: string[];
  maintained_by: string;
  last_updated: string;
  usage_count: number;
  usage_count_formatted: string;
  rating: string;
  rating_count: number;
  workflow_yaml: string;
  included_steps: Array<{
    name: string;
    duration?: string;
    status?: string;
  }>;
  variables: Array<{
    key: string;
    default_value: string;
    description: string;
  }>;
  icon_key: string;
}

export interface CICDUseTemplateRequest {
  template_id: string;
  repository_id: string;
  pipeline_name?: string;
  branch?: string;
}

export interface CICDUseTemplateResponse {
  pipeline_id: string;
  pipeline_name: string;
  workflow_file: string;
  status: string;
  message: string;
}

export interface CICDTemplatesOverviewResponse {
  templates: CICDTemplateDetail[];
  total_templates: number;
  official_count: number;
  custom_count: number;
  recently_used_count: number;
  popular_template_slug: string;
  total_change_pct: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_categories: string[];
  available_types: string[];
  available_frameworks: string[];
}

// ============================================================================
// JOBS TAB TYPES
// ============================================================================

export interface CICDJobItem {
  id: string;
  job_number: number;
  job_name: string;
  pipeline_name: string;
  status: 'Success' | 'Failed' | 'Running' | 'Pending' | 'Blocked' | string;
  duration_seconds: number;
  duration_formatted: string;
  started_at: string;
  started_at_relative: string;
  runner: string;
  commit_sha: string;
  commit_message: string;
  workflow_file: string;
  step: string;
  environment: string;
  run_id_str: string;
  failure_reason?: string | null;
  security_findings_count: number;
}

export interface CICDJobDetailResponse {
  id: string;
  job_number: number;
  job_name: string;
  pipeline_name: string;
  status: string;
  duration_seconds: number;
  duration_formatted: string;
  started_at: string;
  started_at_formatted: string;
  started_at_relative: string;
  completed_at?: string | null;
  runner: string;
  commit_sha: string;
  commit_message: string;
  workflow_file: string;
  step: string;
  environment: string;
  run_id_str: string;
  failure_reason?: string | null;
  logs: string[];
  artifacts: Array<{ name: string; size_bytes?: number; size_formatted?: string }>;
  security_findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  related_links: {
    pipeline_run?: string;
    workflow?: string;
    logs?: string;
    security_findings?: string;
    [key: string]: any;
  };
}

export interface CICDJobsOverviewResponse {
  items: CICDJobItem[];
  selected_job?: CICDJobDetailResponse | null;
  total_jobs: number;
  total_change_pct: number;
  successful_jobs: number;
  success_rate_pct: number;
  success_change_pct: number;
  failed_jobs: number;
  failure_rate_pct: number;
  failure_change_pct: number;
  running_jobs: number;
  running_rate_pct: number;
  avg_duration_seconds: number;
  avg_duration_formatted: string;
  avg_duration_change_pct: number;
  blocked_jobs: number;
  blocked_rate_pct: number;
  blocked_change_pct: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_pipelines: string[];
  available_statuses: string[];
}

export interface CICDJobRerunResponse {
  job_id: string;
  status: string;
  message: string;
  started_at: string;
}

// ============================================================================
// PIPELINE RUNS TAB TYPES
// ============================================================================

export interface CICDPipelineRunsOverviewResponse {
  runs: CICDPipelineRunItem[];
  active_run?: CICDPipelineRunDetailResponse | null;
  total_runs: number;
  total_change_pct: number;
  successful_runs: number;
  success_rate_pct: number;
  success_change_pct: number;
  failed_runs: number;
  failure_rate_pct: number;
  failure_change_pct: number;
  running_runs: number;
  running_rate_pct: number;
  avg_build_time_seconds: number;
  avg_build_time_formatted: string;
  avg_build_time_change_pct: number;
  security_issues_count: number;
  security_change_pct: number;
  critical_issues_count: number;
  high_issues_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_statuses: string[];
}

// ============================================================================
// WORKFLOW EDITOR TAB TYPES
// ============================================================================

export interface CICDWorkflowStepItem {
  id: string;
  name: string;
  action_or_command: string;
  icon: string;
  status: string;
  order: number;
}

export interface CICDWorkflowConfigResponse {
  repository_id: string;
  workflow_file: string;
  name: string;
  description: string;
  provider: string;
  trigger_events: {
    push_to_main?: boolean;
    pull_request?: boolean;
    schedule?: boolean;
    manual_trigger?: boolean;
    [key: string]: boolean | undefined;
  };
  node_version: string;
  build_command: string;
  test_command: string;
  deployment_target: string;
  deploy_to_production: boolean;
  workflow_yaml: string;
  steps: CICDWorkflowStepItem[];
  variables: Array<{
    name: string;
    value: string;
    is_secret: boolean;
  }>;
}

export interface CICDWorkflowSaveRequest {
  repository_id: string;
  workflow_file?: string;
  name: string;
  description?: string;
  trigger_events?: Record<string, boolean>;
  node_version?: string;
  build_command?: string;
  test_command?: string;
  deployment_target?: string;
  deploy_to_production?: boolean;
  workflow_yaml: string;
  steps?: any[];
}

export interface CICDWorkflowSaveResponse {
  status: string;
  message: string;
  workflow_file: string;
  saved_at: string;
}


