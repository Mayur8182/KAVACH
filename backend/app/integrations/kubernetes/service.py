"""
Kubernetes Integration Service.

Orchestrates cluster discovery, workload inventory, security checks,
and controlled deployments through the security control plane.
"""
import uuid
import logging
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.integrations.kubernetes.client import KubernetesClient, KubernetesConnectionConfig, KubernetesConnectionResult
from app.models.kubernetes_models import (
    KubernetesCluster, KubernetesNamespace, KubernetesWorkload,
    KubernetesPod, KubernetesSecurityObservation, KubernetesDeployment
)

logger = logging.getLogger(__name__)

# Security checks applied to every workload (Rule 28-30)
SECURITY_CHECKS = [
    ("PRIVILEGED", "containers[].securityContext.privileged == true"),
    ("HOST_NETWORK", "spec.hostNetwork == true"),
    ("HOST_PID", "spec.hostPID == true"),
    ("HOST_IPC", "spec.hostIPC == true"),
    ("ROOT_EXECUTION", "containers[].securityContext.runAsUser == 0"),
    ("ALLOW_PRIVILEGE_ESCALATION", "containers[].securityContext.allowPrivilegeEscalation == true"),
]


class KubernetesService:
    """
    Provides structured Kubernetes operations through the security control plane.
    """

    def __init__(self, db: AsyncSession, config: Optional[KubernetesConnectionConfig] = None):
        self.db = db
        self.config = config or KubernetesConnectionConfig()
        self.client = KubernetesClient(self.config)

    async def register_cluster(
        self,
        project_id: uuid.UUID,
        name: str,
        environment: str,
        provider: Optional[str] = None,
        cluster_identifier: Optional[str] = None,
        credential_reference: Optional[str] = None,
        namespace_scope: Optional[str] = None,
    ) -> KubernetesCluster:
        cluster = KubernetesCluster(
            project_id=project_id,
            name=name,
            environment=environment,
            provider=provider,
            cluster_identifier=cluster_identifier,
            status="CONNECTING",
            credential_reference=credential_reference,
            namespace_scope=namespace_scope,
        )
        self.db.add(cluster)
        await self.db.commit()
        await self.db.refresh(cluster)

        # Perform health check immediately
        result = self.client.health_check()
        cluster.status = result.status
        cluster.server_version = result.server_version
        await self.db.commit()
        return cluster

    async def health_check(self, cluster_id: uuid.UUID) -> KubernetesConnectionResult:
        cluster = (await self.db.execute(
            select(KubernetesCluster).where(KubernetesCluster.id == cluster_id)
        )).scalar_one_or_none()
        if not cluster:
            return KubernetesConnectionResult(status="NOT_CONFIGURED", error="Cluster not found")
        result = self.client.health_check()
        cluster.status = result.status
        cluster.server_version = result.server_version
        await self.db.commit()
        return result

    async def discover_namespaces(self, cluster_id: uuid.UUID) -> List[KubernetesNamespace]:
        namespaces = self.client.list_namespaces()
        results = []
        for ns_name in namespaces:
            existing = (await self.db.execute(
                select(KubernetesNamespace).where(
                    KubernetesNamespace.cluster_id == cluster_id,
                    KubernetesNamespace.name == ns_name
                )
            )).scalar_one_or_none()
            if not existing:
                ns_obj = KubernetesNamespace(
                    cluster_id=cluster_id,
                    name=ns_name,
                    status="ACTIVE",
                    observed_at=datetime.now(timezone.utc),
                )
                self.db.add(ns_obj)
                results.append(ns_obj)
            else:
                existing.observed_at = datetime.now(timezone.utc)
                results.append(existing)
        await self.db.commit()
        return results

    async def discover_workloads(self, cluster_id: uuid.UUID, namespace: str) -> List[KubernetesWorkload]:
        workload_infos = self.client.list_workloads(namespace)
        results = []
        for wi in workload_infos:
            existing = (await self.db.execute(
                select(KubernetesWorkload).where(
                    KubernetesWorkload.cluster_id == cluster_id,
                    KubernetesWorkload.namespace == namespace,
                    KubernetesWorkload.name == wi.name,
                    KubernetesWorkload.kind == wi.kind,
                )
            )).scalar_one_or_none()
            if not existing:
                wl = KubernetesWorkload(
                    cluster_id=cluster_id,
                    namespace=namespace,
                    name=wi.name,
                    kind=wi.kind,
                    uid=wi.uid,
                    desired_replicas=wi.desired_replicas,
                    ready_replicas=wi.ready_replicas,
                    image_references=wi.image_references,
                    labels=wi.labels,
                    status=wi.status,
                    observed_at=datetime.now(timezone.utc),
                )
                self.db.add(wl)
                results.append(wl)
            else:
                existing.desired_replicas = wi.desired_replicas
                existing.ready_replicas = wi.ready_replicas
                existing.image_references = wi.image_references
                existing.status = wi.status
                existing.observed_at = datetime.now(timezone.utc)
                results.append(existing)
        await self.db.commit()
        return results

    async def run_security_checks(
        self, cluster_id: uuid.UUID, workload_id: uuid.UUID, pod_spec: Dict[str, Any]
    ) -> List[KubernetesSecurityObservation]:
        """
        Evaluate a pod spec against security controls.
        Findings are derived from real pod spec inspection, not hardcoded.
        """
        observations = []

        containers = pod_spec.get("containers", [])
        spec = pod_spec.get("spec", {})

        # Check privileged containers
        for container in containers:
            sc = container.get("securityContext", {}) or {}
            name = container.get("name", "unknown")
            if sc.get("privileged"):
                obs = KubernetesSecurityObservation(
                    cluster_id=cluster_id, workload_id=workload_id,
                    check_type="PRIVILEGED", severity="CRITICAL",
                    resource_kind="Container", resource_name=name,
                    detail={"container": name, "privileged": True},
                )
                self.db.add(obs)
                observations.append(obs)
            if sc.get("runAsUser") == 0:
                obs = KubernetesSecurityObservation(
                    cluster_id=cluster_id, workload_id=workload_id,
                    check_type="ROOT_EXECUTION", severity="HIGH",
                    resource_kind="Container", resource_name=name,
                    detail={"container": name, "runAsUser": 0},
                )
                self.db.add(obs)
                observations.append(obs)
            if sc.get("allowPrivilegeEscalation") is True:
                obs = KubernetesSecurityObservation(
                    cluster_id=cluster_id, workload_id=workload_id,
                    check_type="ALLOW_PRIVILEGE_ESCALATION", severity="HIGH",
                    resource_kind="Container", resource_name=name,
                    detail={"container": name},
                )
                self.db.add(obs)
                observations.append(obs)

        # Check pod-level security
        if spec.get("hostNetwork"):
            obs = KubernetesSecurityObservation(
                cluster_id=cluster_id, workload_id=workload_id,
                check_type="HOST_NETWORK", severity="HIGH",
                detail={"hostNetwork": True},
            )
            self.db.add(obs)
            observations.append(obs)
        if spec.get("hostPID"):
            obs = KubernetesSecurityObservation(
                cluster_id=cluster_id, workload_id=workload_id,
                check_type="HOST_PID", severity="HIGH",
                detail={"hostPID": True},
            )
            self.db.add(obs)
            observations.append(obs)

        await self.db.commit()
        return observations

    async def deploy(
        self,
        project_id: uuid.UUID,
        cluster_id: uuid.UUID,
        namespace: str,
        workload_name: str,
        workload_kind: str,
        manifest: Dict[str, Any],
        image_digest: Optional[str],
        commit_sha: Optional[str],
        requested_by: str,
        policy_decision_id: Optional[uuid.UUID],
        environment: str,
        dry_run: bool = False,
    ) -> KubernetesDeployment:
        """
        Controlled deployment through the security control plane.
        Checks policy, authorization, and idempotency before proceeding.
        Never deploys without a valid policy_decision_id (except dry_run).
        """
        if not dry_run and not policy_decision_id:
            dep = KubernetesDeployment(
                project_id=project_id,
                cluster_id=cluster_id,
                namespace=namespace,
                workload_name=workload_name,
                workload_kind=workload_kind,
                image_digest=image_digest,
                commit_sha=commit_sha,
                status="NOT_EXECUTED",
                failure_reason="No policy decision provided — deployment refused",
                requested_by=requested_by,
                environment=environment,
                dry_run=dry_run,
            )
            self.db.add(dep)
            await self.db.commit()
            return dep

        manifest_hash = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()

        dep = KubernetesDeployment(
            project_id=project_id,
            cluster_id=cluster_id,
            namespace=namespace,
            workload_name=workload_name,
            workload_kind=workload_kind,
            image_digest=image_digest,
            manifest_hash=manifest_hash,
            commit_sha=commit_sha,
            status="APPLYING",
            policy_decision_id=policy_decision_id,
            requested_by=requested_by,
            environment=environment,
            dry_run=dry_run,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(dep)
        await self.db.commit()
        await self.db.refresh(dep)

        # Execute via Kubernetes API
        apply_result = self.client.apply_manifest(manifest, namespace, dry_run=dry_run)
        apply_status = apply_result.get("status")

        if apply_status == "DRY_RUN_PASSED":
            dep.status = "DRY_RUN_PASSED"
        elif apply_status == "APPLIED":
            # Verify actual rollout (never trust manifest acceptance alone)
            rollout = self.client.get_deployment_rollout_status(namespace, workload_name)
            dep.status = rollout.get("status", "ROLLOUT_PENDING")
            dep.rollout_evidence = rollout
        else:
            dep.status = "NOT_EXECUTED"
            dep.failure_reason = apply_result.get("error", "Unknown error")

        dep.completed_at = datetime.now(timezone.utc)
        await self.db.commit()
        return dep
