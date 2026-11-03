/**
 * Container Security TypeScript Types
 * Corresponds to backend app.schemas.container_security
 */

export interface ContainerStatCard {
  value: number;
  trend_text: string;
  trend_direction: 'up' | 'down' | 'neutral';
  trend_color: 'success' | 'error' | 'warning' | 'neutral';
}

export interface ContainerSummaryResponse {
  total_images: ContainerStatCard;
  vulnerable_images: ContainerStatCard;
  critical_findings: ContainerStatCard;
  high_findings: ContainerStatCard;
  total_findings: number;
  scanned_images_count: number;
}

export interface VulnerabilityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  negligible: number;
}

export interface ContainerTopVulnerabilityItem {
  id: string;
  vulnerability_id: string; // e.g. "CVE-2024-3094"
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  score?: number; // e.g. 8.7
  package?: string;
  installed_version?: string;
  fixed_version?: string;
  title?: string;
}

export interface ContainerImageItem {
  id: string;
  project_id: string;
  repository: string;
  tag: string;
  registry: string;
  digest?: string;
  size_bytes?: number;
  size_formatted: string;
  status: 'Vulnerable' | 'Needs Attention' | 'Healthy';
  vulnerabilities: VulnerabilityBreakdown;
  last_scanned_at?: string;
  last_scanned_formatted: string;
  base_image?: string;
  layers_count: number;
  labels_count: number;
  labels: Record<string, string>;
  architecture?: string;
  os?: string;
  created_at?: string;
}

export interface ContainerImageDetailResponse extends ContainerImageItem {
  top_vulnerabilities: ContainerTopVulnerabilityItem[];
  scanner_name: string;
  scan_duration?: string;
  scan_status: string;
}

export interface ContainerImageListResponse {
  items: ContainerImageItem[];
  total: number;
  page: number;
  page_size: number;
  available_registries: string[];
  available_statuses: string[];
}

export interface TriggerContainerScanRequest {
  project_id: string;
  image_id?: string;
  repository?: string;
  tag?: string;
}

