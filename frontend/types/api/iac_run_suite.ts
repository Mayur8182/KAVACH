/**
 * TypeScript API definitions for IaC Security Run Suite (Section 7: Screens 7.1 to 7.8)
 * 100% Sourced from Backend APIs (/api/v1/iac/run-suite/*)
 */

// 7.1 Run Overview
export interface RunOverviewKpis {
  workloads_count: number;
  runtime_threats_count: number;
  vulnerabilities_count: number;
  uptime_percentage: number;
}

export interface RuntimeActivityPoint {
  hour: string;
  normal: number;
  suspicious: number;
  blocked: number;
}

export interface RuntimeEventItem {
  id: string;
  time: string;
  event: string;
  resource: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info' | string;
  status: 'Blocked' | 'Detected' | 'Allowed' | string;
}

export interface RunOverviewResponse {
  time_range: string;
  kpis: RunOverviewKpis;
  activity_chart: RuntimeActivityPoint[];
  recent_events: RuntimeEventItem[];
}

// 7.2 Workloads
export interface WorkloadItem {
  id: string;
  name: string;
  type: 'Deployment' | 'StatefulSet' | 'DaemonSet' | string;
  namespace: string;
  cluster: string;
  status: 'Running' | 'Degraded' | 'Pending' | string;
  pods_ready: number;
  pods_total: number;
  created_at: string;
}

export interface WorkloadsResponse {
  items: WorkloadItem[];
  total: number;
  page: number;
  page_size: number;
  clusters: string[];
  namespaces: string[];
}

// 7.3 Containers
export interface ContainerItem {
  id: string;
  container: string;
  image: string;
  pod: string;
  status: 'Running' | 'Pending' | 'Terminated' | 'Failed' | string;
  cpu: string;
  memory: string;
  cluster: string;
  namespace: string;
  restarts: number;
}

export interface ContainersResponse {
  items: ContainerItem[];
  total: number;
  page: number;
  page_size: number;
  clusters: string[];
  namespaces: string[];
  statuses: string[];
}

// 7.4 Kubernetes
export interface KubernetesNodeItem {
  name: string;
  instance_type: string;
  status: 'Ready' | 'NotReady' | string;
  cpu: string;
  memory: string;
  pods: number;
}

export interface ClusterComponentItem {
  component: string;
  status: 'Healthy' | 'Degraded' | 'Error' | string;
  version: string;
}

export interface KubernetesClusterResponse {
  cluster_id: string;
  cluster_name: string;
  environment: string;
  nodes_count: number;
  pods_count: number;
  namespaces_count: number;
  cluster_health: number;
  nodes: KubernetesNodeItem[];
  components: ClusterComponentItem[];
  available_clusters: string[];
}

// 7.5 Runtime Threats
export interface RuntimeThreatItem {
  id: string;
  time: string;
  threat: string;
  resource: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info' | string;
  status: 'Blocked' | 'Detected' | 'Investigating' | 'Dismissed' | string;
  cluster: string;
  details?: string;
}

export interface RuntimeThreatsResponse {
  items: RuntimeThreatItem[];
  total: number;
  page: number;
  page_size: number;
  clusters: string[];
  severities: string[];
}

export interface UpdateThreatStatusRequest {
  status: string;
}

// 7.6 Runtime Vulnerabilities
export interface RuntimeVulnerabilityItem {
  id: string;
  cve: string;
  package: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  resource: string;
  status: 'Open' | 'In Progress' | 'Resolved' | string;
  cluster: string;
  fix_version?: string;
}

export interface RuntimeVulnerabilitiesResponse {
  items: RuntimeVulnerabilityItem[];
  total: number;
  page: number;
  page_size: number;
  clusters: string[];
  severities: string[];
  statuses: string[];
}

export interface UpdateVulnerabilityStatusRequest {
  status: string;
}

// 7.7 Network Activity
export interface NetworkFlowLogItem {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port: number;
  action: 'Allow' | 'Block' | string;
  bytes: string;
  cluster: string;
  namespace: string;
  timestamp: string;
}

export interface NetworkActivityResponse {
  items: NetworkFlowLogItem[];
  total: number;
  page: number;
  page_size: number;
  clusters: string[];
  namespaces: string[];
}

// 7.8 Runtime Security Policies
export interface RuntimePolicyItem {
  id: string;
  name: string;
  type: string;
  scope: string;
  status: 'Enabled' | 'Disabled' | string;
  description?: string;
  rules_count: number;
}

export interface RuntimePoliciesResponse {
  items: RuntimePolicyItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateRuntimePolicyRequest {
  name: string;
  type?: string;
  scope?: string;
  status?: string;
  description?: string;
}

export interface TogglePolicyStatusRequest {
  status: 'Enabled' | 'Disabled' | string;
}
