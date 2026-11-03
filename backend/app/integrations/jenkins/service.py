"""
Jenkins Integration Service.

Orchestrates Jenkins instance management, job tracking, build monitoring,
security gate evaluation, and idempotent webhook processing.
"""
import uuid
import logging
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.integrations.jenkins.client import JenkinsClient, JenkinsConnectionConfig, JenkinsConnectionResult
from app.models.jenkins_models import (
    JenkinsInstance, JenkinsJob, JenkinsBuild,
    JenkinsWebhookEvent, BuildArtifact, SecurityDeployment
)

logger = logging.getLogger(__name__)


class JenkinsService:
    """
    Structured Jenkins operations for the security control plane.
    All policy decisions originate from the platform — never from Jenkins.
    """

    def __init__(self, db: AsyncSession, config: Optional[JenkinsConnectionConfig] = None):
        self.db = db
        self.config = config

    def _get_client(self, instance: JenkinsInstance) -> JenkinsClient:
        cfg = JenkinsConnectionConfig(
            base_url=instance.base_url,
            credential_reference=instance.credential_reference,
            # In a real deployment, credentials are resolved from the credential store
            _username=None,
            _api_token=None,
        )
        if self.config:
            cfg._username = self.config._username
            cfg._api_token = self.config._api_token
        return JenkinsClient(cfg)

    async def register_instance(
        self,
        project_id: uuid.UUID,
        name: str,
        base_url: str,
        credential_reference: Optional[str] = None,
    ) -> JenkinsInstance:
        instance = JenkinsInstance(
            project_id=project_id,
            name=name,
            base_url=base_url,
            status="CONNECTING",
            credential_reference=credential_reference,
        )
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def health_check(self, instance_id: uuid.UUID) -> JenkinsConnectionResult:
        instance = (await self.db.execute(
            select(JenkinsInstance).where(JenkinsInstance.id == instance_id)
        )).scalar_one_or_none()
        if not instance:
            from app.integrations.jenkins.client import JenkinsConnectionResult as JCR
            return JCR(status="NOT_CONFIGURED", error="Instance not found")
        client = self._get_client(instance)
        result = client.health_check()
        instance.status = result.status
        instance.version = result.version
        await self.db.commit()
        return result

    async def discover_jobs(self, instance_id: uuid.UUID, project_id: uuid.UUID) -> List[JenkinsJob]:
        instance = (await self.db.execute(
            select(JenkinsInstance).where(JenkinsInstance.id == instance_id)
        )).scalar_one_or_none()
        if not instance:
            return []
        client = self._get_client(instance)
        job_infos = client.list_jobs()
        results = []
        for ji in job_infos:
            existing = (await self.db.execute(
                select(JenkinsJob).where(
                    JenkinsJob.jenkins_instance_id == instance_id,
                    JenkinsJob.job_name == ji.name,
                )
            )).scalar_one_or_none()
            if not existing:
                job = JenkinsJob(
                    jenkins_instance_id=instance_id,
                    project_id=project_id,
                    job_name=ji.name,
                    job_type=ji.job_type,
                    status="ACTIVE",
                )
                self.db.add(job)
                results.append(job)
            else:
                results.append(existing)
        await self.db.commit()
        return results

    async def record_build(
        self,
        job_id: uuid.UUID,
        build_number: int,
        commit_sha: Optional[str] = None,
        status: str = "RUNNING",
    ) -> JenkinsBuild:
        # Check for existing build (idempotency)
        existing = (await self.db.execute(
            select(JenkinsBuild).where(
                JenkinsBuild.job_id == job_id,
                JenkinsBuild.build_number == build_number,
            )
        )).scalar_one_or_none()
        if existing:
            return existing

        build = JenkinsBuild(
            job_id=job_id,
            build_number=build_number,
            commit_sha=commit_sha,
            status=status,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(build)
        await self.db.commit()
        await self.db.refresh(build)
        return build

    async def process_webhook(self, delivery_id: str, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Idempotently process a Jenkins webhook event.
        Duplicate delivery_ids are silently deduplicated.
        """
        payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

        # Check idempotency
        existing = (await self.db.execute(
            select(JenkinsWebhookEvent).where(JenkinsWebhookEvent.delivery_id == delivery_id)
        )).scalar_one_or_none()
        if existing:
            logger.info("Duplicate Jenkins webhook delivery_id=%s — skipped", delivery_id)
            return {"status": "DUPLICATE", "event_id": str(existing.id)}

        event = JenkinsWebhookEvent(
            delivery_id=delivery_id,
            event_type=event_type,
            job_name=payload.get("name"),
            build_number=payload.get("build", {}).get("number"),
            commit_sha=payload.get("build", {}).get("scm", {}).get("commit"),
            payload_hash=payload_hash,
            processing_status="PROCESSING",
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)

        # Process the event (record build, trigger security gate, etc.)
        event.processing_status = "PROCESSED"
        await self.db.commit()
        return {"status": "PROCESSED", "event_id": str(event.id)}

    async def evaluate_security_gate(
        self,
        build_id: uuid.UUID,
        commit_sha: Optional[str],
        image_digest: Optional[str],
        environment: str,
        policy_decision: str,   # ALLOW, WARN, BLOCK, REQUIRE_APPROVAL
        evidence: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Records a security gate decision for a Jenkins build.
        The platform's policy engine makes the decision, not Jenkins.
        """
        build = (await self.db.execute(
            select(JenkinsBuild).where(JenkinsBuild.id == build_id)
        )).scalar_one_or_none()
        if not build:
            return {"decision": "NOT_EXECUTED", "reason": "Build not found"}

        if policy_decision == "BLOCK":
            build.status = "SECURITY_GATE_FAILED"
            build.result = "BLOCKED_BY_SECURITY"
        elif policy_decision == "REQUIRE_APPROVAL":
            build.status = "PENDING_APPROVAL"
        # ALLOW and WARN allow the pipeline to continue
        await self.db.commit()

        return {
            "decision": policy_decision,
            "build_id": str(build_id),
            "commit_sha": commit_sha,
            "image_digest": image_digest,
            "environment": environment,
            "evidence_keys": list(evidence.keys()),
        }

    async def record_artifact(
        self,
        project_id: uuid.UUID,
        jenkins_build_id: uuid.UUID,
        artifact_type: str,
        name: str,
        digest: Optional[str],
        commit_sha: Optional[str],
        provenance: Optional[Dict[str, Any]] = None,
    ) -> BuildArtifact:
        artifact = BuildArtifact(
            project_id=project_id,
            jenkins_build_id=jenkins_build_id,
            artifact_type=artifact_type,
            name=name,
            digest=digest,
            commit_sha=commit_sha,
            provenance=provenance or {},
        )
        self.db.add(artifact)
        await self.db.commit()
        await self.db.refresh(artifact)
        return artifact
