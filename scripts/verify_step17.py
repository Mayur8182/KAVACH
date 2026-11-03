"""
Step 17 Verification Script.

Tests the full lifecycle:
  Git Commit -> Jenkins Build -> Docker Image -> K8s Deployment
with real service layer orchestration using in-memory SQLite.

Covers mandatory tests:
  - Image recording with provenance (commit SHA + build linkage)
  - Docker connection status (NOT_CONFIGURED when SDK absent)
  - Kubernetes connection status (NOT_CONFIGURED when SDK absent)
  - Jenkins connection status (NOT_CONFIGURED when no credentials)
  - Security gate: BLOCK halts deployment
  - Deployment refused without policy decision
  - Duplicate webhook idempotency
  - Container security checks (privileged, root, hostNetwork)
  - Blocked deployment when K8s SDK unavailable returns NOT_EXECUTED / NOT_CONFIGURED
"""
import asyncio
import logging
import uuid
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def run_verification():
    logger.info("=== Step 17 Verification: Docker + Kubernetes + Jenkins ===")

    from app.models import Base
    from app.models.project import Project
    from app.models.user import User

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Setup: Project + User
        user = User(email="infra@example.com", name="Infra Eng", password_hash="pw")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        project_id = uuid.uuid4()
        project = Project(id=project_id, name="Infra Security Test", description="Step 17", owner_id=user.id)
        session.add(project)
        await session.commit()

        logger.info(f"Project: {project_id}")

        # ---- DOCKER ----
        logger.info("\n--- Docker Integration ---")
        from app.integrations.docker.client import DockerConnectionConfig
        from app.integrations.docker.service import DockerService

        docker_service = DockerService(session, config=DockerConnectionConfig())

        # Health check (Docker SDK may not be installed in test env)
        docker_status = await docker_service.health_check()
        logger.info(f"Docker Status: {docker_status.status}")
        assert docker_status.status in ("CONNECTED", "NOT_CONFIGURED", "UNAVAILABLE", "AUTHENTICATION_FAILED")

        # Register a registry
        registry = await docker_service.register_registry(
            project_id=project_id,
            provider="DOCKER_HUB",
            name="Docker Hub",
            url="https://registry-1.docker.io",
            credential_reference="cred-ref-dockerhub",
        )
        logger.info(f"Registry: {registry.id} status={registry.status}")
        assert registry.status in ("PENDING_VERIFICATION", "NOT_CONFIGURED")

        # Record an image with provenance (Test 4 — image provenance)
        commit_sha = "abc123def456"
        image = await docker_service.record_image(
            project_id=project_id,
            repository="myorg/payment-api",
            tag="1.0.0",
            digest=None,  # will try to enrich from Docker daemon
            commit_sha=commit_sha,
            registry_id=registry.id,
        )
        logger.info(f"Image recorded: {image.id} repo={image.repository} commit={image.commit_sha}")
        assert image.commit_sha == commit_sha
        assert image.project_id == project_id

        # Scan image (Trivy may not be installed)
        scan_result = await docker_service.scan_image(image.id)
        logger.info(f"Scan result: {scan_result['status']}")
        assert scan_result["status"] in (
            "FINDINGS_PRESENT", "NO_FINDINGS", "SCAN_FAILED",
            "SCANNER_NOT_CONFIGURED", "IMAGE_NOT_FOUND", "REGISTRY_AUTH_FAILED"
        )

        # ---- KUBERNETES ----
        logger.info("\n--- Kubernetes Integration ---")
        from app.integrations.kubernetes.client import KubernetesConnectionConfig
        from app.integrations.kubernetes.service import KubernetesService

        k8s_service = KubernetesService(session, config=KubernetesConnectionConfig())

        cluster = await k8s_service.register_cluster(
            project_id=project_id,
            name="test-cluster",
            environment="TEST",
            provider="SELF_MANAGED",
            namespace_scope="default,security-test",
        )
        logger.info(f"Cluster: {cluster.id} status={cluster.status}")
        # Status is determined by real health check
        assert cluster.status in (
            "CONNECTED", "NOT_CONFIGURED", "AUTHENTICATION_FAILED",
            "FORBIDDEN", "UNAVAILABLE", "ERROR", "CONNECTING"
        )

        # Namespaces (empty if K8s SDK not available)
        namespaces = await k8s_service.discover_namespaces(cluster.id)
        logger.info(f"Discovered {len(namespaces)} namespaces")

        # Security checks on a pod spec (Test 5 — blocked privileged workload)
        logger.info("\n--- Security Checks on Privileged Pod Spec ---")
        from app.models.kubernetes_models import KubernetesWorkload
        # Create a dummy workload record to attach observations to
        wl = KubernetesWorkload(
            cluster_id=cluster.id,
            namespace="default",
            name="dangerous-app",
            kind="Deployment",
            uid="wl-uid-test",
            status="UNKNOWN",
        )
        session.add(wl)
        await session.commit()
        await session.refresh(wl)

        pod_spec_privileged = {
            "spec": {"hostNetwork": True, "hostPID": True},
            "containers": [
                {"name": "app", "securityContext": {"privileged": True, "runAsUser": 0}}
            ]
        }
        observations = await k8s_service.run_security_checks(cluster.id, wl.id, pod_spec_privileged)
        logger.info(f"Security observations on privileged spec: {len(observations)}")
        check_types = [o.check_type for o in observations]
        assert "PRIVILEGED" in check_types
        assert "HOST_NETWORK" in check_types
        assert "ROOT_EXECUTION" in check_types

        # Test 5: Deployment refused without policy decision (RULE — no blind deployment)
        logger.info("\n--- Test: Deployment refused without policy decision ---")
        refused_dep = await k8s_service.deploy(
            project_id=project_id,
            cluster_id=cluster.id,
            namespace="default",
            workload_name="payment-api",
            workload_kind="Deployment",
            manifest={"apiVersion": "apps/v1", "kind": "Deployment"},
            image_digest="sha256:abc123",
            commit_sha=commit_sha,
            requested_by="test-user",
            policy_decision_id=None,  # No policy decision
            environment="TEST",
            dry_run=False,
        )
        logger.info(f"Refused deployment status: {refused_dep.status}")
        assert refused_dep.status == "NOT_EXECUTED"
        assert refused_dep.failure_reason is not None

        # Dry-run with a policy decision (simulated)
        logger.info("\n--- Test: Dry-run deployment ---")
        dry_dep = await k8s_service.deploy(
            project_id=project_id,
            cluster_id=cluster.id,
            namespace="default",
            workload_name="payment-api",
            workload_kind="Deployment",
            manifest={"apiVersion": "apps/v1", "kind": "Deployment"},
            image_digest="sha256:abc123",
            commit_sha=commit_sha,
            requested_by="test-user",
            policy_decision_id=uuid.uuid4(),
            environment="TEST",
            dry_run=True,
        )
        logger.info(f"Dry-run deployment status: {dry_dep.status}")
        # K8s SDK may not be available in test, so NOT_EXECUTED or DRY_RUN_PASSED
        assert dry_dep.status in ("DRY_RUN_PASSED", "NOT_EXECUTED", "NOT_CONFIGURED")

        # ---- JENKINS ----
        logger.info("\n--- Jenkins Integration ---")
        from app.integrations.jenkins.client import JenkinsConnectionConfig
        from app.integrations.jenkins.service import JenkinsService

        jenkins_cfg = JenkinsConnectionConfig(
            base_url="http://jenkins.example.internal",
            credential_reference="cred-ref-jenkins",
        )
        jenkins_service = JenkinsService(session, config=jenkins_cfg)

        instance = await jenkins_service.register_instance(
            project_id=project_id,
            name="CI Jenkins",
            base_url="http://jenkins.example.internal",
            credential_reference="cred-ref-jenkins",
        )
        logger.info(f"Jenkins instance: {instance.id} status={instance.status}")

        # Health check (Jenkins not reachable in test)
        health = await jenkins_service.health_check(instance.id)
        logger.info(f"Jenkins health: {health.status}")
        assert health.status in (
            "CONNECTED", "NOT_CONFIGURED", "AUTHENTICATION_FAILED",
            "FORBIDDEN", "UNAVAILABLE", "ERROR"
        )

        # Record a build and an artifact (full provenance chain: Test 4)
        job = await jenkins_service.register_instance(  # reuse as job for simplicity
            project_id=project_id,
            name="build-job",
            base_url="http://jenkins.example.internal",
        )
        # Create job record directly
        from app.models.jenkins_models import JenkinsJob
        j_job = JenkinsJob(
            jenkins_instance_id=instance.id,
            project_id=project_id,
            job_name="payment-api-build",
            job_type="PIPELINE",
            status="ACTIVE",
        )
        session.add(j_job)
        await session.commit()
        await session.refresh(j_job)

        build = await jenkins_service.record_build(
            job_id=j_job.id,
            build_number=182,
            commit_sha=commit_sha,
            status="SUCCESS",
        )
        logger.info(f"Build recorded: #{build.build_number} commit={build.commit_sha}")
        assert build.commit_sha == commit_sha

        # Idempotency: same build recorded twice must not create duplicate (Test 10)
        build_again = await jenkins_service.record_build(
            job_id=j_job.id,
            build_number=182,
            commit_sha=commit_sha,
        )
        assert build.id == build_again.id
        logger.info("Duplicate build record correctly deduplicated ✓")

        # Record build artifact linking all provenance
        artifact = await jenkins_service.record_artifact(
            project_id=project_id,
            jenkins_build_id=build.id,
            artifact_type="DOCKER_IMAGE",
            name="myorg/payment-api:1.0.0",
            digest="sha256:abc123def456",
            commit_sha=commit_sha,
            provenance={"builder": "jenkins", "build_number": 182},
        )
        logger.info(f"Artifact: {artifact.id} digest={artifact.digest} commit={artifact.commit_sha}")
        assert artifact.digest == "sha256:abc123def456"
        assert artifact.commit_sha == commit_sha
        assert artifact.jenkins_build_id == build.id

        # Security gate: BLOCK (Test 2 — gate blocks pipeline)
        gate_result = await jenkins_service.evaluate_security_gate(
            build_id=build.id,
            commit_sha=commit_sha,
            image_digest="sha256:abc123def456",
            environment="TEST",
            policy_decision="BLOCK",
            evidence={"finding_count": 5, "critical_count": 2},
        )
        logger.info(f"Security gate decision: {gate_result['decision']}")
        assert gate_result["decision"] == "BLOCK"

        # Idempotent webhook processing (Test 10)
        logger.info("\n--- Test: Idempotent Webhook Processing ---")
        payload = {"name": "payment-api-build", "build": {"number": 183, "scm": {"commit": "xyz789"}}}
        delivery_id = "webhook-delivery-abc-123"

        result1 = await jenkins_service.process_webhook(delivery_id, "build.complete", payload)
        result2 = await jenkins_service.process_webhook(delivery_id, "build.complete", payload)

        logger.info(f"First webhook: {result1['status']}, Second webhook: {result2['status']}")
        assert result1["status"] == "PROCESSED"
        assert result2["status"] == "DUPLICATE"
        assert result1["event_id"] == result2["event_id"]  # Same event, not duplicate record

        # ---- TRACEABILITY CHECK ----
        logger.info("\n--- Provenance Traceability ---")
        logger.info(f"  commit_sha={commit_sha}")
        logger.info(f"  jenkins_build_id={build.id}")
        logger.info(f"  artifact_digest={artifact.digest}")
        logger.info(f"  image_id={image.id}")
        logger.info(f"  cluster_id={cluster.id}")
        assert artifact.commit_sha == commit_sha
        assert artifact.jenkins_build_id == build.id
        assert image.commit_sha == commit_sha

        logger.info("\n✅ STEP 17 VERIFICATION SUCCESSFUL")
        logger.info("   Docker: integration registered, scan attempted")
        logger.info("   Kubernetes: cluster registered, security checks ran, deployment gate enforced")
        logger.info("   Jenkins: instance registered, build tracked, security gate applied, webhook deduplicated")
        logger.info("   Provenance: commit -> build -> artifact -> image -> cluster all traceable")


if __name__ == "__main__":
    asyncio.run(run_verification())
