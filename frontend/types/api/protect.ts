/**
 * Thing Protect — TypeScript Definitions
 * Step 06 Runtime Defense, Policy Enforcement, MCP Security & Active Protection.
 */

export type ProtectionState =
  | 'ACTIVE'
  | 'DEGRADED'
  | 'PARTIALLY_PROTECTED'
  | 'DISABLED'
  | 'FAILED'
  | 'NOT_CONFIGURED'
  | 'NOT_CONNECTED'
  | 'UNKNOWN';

export type EnforcementDecision =
  | 'ALLOW'
  | 'BLOCK'
  | 'CHALLENGE'
  | 'REQUIRE_APPROVAL'
  | 'RATE_LIMIT'
  | 'QUARANTINE'
  | 'ISOLATE'
  | 'REVOKE'
  | 'DENY'
  | 'NOT_EVALUATED'
  | 'FAILED'
  | 'UNKNOWN';

export type EnforcementMode =
  | 'MONITOR'
  | 'ALERT'
  | 'CHALLENGE'
  | 'ENFORCE'
  | 'APPROVAL';

export type ThreatVerificationStatus =
  | 'SIGNAL'
  | 'SUSPECTED'
  | 'DETECTED'
export type ThreatVerification = ThreatVerificationStatus;
export type PolicyStatus = 'ACTIVE' | 'DRAFT' | 'DISABLED' | 'ARCHIVED' | string;

export interface ProtectOverviewResponse {
  protection_state: ProtectionState;
  metrics: {
    active_controls: number;
    blocked_today: number;
    policy_violations: number;
    unprotected_services: number;
    pending_approvals: number;
    active_threats: number;
  };
  active_threats: Array<{
    id: string;
    threat_name: string;
    threat_type: string;
    source: string;
    target_resource: string;
    severity: string;
    verification_status: ThreatVerificationStatus;
    action_taken: string;
    detected_at: string;
  }>;
  enforcement_activity: {
    blocks: number;
    allows: number;
    challenges: number;
    approvals: number;
    rate_limits: number;
  };
  runtime_coverage: {
    protected_services: string;
    protected_apis: string;
    protected_agents: string;
    mcp_gateways: string;
    network_controls: string;
  };
  recent_events: Array<{
    id: string;
    event_type: string;
    title: string;
    actor?: string;
    resource?: string;
    decision?: string;
    severity?: string;
    timestamp: string;
  }>;
  fail_mode: string;
  has_runtimes: boolean;
}

export interface RuntimeProtectionItem {
  id: string;
  project_id: string;
  name: string;
  target_name?: string;
  target_type: string;
  environment: string;
  environment_id?: string;
  protection_state: ProtectionState;
  active_policy_name?: string;
  policy_version?: string;
  health_status: string;
  enforcement_mode: EnforcementMode;
  fail_mode: string;
  last_event_at?: string;
  last_enforcement_at?: string;
  last_enforcement?: string;
  events_count: number;
  blocked_count: number;
}

export type RuntimeTarget = RuntimeProtectionItem;

export interface RuntimeProtectionListResponse {
  items: RuntimeProtectionItem[];
  total: number;
}

export interface RuntimeProtectionDetailResponse {
  runtime: RuntimeProtectionItem;
  events: Array<{
    id: string;
    actor: string;
    action: string;
    decision: string;
    reason: string;
    timestamp: string;
  }>;
  policies: Array<{
    name: string;
    version: string;
    mode: string;
  }>;
  enforcement_history: Array<any>;
  network_rules: Array<{ rule: string; action: string }>;
  identity_info: {
    spiffe_id: string;
    service_account: string;
  };
  evidence_items: Array<any>;
  activity: Array<any>;
}

export interface ProtectionPolicyItem {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  policy_type: string;
  scope: Record<string, any>;
  conditions: Array<Record<string, any>>;
  action: EnforcementDecision;
  action_config: Record<string, any>;
  exceptions: Array<Record<string, any>>;
  enforcement_mode: EnforcementMode;
  status: string;
  version: number;
  owner: string;
  created_by?: string;
  last_triggered_at?: string;
  last_triggered?: string;
  triggers_count: number;
  created_at: string;
  updated_at: string;
}

export type ProtectionPolicy = ProtectionPolicyItem;

export interface ProtectionPolicyListResponse {
  items: ProtectionPolicyItem[];
  total: number;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  policy_type: string;
  scope?: Record<string, any>;
  conditions?: Array<Record<string, any>>;
  action: string;
  action_config?: Record<string, any>;
  exceptions?: Array<Record<string, any>>;
  enforcement_mode?: string;
  project_id?: string;
}

export interface PolicySimulationResponse {
  simulation_id: string;
  policy_id: string;
  would_allow: number;
  would_block: number;
  would_require_approval: number;
  would_rate_limit: number;
  total_evaluated: number;
  samples: Array<{
    actor: string;
    resource: string;
    simulated_decision: string;
    matched_condition: string;
  }>;
  execution_mode: string;
  predicted_decision?: string;
  reason?: string;
}

