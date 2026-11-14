/**
 * Thing Cloud — TypeScript Types
 * Mirrors backend Pydantic schemas in backend/app/cloud/schemas.py
 */

export type CloudProvider = 'AWS' | 'AZURE' | 'GCP' | 'KUBERNETES';

export type CloudConnectionStatus =
  | 'NOT_CONFIGURED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCOVERY_RUNNING'
  | 'DEGRADED'
  | 'AUTHENTICATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'DISCONNECTED'
  | 'UNKNOWN';

export type CloudSecurityState = 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'UNKNOWN' | 'NOT_EVALUATED';

export type CloudExposureState = 'PUBLIC' | 'INTERNAL' | 'UNKNOWN';

export interface CloudCoverageMetric {
  discovered: number;
  evaluated: number;
  unknown: number;
  status: string;
}

export interface CloudConnectionSummary {
  provider: CloudProvider;
  status: CloudConnectionStatus | string;
  account_count: number;
  last_verified_at: string | null;
}

export interface CloudAttentionItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  provider: string;
  resource_name: string;
  resource_type: string;
  environment: string;
  reason: string;
  detected_at: string;
}

export interface CloudOverviewResponse {
  generated_at: string;
  project_id: string | null;
  cloud_accounts_count: number;
  assets_total_count: number;
  critical_findings_count: number;
  high_findings_count: number;
  providers: Record<string, CloudConnectionSummary>;
  critical_attention: CloudAttentionItem[];
  coverage: Record<string, CloudCoverageMetric>;
}

export interface CloudConnectionItem {
  id: string;
  project_id: string;
  provider: CloudProvider;
  connection_name: string;
  name?: string;
  status: CloudConnectionStatus;
  authentication_method: string;
  account_identifier: string | null;
  account_id?: string | null;
  tenant_identifier: string | null;
  subscription_identifier: string | null;
  gcp_project_identifier: string | null;
  default_region: string | null;
  permissions_mode: string;
  last_verified_at: string | null;
  last_scan_at?: string | null;
  last_error: string | null;
  cloud_metadata: Record<string, any>;
  created_at: string;
}

export interface CloudConnectionsResponse {
  items: CloudConnectionItem[];
  total: number;
}

export interface ConnectProviderRequest {
  provider: CloudProvider;
  connection_name: string;
  authentication_method: string;
  account_identifier?: string;
  tenant_identifier?: string;
  subscription_identifier?: string;
  gcp_project_identifier?: string;
  default_region?: string;
  credentials_payload?: Record<string, any>;
}

export interface SetupInstructionsResponse {
  provider: CloudProvider;
  instructions_title: string;
  instructions_markdown: string;
  external_id?: string;
  kavach_account_id?: string;
  trust_policy?: Record<string, any>;
  required_permissions: string[];
  cli_snippet?: string;
  cloudformation_template_json?: string;
  cloudformation_quick_create_url?: string;
}

export interface ConnectionValidationResponse {
  success: boolean;
  status: string;
  message: string;
  account_identifier?: string;
  discovered_resources_count: number;
  observations_count: number;
  details: Record<string, any>;
}

export interface CloudAssetItem {
  id: string;
  project_id: string;
  cloud_connection_id: string;
  provider: CloudProvider;
  resource_type: string;
  provider_resource_id: string;
  resource_name: string;
  resource_uri: string | null;
  region: string | null;
  zone: string | null;
  account_id: string | null;
  status: string;
  environment: string;
  exposure: CloudExposureState;
  security_state: CloudSecurityState;
  violations_count: number;
  tags: Record<string, any>;
  discovered_at: string;
  last_seen_at: string;
}

