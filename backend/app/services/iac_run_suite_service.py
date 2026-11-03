"""
Service layer for IaC Security Run Suite (Section 7: Screens 7.1 to 7.8)
Provides deterministic runtime state and operations for:
- 7.1 Run Overview (KPIs, Activity timeline, Recent events)
- 7.2 Workloads (Deployments, StatefulSets, DaemonSets)
- 7.3 Containers (Container runtime health, CPU, Memory)
- 7.4 Kubernetes (Cluster posture, Node statuses, Core components)
- 7.5 Runtime Threats (Investigation, Status mutation)
- 7.6 Runtime Vulnerabilities (Running container CVEs, resolution tracking)
- 7.7 Network Activity (Workload flow logs, byte metrics, allow/block actions)
- 7.8 Runtime Security Policies (Policies management, status toggle, policy creation)
"""

from typing import List, Dict, Any, Optional
import uuid
from app.schemas.iac_run_suite import (
    RunOverviewResponse,
    RunOverviewKpis,
    RuntimeActivityPoint,
    RuntimeEventItem,
    WorkloadsResponse,
    WorkloadItem,
    ContainersResponse,
    ContainerItem,
    KubernetesClusterResponse,
    KubernetesNodeItem,
    ClusterComponentItem,
    RuntimeThreatsResponse,
    RuntimeThreatItem,
    RuntimeVulnerabilitiesResponse,
    RuntimeVulnerabilityItem,
    NetworkActivityResponse,
    NetworkFlowLogItem,
    RuntimePoliciesResponse,
    RuntimePolicyItem,
    CreateRuntimePolicyRequest,
)


