"""
Step 19 Verification Script:
Cross-Domain Security Graph, Attack Path Analysis, Blast-Radius Intelligence & Provenance.

Covers all mandatory rules and acceptance tests:
  - Real nodes and edges with provenance (Rule 45, 46, 51)
  - Distinguish CONFIGURED vs OBSERVED access (Rule 48)
  - Authority path tracing: Human -> Agent A -> Agent B -> Cloud Resource (Acceptance Test 1, Sec 24)
  - Production database blast radius with explainability & NO scores (Rule 50, Acceptance Test 2)
  - Supply chain & vulnerability propagation (Acceptance Test 3, Sec 75)
  - Attack path analysis with condition tracking (Acceptance Test 5, 9, Sec 32-37)
  - Blocked path detection (Test 107)
  - Temporal validity & delegation revocation (Acceptance Test 6, 13, Rule 52)
  - Change impact analysis & graph diff (Sec 50, 135-138)
  - Multi-tenant isolation & bounded query limits (Rule 53, 80, 81)
  - Graph snapshot creation (Sec 59)
"""

import asyncio
import logging
import uuid
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def run_verification():
    logger.info("=== STEP 19 VERIFICATION: CROSS-DOMAIN SECURITY GRAPH & INTELLIGENCE ===")

    from app.models import Base
    from app.models.project import Project
    from app.models.user import User
    from app.security_graph import (
        SecurityGraphService,
        GraphNodeType,
        GraphEdgeType,
        EdgeState,
        AttackPathState,
        ReachabilityType,
    )
    from app.security_graph.traversal import GraphTraversalEngine, QueryLimitExceededError
    from app.security_graph.impact_analysis import ChangeImpactAnalyzer

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Setup: Project + User
        user = User(email="secops@example.com", name="SecOps Lead", password_hash="hash")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        project_id = uuid.uuid4()
        project = Project(id=project_id, name="Security Graph Test Project", description="Step 19 Verification", owner_id=user.id)
        session.add(project)
        await session.commit()

        service = SecurityGraphService(session)

        # --------------------------------------------------------------------
        # 1. Real Nodes & Edges with Provenance (Rule 45, 46, 51)
        # --------------------------------------------------------------------
        logger.info("\n--- 1. Node & Edge Creation with Provenance ---")
        t0 = datetime.now(timezone.utc)

        # Human Owner
        human_node = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.HUMAN.value,
            external_id="user:secops-lead",
            name="SecOps Lead (Alice)",
            source_type="USERS_TABLE",
            source_id=str(user.id),
        )

        # Agent A (Security Planner)
        agent_a = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.AI_AGENT.value,
            external_id="agent:planner-001",
            name="Agent A (Planner)",
            source_type="AGENTS_TABLE",
            source_id="agent-uuid-001",
        )

        # Agent B (Executor)
        agent_b = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.AI_AGENT.value,
            external_id="agent:executor-002",
            name="Agent B (Executor)",
            source_type="AGENTS_TABLE",
            source_id="agent-uuid-002",
        )

        # Cloud Production Database
        prod_db = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.DATABASE.value,
            external_id="arn:aws:rds:us-east-1:123456789012:db:prod-payments",
            name="prod-payments-db",
            provider="AWS",
            environment="PRODUCTION",
            source_type="CLOUD_RESOURCES_TABLE",
            source_id="cr-rds-uuid-01",
        )

        # Delegation edge: Human -> Agent A
        edge_human_a = await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=human_node.id,
            target_node_id=agent_a.id,
            edge_type=GraphEdgeType.OWNS.value,
            state=EdgeState.AUTHORIZED_ACCESS.value,
            source_type="HUMAN_AUTHORIZATION",
            source_id=str(user.id),
            confidence=1.0,
        )

        # Delegation edge: Agent A -> Agent B
        edge_a_b = await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=agent_a.id,
            target_node_id=agent_b.id,
            edge_type=GraphEdgeType.DELEGATES_TO.value,
            state=EdgeState.AUTHORIZED_ACCESS.value,
            source_type="AGENT_DELEGATIONS_TABLE",
            source_id="delegation-uuid-101",
            evidence_id="evidence-del-101",
            confidence=1.0,
        )

        # Access edge: Agent B -> prod_db (CONFIGURED ACCESS)
        edge_b_db = await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=agent_b.id,
            target_node_id=prod_db.id,
            edge_type=GraphEdgeType.CAN_ACCESS.value,
            state=EdgeState.CONFIGURED_ACCESS.value,
            source_type="CLOUD_IAM_POLICY",
            source_id="policy-uuid-501",
            confidence=1.0,
        )

        await session.commit()
        logger.info(f"Created nodes: Human, Agent A, Agent B, Prod DB")
        logger.info(f"Created edges: Human->AgentA, AgentA->AgentB, AgentB->ProdDB")
        assert human_node.id is not None
        assert edge_a_b.source_type == "AGENT_DELEGATIONS_TABLE"
        assert edge_a_b.evidence_id == "evidence-del-101"

        # --------------------------------------------------------------------
        # 2. Distinguish CONFIGURED vs OBSERVED Access (Rule 48)
        # --------------------------------------------------------------------
        logger.info("\n--- 2. CONFIGURED vs OBSERVED Access Verification (Rule 48) ---")
        reach_configured = await service.calculate_reachability(
            project_id=project_id,
            source_node_id=agent_b.id,
            target_node_id=prod_db.id,
            reachability_type="AUTHORIZATION_REACHABLE",
        )
        logger.info(f"Reachability status: {reach_configured['status']}")
        assert reach_configured["is_reachable"] is True
        assert reach_configured["status"] == "CONFIGURED_REACHABLE"
        assert reach_configured["has_observed_evidence"] is False

        # Now simulate runtime telemetry adding OBSERVED_ACCESS
        edge_b_db.state = EdgeState.OBSERVED_ACCESS.value
        edge_b_db.evidence_id = "telemetry-trace-999"
        await session.commit()

        reach_observed = await service.calculate_reachability(
            project_id=project_id,
            source_node_id=agent_b.id,
            target_node_id=prod_db.id,
            reachability_type="AUTHORIZATION_REACHABLE",
        )
        logger.info(f"Reachability after runtime telemetry: {reach_observed['status']}")
        assert reach_observed["status"] == "OBSERVED_REACHABLE"
        assert reach_observed["has_observed_evidence"] is True

        # --------------------------------------------------------------------
        # 3. Authority Path Tracing (Acceptance Test 1, Sec 24)
        # --------------------------------------------------------------------
        logger.info("\n--- 3. Authority Path Tracing: 'Who gave Agent B authority?' ---")
        authority_result = await service.get_authority_path(project_id, agent_b.id)
        chain = authority_result["delegation_chain"]
        logger.info(f"Authority chain hops: {len(chain)}")
        for i, hop in enumerate(chain):
            logger.info(f"  Hop {i+1}: Delegator={hop['delegator_name']} -> ActingAgent={hop['acting_agent_id']} via {hop['edge_type']}")

        assert len(chain) == 2
        assert chain[0]["delegator_id"] == str(agent_a.id)
        assert chain[1]["delegator_id"] == str(human_node.id)
        logger.info("Authority chain verified back to root Human ✓")

        # --------------------------------------------------------------------
        # 4. Production Database Blast Radius (Rule 50, Acceptance Test 2)
        # --------------------------------------------------------------------
        logger.info("\n--- 4. Production Database Blast Radius Analysis ---")
        # Add a connected microservice and a security requirement
        app_service = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type="SERVICE",
            external_id="service:payment-processor",
            name="Payment Processor Service",
            environment="PRODUCTION",
            source_type="K8S_SERVICE",
            source_id="svc-uuid-001",
        )
        sec_req = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type="SECURITY_REQUIREMENT",
            external_id="req:DATABASE_PUBLIC_ACCESS_PROHIBITED",
            name="DATABASE_PUBLIC_ACCESS_PROHIBITED",
            environment="PRODUCTION",
            source_type="SECURITY_BLUEPRINT",
            source_id="sec-req-uuid-01",
        )
        # Service -> DB
        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=app_service.id,
            target_node_id=prod_db.id,
            edge_type=GraphEdgeType.ROUTES_TO.value,
        )
        # DB -> Sec Req
        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=prod_db.id,
            target_node_id=sec_req.id,
            edge_type=GraphEdgeType.PROTECTED_BY.value,
        )
        await session.commit()

        blast = await service.calculate_blast_radius(project_id, prod_db.id, max_depth=3)
        logger.info(f"Blast radius total affected nodes: {blast['total_affected_nodes']}")
        logger.info(f"  Directly affected: {blast['directly_affected_count']}")
        logger.info(f"  Affected requirements count: {len(blast['affected_requirements'])}")
        assert blast["directly_affected_count"] >= 1
        assert len(blast["affected_requirements"]) >= 1
        assert "score" not in blast  # RULE 50: No fake security score!

        # --------------------------------------------------------------------
        # 5. Supply Chain & Vulnerability Propagation (Acceptance Test 3, Sec 75)
        # --------------------------------------------------------------------
        logger.info("\n--- 5. Supply Chain & Provenance Traceability ---")
        commit_node = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.COMMIT.value,
            external_id="commit:sha-abc12345",
            name="Git Commit abc12345",
            source_type="GITHUB",
            source_id="sha-abc12345",
        )
        build_node = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.JENKINS_BUILD.value,
            external_id="jenkins:build-205",
            name="Jenkins Build #205",
            source_type="JENKINS",
            source_id="build-205",
        )
        image_node = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.DOCKER_IMAGE.value,
            external_id="image:sha256:7f8e9d1a",
            name="payment-api:2.0",
            source_type="DOCKER",
            source_id="sha256:7f8e9d1a",
        )
        k8s_deploy = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.DEPLOYMENT.value,
            external_id="k8s:deploy:payment-api",
            name="k8s-deploy-payment-api",
            source_type="KUBERNETES",
            source_id="deploy-uuid-001",
        )

        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=commit_node.id,
            target_node_id=build_node.id,
            edge_type=GraphEdgeType.TRIGGERS.value,
        )
        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=build_node.id,
            target_node_id=image_node.id,
            edge_type=GraphEdgeType.PRODUCES.value,
        )
        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=image_node.id,
            target_node_id=k8s_deploy.id,
            edge_type=GraphEdgeType.DEPLOYED_TO.value,
        )
        await session.commit()

        # Verify reachability from Commit to K8s deployment
        supply_reach = await service.calculate_reachability(
            project_id=project_id,
            source_node_id=commit_node.id,
            target_node_id=k8s_deploy.id,
            reachability_type="SUPPLY_CHAIN_REACHABLE",
        )
        logger.info(f"Supply chain reachability Commit -> Deployment: {supply_reach['is_reachable']}")
        assert supply_reach["is_reachable"] is True
        assert supply_reach["path_count"] == 1

        # --------------------------------------------------------------------
        # 6. Attack Path Analysis & Condition Tracking (Acceptance Test 5, 9, Sec 32)
        # --------------------------------------------------------------------
        logger.info("\n--- 6. Attack Path Analysis with Condition Tracking ---")
        ingress_node = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.INGRESS.value,
            external_id="k8s:ingress:public-gateway",
            name="Public Gateway Ingress",
            source_type="KUBERNETES",
            source_id="ingress-001",
        )
        # Ingress -> app_service
        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=ingress_node.id,
            target_node_id=app_service.id,
            edge_type=GraphEdgeType.ROUTES_TO.value,
            state=EdgeState.CONFIGURED_ACCESS.value,
        )
        await session.commit()

        # Find attack paths from Ingress to Prod DB
        attack_paths = await service.analyze_attack_paths(
            project_id=project_id,
            source_id=ingress_node.id,
            target_id=prod_db.id,
        )
        logger.info(f"Discovered attack paths: {len(attack_paths)}")
        assert len(attack_paths) >= 1
        first_path = attack_paths[0]
        logger.info(f"Path state: {first_path['state']}, Length: {first_path['path_length']}, Severity: {first_path['severity_context']}")
        logger.info(f"Conditions: {first_path['conditions']}")
        assert first_path["state"] == AttackPathState.POTENTIAL.value  # RULE 49: POTENTIAL until verified
        assert first_path["severity_context"] == "CRITICAL"  # Targeting PRODUCTION DB

        # --------------------------------------------------------------------
        # 7. Blocked Attack Path Verification (Test 107)
        # --------------------------------------------------------------------
        logger.info("\n--- 7. Blocked Attack Path Verification (Test 107) ---")
        blocked_ingress = await service.projection.get_or_create_node(
            project_id=project_id,
            node_type=GraphNodeType.FIREWALL.value,
            external_id="fw:blocked-ingress",
            name="Blocked Firewall Ingress",
            source_type="FIREWALL",
            source_id="fw-001",
        )
        # Blocked edge with DENIED_ACCESS
        await service.projection.get_or_create_edge(
            project_id=project_id,
            source_node_id=blocked_ingress.id,
            target_node_id=app_service.id,
            edge_type=GraphEdgeType.ROUTES_TO.value,
            state=EdgeState.DENIED_ACCESS.value,
        )
        await session.commit()

        blocked_paths = await service.analyze_attack_paths(
            project_id=project_id,
            source_id=blocked_ingress.id,
            target_id=prod_db.id,
        )
        logger.info(f"Blocked path analysis state: {blocked_paths[0]['state']}")
        assert blocked_paths[0]["state"] == AttackPathState.BLOCKED.value

        # --------------------------------------------------------------------
        # 8. Temporal Graph & Delegation Revocation (Rule 52, Acceptance Test 6, 13)
        # --------------------------------------------------------------------
        logger.info("\n--- 8. Temporal Graph & Delegation Revocation ---")
        # Time setup:
        # Edge valid from: T0 (now - 15m)
        # Query active:    T1 (now - 10m)
        # Edge revoked at: T2 (now - 5m)
        # Query revoked:   T3 (now + 5m)
        t_now = datetime.now(timezone.utc)
        time_created = t_now - timedelta(minutes=15)
        time_active = t_now - timedelta(minutes=10)
        time_revoked = t_now - timedelta(minutes=5)
        time_future = t_now + timedelta(minutes=5)

        edge_a_b.valid_from = time_created
        edge_a_b.valid_until = time_revoked
        # Also ensure agent nodes were valid at time_active
        agent_a.valid_from = time_created
        agent_b.valid_from = time_created
        await session.commit()

        # Query at time_active (before revocation) -> SHOULD BE REACHABLE
        reach_past = await service.calculate_reachability(
            project_id=project_id,
            source_node_id=agent_a.id,
            target_node_id=agent_b.id,
            reachability_type="AUTHORIZATION_REACHABLE",
            query_time=time_active,
        )
        logger.info(f"Past reachability before revocation (T1): {reach_past['is_reachable']}")
        assert reach_past["is_reachable"] is True

        # Query at time_future (after revocation) -> MUST NOT BE REACHABLE
        reach_now = await service.calculate_reachability(
            project_id=project_id,
            source_node_id=agent_a.id,
            target_node_id=agent_b.id,
            reachability_type="AUTHORIZATION_REACHABLE",
            query_time=time_future,
        )
        logger.info(f"Current reachability after revocation (T3): {reach_now['is_reachable']}")
        assert reach_now["is_reachable"] is False
        logger.info("Temporal validity window strictly respected (Rule 52) ✓")

        # Restore edge validity for subsequent tests
        edge_a_b.valid_until = None
        await session.commit()

        # --------------------------------------------------------------------
        # 9. Change Impact Analysis & Graph Diff (Sec 50, 135–138)
        # --------------------------------------------------------------------
        logger.info("\n--- 9. Change Impact Analysis & Graph Diff ---")
        impact = await service.analyze_change_impact(
            project_id=project_id,
            trigger_type="IAM_CHANGE",
            trigger_id="iam-change-event-88",
            changed_node_id=agent_a.id,
        )
        logger.info(f"Change impact affected nodes count: {impact['affected_nodes_count']}")
        assert impact["affected_nodes_count"] >= 1

        # Test graph diff
        graph_before = {
            "nodes": [{"id": "node-1", "name": "App"}, {"id": "node-2", "name": "DB"}],
            "edges": [{"source_node_id": "node-1", "target_node_id": "node-2", "edge_type": "ROUTES_TO", "state": "CONFIGURED_ACCESS"}],
        }
        graph_after = {
            "nodes": [{"id": "node-1", "name": "App"}, {"id": "node-2", "name": "DB"}, {"id": "node-3", "name": "External API"}],
            "edges": [
                {"source_node_id": "node-1", "target_node_id": "node-2", "edge_type": "ROUTES_TO", "state": "CONFIGURED_ACCESS"},
                {"source_node_id": "node-1", "target_node_id": "node-3", "edge_type": "ROUTES_TO", "state": "CONFIGURED_ACCESS"},
            ],
        }
        diff = ChangeImpactAnalyzer.diff_graphs(graph_before, graph_after)
        logger.info(f"Graph Diff: added_nodes={diff['added_nodes_count']}, added_edges={diff['added_edges_count']}")
        assert diff["added_nodes_count"] == 1
        assert diff["added_edges_count"] == 1
        assert diff["added_nodes"][0]["name"] == "External API"

        # --------------------------------------------------------------------
        # 10. Multi-Tenant Isolation & Bounded Query Limits (Rule 53, 80, 81)
        # --------------------------------------------------------------------
        logger.info("\n--- 10. Multi-Tenant Isolation & Bounded Limits ---")
        foreign_project_id = uuid.uuid4()
        foreign_nodes = await service.repo.list_nodes(project_id=foreign_project_id)
        logger.info(f"Nodes visible in foreign project: {len(foreign_nodes)}")
        assert len(foreign_nodes) == 0  # Tenant isolation verified!

        # Test query depth limit enforcement
        try:
            GraphTraversalEngine.traverse_bfs(
                start_node_id=agent_a.id,
                adjacency={},
                node_lookup={},
                max_depth=20,  # Exceeds limit 15
            )
            assert False, "Should have raised QueryLimitExceededError"
        except QueryLimitExceededError:
            logger.info("Traversal max_depth limit correctly enforced (Rule 53) ✓")

        # --------------------------------------------------------------------
        # 11. Graph Snapshot Creation (Sec 59)
        # --------------------------------------------------------------------
        logger.info("\n--- 11. Graph Snapshot Creation ---")
        snapshot = await service.repo.create_snapshot(
            project_id=project_id,
            reason="Pre-deployment forensic snapshot",
            source_event_id="deployment-event-404",
        )
        logger.info(f"Snapshot created: id={snapshot.id}, nodes={snapshot.node_count}, edges={snapshot.edge_count}")
        assert snapshot.node_count >= 5
        assert snapshot.edge_count >= 5

        logger.info("\n✅ STEP 19 VERIFICATION SUCCESSFUL")
        logger.info("   All 11 verification suites passed.")
        logger.info("   Cross-Domain Security Graph, Attack Path Analysis & Blast Radius Engine operational.")


if __name__ == "__main__":
    asyncio.run(run_verification())