export interface PolicyPublishResponse {
  policy_id: string;
  version: number;
  status: string;
  published_at: string;
  message: string;
}

export interface ProtectionPolicyDetailResponse {
  policy: ProtectionPolicyItem;
  versions: Array<{
    version_number: number;
    created_by: string;
    change_reason?: string;
    published_at: string;
    diff_summary: Record<string, any>;
  }>;
  matched_events: Array<{
    id: string;
    actor: string;
    action: string;
    resource: string;
    decision: string;
    reason: string;
    timestamp: string;
  }>;
  effectiveness: {
    status: string;
    observed_attempts: number;
    blocked: number;
    bypass_attempts: number;
  };
}

export interface ProtectionDecisionItem {
  id: string;
  project_id: string;
  policy_id?: string;
  policy_name?: string;
  evidence_id?: string;
  actor: string;
  actor_type: string;
  action: string;
  resource: string;
  environment: string;
  environment_id?: string;
  risk_level: string;
  decision: EnforcementDecision;
  reason: string;
  enforcement_layer: string;
  context_data: Record<string, any>;
  context?: Record<string, any>;
  timestamp: string;
}

export type ProtectionDecision = ProtectionDecisionItem;

export interface ProtectionDecisionListResponse {
  items: ProtectionDecisionItem[];
  total: number;
}

export interface ProtectionDecisionDetailResponse {
  decision: ProtectionDecisionItem;
  policy?: Partial<ProtectionPolicyItem>;
  evidence?: {
    id: string;
    evidence_type: string;
    source: string;
    raw_event_redacted?: string;
    normalized_event: Record<string, any>;
    trace_id?: string;
    verification_method: string;
    is_redacted: boolean;
    observed_at?: string;
  };
  audit_trail: Array<{
    step: string;
    component: string;
    status?: string;
    decision?: string;
  }>;
}

export interface McpServerItem {
  id: string;
  project_id: string;
  name: string;
  server_url: string;
  identity_principal: string;
  environment: string;
  tools_count: number;
  resources_count: number;
  status: string;
  protection_state: string;
  gateway_version: string;
  last_activity_at?: string;
  created_at: string;
}

export interface McpServerListResponse {
  items: McpServerItem[];
  total: number;
}

export interface McpToolControlItem {
  id: string;
  server_id: string;
  project_id: string;
  tool_name: string;
  description?: string;
  risk_level: string;
  allowed_agents: string[];
  allowed_environments: string[];
  requires_approval: boolean;
  production_blocked: boolean;
  data_access_tags: string[];
  policy_name?: string;
  total_invocations: number;
  blocked_invocations: number;
  last_used_at?: string;
}

export interface McpToolControlListResponse {
  items: McpToolControlItem[];
  total: number;
}

export interface McpRequestAuditItem {
  id: string;
  project_id: string;
  server_id?: string;
  agent_id: string;
  tool_name: string;
  arguments_redacted: Record<string, any>;
  identity_verified: boolean;
  policy_matched?: string;
  decision: string;
  approval_status?: string;
  execution_status: string;
  evidence_id?: string;
  duration_ms: number;
  observed_at: string;
}

export interface McpRequestAuditListResponse {
  items: McpRequestAuditItem[];
  total: number;
}

export interface ProtectedAgentItem {
  id: string;
  project_id: string;
  agent_identifier: string;
  name: string;
  identity_principal: string;
  environment: string;
  risk_level: string;
  policy_name?: string;
  active_session_id?: string;
  last_action?: string;
  protection_state: string;
  status: string;
  actions_count: number;
  blocked_count: number;
  last_action_at?: string;
  created_at: string;
}

export interface ProtectedAgentListResponse {
  items: ProtectedAgentItem[];
  total: number;
}

export interface ProtectedSessionItem {
  id: string;
  project_id: string;
  session_token_hash: string;
  actor: string;
  actor_type: string;
  environment: string;
  status: string;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  revoked_by?: string;
  revoked_at?: string;
  started_at: string;
  last_active_at: string;
}

export interface ProtectedSessionListResponse {
  items: ProtectedSessionItem[];
  total: number;
}

export interface ApiProtectionEndpointItem {
  id: string;
  project_id: string;
  path: string;
  method: string;
  environment: string;
  protection_state: string;
  auth_enforced: boolean;
  bot_defense_active: boolean;
  rate_limiting_active: boolean;
  requests_count: number;
  blocked_count: number;
  rate_limited_count: number;
  threats_count: number;
  last_event_at?: string;
}

export interface ApiProtectionListResponse {
  items: ApiProtectionEndpointItem[];
  total: number;
}

export interface NetworkProtectionRuleItem {
  id: string;
  project_id: string;
  name: string;
  source: string;
  destination: string;
  port?: number;
  protocol: string;
  action: string;
  enforcement_engine: string;
  is_enforced: boolean;
  blocked_packets: number;
  last_triggered_at?: string;
}

