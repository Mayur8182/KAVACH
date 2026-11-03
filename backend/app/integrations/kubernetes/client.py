"""
Kubernetes Integration Client.

Uses the kubernetes Python SDK to perform real cluster operations.
Never executes arbitrary kubectl commands (Rule 30).
"""
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class KubernetesConnectionConfig:
    auth_mode: str = "KUBECONFIG"          # KUBECONFIG, IN_CLUSTER, TOKEN
    kubeconfig_path: Optional[str] = None
    api_server: Optional[str] = None
    token_reference: Optional[str] = None  # reference to credential store, not the token itself
    namespace_scope: Optional[List[str]] = None


@dataclass
class KubernetesConnectionResult:
    status: str  # CONNECTED, NOT_CONFIGURED, AUTHENTICATION_FAILED, FORBIDDEN, UNAVAILABLE, ERROR
    server_version: Optional[str] = None
    error: Optional[str] = None


@dataclass
class WorkloadInfo:
    name: str
    kind: str
    namespace: str
    uid: str
    desired_replicas: Optional[int]
    ready_replicas: Optional[int]
    image_references: List[str]
    labels: Dict[str, str]
    status: str


@dataclass
class PodInfo:
    name: str
    namespace: str
    uid: str
    status: str
    node: Optional[str]
    containers: List[Dict[str, Any]]
    service_account: Optional[str]
    security_context: Dict[str, Any]