export interface CloudAssetsResponse {
  items: CloudAssetItem[];
  assets?: CloudAssetItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface CloudAssetDetailResponse {
  id: string;
  project_id: string;
  cloud_connection_id: string;
  provider: CloudProvider;
  resource_type: string;
  provider_resource_id: string;
  resource_name: string;
  resource_uri: string | null;
  region: string | null;
  zone: string | null;
  account_id: string | null;
  status: string;
  environment: string;
  exposure: CloudExposureState;
  security_state: CloudSecurityState;
  reasons: string[];
  tags: Record<string, any>;
  labels: Record<string, any>;
  configuration: Record<string, any>;
  findings: Array<Record<string, any>>;
  relationships: Array<Record<string, any>>;
  evidence_provenance: Record<string, any> | null;
  discovered_at: string;
  last_seen_at: string;
}

export interface CloudFindingItem {
  id: string;
  project_id: string;
  cloud_resource_id: string;
  resource_name: string;
  resource_type: string;
  provider: CloudProvider;
  account_id: string | null;
  finding_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: string;
  rule_id: string;
  title: string;
  description: string | null;
  environment: string;
  observed_value: Record<string, any> | null;
  expected_value: Record<string, any> | null;
  evidence_id: string | null;
  detected_at: string;
}

export interface CloudFindingsResponse {
  items: CloudFindingItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface CloudFindingDetailResponse {
  id: string;
  project_id: string;
  cloud_resource_id: string;
  resource_name: string;
  resource_type: string;
  provider_resource_id: string;
  provider: CloudProvider;
  account_id: string | null;
  region: string | null;
  environment: string;
  finding_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: string;
  rule_id: string;
  title: string;
  description: string;
  configuration_path: string | null;
  observed_value: any;
  expected_value: any;
  remediation_guidance: string | null;
  evidence_source: string;
  evidence_id: string | null;
  attack_path_summary: string | null;
  detected_at: string;
  raw_metadata: Record<string, any>;
}

export interface CloudIAMPrincipalItem {
  id: string;
  provider: CloudProvider;
  principal_type: string;
  provider_principal_id: string;
  principal_name: string;
  arn_or_uri: string | null;
  is_admin: boolean;
  mfa_enabled: boolean | null;
  permissions_count: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  discovered_at: string;
}

export interface CloudIAMResponse {
  principals: CloudIAMPrincipalItem[];
  roles_count: number;
  policies_count: number;
  admin_principals_count: number;
  unused_permissions_count: number;
  toxic_combinations: Array<Record<string, any>>;
}

export interface CloudNetworkItem {
  id: string;
  provider: CloudProvider;
  network_name: string;
  provider_network_id: string;
  cidr_block: string | null;
  region: string | null;
  subnets_count: number;
  public_subnets_count: number;
  is_default: boolean;
}

export interface CloudNetworkResponse {
  networks: CloudNetworkItem[];
  public_resources_count: number;
  critical_exposures_count: number;
  security_groups_count: number;
  open_management_ports_count: number;
}

export interface CloudStorageItem {
  id: string;
  provider: CloudProvider;
  name: string;
  bucket_name?: string;
  account_id?: string;
  storage_type: string;
  region: string | null;
  public_access_blocked: boolean;
  encryption_enabled: boolean;
  encrypted?: boolean;
  kms_key_arn?: string | null;
  versioning_enabled: boolean;
  logging_enabled: boolean;
  contains_sensitive_data: boolean;
  findings_count?: number;
  security_status: CloudSecurityState;
}

export interface CloudStorageResponse {
  items: CloudStorageItem[];
  total_buckets: number;
  unencrypted_count: number;
  publicly_accessible_count: number;
  public_buckets?: number;
  unencrypted_buckets?: number;
}

export interface CloudDatabaseItem {
  id: string;
  provider: CloudProvider;
  name: string;
  engine: string;
  version: string | null;
  region: string | null;
  is_publicly_accessible: boolean;
  storage_encrypted: boolean;
  backup_retention_days: number;
  multi_az: boolean;
  security_status: CloudSecurityState;
}

export interface CloudDatabaseResponse {
  items: CloudDatabaseItem[];
  total_databases: number;
  publicly_exposed_count: number;
  unencrypted_count: number;
}

export interface CloudKubernetesClusterItem {
  id: string;
  provider: string;
  cluster_name: string;
  status: string;
  version: string | null;
  nodes_count: number;
  namespaces_count: number;
  workloads_count: number;
  rbac_strict: boolean;
  network_policies_active: boolean;
  open_findings_count: number;
}

export interface CloudKubernetesResponse {
  clusters: CloudKubernetesClusterItem[];
  total_clusters: number;
}

export interface CloudDockerImageItem {
  id: string;
  image_name: string;
  tag: string;
  digest: string;
  registry: string;
  sbom_available: boolean;
  vulnerabilities_critical: number;
  vulnerabilities_high: number;
  signature_verified: boolean;
  provenance_verified: boolean;
  last_scanned_at: string | null;
}

export interface CloudDockerResponse {
  images: CloudDockerImageItem[];
  total_images: number;
}

export interface CloudIaCItem {
  id: string;
  repository_name: string;
  framework: string;
  file_path: string;
  resource_type: string;
  resource_name: string;
  policy_name: string;
  rule_id?: string;
  severity: string;
  status: string;
  proposed_remediation: string | null;
}

export interface CloudIaCResponse {
  items: CloudIaCItem[];
  total_checks: number;
  total?: number;
  drifted_resources_count: number;
}

export type CloudIaCCheckItem = CloudIaCItem;

export interface CloudExposureItem {
  id: string;
  resource_name: string;
  resource_type: string;
  provider: CloudProvider;
  environment: string;
  public_ip: string | null;
  port: string | null;
  service_type: string;
  path_summary: string;
  severity: string;
}

export interface CloudExposuresResponse {
  items: CloudExposureItem[];
  total_exposures: number;
  critical_exposures: number;
}

export interface CloudAttackPathItem {
  id: string;
  title: string;
  entry_point: string;
  target_asset: string;
  confidence: 'VERIFIED' | 'PARTIAL' | 'UNKNOWN';
  blast_radius_score: string;
  nodes: Array<Record<string, any>>;
  edges: Array<Record<string, any>>;
  provenance: string;
}

export interface CloudAttackPathsResponse {
  items: CloudAttackPathItem[];
  total: number;
}

export interface BlastRadiusNode {
  id: string;
  label: string;
  type: 'RESOURCE' | 'IDENTITY' | 'DATA' | 'NETWORK';
  reachability: 'DIRECT' | 'TRANSITIVE' | 'CONDITIONAL';
  risk_level: string;
}

export interface CloudBlastRadiusResponse {
  starting_asset: string;
  reachable_resources_count: number;
  reachable_sensitive_data: boolean;
  reachable_identities_count: number;
  nodes: BlastRadiusNode[];
  edges: Array<Record<string, any>>;
}

export interface CloudComplianceFramework {
  framework_id: string;
  framework_name: string;
  version: string;
  satisfied_controls: number;
  violated_controls: number;
  total_controls: number;
  status: string;
}

export interface CloudComplianceResponse {
  frameworks: CloudComplianceFramework[];
  total_requirements: number;
  satisfied_count: number;
  violated_count: number;
}

export interface CloudRemediationJobItem {
  id: string;
  finding_id: string;
  resource_name: string;
  action_type: string;
  status: 'PROPOSED' | 'APPROVAL_REQUIRED' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  requested_by: string;
  requested_at: string;
  approval_required: boolean;
  verified_at: string | null;
  error: string | null;
}

export interface CloudRemediationResponse {
  jobs: CloudRemediationJobItem[];
  total: number;
}

export interface CloudEvidenceItem {
  id: string;
  source: string;
  observed_property: string;
  current_value: string;
  expected_value: string;
  resource_id: string;
  resource_name: string;
  policy_id: string | null;
  verification_status: string;
  recorded_at: string;
  raw_payload?: Record<string, any> | null;
}

export interface CloudEvidenceResponse {
  items: CloudEvidenceItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CloudExposuresOverviewResponse {
  total_exposures: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  items: any[];
}

export interface CloudIAMPrincipalItem {
  id: string;
  name: string;
  type: string;
  provider: CloudProvider;
  environment: string;
  roles_count: number;
  permissions_count: number;
  excessive_permissions: boolean;
  mfa_enabled: boolean;
  status: string;
}

export interface CloudIAMOverviewResponse {
  total_principals: number;
  overprivileged_principals: number;
  unused_credentials: number;
  mfa_missing: number;
  items: CloudIAMPrincipalItem[];
}

export interface CloudNetworkOverviewResponse {
  total_rules: number;
  risky_rules: number;
  open_to_internet: number;
  unrestricted_egress: number;
  items: any[];
}


