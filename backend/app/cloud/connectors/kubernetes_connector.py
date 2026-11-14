"""
Kubernetes Read-Only Cluster Connector for Kavach
Implements ServiceAccount Bearer Token authentication with read-only ClusterRole RBAC scoping.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional
import httpx

from app.cloud.connectors.base import (
    CloudConnectorBase,
    ConnectionValidationResult,
    SetupInstructions,
)

logger = logging.getLogger("kavach.cloud.kubernetes_connector")


class KubernetesCloudConnector(CloudConnectorBase):
    def generate_setup_instructions(self, project_id: uuid.UUID) -> SetupInstructions:
        yaml_manifest = (
            "apiVersion: v1\n"
            "kind: Namespace\n"
            "metadata:\n"
            "  name: kavach-system\n"
            "---\n"
            "apiVersion: v1\n"
            "kind: ServiceAccount\n"
            "metadata:\n"
            "  name: kavach-audit-sa\n"
            "  namespace: kavach-system\n"
            "---\n"
            "apiVersion: rbac.authorization.k8s.io/v1\n"
            "kind: ClusterRole\n"
            "metadata:\n"
            "  name: kavach-read-only\n"
            "rules:\n"
            "- apiGroups: [\"\", \"apps\", \"batch\", \"networking.k8s.io\"]\n"
            "  resources:\n"
            "  - pods\n"
            "  - services\n"
            "  - deployments\n"
            "  - daemonsets\n"
            "  - statefulsets\n"
            "  - ingresses\n"
            "  - namespaces\n"
            "  - nodes\n"
            "  verbs: [\"get\", \"list\", \"watch\"]\n"
            "---\n"
            "apiVersion: rbac.authorization.k8s.io/v1\n"
            "kind: ClusterRoleBinding\n"
            "metadata:\n"
            "  name: kavach-read-only-binding\n"
            "subjects:\n"
            "- kind: ServiceAccount\n"
            "  name: kavach-audit-sa\n"
            "  namespace: kavach-system\n"
            "roleRef:\n"
            "  kind: ClusterRole\n"
            "  name: kavach-read-only\n"
            "  apiGroup: rbac.authorization.k8s.io\n"
        )

        cli_snippet = (
            f"# 1. Apply read-only RBAC manifest\n"
            f"kubectl apply -f - << 'EOF'\n"
            f"{yaml_manifest}"
            f"EOF\n\n"
            f"# 2. Generate a long-lived ServiceAccount Token\n"
            f"kubectl create token kavach-audit-sa -n kavach-system --duration=8760h\n"
        )

        md_instructions = (
            f"### Connect Kubernetes via Read-Only Service Account RBAC\n\n"
            f"1. Apply the read-only ClusterRole manifest to your cluster.\n"
            f"2. Generate a read-only token using `kubectl create token kavach-audit-sa -n kavach-system`.\n"
            f"3. Provide your **API Server Endpoint URL** (e.g. `https://k8s.example.com:6443`) and the **ServiceAccount Bearer Token** below."
        )

        return SetupInstructions(
            provider="KUBERNETES",
            instructions_title="Kubernetes Read-Only RBAC (ClusterRole)",
            instructions_markdown=md_instructions,
            required_permissions=["pods/get", "deployments/list", "ingresses/list", "nodes/list"],
            cli_snippet=cli_snippet,
        )

    async def validate_and_discover(
        self,
        credentials_payload: Dict[str, Any],
        default_region: str = "global",
    ) -> ConnectionValidationResult:
        cluster_name = credentials_payload.get("cluster_name", "").strip() or "k8s-cluster"
        api_server_url = credentials_payload.get("api_server_url", "").strip()
        bearer_token = credentials_payload.get("bearer_token", "").strip() or credentials_payload.get("credentials_json", "").strip()

        if not api_server_url or not bearer_token:
            return ConnectionValidationResult(
                is_valid=False,
                status="AUTHENTICATION_FAILED",
                account_identifier=cluster_name,
                error_message="Missing required Kubernetes parameters: API Server URL and Bearer Token are mandatory.",
            )

        api_server_url = api_server_url.rstrip("/")
        headers = {"Authorization": f"Bearer {bearer_token}"}

        # Validate connection to /version
        server_version = {}
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            try:
                ver_resp = await client.get(f"{api_server_url}/version", headers=headers)
                if ver_resp.status_code != 200:
                    return ConnectionValidationResult(
                        is_valid=False,
                        status="AUTHENTICATION_FAILED",
                        account_identifier=cluster_name,
                        error_message=f"Kubernetes API server rejected request ({ver_resp.status_code}): {ver_resp.text[:200]}",
                    )
                server_version = ver_resp.json()
            except httpx.RequestError as e:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="UNAVAILABLE",
                    account_identifier=cluster_name,
                    error_message=f"Could not reach Kubernetes API server at {api_server_url}: {str(e)}",
                )

        # Discover namespaces and pods
        discovered_resources = []
        observations = []

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            try:
                ns_resp = await client.get(f"{api_server_url}/api/v1/namespaces", headers=headers)
                if ns_resp.status_code == 200:
                    ns_items = ns_resp.json().get("items", [])
                    for ns in ns_items:
                        ns_name = ns.get("metadata", {}).get("name", "unknown")
                        discovered_resources.append({
                            "resource_name": ns_name,
                            "resource_type": "KUBERNETES_NAMESPACE",
                            "provider_resource_id": f"k8s://{cluster_name}/namespaces/{ns_name}",
                            "region": default_region,
                            "status": "ACTIVE",
                            "configuration": {"phase": ns.get("status", {}).get("phase")},
                        })
            except Exception as ns_err:
                logger.warning(f"Error querying namespaces: {ns_err}")

            try:
                nodes_resp = await client.get(f"{api_server_url}/api/v1/nodes", headers=headers)
                if nodes_resp.status_code == 200:
                    node_items = nodes_resp.json().get("items", [])
                    for node in node_items:
                        node_name = node.get("metadata", {}).get("name", "node")
                        discovered_resources.append({
                            "resource_name": node_name,
                            "resource_type": "KUBERNETES_NODE",
                            "provider_resource_id": f"k8s://{cluster_name}/nodes/{node_name}",
                            "region": default_region,
                            "status": "ACTIVE",
                            "configuration": node.get("status", {}).get("nodeInfo", {}),
                        })
            except Exception as node_err:
                logger.warning(f"Error querying nodes: {node_err}")

        return ConnectionValidationResult(
            is_valid=True,
            status="CONNECTED",
            account_identifier=cluster_name,
            identity_info={
                "cluster_name": cluster_name,
                "api_server_url": api_server_url,
                "server_version": server_version.get("gitVersion"),
            },
            discovered_resources=discovered_resources,
            observations=observations,
        )