export interface ContainerScanJobResponse {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  image_id?: string;
  findings_count: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface ContainerRegistryItem {
  id: string;
  project_id: string;
  provider: 'DOCKER_HUB' | 'ECR' | 'ACR' | 'GCR' | 'GHCR' | 'SELF_HOSTED';
  name: string;
  url: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'AUTHENTICATION_FAILED';
  account_id?: string;
  region?: string;
  repositories_count: number;
  images_count: number;
  last_synced_at?: string;
  last_synced_formatted: string;
}

export interface ContainerRegistryListResponse {
  items: ContainerRegistryItem[];
  total: number;
}

export interface ConnectRegistryRequest {
  provider: string;
  name: string;
  url: string;
  account_id?: string;
  region?: string;
  access_token?: string;
}

// ============================================================================
// MODULE A: DOCKERFILE & BUILD SECURITY TYPES
// ============================================================================

export interface DockerfileSummaryResponse {
  scanned_dockerfiles: number;
  scanned_trend: string;
  repositories_count: number;
  dockerfiles_with_issues: number;
  issues_trend: string;
  issues_percentage: string;
  critical_count: number;
  critical_trend: string;
  high_count: number;
  high_trend: string;
  medium_count: number;
  medium_trend: string;
  low_count: number;
  low_trend: string;
  best_practice_compliance_pct: number;
  compliance_trend: string;
  checks_passing: string;
}

export interface DockerfileTopIssueItem {
  name: string;
  count: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
}

export interface DockerfileSeverityTimeseriesItem {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DockerfileBuildStageItem {
  type: string;
  count: number;
  pct: number;
  color: string;
}

export interface DockerfileChartDataResponse {
  top_issues: DockerfileTopIssueItem[];
  findings_by_severity_timeseries: DockerfileSeverityTimeseriesItem[];
  build_stage_analysis: DockerfileBuildStageItem[];
  total_dockerfiles: number;
}

export interface DockerfileItem {
  id: string;
  path: string;
  repository: string;
  base_image: string;
  lines: number;
  issues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  last_scanned: string;
  last_scanned_at?: string;
  status: string;
  build_type: string;
}

export interface DockerfileListResponse {
  items: DockerfileItem[];
  total: number;
  page: number;
  page_size: number;
  repositories: string[];
  base_images: string[];
  build_types: string[];
}

export interface DockerfileFindingDetail {
  id: string;
  dockerfile_id: string;
  dockerfile_path: string;
  repository: string;
  rule_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  line_number?: number;
  snippet?: string;
  remediation?: string;
  suggested_fix_diff?: string;
  category: string;
}

export interface DockerfileInspectionResponse {
  dockerfile: DockerfileItem;
  raw_content?: string;
  findings: DockerfileFindingDetail[];
}

export interface RemediateDockerfileRequest {
  finding_id?: string;
  rule_id?: string;
  apply_all?: boolean;
}

export interface RemediateDockerfileResponse {
  success: boolean;
  message: string;
  remediated_findings_count: number;
  updated_raw_content: string;
  diff: string;
  dockerfile: DockerfileItem;
}

export interface DockerfileRecommendationItem {
  id: string;
  title: string;
  category: string;
  severity: string;
  impact: string;
  guidance: string;
  affected_dockerfiles: number;
}

// ============================================================================
// MODULE B: CONTAINER CONFIGURATION & HARDENING TYPES
// ============================================================================

export interface ContainerConfigSummaryResponse {
  analyzed_containers: number;
  analyzed_trend: string;
  clusters_count: number;
  misconfigurations: number;
  misconfigurations_trend: string;
  misconfigurations_pct: string;
  privileged_containers: number;
  privileged_trend: string;
  privileged_pct: string;
  running_as_root: number;
  running_as_root_trend: string;
  running_as_root_pct: string;
  capability_issues: number;
  capability_issues_trend: string;
  capability_issues_pct: string;
}

export interface ConfigCategoryIssueItem {
  category: string;
  count: number;
  color: string;
}

export interface PostureDistributionItem {
  posture: string;
  count: number;
  pct: number;
  color: string;
}

export interface HardeningRecommendationItem {
  recommendation: string;
  count: number;
  severity: string;
  rationale?: string;
}

export interface ContainerConfigChartsResponse {
  issues_by_category: ConfigCategoryIssueItem[];
  posture_distribution: PostureDistributionItem[];
  total_containers: number;
  top_hardening_recommendations: HardeningRecommendationItem[];
}

export interface ContainerConfigRowItem {
  id: string;
  container_name: string;
  image: string;
  namespace: string;
  cluster: string;
  privileged: boolean;
  user: string;
  capabilities_count: number;
  capabilities: string[];
  status: string;
  findings_count: number;
  security_posture: 'Compliant' | 'Minor issues' | 'High risk' | 'Critical';
  observed_at?: string;
}

export interface ContainerConfigListResponse {
  items: ContainerConfigRowItem[];
  total: number;
  page: number;
  page_size: number;
  clusters: string[];
  namespaces: string[];
  statuses: string[];
  postures: string[];
}

// ============================================================================
// MODULE C: REGISTRY INTEGRATIONS (ENHANCED) TYPES
// ============================================================================

export interface RegistrySummaryResponse {
  connected_registries: number;
  total_registries?: number;
  connected_trend: string;
  connected_subtitle: string;
  total_images: number;
  images_trend: string;
  images_subtitle: string;
  last_sync: string;
  last_sync_subtitle: string;
  sync_successful: number;
  sync_failed: number;
  sync_in_progress: number;
}

export interface RegistryEnhancedItem {
  id: string;
  project_id: string;
  name: string;
  provider: string;
  provider_code: string;
  type: 'Cloud' | 'Self-hosted';
  images: number;
  last_sync: string;
  last_sync_at?: string;
  status: 'Connected' | 'Not Configured' | 'Failed' | 'In Progress';
  endpoint: string;
}

export interface RegistryEnhancedListResponse {
  items: RegistryEnhancedItem[];
  total: number;
  providers: string[];
  types: string[];
  statuses: string[];
}

// ============================================================================
// MODULE 07: IMAGE SCAN MANAGEMENT TYPES
// ============================================================================

export interface ImageScanSummaryResponse {
  total_scans: number;
  total_scans_trend: string;
  successful_scans: number;
  successful_trend: string;
  failed_scans: number;
  failed_trend: string;
  in_progress_scans: number;
  in_progress_trend: string;
  scheduled_scans: number;
  scheduled_trend: string;
}

export interface ScanSeverityBreakdownItem {
  severity: string;
  count: number;
  pct: number;
  color: string;
}

export interface DailyScanTrendItem {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ImageScanChartsResponse {
  total_vulnerabilities: number;
  severity_distribution: ScanSeverityBreakdownItem[];
  scan_trend_timeseries: DailyScanTrendItem[];
}

export interface ImageScanJobRow {
  id: string;
  image: string;
  registry: string;
  scan_type: string;
  status: 'Completed' | 'In Progress' | 'Failed' | 'Queued';
  vulnerabilities_count?: number | null;
  started_at: string;
  started_at_raw?: string;
  duration: string;
  actions: string[];
}

export interface ImageScanListResponse {
  items: ImageScanJobRow[];
  total: number;
  page: number;
  page_size: number;
  registries: string[];
  scan_types: string[];
  statuses: string[];
}

export interface RunNewScanRequest {
  target_type: 'IMAGE' | 'REPOSITORY' | 'REGISTRY' | 'KUBERNETES';
  target_identifier: string;
  scan_type: 'Quick Scan' | 'Full Scan' | 'Compliance Scan' | 'Custom Scan';
  scan_options: {
    scan_secrets: boolean;
    generate_sbom: boolean;
    analyze_dockerfile: boolean;
    enable_storage: boolean;
  };
  project_id?: string;
}

export interface FindingPackageTypeItem {
  package_type: string;
  count: number;
  color: string;
}

export interface ImageScanFindingDetail {
  id: string;
  severity: string;
  package: string;
  version: string;
  issue: string;
  fix_available?: string;
  layer?: string;
  category: string;
}

export interface ImageScanDetailResponse {
  id: string;
  image: string;
  registry: string;
  status: string;
  started_at: string;
  duration: string;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  vulnerabilities_count: number;
  secrets_count: number;
  config_count: number;
  sbom_count: number;
  package_types: FindingPackageTypeItem[];
  findings: ImageScanFindingDetail[];
  logs?: string;
}

export interface ScanScheduleItem {
  id: string;
  name: string;
  target_type: string;
  target_pattern: string;
  cron_expression: string;
  scan_type: string;
  is_enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export interface ScanScheduleListResponse {
  items: ScanScheduleItem[];
  total: number;
}

export interface CreateScheduleRequest {
  name: string;
  target_type?: string;
  target_pattern: string;
  cron_expression?: string;
  scan_type?: string;
  is_enabled?: boolean;
  project_id?: string;
}

// ============================================================================
// MODULE 08: KUBERNETES WORKLOADS TYPES
// ============================================================================

export interface K8sFindingCategoryItem {
  category: string;
  count: number;
  pct: number;
  color: string;
}

export interface K8sWorkloadRiskDistributionItem {
  workload_type: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface KubernetesOverviewResponse {
  clusters_count: number;
  clusters_trend: string;
  namespaces_count: number;
  namespaces_trend: string;
  workloads_count: number;
  workloads_trend: string;
  pods_count: number;
  pods_trend: string;
  security_findings_count: number;
  findings_trend: string;
  findings_by_category: K8sFindingCategoryItem[];
  workload_risk_distribution: K8sWorkloadRiskDistributionItem[];
  summary?: any;
  categories?: any[];
  workload_risks?: any[];
}

export interface TopRiskyWorkloadRow {
  id: string;
  workload: string;
  namespace: string;
  type: string;
  cluster: string;
  risk_level: string;
  findings_count: number;
  image: string;
  last_scanned: string;
  name?: string;
  workload_type?: string;
  cluster_name?: string;
  image_name?: string;
  last_scanned_at?: string;
}

export interface KubernetesClustersSummaryResponse {
  connected_clusters: number;
  healthy_count: number;
  unhealthy_count: number;
  total_namespaces: number;
  healthy_clusters?: number;
  unhealthy_clusters?: number;
}

export interface KubernetesClusterRow {
  id: string;
  cluster_name: string;
  provider: string;
  version: string;
  nodes: number;
  namespaces: number;
  status: string;
  last_sync: string;
  environment: string;
  name?: string;
  health_status?: string;
  nodes_count?: number;
  namespaces_count?: number;
}

export interface KubernetesClusterListResponse {
  items: KubernetesClusterRow[];
  total: number;
}

export interface KubernetesWorkloadRow {
  id: string;
  workload_name: string;
  type: string;
  namespace: string;
  cluster: string;
  pods: string;
  risk_level: string;
  findings_count: number;
  image: string;
  status: string;
  name?: string;
  workload_type?: string;
  cluster_name?: string;
  pods_count?: string;
  image_name?: string;
}

export interface KubernetesWorkloadListResponse {
  items: KubernetesWorkloadRow[];
  total: number;
  clusters: string[];
  namespaces: string[];
  statuses: string[];
  risk_levels: string[];
}

export interface KubernetesWorkloadDetailResponse {
  id: string;
  workload_name: string;
  type: string;
  namespace: string;
  cluster: string;
  pods: string;
  risk_level: string;
  status: string;
  image_references: string[];
  service_accounts: string[];
  security_context: Record<string, any>;
  findings: Array<Record<string, any>>;
  observed_at?: string;
  workload?: any;
}

export interface KubernetesFindingRow {
  id: string;
  workload_name: string;
  resource_kind: string;
  namespace: string;
  cluster: string;
  check_type: string;
  severity: string;
  category: string;
  status: string;
  remediation?: string;
  title?: string;
  resource_name?: string;
}

export interface KubernetesFindingsListResponse {
  items: KubernetesFindingRow[];
  total: number;
}

// ============================================================================
// MODULE 09: CONTAINER RUNTIME SECURITY TYPES
// ============================================================================

export interface RuntimeAlertSeverityItem {
  severity: string;
  count: number;
  pct: number;
  color: string;
}

export interface RuntimeAlertCategoryItem {
  category: string;
  count: number;
  color: string;
}

export interface RuntimeOverviewResponse {
  runtime_alerts: number;
  runtime_alerts_trend: string;
  process_events: number;
  process_events_trend: string;
  blocked_events: number;
  blocked_events_trend: string;
  policy_violations: number;
  policy_violations_trend: string;
  affected_workloads: number;
  affected_workloads_trend: string;
  telemetry_status: 'ACTIVE' | 'DEGRADED' | 'NOT_CONFIGURED';
  sensor_summary: string;
  alerts_by_severity: RuntimeAlertSeverityItem[];
  top_alert_types: RuntimeAlertCategoryItem[];
  recent_alerts?: RuntimeAlertRow[];
  severities?: RuntimeAlertSeverityItem[];
  sensor_health?: { status?: string; telemetry_source?: string; [key: string]: any };
  summary?: {
    runtime_alerts?: number;
    process_events?: number;
    blocked_events?: number;
    policy_violations?: number;
    affected_workloads?: number;
    [key: string]: any;
  };
  alert_types?: Array<{ type_name?: string; category?: string; count: number; [key: string]: any }>;
}

export interface RuntimeAlertRow {
  id: string;
  time: string;
  timestamp?: string;
  timestamp_raw?: string;
  severity: string;
  event_type: string;
  process: string;
  workload: string;
  namespace: string;
  status: string;
}

export interface RuntimeAlertsListResponse {
  items: RuntimeAlertRow[];
  total: number;
  statuses: string[];
  severities: string[];
  event_types: string[];
}

export interface RuntimeEventRow {
  id: string;
  time: string;
  timestamp?: string;
  severity: string;
  event_type: string;
  process: string;
  workload: string;
  namespace: string;
  cmdline?: string;
  container_id?: string;
}

export interface RuntimeEventsListResponse {
  items: RuntimeEventRow[];
  total: number;
  page: number;
  page_size: number;
  event_types: string[];
  severities: string[];
}

export interface RuntimeEventDetailResponse {
  id: string;
  time: string;
  severity: string;
  event_type: string;
  process: string;
  cmdline: string;
  command_line?: string;
  workload: string;
  namespace: string;
  container_id: string;
  parent_process: string;
  pid: number;
  ppid: number;
  user: string;
  network_destination?: string;
  file_path?: string;
  mitre_attack_id: string;
  mitre_attack?: string;
  mitre_tactic: string;
  investigation_status: string;
  timeline_events: Array<{ time: string; event: string }>;
  timeline?: Array<{ time: string; description: string; stage?: string; [key: string]: any }>;
  event?: {
    id: string;
    timestamp?: string;
    time?: string;
    event_type: string;
    workload: string;
    namespace: string;
    severity: string;
    process: string;
    [key: string]: any;
  };
}

export interface RuntimePolicyRow {
  id: string;
  name: string;
  policy_type: string;
  category: string;
  action: string;
  status: string;
  scope: string;
  enforcement_mechanism: string;
  description?: string;
  is_enabled?: boolean;
}

export interface RuntimePoliciesSummaryResponse {
  total_policies: number;
  enabled_count: number;
  disabled_count: number;
  blocking_count: number;
  policies: RuntimePolicyRow[];
  enabled_policies?: number;
  disabled_policies?: number;
  blocking_policies?: number;
  items?: RuntimePolicyRow[];
}

export interface CreateRuntimePolicyRequest {
  name: string;
  policy_type?: string;
  category?: string;
  action?: string;
  status?: string;
  scope?: string;
  description?: string;
  project_id?: string;
}

