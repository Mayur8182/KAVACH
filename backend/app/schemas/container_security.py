"""
Pydantic schemas for Container Security Workspace.
Covers image inventory, vulnerability breakdown, scanning, and detail inspection.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ContainerStatCard(BaseModel):
    value: int
    trend_text: str
    trend_direction: str  # "up" | "down" | "neutral"
    trend_color: str  # "success" | "error" | "warning" | "neutral"


class ContainerSummaryResponse(BaseModel):
    total_images: ContainerStatCard
    vulnerable_images: ContainerStatCard
    critical_findings: ContainerStatCard
    high_findings: ContainerStatCard
    total_findings: int = 0
    scanned_images_count: int = 0


class VulnerabilityBreakdown(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    negligible: int = 0


class ContainerTopVulnerabilityItem(BaseModel):
    id: str
    vulnerability_id: str  # CVE-2024-3094
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    score: Optional[float] = None  # e.g. 8.7
    package: Optional[str] = None
    installed_version: Optional[str] = None
    fixed_version: Optional[str] = None
    title: Optional[str] = None


class ContainerImageItem(BaseModel):
    id: str
    project_id: str
    repository: str
    tag: str
    registry: str  # "Docker Hub", "AWS ECR", etc.
    digest: Optional[str] = None
    size_bytes: Optional[int] = None
    size_formatted: str = "—"
    status: str  # "Vulnerable" | "Needs Attention" | "Healthy"
    vulnerabilities: VulnerabilityBreakdown
    last_scanned_at: Optional[datetime] = None
    last_scanned_formatted: str = "Never scanned"
    base_image: Optional[str] = None
    layers_count: int = 0
    labels_count: int = 0
    labels: Dict[str, str] = Field(default_factory=dict)
    architecture: Optional[str] = None
    os: Optional[str] = None
    created_at: Optional[datetime] = None


class ContainerImageDetailResponse(ContainerImageItem):
    top_vulnerabilities: List[ContainerTopVulnerabilityItem] = Field(default_factory=list)
    scanner_name: str = "Trivy v0.74.0"
    scan_duration: Optional[str] = None
    scan_status: str = "Completed with findings"


class ContainerImageListResponse(BaseModel):
    items: List[ContainerImageItem]
    total: int
    page: int
    page_size: int
    available_registries: List[str] = Field(default_factory=list)
    available_statuses: List[str] = Field(default_factory=list)


class TriggerContainerScanRequest(BaseModel):
    project_id: str
    image_id: Optional[str] = None
    repository: Optional[str] = None
    tag: Optional[str] = None


class ContainerScanJobResponse(BaseModel):
    job_id: str
    status: str  # "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"
    image_id: Optional[str] = None
    findings_count: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


class ContainerRegistryItem(BaseModel):
    id: str
    project_id: str
    provider: str  # "DOCKER_HUB" | "ECR" | "ACR" | "GCR" | "GHCR" | "SELF_HOSTED"
    name: str
    url: str
    status: str  # "CONNECTED" | "NOT_CONFIGURED" | "AUTHENTICATION_FAILED"
    account_id: Optional[str] = None
    region: Optional[str] = None
    repositories_count: int = 0
    images_count: int = 0
    last_synced_at: Optional[datetime] = None
    last_synced_formatted: str = "Never"


class ContainerRegistryListResponse(BaseModel):
    items: List[ContainerRegistryItem]
    total: int


class ConnectRegistryRequest(BaseModel):
    provider: str
    name: str
    url: str
    account_id: Optional[str] = None
    region: Optional[str] = None
    access_token: Optional[str] = None


# ============================================================================
# MODULE A: DOCKERFILE & BUILD SECURITY SCHEMAS
# ============================================================================

class DockerfileSummaryResponse(BaseModel):
    scanned_dockerfiles: int = 0
    scanned_trend: str = "↑ 12%"
    repositories_count: int = 0
    dockerfiles_with_issues: int = 0
    issues_trend: str = "↑ 8%"
    issues_percentage: str = "0% of total"
    critical_count: int = 0
    critical_trend: str = "↑ 0%"
    high_count: int = 0
    high_trend: str = "↑ 14%"
    medium_count: int = 0
    medium_trend: str = "↓ 25%"
    low_count: int = 0
    low_trend: str = "↓ 40%"
    best_practice_compliance_pct: int = 62
    compliance_trend: str = "↑ 8%"
    checks_passing: str = "18/29 checks passing"


class DockerfileTopIssueItem(BaseModel):
    name: str
    count: int
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    color: str


class DockerfileSeverityTimeseriesItem(BaseModel):
    date: str
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class DockerfileBuildStageItem(BaseModel):
    type: str  # "Multi-stage builds", "Single-stage", "Distroless images", "Scratch images", "Others"
    count: int
    pct: int
    color: str


class DockerfileChartDataResponse(BaseModel):
    top_issues: List[DockerfileTopIssueItem] = Field(default_factory=list)
    findings_by_severity_timeseries: List[DockerfileSeverityTimeseriesItem] = Field(default_factory=list)
    build_stage_analysis: List[DockerfileBuildStageItem] = Field(default_factory=list)
    total_dockerfiles: int = 0


class DockerfileItem(BaseModel):
    id: str
    path: str
    repository: str
    base_image: str
    lines: int
    issues: int
    critical: int
    high: int
    medium: int
    low: int
    last_scanned: str
    last_scanned_at: Optional[datetime] = None
    status: str  # "Completed", "Running", "Failed"
    build_type: str  # "Multi-stage", "Single-stage", "Distroless", "Scratch", "Others"


class DockerfileListResponse(BaseModel):
    items: List[DockerfileItem]
    total: int
    page: int
    page_size: int
    repositories: List[str] = Field(default_factory=list)
    base_images: List[str] = Field(default_factory=list)
    build_types: List[str] = Field(default_factory=list)


class DockerfileFindingDetail(BaseModel):
    id: str
    dockerfile_id: str
    dockerfile_path: str
    repository: str
    rule_id: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    line_number: Optional[int] = None
    snippet: Optional[str] = None
    remediation: Optional[str] = None
    suggested_fix_diff: Optional[str] = None
    category: str = "Security"


class DockerfileInspectionResponse(BaseModel):
    dockerfile: DockerfileItem
    raw_content: Optional[str] = None
    findings: List[DockerfileFindingDetail] = Field(default_factory=list)


class RemediateDockerfileRequest(BaseModel):
    finding_id: Optional[str] = None
    rule_id: Optional[str] = None
    apply_all: bool = False


class RemediateDockerfileResponse(BaseModel):
    success: bool
    message: str
    remediated_findings_count: int
    updated_raw_content: str
    diff: str
    dockerfile: DockerfileItem


class DockerfileBuildConfigItem(BaseModel):
    dockerfile_id: str
    dockerfile_path: str
    repository: str
    base_image: str
    stages_count: int
    has_user_directive: bool
    user_name: Optional[str] = None
    has_healthcheck: bool
    exposed_ports: List[str] = Field(default_factory=list)
    build_args_count: int = 0
    sensitive_args_detected: bool = False
    multi_stage: bool = False


class DockerfileRecommendationItem(BaseModel):
    id: str
    title: str
    category: str
    severity: str
    impact: str
    guidance: str
    affected_dockerfiles: int = 0


class ScanDockerfileRequest(BaseModel):
    project_id: Optional[str] = None
    repository_name: Optional[str] = None
    dockerfile_path: Optional[str] = None
    content: Optional[str] = None


# ============================================================================
# MODULE B: CONTAINER CONFIGURATION & HARDENING SCHEMAS
# ============================================================================

class ContainerConfigSummaryResponse(BaseModel):
    analyzed_containers: int = 0
    analyzed_trend: str = "↑ 10%"
    clusters_count: int = 0
    misconfigurations: int = 0
    misconfigurations_trend: str = "↑ 16%"
    misconfigurations_pct: str = "0% of total"
    privileged_containers: int = 0
    privileged_trend: str = "↑ 0%"
    privileged_pct: str = "0% of total"
    running_as_root: int = 0
    running_as_root_trend: str = "↓ 25%"
    running_as_root_pct: str = "0% of total"
    capability_issues: int = 0
    capability_issues_trend: str = "↓ 12%"
    capability_issues_pct: str = "0% of total"


class ConfigCategoryIssueItem(BaseModel):
    category: str  # "Privileged mode", "Running as root", "Excessive capabilities", "Host mounts", "Insecure environment vars", "Other"
    count: int
    color: str


class PostureDistributionItem(BaseModel):
    posture: str  # "Compliant", "Minor issues", "High risk", "Critical"
    count: int
    pct: int
    color: str


class HardeningRecommendationItem(BaseModel):
    recommendation: str
    count: int
    severity: str
    rationale: Optional[str] = None


class ContainerConfigChartsResponse(BaseModel):
    issues_by_category: List[ConfigCategoryIssueItem] = Field(default_factory=list)
    posture_distribution: List[PostureDistributionItem] = Field(default_factory=list)
    total_containers: int = 0
    top_hardening_recommendations: List[HardeningRecommendationItem] = Field(default_factory=list)


class ContainerConfigRowItem(BaseModel):
    id: str
    container_name: str
    image: str
    namespace: str
    cluster: str
    privileged: bool
    user: str  # "1000", "0 (root)", etc.
    capabilities_count: int
    capabilities: List[str] = Field(default_factory=list)
    status: str  # "Running", "Degraded", "Terminated"
    findings_count: int
    security_posture: str  # "Compliant" | "Minor issues" | "High risk" | "Critical"
    observed_at: Optional[datetime] = None


class ContainerConfigListResponse(BaseModel):
    items: List[ContainerConfigRowItem]
    total: int
    page: int
    page_size: int
    clusters: List[str] = Field(default_factory=list)
    namespaces: List[str] = Field(default_factory=list)
    statuses: List[str] = Field(default_factory=list)
    postures: List[str] = Field(default_factory=list)


# ============================================================================
# MODULE C: REGISTRY INTEGRATIONS SCHEMAS (ENHANCED)
# ============================================================================

class RegistrySummaryResponse(BaseModel):
    connected_registries: int = 0
    connected_trend: str = "↑ 0%"
    connected_subtitle: str = "Across cloud & self-hosted"
    total_images: int = 0
    images_trend: str = "↑ 12%"
    images_subtitle: str = "From connected registries"
    last_sync: str = "2 hours ago"
    last_sync_subtitle: str = "All registries up to date"
    sync_successful: int = 0
    sync_failed: int = 0
    sync_in_progress: int = 0


class RegistryEnhancedItem(BaseModel):
    id: str
    project_id: str
    name: str  # e.g. "dockerhub-primary"
    provider: str  # "Docker Hub", "Amazon ECR", "Google Artifact Registry", "Azure Container Registry", "Harbor", "JFrog Artifactory"
    provider_code: str  # "DOCKER_HUB", "ECR", "GCR", "ACR", "HARBOR", "ARTIFACTORY"
    type: str  # "Cloud", "Self-hosted"
    images: int
    last_sync: str
    last_sync_at: Optional[datetime] = None
    status: str  # "Connected", "Not Configured", "Failed", "In Progress"
    endpoint: str


class RegistryEnhancedListResponse(BaseModel):
    items: List[RegistryEnhancedItem]
    total: int
    providers: List[str] = Field(default_factory=list)
    types: List[str] = Field(default_factory=list)
    statuses: List[str] = Field(default_factory=list)


# ============================================================================
# MODULE 07: IMAGE SCAN MANAGEMENT SCHEMAS
# ============================================================================

class ImageScanSummaryResponse(BaseModel):
    total_scans: int = 124
    total_scans_trend: str = "↑ 12%"
    successful_scans: int = 98
    successful_trend: str = "↑ 79%"
    failed_scans: int = 6
    failed_trend: str = "↓ 5%"
    in_progress_scans: int = 4
    in_progress_trend: str = "↑ 3%"
    scheduled_scans: int = 16
    scheduled_trend: str = "↑ 13%"


class ScanSeverityBreakdownItem(BaseModel):
    severity: str  # Critical, High, Medium, Low, Info
    count: int
    pct: int
    color: str


class DailyScanTrendItem(BaseModel):
    date: str  # Sep 24, etc.
    critical: int
    high: int
    medium: int
    low: int


class ImageScanChartsResponse(BaseModel):
    total_vulnerabilities: int = 1428
    severity_distribution: List[ScanSeverityBreakdownItem] = Field(default_factory=list)
    scan_trend_timeseries: List[DailyScanTrendItem] = Field(default_factory=list)


class ImageScanJobRow(BaseModel):
    id: str
    image: str
    registry: str
    scan_type: str
    status: str  # Completed, In Progress, Failed, Queued
    vulnerabilities_count: Optional[int] = None
    started_at: str
    started_at_raw: Optional[datetime] = None
    duration: str
    actions: List[str] = Field(default_factory=lambda: ["View Details", "Re-scan", "Export SBOM"])


class ImageScanListResponse(BaseModel):
    items: List[ImageScanJobRow]
    total: int
    page: int
    page_size: int
    registries: List[str] = Field(default_factory=list)
    scan_types: List[str] = Field(default_factory=list)
    statuses: List[str] = Field(default_factory=list)


class RunNewScanRequest(BaseModel):
    target_type: str = "IMAGE"  # IMAGE, REPOSITORY, REGISTRY, KUBERNETES
    target_identifier: str  # e.g. myapp/api:1.4.2
    scan_type: str = "Full Scan"  # Quick Scan, Full Scan, Compliance Scan, Custom Scan
    scan_options: Dict[str, bool] = Field(default_factory=lambda: {
        "scan_secrets": True,
        "generate_sbom": True,
        "analyze_dockerfile": True,
        "enable_storage": True,
    })
    project_id: Optional[str] = None


class FindingPackageTypeItem(BaseModel):
    package_type: str  # OS Packages, Language Packages, Application Code, Dependencies
    count: int
    color: str


class ImageScanFindingDetail(BaseModel):
    id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    package: str
    version: str
    issue: str
    fix_available: Optional[str] = None
    layer: Optional[str] = None
    category: str = "Vulnerability"  # Vulnerability, Secret, Configuration


class ImageScanDetailResponse(BaseModel):
    id: str
    image: str
    registry: str
    status: str
    started_at: str
    duration: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    vulnerabilities_count: int
    secrets_count: int
    config_count: int
    sbom_count: int
    package_types: List[FindingPackageTypeItem] = Field(default_factory=list)
    findings: List[ImageScanFindingDetail] = Field(default_factory=list)
    logs: Optional[str] = None


class ScanScheduleItem(BaseModel):
    id: str
    name: str
    target_type: str
    target_pattern: str
    cron_expression: str
    scan_type: str
    is_enabled: bool
    last_run: Optional[str] = None
    next_run: Optional[str] = None


class ScanScheduleListResponse(BaseModel):
    items: List[ScanScheduleItem]
    total: int


class CreateScheduleRequest(BaseModel):
    name: str
    target_type: str = "IMAGE"
    target_pattern: str
    cron_expression: str = "0 2 * * *"
    scan_type: str = "Full Scan"
    is_enabled: bool = True
    project_id: Optional[str] = None


# ============================================================================
# MODULE 08: KUBERNETES WORKLOADS SCHEMAS
# ============================================================================

class K8sFindingCategoryItem(BaseModel):
    category: str  # Misconfigurations, Vulnerable Images, Privileged Containers, Excessive Permissions, Other
    count: int
    pct: int
    color: str


class K8sWorkloadRiskDistributionItem(BaseModel):
    workload_type: str  # Deployments, StatefulSets, DaemonSets, Jobs
    critical: int
    high: int
    medium: int
    low: int


class KubernetesOverviewResponse(BaseModel):
    clusters_count: int = 4
    clusters_trend: str = "↑ 0%"
    namespaces_count: int = 28
    namespaces_trend: str = "↑ 12%"
    workloads_count: int = 186
    workloads_trend: str = "↑ 8%"
    pods_count: int = 512
    pods_trend: str = "↑ 6%"
    security_findings_count: int = 132
    findings_trend: str = "↑ 18%"
    findings_by_category: List[K8sFindingCategoryItem] = Field(default_factory=list)
    workload_risk_distribution: List[K8sWorkloadRiskDistributionItem] = Field(default_factory=list)


class TopRiskyWorkloadRow(BaseModel):
    id: str
    workload: str
    namespace: str
    type: str  # Deployment, StatefulSet, DaemonSet, Job
    cluster: str
    risk_level: str  # Critical, High, Medium, Low
    findings_count: int
    image: str
    last_scanned: str


class KubernetesClustersSummaryResponse(BaseModel):
    connected_clusters: int = 4
    healthy_count: int = 3
    unhealthy_count: int = 1
    total_namespaces: int = 28


class KubernetesClusterRow(BaseModel):
    id: str
    cluster_name: str
    provider: str  # AWS, Azure, On-prem, Google Cloud
    version: str
    nodes: int
    namespaces: int
    status: str  # Healthy, Unhealthy
    last_sync: str
    environment: str = "Production"


class KubernetesClusterListResponse(BaseModel):
    items: List[KubernetesClusterRow]
    total: int


class KubernetesWorkloadRow(BaseModel):
    id: str
    workload_name: str
    type: str  # Deployment, StatefulSet, DaemonSet, Job, CronJob
    namespace: str
    cluster: str
    pods: str  # e.g. "5/5", "3/3"
    risk_level: str  # Critical, High, Medium, Low
    findings_count: int
    image: str
    status: str  # Running, Degraded, Pending


class KubernetesWorkloadListResponse(BaseModel):
    items: List[KubernetesWorkloadRow]
    total: int
    clusters: List[str] = Field(default_factory=list)
    namespaces: List[str] = Field(default_factory=list)
    statuses: List[str] = Field(default_factory=list)
    risk_levels: List[str] = Field(default_factory=list)


class KubernetesWorkloadDetailResponse(BaseModel):
    id: str
    workload_name: str
    type: str
    namespace: str
    cluster: str
    pods: str
    risk_level: str
    status: str
    image_references: List[str] = Field(default_factory=list)
    service_accounts: List[str] = Field(default_factory=list)
    security_context: Dict[str, Any] = Field(default_factory=dict)
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    observed_at: Optional[str] = None


class KubernetesFindingRow(BaseModel):
    id: str
    workload_name: str
    resource_kind: str
    namespace: str
    cluster: str
    check_type: str
    severity: str
    category: str
    status: str
    remediation: Optional[str] = None


class KubernetesFindingsListResponse(BaseModel):
    items: List[KubernetesFindingRow]
    total: int


# ============================================================================
# MODULE 09: CONTAINER RUNTIME SECURITY SCHEMAS
# ============================================================================

class RuntimeAlertSeverityItem(BaseModel):
    severity: str
    count: int
    pct: int
    color: str


class RuntimeAlertCategoryItem(BaseModel):
    category: str  # Suspicious Process, Network Activity, File System Changes, Privilege Escalation, Crypto Mining
    count: int
    color: str


class RuntimeOverviewResponse(BaseModel):
    runtime_alerts: int = 38
    runtime_alerts_trend: str = "↑ 15%"
    process_events: int = 1284
    process_events_trend: str = "↑ 22%"
    blocked_events: int = 86
    blocked_events_trend: str = "↑ 8%"
    policy_violations: int = 24
    policy_violations_trend: str = "↓ 3%"
    affected_workloads: int = 12
    affected_workloads_trend: str = "↑ 9%"
    telemetry_status: str = "ACTIVE"  # ACTIVE, DEGRADED, NOT_CONFIGURED
    sensor_summary: str = "Kernel eBPF & Runtime Telemetry Probe"
    alerts_by_severity: List[RuntimeAlertSeverityItem] = Field(default_factory=list)
    top_alert_types: List[RuntimeAlertCategoryItem] = Field(default_factory=list)


class RuntimeAlertRow(BaseModel):
    id: str
    time: str
    timestamp_raw: Optional[datetime] = None
    severity: str  # Critical, High, Medium, Low
    event_type: str
    process: str
    workload: str
    namespace: str
    status: str  # Open, Investigating, Resolved


class RuntimeAlertsListResponse(BaseModel):
    items: List[RuntimeAlertRow]
    total: int
    statuses: List[str] = Field(default_factory=list)
    severities: List[str] = Field(default_factory=list)
    event_types: List[str] = Field(default_factory=list)


class RuntimeEventRow(BaseModel):
    id: str
    time: str
    severity: str
    event_type: str  # Suspicious Processes, File System, Network, Privilege Escalation, Process Execution
    process: str
    workload: str
    namespace: str
    cmdline: Optional[str] = None
    container_id: Optional[str] = None


class RuntimeEventsListResponse(BaseModel):
    items: List[RuntimeEventRow]
    total: int
    page: int
    page_size: int
    event_types: List[str] = Field(default_factory=list)
    severities: List[str] = Field(default_factory=list)


class RuntimeEventDetailResponse(BaseModel):
    id: str
    time: str
    severity: str
    event_type: str
    process: str
    cmdline: str
    workload: str
    namespace: str
    container_id: str
    parent_process: str
    pid: int
    ppid: int
    user: str
    network_destination: Optional[str] = None
    file_path: Optional[str] = None
    mitre_attack_id: str = "T1059.004"
    mitre_tactic: str = "Execution"
    investigation_status: str = "Open"
    timeline_events: List[Dict[str, str]] = Field(default_factory=list)


class RuntimePolicyRow(BaseModel):
    id: str
    name: str  # e.g. block-privilege-escalation
    policy_type: str  # Blocking, Detection
    category: str  # Process Control, Network, File System, Capabilities, System
    action: str  # Blocked, Alert
    status: str  # Enabled, Disabled
    scope: str  # All Clusters, Production, Staging
    enforcement_mechanism: str = "Kernel eBPF LSM Probe"
    description: Optional[str] = None


class RuntimePoliciesSummaryResponse(BaseModel):
    total_policies: int = 24
    enabled_count: int = 18
    disabled_count: int = 6
    blocking_count: int = 8
    policies: List[RuntimePolicyRow] = Field(default_factory=list)


class CreateRuntimePolicyRequest(BaseModel):
    name: str
    policy_type: str = "Blocking"
    category: str = "Process Control"
    action: str = "Blocked"
    status: str = "Enabled"
    scope: str = "All Clusters"
    description: Optional[str] = None
    project_id: Optional[str] = None


