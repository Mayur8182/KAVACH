"""
Step 19 Security Graph Service.

Section 144:
Core boundary for security graph operations.
Coordinates traversal, reachability, blast radius, attack paths, change impact, and reconciliation.
RULE 47 — Graph does not equal authority.
RULE 50 — No arbitrary security scores.
RULE 53 — Bounded graph queries.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.security_graph.graph_repository import GraphRepository
from app.security_graph.graph_projection import GraphProjectionService
from app.security_graph.reachability import ReachabilityEngine
from app.security_graph.blast_radius import BlastRadiusEngine
from app.security_graph.attack_paths import AttackPathAnalyzer
from app.security_graph.impact_analysis import ChangeImpactAnalyzer
from app.security_graph.authority_paths import AuthorityPathEngine
from app.security_graph.enums import ReachabilityType


class SecurityGraphService:
    """
    High-level intelligence layer for cross-domain security relationships.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = GraphRepository(session)
        self.projection = GraphProjectionService(session)

    async def get_node(self, project_id: uuid.UUID, node_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        node = await self.repo.get_node(project_id, node_id)
        if not node:
            return None
        return {
            "id": str(node.id),
            "project_id": str(node.project_id),
            "node_type": node.node_type,
            "external_id": node.external_id,
            "provider": node.provider,
            "name": node.name,
            "environment": node.environment,
            "status": node.status,
            "metadata": node.metadata_,
            "first_seen_at": node.first_seen_at.isoformat() if node.first_seen_at else None,
            "valid_from": node.valid_from.isoformat() if node.valid_from else None,
            "valid_until": node.valid_until.isoformat() if node.valid_until else None,
        }

    async def ensure_baseline_graph_seeded(self, project_id: uuid.UUID) -> None:
        check = await self.repo.list_nodes(project_id, limit=1)
        if len(check) > 0:
            return

        nodes_defs = [
            ("Developer", "IDENTITY", "ident://eng/developer-lead", "PLATFORM", "PRODUCTION", {"role": "Lead Engineer", "type": "Identity"}),
            ("GitHub", "SCM_ORGANIZATION", "scm://github/org-main", "GITHUB", "PRODUCTION", {"org": "seculayer", "type": "SCM"}),
            ("Repository frontend-app", "CODE_REPOSITORY", "repo://github/frontend-app", "GITHUB", "PRODUCTION", {"default_branch": "main", "language": "TypeScript", "type": "Repository"}),
            ("Build Pipeline GitHub Actions", "CI_PIPELINE", "ci://github/actions/build-main", "GITHUB_ACTIONS", "PRODUCTION", {"runner": "ubuntu-latest", "workflow": "ci.yml", "type": "CI/CD Pipeline"}),
            ("Container Image frontend:1.2.3", "CONTAINER_IMAGE", "container://registry/frontend:1.2.3", "DOCKER", "PRODUCTION", {"digest": "sha256:4f89ac32b", "tag": "1.2.3", "type": "Container Image"}),
            ("Kubernetes prod-cluster", "K8S_CLUSTER", "k8s://clusters/prod-cluster", "KUBERNETES", "PRODUCTION", {"region": "us-east-1", "version": "1.28", "type": "Kubernetes Cluster"}),
            ("Service web-app", "SERVICE", "svc://k8s/web-app", "KUBERNETES", "PRODUCTION", {"namespace": "default", "replicas": 3, "port": 8080, "type": "Workload Service"}),
            ("Vulnerability CVE-2024-1234", "VULNERABILITY", "vuln://cve/2024-1234", "SEMGREP", "PRODUCTION", {"cve": "CVE-2024-1234", "severity": "CRITICAL", "cvss": 9.8, "title": "Remote Code Execution in Web App", "type": "Vulnerability"}),
            ("Database user-db", "DATABASE", "db://rds/user-db", "AWS", "PRODUCTION", {"engine": "PostgreSQL 15", "instance": "db.m6g.large", "port": 5432, "type": "Database"}),
            ("Sensitive Data customer_data", "SENSITIVE_DATA", "data://user-db/customer_data", "PLATFORM", "PRODUCTION", {"classification": "PII & Financial", "records": "320K", "table": "customer_data", "type": "Sensitive Data"}),
            ("External User", "IDENTITY", "ident://internet/external-user", "INTERNET", "PRODUCTION", {"origin": "Public Internet", "trust_level": "UNAUTHENTICATED", "type": "External Identity"}),
            ("Public IP 34.120.21.10", "NETWORK_ENDPOINT", "net://ip/34.120.21.10", "GCP", "PRODUCTION", {"ip": "34.120.21.10", "exposure": "PUBLIC", "port": 443, "type": "Network Endpoint"}),
        ]

        created_nodes = {}
        for name, ntype, ext_id, prov, env, meta in nodes_defs:
            node = await self.projection.get_or_create_node(
                project_id=project_id,
                node_type=ntype,
                external_id=ext_id,
                name=name,
                source_type="SEED",
                source_id=ext_id,
                provider=prov,
                environment=env,
                metadata=meta,
            )
            created_nodes[name] = node

        edge_defs = [
            ("Developer", "GitHub", "CONTRIBUTES_TO", "COMMITS_CODE"),
            ("GitHub", "Repository frontend-app", "HOSTS", "STORES_SOURCE"),
            ("Repository frontend-app", "Build Pipeline GitHub Actions", "TRIGGERS", "RUNS_PIPELINE"),
            ("Build Pipeline GitHub Actions", "Container Image frontend:1.2.3", "BUILDS", "OUTPUTS_ARTIFACT"),
            ("Container Image frontend:1.2.3", "Kubernetes prod-cluster", "DEPLOYS_TO", "RUNS_IN_CLUSTER"),
            ("Kubernetes prod-cluster", "Service web-app", "RUNS", "MANAGES_POD"),
            ("Service web-app", "Vulnerability CVE-2024-1234", "AFFECTED_BY", "EXPLOITABLE_VULNERABILITY"),
            ("Service web-app", "Database user-db", "CONNECTS_TO", "READS_WRITES_DATABASE"),
            ("Database user-db", "Sensitive Data customer_data", "CONTAINS", "HOLDS_PII_TABLE"),
            ("External User", "Public IP 34.120.21.10", "ACCESSES", "INTERNET_TRAFFIC"),
            ("Public IP 34.120.21.10", "Service web-app", "ROUTES_TO", "INGRESS_FORWARDING"),
        ]

        from app.models.security_graph_models import SecurityGraphEdge
        for src_name, tgt_name, etype, relation in edge_defs:
            src = created_nodes.get(src_name)
            tgt = created_nodes.get(tgt_name)
            if src and tgt:
                edge = SecurityGraphEdge(
                    id=uuid.uuid4(),
                    project_id=project_id,
                    source_node_id=src.id,
                    target_node_id=tgt.id,
                    edge_type=etype,
                    state="ACTIVE",
                    confidence=1.0,
                    source_type="SEED",
                    source_id=f"{src_name}->{tgt_name}",
                    evidence_id=f"ev_{uuid.uuid4().hex[:12]}",
                    metadata_={"relationship": relation},
                )
                self.session.add(edge)

        await self.session.commit()

    async def get_project_graph(
        self,
        project_id: uuid.UUID,
        query_time: Optional[datetime] = None,
        max_nodes: int = 500,
        max_edges: int = 1000,
    ) -> Dict[str, Any]:
        """
        Returns nodes and edges active at query_time for visualization and analysis.
        """
        await self.ensure_baseline_graph_seeded(project_id)
        data = await self.repo.load_graph_projection(
            project_id=project_id,
            query_time=query_time,
            max_nodes=max_nodes,
            max_edges=max_edges,
        )


        nodes = [
            {
                "id": str(n.id),
                "name": n.name,
                "node_type": n.node_type,
                "provider": n.provider,
                "environment": n.environment,
                "external_id": n.external_id,
                "metadata": n.metadata_ or {},
            }
            for n in data["nodes"]
        ]
        edges = [
            {
                "id": str(e.id),
                "source_node_id": str(e.source_node_id),
                "target_node_id": str(e.target_node_id),
                "edge_type": e.edge_type,
                "state": e.state,
                "evidence_id": e.evidence_id,
                "confidence": e.confidence,
                "metadata": e.metadata_ or {},
            }
            for e in data["edges"]
        ]


        return {
            "project_id": str(project_id),
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": nodes,
            "edges": edges,
        }

    async def calculate_reachability(
        self,
        project_id: uuid.UUID,
        source_node_id: uuid.UUID,
        target_node_id: uuid.UUID,
        reachability_type: str = "NETWORK_REACHABLE",
        query_time: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates reachability between two nodes.
        """
        data = await self.repo.load_graph_projection(project_id, query_time=query_time)

        if reachability_type == "COMBINED":
            return ReachabilityEngine.evaluate_combined_reachability(
                source_id=source_node_id,
                target_id=target_node_id,
                adjacency=data["adjacency_outbound"],
                node_lookup=data["node_lookup"],
                query_time=query_time,
            )

        rtype = ReachabilityType(reachability_type)
        return ReachabilityEngine.evaluate_reachability(
            source_id=source_node_id,
            target_id=target_node_id,
            adjacency=data["adjacency_outbound"],
            node_lookup=data["node_lookup"],
            reachability_type=rtype,
            query_time=query_time,
        )

    async def calculate_blast_radius(
        self,
        project_id: uuid.UUID,
        node_id: uuid.UUID,
        max_depth: int = 5,
        query_time: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Computes the blast radius if node_id is compromised or modified.
        """
        data = await self.repo.load_graph_projection(project_id, query_time=query_time)
        return BlastRadiusEngine.calculate_blast_radius(
            target_node_id=node_id,
            adjacency=data["adjacency_outbound"],
            node_lookup=data["node_lookup"],
            max_depth=max_depth,
            query_time=query_time,
        )

    async def analyze_attack_paths(
        self,
        project_id: uuid.UUID,
        source_id: Optional[uuid.UUID] = None,
        target_id: Optional[uuid.UUID] = None,
        max_depth: int = 6,
        query_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Finds potential attack paths with condition tracking.
        """
        data = await self.repo.load_graph_projection(project_id, query_time=query_time)
        paths = AttackPathAnalyzer.identify_potential_paths(
            adjacency=data["adjacency_outbound"],
            node_lookup=data["node_lookup"],
            source_id=source_id,
            target_id=target_id,
            max_depth=max_depth,
            query_time=query_time,
        )

        # Persist discovered paths
        for p in paths:
            await self.repo.save_attack_path(
                project_id=project_id,
                source_node_id=uuid.UUID(p["source_node_id"]),
                target_node_id=uuid.UUID(p["target_node_id"]),
                path_type=p["path_type"],
                state=p["state"],
                severity_context=p["severity_context"],
                path_length=p["path_length"],
                hops=p["hops"],
                conditions=p["conditions"],
                evidence_ids=p["evidence_ids"],
            )

        return paths

    async def get_authority_path(
        self,
        project_id: uuid.UUID,
        agent_node_id: uuid.UUID,
        query_time: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Answers: "Who gave Agent X authority, and what can it reach?"
        """
        data = await self.repo.load_graph_projection(project_id, query_time=query_time)
        chain = AuthorityPathEngine.trace_authority_chain(
            agent_node_id=agent_node_id,
            adjacency_inbound=data["adjacency_inbound"],
            node_lookup=data["node_lookup"],
            query_time=query_time,
        )
        accessible = AuthorityPathEngine.get_accessible_resources(
            agent_node_id=agent_node_id,
            adjacency_outbound=data["adjacency_outbound"],
            node_lookup=data["node_lookup"],
            query_time=query_time,
        )
        return {
            "agent_node_id": str(agent_node_id),
            "delegation_chain": chain,
            "chain_length": len(chain),
            "accessible_resources_count": len(accessible),
            "accessible_resources": accessible,
        }

    async def analyze_change_impact(
        self,
        project_id: uuid.UUID,
        trigger_type: str,
        trigger_id: str,
        changed_node_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Analyzes the impact of a change and records it in security_change_impact.
        """
        data = await self.repo.load_graph_projection(project_id)
        impact = ChangeImpactAnalyzer.analyze_change(
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            changed_node_id=changed_node_id,
            adjacency=data["adjacency_outbound"],
            node_lookup=data["node_lookup"],
        )
        await self.repo.save_change_impact(
            project_id=project_id,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            impact_data=impact,
        )
        return impact

    async def reconcile_graph(self, project_id: uuid.UUID) -> Dict[str, Any]:
        """
        Executes projection synchronization for the project.
        """
        return await self.projection.reconcile_project_graph(project_id)
