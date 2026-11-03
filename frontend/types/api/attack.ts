/**
 * Thing Attack — API Types
 * Full TypeScript interfaces corresponding to /api/v1/attack/* endpoints.
 */

export interface AttackOverviewMetrics {
  exposed_assets: number;
  tested_assets: number;
  verified_issues: number;
  attack_paths: number;
}

export interface CriticalExploitabilityItem {
  id: string;
  title: string;
  target: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  exploitability: 'THEORETICAL' | 'DETECTED' | 'TESTABLE' | 'TESTED' | 'EXPLOITABLE' | 'NOT_EXPLOITABLE' | 'INCONCLUSIVE' | 'BLOCKED' | 'NOT_AUTHORIZED';
  attack_type: string;
  detected_at: string;
  has_evidence: boolean;
}

export interface AttackSurfaceBreakdown {
  domains: number;
  apis: number;
  services: number;
  cloud_assets: number;
  containers: number;
  kubernetes: number;
}

export interface RecentTestItem {
  id: string;
  test_type: 'DAST' | 'PENTEST' | 'API_DISCOVERY';
  target: string;
  environment: string;
  status: 'CREATED' | 'QUEUED' | 'RUNNING' | 'DISCOVERING' | 'TESTING' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PENDING_APPROVAL';
  progress: number;
  findings_count: number;
  started_at?: string | null;
  duration_ms?: number | null;
}

export interface RecentAttackActivityItem {
  id: string;
  event_type: string;
  title: string;
  target: string;
  severity?: string | null;
  status: string;
  timestamp: string;
}

export interface AttackOverviewResponse {
  metrics: AttackOverviewMetrics;
  critical_exploitability: CriticalExploitabilityItem[];
  attack_surface_breakdown: AttackSurfaceBreakdown;
  recent_tests: RecentTestItem[];
  recent_activity: RecentAttackActivityItem[];
  has_targets: boolean;
}

// ── Asset Types ──────────────────────────────────────────────────

export interface AttackAssetItem {
  id: string;
  project_id: string;
  name: string;
  asset_type: 'DOMAIN' | 'SUBDOMAIN' | 'IP' | 'WEB_APP' | 'API' | 'GRAPHQL' | 'SERVICE' | 'LOAD_BALANCER' | 'CLOUD_ASSET' | 'CONTAINER' | 'K8S_SERVICE' | 'EXTERNAL_DEPENDENCY';
  environment: string;
  exposure: 'INTERNET' | 'INTERNAL' | 'PARTNER' | 'VPC' | 'ISOLATED';
  technology?: string | null;
  target_url?: string | null;
  ip_address?: string | null;
  port?: number | null;
  last_seen?: string | null;
  last_tested?: string | null;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' | 'UNKNOWN';
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DEPRECATED';
  ownership?: string | null;
}

export interface AttackAssetListResponse {
  items: AttackAssetItem[];
  total: number;
}

export interface CreateAttackAssetRequest {
  name: string;
  asset_type: string;
  environment?: string;
  exposure?: string;
  technology?: string;
  target_url?: string;
  ip_address?: string;
  port?: number;
  ownership?: string;
  project_id?: string;
}

export interface AttackAssetDetailResponse {
  asset: AttackAssetItem;
  endpoints_count: number;
  findings_count: number;
  attack_paths_count: number;
  tests_count: number;
  technologies: string[];
  endpoints: Array<{
    id: string;
    path: string;
    method: string;
    auth: string;
    source: string;
    risk: string;
    status: string;
  }>;
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    exploitability: string;
    type: string;
  }>;
  attack_paths: Array<{
    id: string;
    title: string;
    risk_score: number;
    criticality: string;
  }>;
  recent_tests: Array<{
    test_type: string;
    status: string;
    timestamp: string;
  }>;
  activity_timeline: Array<{
    action: string;
    timestamp: string;
  }>;
}

// ── API Inventory & Discovery Types ──────────────────────────────

export interface AttackApiEndpointItem {
  id: string;
  project_id: string;
  asset_id?: string | null;
  asset_name?: string | null;
  path: string;
  method: string;
  auth_type: string;
  discovery_source: 'OPENAPI' | 'TRAFFIC' | 'GATEWAY' | 'REPOSITORY' | 'RUNTIME_TELEMETRY' | 'CRAWLER' | 'MANUAL' | 'CLOUD_INTEGRATION';
  api_category: 'REST' | 'GRAPHQL' | 'GRPC' | 'WEBSOCKET' | 'WEBHOOK';
  risk_level: string;
  test_status: 'NOT_TESTED' | 'TESTING' | 'VERIFIED_SAFE' | 'FINDING_DETECTED' | 'EXPLOITABLE' | 'BLOCKED' | 'INCONCLUSIVE';
  last_seen?: string | null;
  last_tested?: string | null;
}

