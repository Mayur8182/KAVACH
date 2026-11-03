"""
Pydantic Schemas for IaC Security Run Suite (Section 7: Screens 7.1 to 7.8)
Includes models for:
- 7.1 Run Overview (KPIs, Runtime Activity Chart, Recent Runtime Events)
- 7.2 Workloads (Deployments, StatefulSets, DaemonSets across clusters/namespaces)
- 7.3 Containers (Containers runtime state, CPU, Memory, Pod mapping)
- 7.4 Kubernetes (Cluster health, Node status, Cluster components)
- 7.5 Runtime Threats (Threat events, severity, blocked/detected status, triage)
- 7.6 Runtime Vulnerabilities (Running container CVEs, package, severity, status)
- 7.7 Network Activity (Flow logs, protocols, ports, Allow/Block actions, bytes)
- 7.8 Runtime Security Policies (Policies, scope, status toggling, CRUD)
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ==========================================
# 7.1 Run Overview
# ==========================================

class RunOverviewKpis(BaseModel):
    workloads_count: int = Field(default=12, description="Total running workloads")
    runtime_threats_count: int = Field(default=3, description="Active runtime threats detected")
    vulnerabilities_count: int = Field(default=8, description="Vulnerabilities in runtime containers")
    uptime_percentage: float = Field(default=99.9, description="Cluster runtime uptime percentage")


class RuntimeActivityPoint(BaseModel):
    hour: str = Field(..., description="Timestamp label e.g. 00:00, 03:00")
    normal: int = Field(default=0, description="Normal activity count")
    suspicious: int = Field(default=0, description="Suspicious activity count")
    blocked: int = Field(default=0, description="Blocked activity count")


class RuntimeEventItem(BaseModel):
    id: str
    time: str = Field(..., description="Event time e.g. 10:12 AM")
    event: str = Field(..., description="Event name e.g. Suspicious process")
    resource: str = Field(..., description="Target workload/pod e.g. web-7f8d9")
    severity: str = Field(..., description="Critical, High, Medium, Low, Info")
    status: str = Field(..., description="Blocked, Detected, Allowed")


class RunOverviewResponse(BaseModel):
    time_range: str = Field(default="Last 24 hours")
    kpis: RunOverviewKpis
    activity_chart: List[RuntimeActivityPoint]
    recent_events: List[RuntimeEventItem]


# ==========================================
# 7.2 Workloads
# ==========================================

class WorkloadItem(BaseModel):
    id: str
    name: str = Field(..., description="Workload name e.g. frontend-app")
    type: str = Field(..., description="Deployment, StatefulSet, DaemonSet")
    namespace: str = Field(..., description="Kubernetes namespace e.g. production")
    cluster: str = Field(default="eks-prod-cluster")
    status: str = Field(default="Running", description="Running, Degraded, Pending")
    pods_ready: int = Field(default=3)
    pods_total: int = Field(default=3)
    created_at: str = Field(default="2026-09-15T08:00:00Z")


class WorkloadsResponse(BaseModel):
    items: List[WorkloadItem]
    total: int
    page: int = 1
    page_size: int = 10
    clusters: List[str]
    namespaces: List[str]


# ==========================================
# 7.3 Containers
# ==========================================

class ContainerItem(BaseModel):
    id: str
    container: str = Field(..., description="Container name e.g. frontend")
    image: str = Field(..., description="Image tag e.g. frontend:1.2.0")
    pod: str = Field(..., description="Pod identifier e.g. frontend-7f8d9")
    status: str = Field(default="Running", description="Running, Pending, Terminated")
    cpu: str = Field(..., description="CPU utilization e.g. 12%")
    memory: str = Field(..., description="Memory utilization e.g. 256 MB")
    cluster: str = Field(default="eks-prod-cluster")
    namespace: str = Field(default="production")
    restarts: int = Field(default=0)


class ContainersResponse(BaseModel):
    items: List[ContainerItem]
    total: int
    page: int = 1
    page_size: int = 10
    clusters: List[str]
    namespaces: List[str]
    statuses: List[str]


# ==========================================
# 7.4 Kubernetes
# ==========================================

class KubernetesNodeItem(BaseModel):
    name: str = Field(..., description="Node hostname e.g. ip-10-0-1-112")
    instance_type: str = Field(..., description="Instance type e.g. t3.large")
    status: str = Field(default="Ready", description="Ready, NotReady")
    cpu: str = Field(..., description="CPU e.g. 32%")
    memory: str = Field(..., description="Memory e.g. 48%")
    pods: int = Field(..., description="Active pods count e.g. 14")


class ClusterComponentItem(BaseModel):
    component: str = Field(..., description="Component name e.g. kube-apiserver")
    status: str = Field(default="Healthy", description="Healthy, Degraded, Error")
    version: str = Field(..., description="Version e.g. v1.28.3")


class KubernetesClusterResponse(BaseModel):
    cluster_id: str = "eks-prod-cluster"
    cluster_name: str = "eks-prod-cluster (production)"
    environment: str = "production"
    nodes_count: int = 3
    pods_count: int = 42
    namespaces_count: int = 6
    cluster_health: float = 99.9
    nodes: List[KubernetesNodeItem]
    components: List[ClusterComponentItem]
    available_clusters: List[str]


# ==========================================
# 7.5 Runtime Threats
# ==========================================

class RuntimeThreatItem(BaseModel):
    id: str
    time: str = Field(..., description="Time e.g. 10:12 AM")
    threat: str = Field(..., description="Threat title e.g. Reverse shell detected")
    resource: str = Field(..., description="Target pod e.g. web-7f8d9")
    severity: str = Field(..., description="Critical, High, Medium, Low, Info")
    status: str = Field(..., description="Blocked, Detected, Investigating, Dismissed")
    cluster: str = Field(default="eks-prod-cluster")
    details: Optional[str] = None


class RuntimeThreatsResponse(BaseModel):
    items: List[RuntimeThreatItem]
    total: int
    page: int = 1
    page_size: int = 10
    clusters: List[str]
    severities: List[str]


class UpdateThreatStatusRequest(BaseModel):
    status: str = Field(..., description="Blocked, Detected, Investigating, Dismissed")


# ==========================================
# 7.6 Runtime Vulnerabilities
# ==========================================

class RuntimeVulnerabilityItem(BaseModel):
    id: str
    cve: str = Field(..., description="CVE ID e.g. CVE-2024-21626")
    package: str = Field(..., description="Package / component e.g. runc")
    severity: str = Field(..., description="Critical, High, Medium, Low")
    resource: str = Field(..., description="Affected resource e.g. api-5d6c7")
    status: str = Field(default="Open", description="Open, In Progress, Resolved")
    cluster: str = Field(default="eks-prod-cluster")
    fix_version: Optional[str] = None


class RuntimeVulnerabilitiesResponse(BaseModel):
    items: List[RuntimeVulnerabilityItem]
    total: int
    page: int = 1
    page_size: int = 10
    clusters: List[str]
    severities: List[str]
    statuses: List[str]


class UpdateVulnerabilityStatusRequest(BaseModel):
    status: str = Field(..., description="Open, In Progress, Resolved")


# ==========================================
# 7.7 Network Activity
# ==========================================

class NetworkFlowLogItem(BaseModel):
    id: str
    source: str = Field(..., description="Source resource e.g. web-7f8d9")
    destination: str = Field(..., description="Destination e.g. api-5d6c7")
    protocol: str = Field(..., description="TCP, HTTPS, UDP")
    port: int = Field(..., description="Port number e.g. 8080")
    action: str = Field(..., description="Allow, Block")
    bytes: str = Field(..., description="Transferred bytes e.g. 12.4 MB")
    cluster: str = Field(default="eks-prod-cluster")
    namespace: str = Field(default="production")
    timestamp: str = Field(default="2026-10-12T01:00:00Z")


class NetworkActivityResponse(BaseModel):
    items: List[NetworkFlowLogItem]
    total: int
    page: int = 1
    page_size: int = 10
    clusters: List[str]
    namespaces: List[str]


# ==========================================
# 7.8 Runtime Security Policies
# ==========================================

class RuntimePolicyItem(BaseModel):
    id: str
    name: str = Field(..., description="Policy name e.g. Block Privileged Containers")
    type: str = Field(..., description="Runtime, Network, Admission")
    scope: str = Field(..., description="Cluster, Namespace")
    status: str = Field(default="Enabled", description="Enabled, Disabled")
    description: Optional[str] = None
    rules_count: int = Field(default=1)


class RuntimePoliciesResponse(BaseModel):
    items: List[RuntimePolicyItem]
    total: int
    page: int = 1
    page_size: int = 10


class CreateRuntimePolicyRequest(BaseModel):
    name: str
    type: str = "Runtime"
    scope: str = "Cluster"
    status: str = "Enabled"
    description: Optional[str] = None


class TogglePolicyStatusRequest(BaseModel):
    status: str = Field(..., description="Enabled, Disabled")
