from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class ContainerHardeningRule(BaseBlueprintRule):
    rule_id = "RULE-OPS-001"
    name = "Container Hardening Rule"
    version = "1.0.0"
    description = "Enforces container immutability, rootless execution, and minimal base images."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        container_techs = {"DOCKER", "CONTAINER", "PODMAN", "DOCKERFILE", "CONTAINERD"}
        for tech in intent.technologies:
            if tech.name.upper() in container_techs or tech.category == "CONTAINER":
                evidence_items.append(RequirementEvidenceItem(
                    source_type="TECHNOLOGY",
                    source_field="technologies",
                    evidence_text=f"Container technology '{tech.name}' ({tech.category}) specified",
                ))

        if not evidence_items:
            # Strictly negative: if no container tech, DO NOT generate
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="CONTAINER_HARDENING_REQUIRED",
                title="Rootless Container & Base Image Hardening",
                description="Containers must execute as an unprivileged non-root user, utilize minimal distroless or alpine base images, enforce read-only root filesystems where feasible, and drop unnecessary Linux capabilities.",
                category="CONTAINER",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Containerized workloads running as root provide trivial privilege escalation vectors if an application breakout or remote code execution flaw occurs.",
                verification_strategy=["STATIC_ANALYSIS", "DEPENDENCY_ANALYSIS"],
                security_invariant="container.user != 'root' and container.user != '0'",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]


class KubernetesRbacRule(BaseBlueprintRule):
    rule_id = "RULE-OPS-002"
    name = "Kubernetes RBAC & Pod Security Rule"
    version = "1.0.0"
    description = "Enforces least-privilege Role-Based Access Control and restricted Pod Security Standards."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        k8s_terms = {"KUBERNETES", "K8S", "HELM", "KUSTOMIZE", "OPENSHIFT"}
        for tech in intent.technologies:
            if tech.name.upper() in k8s_terms:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="TECHNOLOGY",
                    source_field="technologies",
                    evidence_text=f"Kubernetes orchestration technology '{tech.name}' declared",
                ))

        if intent.deployment_context.environment.upper() in {"KUBERNETES", "K8S"}:
            evidence_items.append(RequirementEvidenceItem(
                source_type="ENVIRONMENT",
                source_field="deployment_context.environment",
                evidence_text="Deployment environment targets Kubernetes cluster",
            ))

        if not evidence_items:
            # Strictly negative: if no Kubernetes deployment, DO NOT generate
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="KUBERNETES_RBAC_REQUIRED",
                title="Kubernetes Least-Privilege RBAC & Namespace Isolation",
                description="Workload ServiceAccounts must not bind to cluster-admin or wildcard verbs. RBAC rules must be restricted to explicit namespaces, resources, and specific API groups.",
                category="KUBERNETES",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Over-privileged Kubernetes ServiceAccounts allow lateral cluster movement and total node compromise upon pod compromise.",
                verification_strategy=["STATIC_ANALYSIS"],
                security_invariant="service_account.cluster_admin == False and '*' not in service_account.verbs",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]