export interface AttackApiEndpointListResponse {
  items: AttackApiEndpointItem[];
  total: number;
}

export interface AttackApiEndpointDetailResponse {
  endpoint: AttackApiEndpointItem;
  parameters: Array<{ name: string; type: string; in?: string }>;
  request_schema: Record<string, any>;
  response_schema: Record<string, any>;
  data_access: string[];
  dependencies: string[];
  security_checks: Record<string, string>;
  findings: Array<{ id: string; title: string; severity: string; exploitability: string }>;
  attack_paths: any[];
  recent_evidence: any[];
}

export interface TriggerDiscoveryRequest {
  source?: 'OPENAPI' | 'REPOSITORY' | 'GATEWAY' | 'RUNTIME_TRAFFIC' | 'CRAWLER';
  target?: string;
  target_domain?: string;
  project_id?: string;
}

export interface AttackDiscoveryRunItem {
  id: string;
  source: string;
  target: string;
  status: string;
  endpoints_discovered: number;
  shadow_apis_detected: number;
  zombie_apis_detected: number;
  started_at?: string | null;
  completed_at?: string | null;
  logs: string[];
  error_message?: string | null;
}

export interface AttackDiscoveryRunListResponse {
  items: AttackDiscoveryRunItem[];
  total: number;
}

// ── DAST Types ───────────────────────────────────────────────────

export interface StartDastRunRequest {
  target_url: string;
  environment?: string;
  test_profile?: string;
  auth_config?: Record<string, any>;
  scope?: Record<string, any>;
  safety_policy?: {
    max_rate_limit?: number;
    destructive_testing?: boolean;
    allowed_methods?: string[];
  };
  project_id?: string;
}

export interface AttackDastRunItem {
  id: string;
  project_id: string;
  target_url: string;
  environment: string;
  status: string;
  progress_percentage: number;
  test_profile: string;
  endpoints_discovered: number;
  endpoints_tested: number;
  findings_count: number;
  requires_approval: boolean;
  is_approved: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  raw_logs: string[];
  error_reason?: string | null;
}

export interface AttackDastRunListResponse {
  items: AttackDastRunItem[];
  total: number;
}

// ── Pentest Types ────────────────────────────────────────────────

export interface CreatePentestRequest {
  name: string;
  environment?: string;
  description?: string;
  scope?: {
    allowed_domains?: string[];
    allowed_ips?: string[];
    allowed_endpoints?: string[];
    excluded_targets?: string[];
  };
  rules_of_engagement?: {
    allowed_techniques?: string[];
    forbidden_techniques?: string[];
    max_request_rate?: number;
    max_execution_time_minutes?: number;
    production_restrictions?: boolean;
    data_handling_policy?: string;
  };
  test_modules?: string[];
  project_id?: string;
}