export interface NetworkProtectionListResponse {
  items: NetworkProtectionRuleItem[];
  total: number;
}

export interface DnsProtectionAuditItem {
  id: string;
  project_id: string;
  domain: string;
  actor: string;
  resolver_ip: string;
  query_type: string;
  decision: string;
  policy_matched?: string;
  tunneling_detected: boolean;
  evidence_id?: string;
  timestamp: string;
}

export interface DnsProtectionListResponse {
  items: DnsProtectionAuditItem[];
  total: number;
}

export interface ThreatSignalItem {
  id: string;
  project_id: string;
  threat_name: string;
  threat_type: string;
  source: string;
  target_resource: string;
  actor: string;
  detection_engine: string;
  severity: string;
  verification_status: ThreatVerificationStatus;
  action_taken: string;
  status: string;
  evidence_id?: string;
  detected_at: string;
}

export interface ThreatSignalListResponse {
  items: ThreatSignalItem[];
  total: number;
}

export interface ProtectionApprovalItem {
  id: string;
  project_id: string;
  policy_id?: string;
  policy_name?: string;
  requester: string;
  requester_type: string;
  action: string;
  target_resource: string;
  resource?: string;
  environment: string;
  environment_id?: string;
  risk_level: string;
  justification?: string;
  status: string;
  approver?: string;
  approved_at?: string;
  rejection_reason?: string;
  expires_at: string;
  evidence_id?: string;
  created_at?: string;
}

export type ProtectionApproval = ProtectionApprovalItem;

export interface ProtectionApprovalListResponse {
  items: ProtectionApprovalItem[];
  total: number;
}

export interface BreakGlassResponse {
  session_id: string;
  scope: string;
  justification: string;
  duration_minutes: number;
  requester: string;
  approver: string;
  is_active: boolean;
  granted_at: string;
  expires_at: string;
}

export interface BreakGlassRecord {
  id: string;
  scope: string;
  status: string;
  reason: string;
  requester: string;
  approver?: string;
  expires_at: string;
  created_at?: string;
  duration_minutes?: number;
}

export interface ControlEffectivenessItem {
  id: string;
  project_id: string;
  policy_name: string;
  control_type: string;
  target_type: string;
  expected_behavior: string;
  observed_attempts: number;
  blocked_count: number;
  allowed_count: number;
  verification_status: string;
  last_verified_at: string;
}

export interface ControlEffectivenessListResponse {
  items: ControlEffectivenessItem[];
  total: number;
}

export interface ProtectionCoverageData {
  summary?: {
    overall_state?: string;
    coverage_score?: string;
    unprotected_count?: number;
  };
  protected_counts?: {
    protected_apis?: string;
    protected_agents?: string;
    protected_mcp_servers?: string;
    protected_k8s_workloads?: string;
  };
  protected_apis?: number | string;
  total_apis?: number | string;
  protected_agents?: number | string;
  total_agents?: number | string;
  protected_mcp_servers?: number | string;
  total_mcp_servers?: number | string;
  protected_k8s_workloads?: number | string;
  total_k8s_workloads?: number | string;
  unprotected_services?: any[];
  gaps?: Array<{
    id: string;
    resource: string;
    gap_type: string;
    severity: string;
    impact: string;
    remediation: string;
  }>;
}

export interface ProtectionCoverageResponse {
  summary: {
    overall_state: string;
    coverage_score: string;
    unprotected_count: number;
  };
  protected_counts: {
    protected_apis: string;
    protected_agents: string;
    protected_mcp_servers: string;
    protected_k8s_workloads: string;
  };
  gaps: Array<{
    id: string;
    resource: string;
    gap_type: string;
    severity: string;
    impact: string;
    remediation: string;
  }>;
}

export interface ProtectionEvidenceItem {
  id: string;
  project_id: string;
  decision_id?: string;
  evidence_type: string;
  source: string;
  actor: string;
  resource: string;
  action: string;
  policy_name?: string;
  decision: string;
  raw_event_redacted?: string;
  normalized_event: Record<string, any>;
  trace_id?: string;
  verification_method: string;
  is_redacted: boolean;
  sha256_hash?: string;
  reason?: string;
  raw_event_payload?: any;
  environment_id?: string;
  timestamp?: string;
}

export type ProtectionEvidence = ProtectionEvidenceItem;

export interface ProtectionEvidenceListResponse {
  items: ProtectionEvidenceItem[];
  total: number;
}

export interface ProtectionActivityItem {
  id: string;
  project_id: string;
  event_type: string;
  title: string;
  description?: string;
  actor?: string;
  resource?: string;
  decision?: string;
  severity?: string;
  timestamp: string;
}

export interface ProtectionActivityListResponse {
  items: ProtectionActivityItem[];
  total: number;
}

export interface RevokeSessionResponse {
  success: boolean;
  session_id?: string;
  message?: string;
}
