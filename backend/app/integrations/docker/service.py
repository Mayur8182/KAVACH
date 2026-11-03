"""
Docker Integration Service.

Orchestrates image discovery, scanning, provenance linking, and policy evaluation.
"""
import uuid
import logging
import subprocess
import json
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.integrations.docker.client import DockerClient, DockerConnectionConfig, DockerConnectionResult
from app.models.docker_models import DockerImage, ContainerImageFinding, ContainerRegistry

logger = logging.getLogger(__name__)


class DockerService:
    """
    Provides structured Docker operations for the security control plane.
    Never exposes raw Docker socket access to arbitrary callers.
    """

    def __init__(self, db: AsyncSession, config: Optional[DockerConnectionConfig] = None):
        self.db = db
        self.config = config or DockerConnectionConfig()
        self.client = DockerClient(self.config)

    async def health_check(self) -> DockerConnectionResult:
        """Returns real Docker daemon connection status."""
        return self.client.health_check()

    async def register_registry(
        self,
        project_id: uuid.UUID,
        provider: str,
        name: str,
        url: str,
        credential_reference: Optional[str] = None,
    ) -> ContainerRegistry:
        registry = ContainerRegistry(
            project_id=project_id,
            provider=provider,
            name=name,
            url=url,
            status="NOT_CONFIGURED" if not credential_reference else "PENDING_VERIFICATION",
            credential_reference=credential_reference,
        )
        self.db.add(registry)
        await self.db.commit()
        await self.db.refresh(registry)
        return registry

    async def record_image(
        self,
        project_id: uuid.UUID,
        repository: str,
        tag: Optional[str],
        digest: Optional[str],
        commit_sha: Optional[str] = None,
        jenkins_build_id: Optional[uuid.UUID] = None,
        registry_id: Optional[uuid.UUID] = None,
    ) -> DockerImage:
        """
        Record an image in the platform DB. Associates provenance data.
        Does NOT invent digests — only stores what is known.
        """
        image = DockerImage(
            project_id=project_id,
            registry_id=registry_id,
            repository=repository,
            tag=tag,
            digest=digest,
            commit_sha=commit_sha,
            jenkins_build_id=jenkins_build_id,
            status="DISCOVERED",
            observed_at=datetime.now(timezone.utc),
        )

        # Try to enrich from local Docker daemon
        if not digest:
            info = self.client.inspect_image(repository, tag or "latest")
            if info:
                image.digest = info.digest
                image.architecture = info.architecture
                image.os = info.os
                image.size = info.size
                image.status = "INSPECTED"

        self.db.add(image)
        await self.db.commit()
        await self.db.refresh(image)
        return image

    async def scan_image(self, image_id: uuid.UUID) -> Dict[str, Any]:
        """
        Run Trivy against a recorded image. Records real findings.
        Returns scan result summary with status.

        NEVER fabricates findings — if the scanner fails, status is SCAN_FAILED.
        """
        image_stmt = select(DockerImage).where(DockerImage.id == image_id)
        image = (await self.db.execute(image_stmt)).scalar_one_or_none()
        if not image:
            return {"status": "IMAGE_NOT_FOUND"}

        ref = image.digest or (f"{image.repository}:{image.tag}" if image.tag else image.repository)

        try:
            result = await asyncio.to_thread(
                subprocess.run,
                ["trivy", "image", "--format", "json", "--quiet", ref],
                capture_output=True,
                text=True,
                timeout=300,
            )
            if result.returncode != 0:
                logger.error("Trivy scan failed for %s: %s", ref, result.stderr)
                return {
                    "status": "SCAN_FAILED",
                    "reason": result.stderr[:500],
                }

            trivy_output = json.loads(result.stdout)
            findings_count = 0

            for target_result in trivy_output.get("Results", []):
                for vuln in target_result.get("Vulnerabilities") or []:
                    finding = ContainerImageFinding(
                        image_id=image.id,
                        vulnerability_id=vuln.get("VulnerabilityID"),
                        package=vuln.get("PkgName"),
                        installed_version=vuln.get("InstalledVersion"),
                        fixed_version=vuln.get("FixedVersion"),
                        severity=vuln.get("Severity", "UNKNOWN"),
                        status="OPEN",
                        evidence={
                            "title": vuln.get("Title"),
                            "description": (vuln.get("Description") or "")[:500],
                            "references": vuln.get("References", [])[:5],
                        },
                    )
                    self.db.add(finding)
                    findings_count += 1

            await self.db.commit()
            image.status = "SCANNED"
            await self.db.commit()

            return {
                "status": "FINDINGS_PRESENT" if findings_count > 0 else "NO_FINDINGS",
                "findings_count": findings_count,
                "image_ref": ref,
            }

        except FileNotFoundError:
            logger.warning("Trivy binary not found.")
            return {"status": "SCANNER_NOT_CONFIGURED", "reason": "Trivy not installed"}
        except subprocess.TimeoutExpired:
            return {"status": "SCAN_FAILED", "reason": "Trivy scan timed out"}
        except json.JSONDecodeError as exc:
            return {"status": "SCAN_FAILED", "reason": f"Failed to parse Trivy output: {exc}"}
        except Exception as exc:
            logger.error("Image scan error: %s", exc, exc_info=True)
            return {"status": "SCAN_FAILED", "reason": str(exc)}

    async def get_image_findings(self, image_id: uuid.UUID) -> List[ContainerImageFinding]:
        stmt = select(ContainerImageFinding).where(ContainerImageFinding.image_id == image_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()