export interface AttackPentestItem {
  id: string;
  project_id: string;
  name: string;
  environment: string;
  status: string;
  description?: string | null;
  scope: Record<string, any>;
  rules_of_engagement: Record<string, any>;
  test_modules: string[];
  requires_approval: boolean;
  approved_by?: string | null;
  findings_count: number;
  attack_paths_count: number;
  launched_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface AttackPentestListResponse {
  items: AttackPentestItem[];
  total: number;
}

export interface AttackPentestDetailResponse {
  pentest: AttackPentestItem;
  findings: Array<{ id: string; title: string; severity: string; exploitability: string }>;
  attack_paths: any[];
  evidence_items: any[];
  audit_timeline: Array<{ event: string; timestamp: string }>;
}

// ── Attack Path Types ────────────────────────────────────────────

export interface AttackPathNode {
  id: string;
  label: string;
  node_type: 'INTERNET' | 'PUBLIC_API' | 'AUTH_WEAKNESS' | 'SERVICE' | 'PRIVILEGED_IDENTITY' | 'DATABASE' | 'SENSITIVE_DATA';
  provenance: 'OBSERVED' | 'CONFIGURED' | 'INFERRED' | 'VERIFIED';
  metadata?: Record<string, any>;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  provenance: 'OBSERVED' | 'CONFIGURED' | 'INFERRED' | 'VERIFIED';
}

export interface AttackPathItem {
  id: string;
  project_id: string;
  finding_id?: string | null;
  title: string;
  risk_score: number;
  criticality: string;
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
  target_asset?: string | null;
  blast_radius?: string | null;
  mitre_techniques: string[];
  verified: boolean;
  created_at: string;
}

export interface AttackPathListResponse {
  items: AttackPathItem[];
  total: number;
}

// ── Findings Types ───────────────────────────────────────────────

export interface AttackFindingItem {
  id: string;
  project_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  exploitability: 'THEORETICAL' | 'DETECTED' | 'TESTABLE' | 'TESTED' | 'EXPLOITABLE' | 'NOT_EXPLOITABLE' | 'INCONCLUSIVE' | 'BLOCKED' | 'NOT_AUTHORIZED';
  attack_type: string;
  retest_status: 'NONE' | 'RETESTING' | 'VERIFIED_FIXED' | 'STILL_EXPLOITABLE';
  target_url?: string | null;
  asset_id?: string | null;
  endpoint_id?: string | null;
  has_evidence: boolean;
  created_at: string;
}

export interface AttackFindingListResponse {
  items: AttackFindingItem[];
  total: number;
}

export interface AttackFindingDetailResponse {
  finding: AttackFindingItem;
  reproduction_steps?: string | null;
  remediation_guidance?: string | null;
  related_code: {
    repository?: string;
    file?: string;
    line?: number;
    commit_sha?: string;
  };
  related_cloud_resource: {
    provider?: string;
    service?: string;
    resource_id?: string;
  };
  related_runtime_event: {
    sensor?: string;
    trace_id?: string;
    blocked_by_protect?: boolean;
  };
  evidence?: {
    id: string;
    evidence_type: string;
    source: string;
    target_url: string;
    request_headers: Record<string, string>;
    request_payload?: string | null;
    response_status?: number | null;
    response_headers: Record<string, string>;
    response_body_redacted?: string | null;
    trace_id?: string | null;
    verification_method?: string | null;
    observed_at: string;
  } | null;
  attack_path?: AttackPathItem | null;
  retest_history: Array<{
    date: string;
    status: string;
    result: string;
  }>;
}

export interface RetestFindingResponse {
  finding_id: string;
  retest_job_id: string;
  status: string;
  message: string;
}

// ── Evidence Types ───────────────────────────────────────────────

export interface AttackEvidenceItemSchema {
  id: string;
  project_id: string;
  finding_id?: string | null;
  evidence_type: string;
  source: string;
  target_url: string;
  request_headers: Record<string, string>;
  request_payload?: string | null;
  response_status?: number | null;
  response_headers: Record<string, string>;
  response_body_redacted?: string | null;
  trace_id?: string | null;
  verification_method?: string | null;
  is_redacted: boolean;
  observed_at: string;
}

export interface AttackEvidenceListResponse {
  items: AttackEvidenceItemSchema[];
  total: number;
}

// ── Schedules, Reports, Policies Types ───────────────────────────

export interface AttackScheduleItem {
  id: string;
  name: string;
  test_type: string;
  frequency: string;
  cron_expression?: string | null;
  target_url?: string | null;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
}

export interface AttackScheduleListResponse {
  items: AttackScheduleItem[];
  total: number;
}

export interface CreateScheduleRequest {
  name: string;
  test_type: string;
  frequency: string;
  cron_expression?: string;
  target_url?: string;
  project_id?: string;
}

export interface AttackReportItem {
  id: string;
  title: string;
  report_type: string;
  status: string;
  summary?: string | null;
  metrics: Record<string, any>;
  file_format: string;
  download_url?: string | null;
  generated_at: string;
}

export interface AttackReportListResponse {
  items: AttackReportItem[];
  total: number;
}

export interface CreateReportRequest {
  title: string;
  report_type: string;
  file_format?: string;
  project_id?: string;
}

export interface AttackPolicyItem {
  id: string;
  name: string;
  policy_type: string;
  rules: Record<string, any>;
  is_enforced: boolean;
  created_at: string;
}

export interface AttackPolicyListResponse {
  items: AttackPolicyItem[];
  total: number;
}

export interface CreatePolicyRequest {
  name: string;
  policy_type: string;
  rules: Record<string, any>;
  is_enforced?: boolean;
  project_id?: string;
}