class IaCRunSuiteService:
    def __init__(self):
        self._init_data()

    def _init_data(self):
        # 7.1 Overview activity chart
        self.activity_points = [
            RuntimeActivityPoint(hour="00:00", normal=32, suspicious=4, blocked=2),
            RuntimeActivityPoint(hour="03:00", normal=28, suspicious=6, blocked=1),
            RuntimeActivityPoint(hour="06:00", normal=45, suspicious=8, blocked=3),
            RuntimeActivityPoint(hour="09:00", normal=88, suspicious=14, blocked=5),
            RuntimeActivityPoint(hour="12:00", normal=120, suspicious=18, blocked=8),
            RuntimeActivityPoint(hour="15:00", normal=110, suspicious=12, blocked=4),
            RuntimeActivityPoint(hour="18:00", normal=75, suspicious=9, blocked=2),
            RuntimeActivityPoint(hour="21:00", normal=50, suspicious=5, blocked=1),
        ]

        # 7.1 Recent events
        self.recent_events = [
            RuntimeEventItem(
                id="evt-1",
                time="10:12 AM",
                event="Suspicious process",
                resource="web-7f8d9",
                severity="High",
                status="Blocked",
            ),
            RuntimeEventItem(
                id="evt-2",
                time="09:48 AM",
                event="Network policy violation",
                resource="api-5d6c7",
                severity="Medium",
                status="Detected",
            ),
            RuntimeEventItem(
                id="evt-3",
                time="09:21 AM",
                event="Privilege escalation",
                resource="worker-9c2e",
                severity="Critical",
                status="Blocked",
            ),
            RuntimeEventItem(
                id="evt-4",
                time="08:55 AM",
                event="Unexpected file access",
                resource="frontend-6b4a",
                severity="Low",
                status="Allowed",
            ),
            RuntimeEventItem(
                id="evt-5",
                time="08:33 AM",
                event="Container started",
                resource="db-7a1f0",
                severity="Info",
                status="Allowed",
            ),
        ]

        # 7.2 Workloads
        self.workloads: List[WorkloadItem] = [
            WorkloadItem(id="wl-1", name="frontend-app", type="Deployment", namespace="production", cluster="eks-prod-cluster", status="Running", pods_ready=3, pods_total=3),
            WorkloadItem(id="wl-2", name="api-service", type="Deployment", namespace="production", cluster="eks-prod-cluster", status="Running", pods_ready=3, pods_total=3),
            WorkloadItem(id="wl-3", name="worker", type="Deployment", namespace="production", cluster="eks-prod-cluster", status="Running", pods_ready=2, pods_total=2),
            WorkloadItem(id="wl-4", name="postgres", type="StatefulSet", namespace="production", cluster="eks-prod-cluster", status="Running", pods_ready=1, pods_total=1),
            WorkloadItem(id="wl-5", name="redis", type="StatefulSet", namespace="production", cluster="eks-prod-cluster", status="Running", pods_ready=1, pods_total=1),
            WorkloadItem(id="wl-6", name="nginx-ingress", type="DaemonSet", namespace="ingress", cluster="eks-prod-cluster", status="Running", pods_ready=2, pods_total=2),
            WorkloadItem(id="wl-7", name="monitoring", type="Deployment", namespace="monitoring", cluster="eks-prod-cluster", status="Running", pods_ready=2, pods_total=2),
            WorkloadItem(id="wl-8", name="log-collector", type="DaemonSet", namespace="monitoring", cluster="eks-prod-cluster", status="Running", pods_ready=2, pods_total=2),
            WorkloadItem(id="wl-9", name="cert-manager", type="Deployment", namespace="kube-system", cluster="eks-prod-cluster", status="Running", pods_ready=1, pods_total=1),
            WorkloadItem(id="wl-10", name="external-dns", type="Deployment", namespace="kube-system", cluster="eks-prod-cluster", status="Running", pods_ready=1, pods_total=1),
            WorkloadItem(id="wl-11", name="vault-agent", type="Deployment", namespace="production", cluster="eks-prod-cluster", status="Running", pods_ready=1, pods_total=1),
            WorkloadItem(id="wl-12", name="node-exporter", type="DaemonSet", namespace="monitoring", cluster="eks-prod-cluster", status="Running", pods_ready=3, pods_total=3),
        ]

        # 7.3 Containers
        self.containers: List[ContainerItem] = [
            ContainerItem(id="cnt-1", container="frontend", image="frontend:1.2.0", pod="frontend-7f8d9", status="Running", cpu="12%", memory="256 MB", cluster="eks-prod-cluster", namespace="production"),
            ContainerItem(id="cnt-2", container="api", image="api:2.3.1", pod="api-5d6c7", status="Running", cpu="18%", memory="512 MB", cluster="eks-prod-cluster", namespace="production"),
            ContainerItem(id="cnt-3", container="worker", image="worker:1.0.0", pod="worker-9c2e", status="Running", cpu="8%", memory="384 MB", cluster="eks-prod-cluster", namespace="production"),
            ContainerItem(id="cnt-4", container="postgres", image="postgres:15", pod="db-7a1f0", status="Running", cpu="22%", memory="1.2 GB", cluster="eks-prod-cluster", namespace="production"),
            ContainerItem(id="cnt-5", container="redis", image="redis:7", pod="redis-4c9e", status="Running", cpu="6%", memory="128 MB", cluster="eks-prod-cluster", namespace="production"),
            ContainerItem(id="cnt-6", container="nginx", image="nginx:1.25", pod="nginx-6c3b", status="Running", cpu="4%", memory="128 MB", cluster="eks-prod-cluster", namespace="ingress"),
            ContainerItem(id="cnt-7", container="prometheus", image="prom:2.48", pod="prom-5e1a", status="Running", cpu="14%", memory="512 MB", cluster="eks-prod-cluster", namespace="monitoring"),
            ContainerItem(id="cnt-8", container="grafana", image="grafana:10", pod="grafana-7a8d", status="Running", cpu="9%", memory="256 MB", cluster="eks-prod-cluster", namespace="monitoring"),
            ContainerItem(id="cnt-9", container="fluent-bit", image="fluent-bit:2.1", pod="log-7c9d8", status="Running", cpu="5%", memory="128 MB", cluster="eks-prod-cluster", namespace="monitoring"),
            ContainerItem(id="cnt-10", container="cert-manager", image="cert-manager:1.14", pod="cert-2b3a", status="Running", cpu="3%", memory="64 MB", cluster="eks-prod-cluster", namespace="kube-system"),
        ]

        # 7.4 Kubernetes
        self.k8s_nodes: List[KubernetesNodeItem] = [
            KubernetesNodeItem(name="ip-10-0-1-112", instance_type="t3.large", status="Ready", cpu="32%", memory="48%", pods=14),
            KubernetesNodeItem(name="ip-10-0-2-34", instance_type="t3.medium", status="Ready", cpu="41%", memory="62%", pods=16),
            KubernetesNodeItem(name="ip-10-0-3-56", instance_type="t3.medium", status="Ready", cpu="28%", memory="38%", pods=12),
        ]
        self.k8s_components: List[ClusterComponentItem] = [
            ClusterComponentItem(component="kube-apiserver", status="Healthy", version="v1.28.3"),
            ClusterComponentItem(component="kube-scheduler", status="Healthy", version="v1.28.3"),
            ClusterComponentItem(component="kube-controller-manager", status="Healthy", version="v1.28.3"),
            ClusterComponentItem(component="etcd", status="Healthy", version="v3.5.9"),
            ClusterComponentItem(component="coredns", status="Healthy", version="v1.11.1"),
        ]

        # 7.5 Runtime Threats
        self.threats: List[RuntimeThreatItem] = [
            RuntimeThreatItem(id="thr-1", time="10:12 AM", threat="Reverse shell detected", resource="web-7f8d9", severity="Critical", status="Blocked", details="Outbound TCP session initiated on unprivileged port to unrecognized public IP"),
            RuntimeThreatItem(id="thr-2", time="09:48 AM", threat="Suspicious outbound connection", resource="api-5d6c7", severity="High", status="Detected", details="DNS query to high-entropy domain outside configured egress boundaries"),
            RuntimeThreatItem(id="thr-3", time="09:21 AM", threat="Privilege escalation attempt", resource="worker-9c2e", severity="Critical", status="Blocked", details="setuid syscall intercepted by seccomp profile filter"),
            RuntimeThreatItem(id="thr-4", time="08:55 AM", threat="Unexpected file modification", resource="frontend-6b4a", severity="Medium", status="Detected", details="Write attempt detected on read-only root filesystem mount"),
            RuntimeThreatItem(id="thr-5", time="08:33 AM", threat="Container escape attempt", resource="db-7a1f0", severity="High", status="Blocked", details="Attempted access to /proc/sysrq-trigger via container breakout sequence"),
            RuntimeThreatItem(id="thr-6", time="07:12 AM", threat="Crypto miner activity", resource="worker-9c2e", severity="High", status="Blocked", details="Stratum protocol signature detected in egress payload stream"),
            RuntimeThreatItem(id="thr-7", time="06:45 AM", threat="Suspicious process execution", resource="api-5d6c7", severity="Medium", status="Detected", details="Execution of /bin/sh binary inside distroless container image"),
            RuntimeThreatItem(id="thr-8", time="05:33 AM", threat="Unknown binary execution", resource="web-7f8d9", severity="Medium", status="Detected", details="ELF binary dropped in /tmp executed without whitelisted hash"),
            RuntimeThreatItem(id="thr-9", time="04:21 AM", threat="Lateral movement detected", resource="redis-4c9e", severity="High", status="Blocked", details="SYN scanning sequence directed at adjacent container subnet"),
            RuntimeThreatItem(id="thr-10", time="03:18 AM", threat="Sensitive file access", resource="api-5d6c7", severity="Low", status="Detected", details="Direct read operation on /var/run/secrets/kubernetes.io/serviceaccount"),
        ]

        # 7.6 Runtime Vulnerabilities
        self.vulnerabilities: List[RuntimeVulnerabilityItem] = [
            RuntimeVulnerabilityItem(id="vuln-1", cve="CVE-2024-21626", package="runc", severity="Critical", resource="api-5d6c7", status="Open", fix_version="v1.1.12"),
            RuntimeVulnerabilityItem(id="vuln-2", cve="CVE-2023-48795", package="glibc", severity="High", resource="frontend-7f8d9", status="Open", fix_version="2.38-r1"),
            RuntimeVulnerabilityItem(id="vuln-3", cve="CVE-2024-3094", package="openssl", severity="Critical", resource="worker-9c2e", status="Open", fix_version="3.0.13"),
            RuntimeVulnerabilityItem(id="vuln-4", cve="CVE-2023-38545", package="nginx", severity="Medium", resource="nginx-6c3b", status="In Progress", fix_version="1.25.3"),
            RuntimeVulnerabilityItem(id="vuln-5", cve="CVE-2024-25600", package="containerd", severity="High", resource="node-ip-10-0-1-12", status="Open", fix_version="1.6.28"),
            RuntimeVulnerabilityItem(id="vuln-6", cve="CVE-2023-52365", package="curl", severity="Low", resource="api-5d6c7", status="Resolved", fix_version="8.5.0"),
            RuntimeVulnerabilityItem(id="vuln-7", cve="CVE-2024-29849", package="linux-kernel", severity="High", resource="node-ip-10-0-2-34", status="Open", fix_version="6.1.75"),
            RuntimeVulnerabilityItem(id="vuln-8", cve="CVE-2023-45142", package="python", severity="Medium", resource="worker-9c2e", status="Resolved", fix_version="3.11.8"),
            RuntimeVulnerabilityItem(id="vuln-9", cve="CVE-2024-37198", package="redis", severity="Low", resource="redis-4c9e", status="Resolved", fix_version="7.2.4"),
            RuntimeVulnerabilityItem(id="vuln-10", cve="CVE-2023-40325", package="busybox", severity="Low", resource="frontend-7f8d9", status="Open", fix_version="1.36.1"),
        ]

        # 7.7 Network Activity
        self.flow_logs: List[NetworkFlowLogItem] = [
            NetworkFlowLogItem(id="flow-1", source="web-7f8d9", destination="api-5d6c7", protocol="TCP", port=8080, action="Allow", bytes="12.4 MB", namespace="production"),
            NetworkFlowLogItem(id="flow-2", source="api-5d6c7", destination="db-7a1f0", protocol="TCP", port=5432, action="Allow", bytes="8.7 MB", namespace="production"),
            NetworkFlowLogItem(id="flow-3", source="worker-9c2e", destination="redis-4c9e", protocol="TCP", port=6379, action="Allow", bytes="3.2 MB", namespace="production"),
            NetworkFlowLogItem(id="flow-4", source="frontend-6b4a", destination="external (aws)", protocol="HTTPS", port=443, action="Allow", bytes="1.1 MB", namespace="production"),
            NetworkFlowLogItem(id="flow-5", source="api-5d6c7", destination="api.github.com", protocol="HTTPS", port=443, action="Allow", bytes="2.8 MB", namespace="production"),
            NetworkFlowLogItem(id="flow-6", source="web-7f8d9", destination="unknown (45.12.3.4)", protocol="TCP", port=4444, action="Block", bytes="0 B", namespace="production"),
            NetworkFlowLogItem(id="flow-7", source="worker-9c2e", destination="external (s3.amazon)", protocol="HTTPS", port=443, action="Allow", bytes="4.6 MB", namespace="production"),
            NetworkFlowLogItem(id="flow-8", source="api-5d6c7", destination="monitoring", protocol="TCP", port=9090, action="Allow", bytes="1.2 MB", namespace="monitoring"),
            NetworkFlowLogItem(id="flow-9", source="redis-4c9e", destination="unknown (91.23.5.6)", protocol="TCP", port=6379, action="Block", bytes="0 B", namespace="production"),
            NetworkFlowLogItem(id="flow-10", source="frontend-6b4a", destination="cdn.cloudflare.com", protocol="HTTPS", port=443, action="Allow", bytes="6.3 MB", namespace="production"),
        ]

        # 7.8 Runtime Security Policies
        self.policies: List[RuntimePolicyItem] = [
            RuntimePolicyItem(id="pol-1", name="Block Privileged Containers", type="Runtime", scope="Cluster", status="Enabled", description="Disallow container execution with privileged: true flag"),
            RuntimePolicyItem(id="pol-2", name="Restrict Host Network", type="Runtime", scope="Cluster", status="Enabled", description="Prevent workloads from binding to node host network interfaces"),
            RuntimePolicyItem(id="pol-3", name="Read-only Filesystem", type="Runtime", scope="Namespace", status="Enabled", description="Enforce read-only root filesystems on all workloads"),
            RuntimePolicyItem(id="pol-4", name="Allowed Registries", type="Runtime", scope="Cluster", status="Enabled", description="Restrict container images to approved internal ECR repositories"),
            RuntimePolicyItem(id="pol-5", name="Drop Linux Capabilities", type="Runtime", scope="Cluster", status="Enabled", description="Drop all standard Linux capabilities and grant only minimum required"),
            RuntimePolicyItem(id="pol-6", name="Process Whitelist", type="Runtime", scope="Namespace", status="Disabled", description="Enforce strict executable hash whitelist per pod baseline"),
            RuntimePolicyItem(id="pol-7", name="Network Egress Control", type="Network", scope="Cluster", status="Enabled", description="Block outbound egress to unknown external IP ranges"),
            RuntimePolicyItem(id="pol-8", name="File System Monitoring", type="Runtime", scope="Cluster", status="Enabled", description="Real-time alert on modification of system binaries in /bin and /usr"),
            RuntimePolicyItem(id="pol-9", name="Syscall Filtering", type="Runtime", scope="Namespace", status="Enabled", description="Restrict dangerous syscalls using active Seccomp profile"),
            RuntimePolicyItem(id="pol-10", name="Resource Limits", type="Runtime", scope="Cluster", status="Enabled", description="Enforce CPU and memory request/limit bounds on all deployments"),
        ]

    # 7.1 Overview
    def get_overview(self, time_range: str = "Last 24 hours") -> RunOverviewResponse:
        active_threats = sum(1 for t in self.threats if t.severity == "Critical" or (t.severity == "High" and t.status == "Detected"))
        open_vulns = sum(1 for v in self.vulnerabilities if v.status != "Resolved")

        # Dynamic activity chart based on time_range
        if time_range == "Last 7 days":
            chart_points = [
                RuntimeActivityPoint(hour="Mon", normal=240, suspicious=35, blocked=12),
                RuntimeActivityPoint(hour="Tue", normal=310, suspicious=42, blocked=18),
                RuntimeActivityPoint(hour="Wed", normal=285, suspicious=38, blocked=14),
                RuntimeActivityPoint(hour="Thu", normal=390, suspicious=54, blocked=21),
                RuntimeActivityPoint(hour="Fri", normal=420, suspicious=60, blocked=28),
                RuntimeActivityPoint(hour="Sat", normal=180, suspicious=18, blocked=8),
                RuntimeActivityPoint(hour="Sun", normal=160, suspicious=14, blocked=6),
            ]
        elif time_range == "Last 30 days":
            chart_points = [
                RuntimeActivityPoint(hour="Week 1", normal=1850, suspicious=220, blocked=84),
                RuntimeActivityPoint(hour="Week 2", normal=2100, suspicious=260, blocked=96),
                RuntimeActivityPoint(hour="Week 3", normal=1980, suspicious=240, blocked=90),
                RuntimeActivityPoint(hour="Week 4", normal=2340, suspicious=295, blocked=112),
            ]
        else:
            chart_points = self.activity_points

        return RunOverviewResponse(
            time_range=time_range,
            kpis=RunOverviewKpis(
                workloads_count=len(self.workloads),
                runtime_threats_count=active_threats,
                vulnerabilities_count=open_vulns,
                uptime_percentage=99.9,
            ),
            activity_chart=chart_points,
            recent_events=self.recent_events,
        )

    # 7.2 Workloads
    def get_workloads(
        self,
        cluster: Optional[str] = None,
        namespace: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> WorkloadsResponse:
        items = self.workloads
        if cluster and cluster != "All Clusters":
            items = [w for w in items if w.cluster == cluster]
        if namespace and namespace != "All Namespaces":
            items = [w for w in items if w.namespace == namespace]
        if search:
            q = search.lower()
            items = [w for w in items if q in w.name.lower() or q in w.type.lower() or q in w.namespace.lower()]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start : start + page_size]

        clusters = ["All Clusters", "eks-prod-cluster", "gke-staging-cluster", "aks-dev-cluster"]
        namespaces = ["All Namespaces", "production", "ingress", "monitoring", "kube-system"]

        return WorkloadsResponse(
            items=paged,
            total=total,
            page=page,
            page_size=page_size,
            clusters=clusters,
            namespaces=namespaces,
        )

    # 7.3 Containers
    def get_containers(
        self,
        cluster: Optional[str] = None,
        namespace: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> ContainersResponse:
        items = self.containers
        if cluster and cluster != "All Clusters":
            items = [c for c in items if c.cluster == cluster]
        if namespace and namespace != "All Namespaces":
            items = [c for c in items if c.namespace == namespace]
        if status and status != "All Statuses":
            items = [c for c in items if c.status == status]
        if search:
            q = search.lower()
            items = [c for c in items if q in c.container.lower() or q in c.image.lower() or q in c.pod.lower()]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start : start + page_size]

        clusters = ["All Clusters", "eks-prod-cluster", "gke-staging-cluster", "aks-dev-cluster"]
        namespaces = ["All Namespaces", "production", "ingress", "monitoring", "kube-system"]
        statuses = ["All Statuses", "Running", "Pending", "Terminated", "Failed"]

        return ContainersResponse(
            items=paged,
            total=total,
            page=page,
            page_size=page_size,
            clusters=clusters,
            namespaces=namespaces,
            statuses=statuses,
        )

    # 7.4 Kubernetes
    def get_kubernetes_cluster(self, cluster_id: str = "eks-prod-cluster") -> KubernetesClusterResponse:
        available_clusters = ["eks-prod-cluster (production)", "gke-staging-cluster (staging)", "aks-dev-cluster (development)"]
        return KubernetesClusterResponse(
            cluster_id=cluster_id,
            cluster_name="eks-prod-cluster (production)",
            environment="production",
            nodes_count=len(self.k8s_nodes),
            pods_count=42,
            namespaces_count=6,
            cluster_health=99.9,
            nodes=self.k8s_nodes,
            components=self.k8s_components,
            available_clusters=available_clusters,
        )

    # 7.5 Runtime Threats
    def get_threats(
        self,
        cluster: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> RuntimeThreatsResponse:
        items = self.threats
        if cluster and cluster != "All Clusters":
            items = [t for t in items if t.cluster == cluster]
        if severity and severity != "All Severities":
            items = [t for t in items if t.severity == severity]
        if search:
            q = search.lower()
            items = [t for t in items if q in t.threat.lower() or q in t.resource.lower()]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start : start + page_size]

        clusters = ["All Clusters", "eks-prod-cluster", "gke-staging-cluster", "aks-dev-cluster"]
        severities = ["All Severities", "Critical", "High", "Medium", "Low", "Info"]

        return RuntimeThreatsResponse(
            items=paged,
            total=total,
            page=page,
            page_size=page_size,
            clusters=clusters,
            severities=severities,
        )

    def update_threat_status(self, threat_id: str, new_status: str) -> Optional[RuntimeThreatItem]:
        for t in self.threats:
            if t.id == threat_id:
                t.status = new_status
                return t
        return None

    # 7.6 Runtime Vulnerabilities
    def get_vulnerabilities(
        self,
        cluster: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> RuntimeVulnerabilitiesResponse:
        items = self.vulnerabilities
        if cluster and cluster != "All Clusters":
            items = [v for v in items if v.cluster == cluster]
        if severity and severity != "All Severities":
            items = [v for v in items if v.severity == severity]
        if status and status != "All Statuses":
            items = [v for v in items if v.status == status]
        if search:
            q = search.lower()
            items = [v for v in items if q in v.cve.lower() or q in v.package.lower() or q in v.resource.lower()]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start : start + page_size]

        clusters = ["All Clusters", "eks-prod-cluster", "gke-staging-cluster", "aks-dev-cluster"]
        severities = ["All Severities", "Critical", "High", "Medium", "Low"]
        statuses = ["All Statuses", "Open", "In Progress", "Resolved"]

        return RuntimeVulnerabilitiesResponse(
            items=paged,
            total=total,
            page=page,
            page_size=page_size,
            clusters=clusters,
            severities=severities,
            statuses=statuses,
        )

    def update_vulnerability_status(self, vuln_id: str, new_status: str) -> Optional[RuntimeVulnerabilityItem]:
        for v in self.vulnerabilities:
            if v.id == vuln_id:
                v.status = new_status
                return v
        return None

    # 7.7 Network Activity
    def get_network_activity(
        self,
        cluster: Optional[str] = None,
        namespace: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> NetworkActivityResponse:
        items = self.flow_logs
        if cluster and cluster != "All Clusters":
            items = [f for f in items if f.cluster == cluster]
        if namespace and namespace != "All Namespaces":
            items = [f for f in items if f.namespace == namespace]
        if search:
            q = search.lower()
            items = [f for f in items if q in f.source.lower() or q in f.destination.lower() or q in str(f.port)]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start : start + page_size]

        clusters = ["All Clusters", "eks-prod-cluster", "gke-staging-cluster", "aks-dev-cluster"]
        namespaces = ["All Namespaces", "production", "ingress", "monitoring", "kube-system"]

        return NetworkActivityResponse(
            items=paged,
            total=total,
            page=page,
            page_size=page_size,
            clusters=clusters,
            namespaces=namespaces,
        )

    # 7.8 Runtime Policies
    def get_policies(self, page: int = 1, page_size: int = 10) -> RuntimePoliciesResponse:
        total = len(self.policies)
        start = (page - 1) * page_size
        paged = self.policies[start : start + page_size]
        return RuntimePoliciesResponse(items=paged, total=total, page=page, page_size=page_size)

    def create_policy(self, req: CreateRuntimePolicyRequest) -> RuntimePolicyItem:
        new_pol = RuntimePolicyItem(
            id=f"pol-{uuid.uuid4().hex[:6]}",
            name=req.name,
            type=req.type,
            scope=req.scope,
            status=req.status,
            description=req.description,
            rules_count=1,
        )
        self.policies.append(new_pol)
        return new_pol

    def toggle_policy_status(self, policy_id: str, new_status: str) -> Optional[RuntimePolicyItem]:
        for p in self.policies:
            if p.id == policy_id:
                p.status = new_status
                return p
        return None

    def delete_policy(self, policy_id: str) -> bool:
        initial_len = len(self.policies)
        self.policies = [p for p in self.policies if p.id != policy_id]
        return len(self.policies) < initial_len


# Global singleton service instance
iac_run_suite_service = IaCRunSuiteService()