class KubernetesClient:
    """
    Structured Kubernetes API client.
    Never exposes arbitrary kubectl execution (Rule 30).
    """

    def __init__(self, config: KubernetesConnectionConfig):
        self.config = config

    def _get_api_client(self):
        """Create and return a real Kubernetes API client."""
        try:
            from kubernetes import client, config as k8s_config
            if self.config.auth_mode == "IN_CLUSTER":
                k8s_config.load_incluster_config()
            else:
                k8s_config.load_kube_config(config_file=self.config.kubeconfig_path)
            return client
        except ImportError:
            return None
        except Exception as exc:
            logger.error("Failed to load Kubernetes config: %s", exc)
            return None

    def health_check(self) -> KubernetesConnectionResult:
        """Performs a real Kubernetes API health check."""
        k8s = self._get_api_client()
        if k8s is None:
            return KubernetesConnectionResult(
                status="NOT_CONFIGURED",
                error="kubernetes SDK not installed or kubeconfig not found. "
                      "Install with: pip install kubernetes"
            )
        try:
            version_api = k8s.VersionApi()
            version = version_api.get_code()
            return KubernetesConnectionResult(
                status="CONNECTED",
                server_version=f"{version.major}.{version.minor}",
            )
        except Exception as exc:
            logger.error("Kubernetes health check failed: %s", exc, exc_info=True)
            err = str(exc)
            if "401" in err or "Unauthorized" in err:
                return KubernetesConnectionResult(status="AUTHENTICATION_FAILED", error=err)
            if "403" in err or "Forbidden" in err:
                return KubernetesConnectionResult(status="FORBIDDEN", error=err)
            return KubernetesConnectionResult(status="UNAVAILABLE", error=err)

    def list_namespaces(self) -> List[str]:
        k8s = self._get_api_client()
        if k8s is None:
            return []
        try:
            core = k8s.CoreV1Api()
            ns_list = core.list_namespace()
            namespaces = [ns.metadata.name for ns in ns_list.items]
            # Apply namespace scope restriction
            if self.config.namespace_scope:
                namespaces = [ns for ns in namespaces if ns in self.config.namespace_scope]
            return namespaces
        except Exception as exc:
            logger.error("Failed to list namespaces: %s", exc)
            return []

    def list_workloads(self, namespace: str) -> List[WorkloadInfo]:
        k8s = self._get_api_client()
        if k8s is None:
            return []
        workloads = []
        try:
            apps = k8s.AppsV1Api()
            deployments = apps.list_namespaced_deployment(namespace=namespace)
            for d in deployments.items:
                images = [c.image for c in (d.spec.template.spec.containers or [])]
                workloads.append(WorkloadInfo(
                    name=d.metadata.name,
                    kind="Deployment",
                    namespace=namespace,
                    uid=d.metadata.uid,
                    desired_replicas=d.spec.replicas,
                    ready_replicas=(d.status.ready_replicas or 0),
                    image_references=images,
                    labels=d.metadata.labels or {},
                    status="AVAILABLE" if (d.status.available_replicas or 0) > 0 else "UNAVAILABLE",
                ))
        except Exception as exc:
            logger.error("Failed to list workloads in %s: %s", namespace, exc)
        return workloads

    def list_pods(self, namespace: str) -> List[PodInfo]:
        k8s = self._get_api_client()
        if k8s is None:
            return []
        pods = []
        try:
            core = k8s.CoreV1Api()
            pod_list = core.list_namespaced_pod(namespace=namespace)
            for p in pod_list.items:
                containers = []
                for cs in (p.status.container_statuses or []):
                    containers.append({
                        "name": cs.name,
                        "image": cs.image,
                        "imageID": cs.image_id,
                        "ready": cs.ready,
                        "restartCount": cs.restart_count,
                    })
                pods.append(PodInfo(
                    name=p.metadata.name,
                    namespace=namespace,
                    uid=p.metadata.uid,
                    status=p.status.phase or "Unknown",
                    node=p.spec.node_name,
                    containers=containers,
                    service_account=p.spec.service_account_name,
                    security_context={
                        "runAsNonRoot": getattr(p.spec.security_context, "run_as_non_root", None),
                        "runAsUser": getattr(p.spec.security_context, "run_as_user", None),
                    } if p.spec.security_context else {},
                ))
        except Exception as exc:
            logger.error("Failed to list pods in %s: %s", namespace, exc)
        return pods

    def apply_manifest(self, manifest: Dict[str, Any], namespace: str, dry_run: bool = False) -> Dict[str, Any]:
        """
        Apply a structured Kubernetes manifest via the API.
        Never executes arbitrary kubectl commands.
        dry_run=True uses Kubernetes server-side dry-run.
        """
        k8s = self._get_api_client()
        if k8s is None:
            return {"status": "NOT_CONFIGURED", "error": "Kubernetes SDK not available"}
        try:
            from kubernetes.utils import create_from_dict
            dry_run_param = "All" if dry_run else None
            # create_from_dict handles resource routing
            create_from_dict(k8s.ApiClient(), manifest, dry_run=dry_run_param, namespace=namespace)
            status = "DRY_RUN_PASSED" if dry_run else "APPLIED"
            return {"status": status}
        except Exception as exc:
            logger.error("Kubernetes apply_manifest failed: %s", exc, exc_info=True)
            return {"status": "APPLY_FAILED", "error": str(exc)}

    def get_deployment_rollout_status(self, namespace: str, deployment_name: str) -> Dict[str, Any]:
        """Check actual rollout state. Never trusts desired replicas alone."""
        k8s = self._get_api_client()
        if k8s is None:
            return {"status": "NOT_CONFIGURED"}
        try:
            apps = k8s.AppsV1Api()
            d = apps.read_namespaced_deployment(name=deployment_name, namespace=namespace)
            status = d.status
            desired = d.spec.replicas or 1
            ready = status.ready_replicas or 0
            updated = status.updated_replicas or 0
            available = status.available_replicas or 0
            if ready >= desired and updated >= desired:
                rollout_status = "ROLLOUT_SUCCESS"
            elif status.unavailable_replicas and status.unavailable_replicas > 0:
                rollout_status = "ROLLOUT_FAILED"
            else:
                rollout_status = "ROLLOUT_PENDING"
            return {
                "status": rollout_status,
                "desired": desired,
                "ready": ready,
                "updated": updated,
                "available": available,
            }
        except Exception as exc:
            logger.error("Failed to get rollout status for %s/%s: %s", namespace, deployment_name, exc)
            return {"status": "ROLLOUT_FAILED", "error": str(exc)}
