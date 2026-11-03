import asyncio
import hashlib
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.github import GitHubRepository, GitHubSecurityJob
from app.models.integration_models import RealIntegration
from app.models.scan import SecurityScan, SecurityFinding
from app.services.notification_dispatcher import NotificationDispatcher

logger = logging.getLogger("scan-orchestrator")


def now_utc():
    return datetime.now(timezone.utc)


# Manifest file signatures triggering SCA
SCA_FILE_PATTERNS = {
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "pipfile.lock",
    "poetry.lock",
    "pom.xml",
    "build.gradle",
    "go.mod",
    "go.sum",
    "cargo.lock",
}

# Infrastructure-as-code file extensions triggering Checkov/IaC
IAC_FILE_EXTENSIONS = {
    ".tf",
    ".tfvars",
    ".hcl",
    "dockerfile",
    ".dockerfile",
}

# Source code extensions triggering Semgrep AST SAST
SAST_FILE_EXTENSIONS = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".go",
    ".java",
    ".rs",
    ".c",
    ".cpp",
    ".cs",
    ".php",
    ".rb",
}


class ScanOrchestrator:
    """
    Intelligent Scan Orchestrator:
    1. Deduplicates rapid webhook pushes for the same commit SHA within a debounce window.
    2. Inspects changed files to execute only relevant scanners (SCA, IaC, SAST, Secrets).
    3. Runs full scans on default branches or when baseline is absent.
    4. Automatically dispatches alerts to Slack/Teams/Webhooks upon scan completion.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self.dispatcher = NotificationDispatcher(db)

    def determine_required_scanners(
        self,
        changed_files: Optional[List[str]],
        is_default_branch: bool = False,
    ) -> Set[str]:
        """
        Determines targeted scanner set based on modified file patterns.
        Always returns full suite on default branches or when file list is omitted.
        """
        if not changed_files or is_default_branch:
            return {"SAST", "SECRETS", "SCA", "IAC"}

        scanners: Set[str] = set()

        for f in changed_files:
            lower = f.lower()
            base = lower.split("/")[-1]

            # SCA Check
            if base in SCA_FILE_PATTERNS:
                scanners.add("SCA")

            # IaC Check
            if any(lower.endswith(ext) for ext in IAC_FILE_EXTENSIONS) or "k8s" in lower or "helm" in lower:
                scanners.add("IAC")

            # SAST & Secrets Check
            if any(lower.endswith(ext) for ext in SAST_FILE_EXTENSIONS):
                scanners.add("SAST")
                scanners.add("SECRETS")

        # If files were modified but none matched specific extensions, fall back to SAST and Secrets
        if not scanners:
            scanners = {"SAST", "SECRETS"}

        return scanners

    async def check_and_deduplicate_scan(
        self,
        repository_id: uuid.UUID,
        commit_sha: str,
        debounce_seconds: int = 20,
    ) -> Optional[GitHubSecurityJob]:
        """
        Scan Deduplication: Checks if an identical commit on the repository
        was queued or completed within the debounce interval.
        """
        if not commit_sha:
            return None

        window_start = now_utc() - timedelta(seconds=debounce_seconds)
        stmt = (
            select(GitHubSecurityJob)
            .where(
                and_(
                    GitHubSecurityJob.repository_id == repository_id,
                    GitHubSecurityJob.commit_sha == commit_sha,
                    or_(
                        GitHubSecurityJob.status.in_(["QUEUED", "RUNNING"]),
                        GitHubSecurityJob.created_at >= window_start,
                    ),
                )
            )
            .order_by(GitHubSecurityJob.created_at.desc())
            .limit(1)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def trigger_event_scan(
        self,
        repository: GitHubRepository,
        commit_sha: str,
        branch: str,
        event_type: str,
        changed_files: Optional[List[str]] = None,
        pull_request_number: Optional[int] = None,
        trigger_user: str = "webhook",
    ) -> Dict[str, Any]:
        """
        Orchestrates continuous security assessment triggered by repository event.
        """
        # 1. Deduplication Check
        existing_job = await self.check_and_deduplicate_scan(
            repository_id=repository.id,
            commit_sha=commit_sha,
        )
        if existing_job:
            logger.info(
                f"[Deduplication] Skipping duplicate scan for {repository.full_name} "
                f"at commit {commit_sha[:7]} (Existing Job: {existing_job.id})"
            )
            return {
                "deduplicated": True,
                "job_id": str(existing_job.id),
                "status": existing_job.status,
                "message": f"Deduplicated with existing job {existing_job.id}",
            }

        is_default = (branch == (repository.default_branch or "main"))
        required_scanners = self.determine_required_scanners(changed_files, is_default_branch=is_default)

        # 2. Enqueue Job in GitHubSecurityJob
        job = GitHubSecurityJob(
            id=uuid.uuid4(),
            project_id=repository.project_id,
            repository_id=repository.id,
            event_type=event_type,
            commit_sha=commit_sha,
            branch=branch,
            pull_request_number=pull_request_number,
            status="QUEUED",
            job_name=f"{event_type.capitalize()} Security Pipeline",
            job_type="AUTOMATED_EVENT",
            triggered_by=trigger_user,
            total_stages=len(required_scanners) + 2,
            current_stage_index=0,
            current_stage="Queued for execution",
            stage_progress=0,
            recent_logs=[f"Event {event_type} received. Required scanners: {', '.join(required_scanners)}"],
            created_at=now_utc(),
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        # 3. Asynchronously execute the real security pipeline
        asyncio.create_task(
            self._run_scan_and_notify(
                job_id=job.id,
                repository_id=repository.id,
                required_scanners=required_scanners,
            )
        )

        return {
            "deduplicated": False,
            "job_id": str(job.id),
            "status": "QUEUED",
            "scanners": list(required_scanners),
        }

    async def _run_scan_and_notify(
        self,
        job_id: uuid.UUID,
        repository_id: uuid.UUID,
        required_scanners: Set[str],
    ) -> None:
        """
        Executes real scanners via GitHubService, records findings,
        and broadcasts notifications to Slack/Teams/Webhooks.
        """
        from app.services.github_service import GitHubService

        try:
            gh_service = GitHubService(self.db)
            completed_job = await gh_service.execute_security_pipeline(job_id)

            # Query real findings summary for this repository
            stmt = select(SecurityFinding).where(SecurityFinding.repository_id == repository_id)
            findings_res = await self.db.execute(stmt)
            findings = findings_res.scalars().all()

            findings_summary = {
                "critical": sum(1 for f in findings if (f.severity or "").upper() == "CRITICAL"),
                "high": sum(1 for f in findings if (f.severity or "").upper() == "HIGH"),
                "medium": sum(1 for f in findings if (f.severity or "").upper() == "MEDIUM"),
                "low": sum(1 for f in findings if (f.severity or "").upper() == "LOW"),
            }

            first_critical = next(
                (f.title for f in findings if (f.severity or "").upper() == "CRITICAL"),
                None,
            )

            # Find connected Slack integration
            repo = completed_job.repository
            repo_name = repo.full_name if repo else "repository"
            branch = completed_job.branch or "main"

            slack_stmt = select(RealIntegration).where(
                RealIntegration.provider == "slack",
                RealIntegration.status == "connected",
            ).limit(1)
            slack_res = await self.db.execute(slack_stmt)
            slack_integ = slack_res.scalar_one_or_none()

            if slack_integ and slack_integ.access_token_encrypted:
                try:
                    from app.core.encryption import decrypt_secret
                    creds_json = decrypt_secret(slack_integ.access_token_encrypted)
                    creds = json.loads(creds_json)
                    webhook_url = creds.get("webhook_url")
                    if webhook_url:
                        scan_url = f"http://localhost:3002/code/repositories/{repository_id}?tab=Security%20Findings"
                        await self.dispatcher.send_slack_notification(
                            webhook_url=webhook_url,
                            title="Scan Completed",
                            repository_name=repo_name,
                            branch=branch,
                            event_name=completed_job.event_type or "push",
                            status=completed_job.status,
                            findings_summary=findings_summary,
                            critical_finding_title=first_critical,
                            scan_url=scan_url,
                        )
                except Exception as slack_err:
                    logger.warning(f"Slack post-scan notification warning: {slack_err}")

        except Exception as e:
            logger.error(f"Error in _run_scan_and_notify for job {job_id}: {e}")
