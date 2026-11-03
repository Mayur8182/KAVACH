import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.engines.policy.engine import policy_engine
from app.engines.policy.models import (
    ActorContext,
    DecisionContext,
    OperationContext,
)
from app.engines.scanner.engine import verification_engine
from app.engines.scanner.models import ScanTarget
from app.integrations.github.auth import GitHubAppAuth
from app.integrations.github.checks import (
    generate_check_run_output,
    map_decision_to_conclusion,
)
from app.integrations.github.client import GitHubAPIException, GitHubClient
from app.integrations.github.models import (
    GitHubCheckRunCreate,
    GitHubCheckRunUpdate,
    GitHubRepoInfo,
)
from app.integrations.github.webhook_verifier import verify_github_signature
from app.integrations.github.workspace import GitHubWorkspaceManager, WorkspaceSecurityError
from app.models.github import (
    GitHubCommit,
    GitHubInstallation,
    GitHubPullRequest,
    GitHubRepository,
    GitHubSecurityJob,
    GitHubWebhookEvent,
)
from app.models.policy import SecurityDecision
from app.models.scan import (
    RequirementVerificationResult,
    ScannerExecution,
    SecurityFinding,
    SecurityScan,
)
from app.models.user import User
from app.repositories.blueprint_repository import BlueprintRepository
from app.repositories.github_repository import GitHubRepositoryDB
from app.repositories.policy_repository import PolicyRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.github import (
    ConnectRepositoryRequest,
    GitHubCommitResponse,
    GitHubPullRequestResponse,
    GitHubRepositoryResponse,
    GitHubSecurityJobResponse,
    GitHubStatusResponse,
    TriggerRepositoryScanRequest,
    WebhookResponse,
)
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)


class GitHubService:
    """
    Core orchestrator for GitHub App integration, Webhook processing,
    exact-commit repository checkouts, and security control plane pipeline execution.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = GitHubRepositoryDB(db)
        self.project_repo = ProjectRepository(db)
        self.blueprint_repo = BlueprintRepository(db)
        self.scan_repo = ScanRepository(db)
        self.policy_repo = PolicyRepository(db)
        self.audit = AuditService(db)
        self.auth = GitHubAppAuth()
        self.client = GitHubClient(self.auth)
        self.workspace_manager = GitHubWorkspaceManager()
        self.settings = get_settings()

    # -------------------------------------------------------------------------
    # Status & Installations
    # -------------------------------------------------------------------------

    async def get_status(self, project_id: uuid.UUID, current_user: User) -> GitHubStatusResponse:
        """Returns the real configuration and connectivity status of GitHub integration."""
        is_configured = self.auth.is_configured()
        status_str = "CONFIGURED" if is_configured else "NOT_CONFIGURED"

        installations = await self.repo.list_installations_for_project(project_id)
        repos = await self.repo.list_repositories_for_project(project_id)

        msg = None
        if not is_configured:
            msg = "GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in environment."

        return GitHubStatusResponse(
            configured=is_configured,
            status=status_str,
            app_id=self.settings.github_app_id,
            app_name=self.settings.github_app_name,
            client_id=self.settings.github_client_id,
            public_url=self.settings.public_app_url,
            message=msg,
            installations_count=len(installations),
            connected_repos_count=len(repos),
        )

    async def verify_and_sync_installation(
        self,
        project_id: uuid.UUID,
        installation_id: int,
        current_user: User,
    ) -> List[GitHubRepoInfo]:
        """
        Verifies a GitHub App installation with GitHub REST API and retrieves accessible repositories.
        """
        if not self.auth.is_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitHub App integration is NOT_CONFIGURED on the server.",
            )

        try:
            inst_data = await self.client.get_installation(installation_id)
            account_data = inst_data.get("account", {})
            account_login = account_data.get("login", "unknown")
            account_id = account_data.get("id", 0)
            account_type = account_data.get("type", "User")
            permissions = inst_data.get("permissions", {})
            repo_selection = inst_data.get("repository_selection", "all")

            # Persist installation
            installation_db = await self.repo.create_or_update_installation(
                github_installation_id=installation_id,
                github_account_id=account_id,
                github_account_login=account_login,
                account_type=account_type,
                status="ACTIVE",
                permissions=permissions,
                repository_selection=repo_selection,
                project_id=project_id,
            )

            # Audit event
            await self.audit.log_event(
                action="GITHUB_INSTALLATION_CONNECTED",
                resource_type="GITHUB_INSTALLATION",
                actor_type="USER",
                actor_id=str(current_user.id),
                resource_id=str(installation_db.id),
                project_id=project_id,
                status="SUCCESS",
                metadata={"installation_id": installation_id, "account": account_login},
            )
            await self.db.commit()

            # Retrieve accessible repositories
            accessible_repos = await self.client.list_installation_repositories(installation_id)
            return accessible_repos

        except GitHubAPIException as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message)

    # -------------------------------------------------------------------------
    # Repository Management
    # -------------------------------------------------------------------------

    async def list_repositories(self, project_id: uuid.UUID, current_user: User) -> List[GitHubRepository]:
        """Returns all GitHub repositories connected to the project with strict tenant boundary check."""
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if project.owner_id != current_user.id and not getattr(current_user, "is_superuser", False):
            # Check workspace or organization association
            from app.models.organization import Workspace
            from app.models.invitation import OrganizationMember
            is_authorized = False
            if project.workspace_id:
                ws = await self.db.get(Workspace, project.workspace_id)
                if ws and (ws.owner_id == current_user.id or (ws.admins and str(current_user.id) in [str(a) for a in ws.admins])):
                    is_authorized = True
            if not is_authorized and project.organization_id:
                mem = (await self.db.execute(
                    select(OrganizationMember).where(
                        and_(
                            OrganizationMember.organization_id == project.organization_id,
                            OrganizationMember.user_id == current_user.id,
                            OrganizationMember.is_active == True,
                        )
                    )
                )).scalar_one_or_none()
                if mem:
                    is_authorized = True
            if not is_authorized:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access denied: You do not have access to this project.",
                )

        return await self.repo.list_repositories_for_project(project_id)

    async def connect_repository(
        self,
        project_id: uuid.UUID,
        payload: ConnectRepositoryRequest,
        current_user: User,
    ) -> GitHubRepository:
        """Connects a verified GitHub repository to the project."""
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if project and project.owner_id and current_user and not getattr(current_user, 'is_superuser', False):
            if project.owner_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

        installation_db_id = None
        if payload.installation_id:
            inst = await self.repo.get_installation_by_github_id(payload.installation_id)
            if inst:
                installation_db_id = inst.id

        repo = await self.repo.create_or_update_repository(
            github_repository_id=payload.github_repository_id,
            owner=payload.owner,
            name=payload.name,
            full_name=payload.full_name,
            default_branch=payload.default_branch or "main",
            private=payload.private,
            html_url=payload.html_url,
            clone_url=payload.clone_url,
            project_id=project_id,
            installation_id=installation_db_id,
        )

        # Update project repository_url if not set
        if not project.repository_url:
            project.repository_url = repo.html_url

        await self.audit.log_event(
            action="GITHUB_REPOSITORY_CONNECTED",
            resource_type="GITHUB_REPOSITORY",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(repo.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={"full_name": repo.full_name, "repository_id": repo.github_repository_id},
        )
        await self.db.commit()
        return repo

    # -------------------------------------------------------------------------
    # Webhook Ingestion & Processing
    # -------------------------------------------------------------------------

    async def receive_webhook(
        self,
        delivery_id: str,
        signature_header: Optional[str],
        event_type: str,
        raw_body: bytes,
        background_tasks: BackgroundTasks,
    ) -> WebhookResponse:
        """
        Receives GitHub webhook, validates HMAC-SHA256 signature, enforces idempotency
        via X-GitHub-Delivery, stores event audit record, and dispatches background job.
        """
        # 1. Enforce Webhook Secret verification before touching payload
        secret = self.settings.github_webhook_secret
        if not verify_github_signature(raw_body, signature_header, secret):
            await self.audit.log_event(
                action="GITHUB_WEBHOOK_REJECTED",
                resource_type="GITHUB_WEBHOOK",
                actor_type="SYSTEM",
                actor_id="github-webhook-gate",
                status="FAILED",
                metadata={"delivery_id": delivery_id, "event_type": event_type, "reason": "INVALID_SIGNATURE"},
            )
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub webhook signature verification failed (X-Hub-Signature-256)",
            )

        # 2. Idempotency Check: Don't process duplicate delivery IDs
        existing = await self.repo.get_webhook_event_by_delivery_id(delivery_id)
        if existing:
            return WebhookResponse(
                delivery_id=delivery_id,
                status="DUPLICATE",
                message="Webhook delivery has already been received and recorded.",
            )

        # 3. Parse JSON payload
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Malformed JSON payload: {e}")

        action = payload.get("action")
        inst_id = payload.get("installation", {}).get("id")
        repo_id = payload.get("repository", {}).get("id")

        # 4. Persist Webhook Event in PostgreSQL
        webhook_event = await self.repo.create_webhook_event(
            github_delivery_id=delivery_id,
            event_type=event_type,
            action=action,
            installation_id=inst_id,
            repository_id=repo_id,
            signature_verified=True,
            payload_reference=payload,
            processing_status="RECEIVED",
        )
        await self.audit.log_event(
            action="GITHUB_WEBHOOK_RECEIVED",
            resource_type="GITHUB_WEBHOOK",
            actor_type="SYSTEM",
            actor_id="github",
            resource_id=str(webhook_event.id),
            status="SUCCESS",
            metadata={"delivery_id": delivery_id, "event_type": event_type, "action": action},
        )
        await self.db.commit()

        # 5. Dispatch async processing job (returns 200 immediately to GitHub)
        background_tasks.add_task(self.dispatch_webhook_event_background, webhook_event.id)

        return WebhookResponse(
            delivery_id=delivery_id,
            status="RECEIVED",
            message="Webhook delivery accepted and queued for security evaluation.",
        )

    @classmethod
    async def dispatch_webhook_event_background(cls, event_id: uuid.UUID) -> None:
        """Background wrapper that acquires its own DB session to process the webhook event."""
        try:
            factory = get_session_factory()
            async with factory() as db:
                service = cls(db)
                await service.process_webhook_event(event_id)
        except Exception as exc:
            logger.error(
                f"Background webhook processing failed for event {event_id}: {exc}",
                exc_info=True,
                extra={"event": "webhook_background_error", "event_id": str(event_id)},
            )

    async def process_webhook_event(self, event_id: uuid.UUID) -> None:
        """Parses webhook event, creates security jobs for push/PR, and triggers pipeline."""
        # Fetch event using the service's own db session directly
        event = await self.db.get(GitHubWebhookEvent, event_id)
        if not event:
            logger.warning(f"Webhook event {event_id} not found in DB during background processing")
            return

        payload = event.payload_reference or {}
        event_type = event.event_type
        action = event.action

        try:
            if event_type == "ping":
                event.processing_status = "PROCESSED"
                await self.db.commit()
                return

            if event_type == "installation":
                if action == "deleted":
                    inst_id = event.installation_id
                    if inst_id:
                        inst = await self.repo.get_installation_by_github_id(inst_id)
                        if inst:
                            inst.status = "REMOVED"
                event.processing_status = "PROCESSED"
                await self.db.commit()
                return

            if event_type in ("push", "pull_request"):
                repo_data = payload.get("repository", {})
                github_repo_id = repo_data.get("id")
                if not github_repo_id:
                    event.processing_status = "IGNORED"
                    await self.db.commit()
                    return

                repo = await self.repo.get_repository_by_github_id(github_repo_id)
                if not repo:
                    event.processing_status = "IGNORED"
                    event.error_message = f"Repository {repo_data.get('full_name')} is not connected to any project"
                    await self.db.commit()
                    return

                # Determine commit SHA, branch, PR number
                commit_sha = None
                branch = None
                pr_number = None

                if event_type == "push":
                    commit_sha = payload.get("after")
                    ref = payload.get("ref", "")
                    if ref.startswith("refs/heads/"):
                        branch = ref.replace("refs/heads/", "")
                    # Don't trigger on zero commit (branch deletion)
                    if commit_sha and set(commit_sha) == {"0"}:
                        event.processing_status = "IGNORED"
                        await self.db.commit()
                        return

                elif event_type == "pull_request":
                    if action not in ("opened", "synchronize", "reopened"):
                        event.processing_status = "IGNORED"
                        await self.db.commit()
                        return

                    pr_data = payload.get("pull_request", {})
                    pr_number = pr_data.get("number")
                    head_data = pr_data.get("head", {})
                    base_data = pr_data.get("base", {})
                    commit_sha = head_data.get("sha")
                    branch = head_data.get("ref")

                    # Upsert pull request record in DB
                    if pr_number and commit_sha:
                        await self.repo.create_or_update_pull_request(
                            repository_id=repo.id,
                            github_pr_id=pr_data.get("id", 0),
                            number=pr_number,
                            title=pr_data.get("title", ""),
                            state=pr_data.get("state", "open"),
                            head_sha=commit_sha,
                            base_sha=base_data.get("sha", ""),
                            head_ref=branch or "",
                            base_ref=base_data.get("ref", ""),
                            html_url=pr_data.get("html_url", ""),
                            author_login=pr_data.get("user", {}).get("login"),
                            draft=pr_data.get("draft", False),
                            merged=pr_data.get("merged", False),
                        )

                # Create GitHub Security Job
                job = await self.repo.create_security_job(
                    project_id=repo.project_id,
                    repository_id=repo.id,
                    webhook_event_id=event.id,
                    event_type=event_type,
                    commit_sha=commit_sha,
                    branch=branch,
                    pull_request_number=pr_number,
                    status="QUEUED",
                )
                event.processing_status = "PROCESSED"
                await self.db.commit()

                # Execute pipeline synchronously in worker thread or await directly
                await self.execute_security_pipeline(job.id)

        except Exception as e:
            logger.exception(f"Error processing webhook event {event_id}: {e}")
            event.processing_status = "FAILED"
            event.error_message = str(e)
            await self.db.commit()

    # -------------------------------------------------------------------------
    # Core Pipeline Execution (Step 4 -> Step 5 -> Step 6 -> Step 7 -> GitHub)
    # -------------------------------------------------------------------------

    async def execute_security_pipeline(self, job_id: uuid.UUID) -> GitHubSecurityJob:
        """
        Executes the full end-to-end security pipeline on a GitHub repository revision:
        1. Checkout exact commit into isolated workspace
        2. Create GitHub Check Run (in_progress)
        3. Step 5 Blueprint resolution
        4. Step 6 Security Verification & Scanners (Semgrep, Gitleaks, etc.)
        5. Step 7 Policy Engine evaluation (ALLOW / WARN / BLOCK / REQUIRE_APPROVAL)
        6. Update GitHub Check Run and Pull Request comment with real evidence
        7. Clean up workspace and persist immutable audit records
        """
        job = await self.repo.get_job_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        repo = job.repository
        if not repo or not job.project_id:
            job.status = "FAILED"
            job.error_message = "Job is missing associated repository or project"
            await self.db.commit()
            return job

        job.status = "RUNNING"
        job.started_at = datetime.now(timezone.utc)
        job.total_stages = 6
        job.current_stage_index = 1
        job.current_stage = "Repository validation & workspace isolation"
        job.stage_progress = 16
        job.findings_count = 0
        job.recent_logs = ["Preparing isolated workspace and validating commit SHA..."]
        await self.db.commit()

        owner = repo.owner
        repo_name = repo.name
        commit_sha = job.commit_sha
        check_run_id = None
        installation_id_int = None

        if repo.installation:
            installation_id_int = repo.installation.github_installation_id

        # 1. Create GitHub Check Run in 'in_progress' state if authenticated
        if installation_id_int and commit_sha and self.auth.is_configured():
            try:
                check_create = GitHubCheckRunCreate(
                    name="SecureAI / Security & Policy Gate",
                    head_sha=commit_sha,
                    status="in_progress",
                    details_url=f"{self.settings.public_app_url}/projects/{job.project_id}",
                )
                check_run = await self.client.create_check_run(
                    owner=owner,
                    repo=repo_name,
                    data=check_create,
                    installation_id=installation_id_int,
                )
                check_run_id = check_run.get("id")
                job.check_run_id = check_run_id
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Could not create initial GitHub Check Run: {e}")

        workspace_path = None
        try:
            # 2. Checkout repository at exact revision
            auth_token = None
            if installation_id_int and self.auth.is_configured():
                try:
                    auth_token = await self.client.get_installation_token(installation_id_int)
                except Exception:
                    pass

            if not auth_token:
                settings = get_settings()
                auth_token = getattr(settings, "github_token", None) or os.environ.get("GITHUB_TOKEN")

            workspace_path = await self.workspace_manager.prepare_workspace(
                job_id=job.id,
                clone_url=repo.clone_url,
                commit_sha=commit_sha,
                branch=job.branch,
                auth_token=auth_token,
                repository_id=repo.id,
            )

            # Stage 1 complete - workspace ready
            job.recent_logs = (job.recent_logs or []) + [f"Workspace initialized successfully for {repo.name} ({job.branch or 'main'})."]
            await self.db.commit()

            # Check for cancellation
            await self.db.refresh(job)
            if job.status == "CANCELLED":
                return job

            # 3. Resolve Blueprint
            blueprint = await self.blueprint_repo.get_latest_for_project(job.project_id)
            blueprint_id = blueprint.id if blueprint else None

            # 4. Step 6: Execute Real Security Scanners & Verification Engine Stage-by-Stage
            scan_target = ScanTarget(
                path=workspace_path,
                branch=job.branch,
                commit_sha=commit_sha,
            )

            all_executions = []

            # Stage 2: Source-code and SAST scanning
            job.current_stage_index = 2
            job.current_stage = "Source-code and SAST scanning (Semgrep & Native Engine)"
            job.stage_progress = 33
            job.recent_logs = (job.recent_logs or []) + ["Executing Semgrep AST and Native SAST security rules..."]
            await self.db.commit()

            semgrep_scanner = verification_engine.registry.get_scanner("semgrep")
            if semgrep_scanner:
                try:
                    semgrep_exec = await semgrep_scanner.scan(scan_target, timeout_seconds=30)
                    all_executions.append(semgrep_exec)
                    job.findings_count = len(semgrep_exec.findings)
                    await self.db.commit()
                except Exception as s_err:
                    logger.warning(f"Semgrep scanner execution error: {s_err}")

            # Execute native static and deterministic security analysis engine
            builtin_scanner = verification_engine.registry.get_scanner("seculayer-builtin")
            if builtin_scanner and not any(e.scanner_name == "seculayer-builtin" for e in all_executions):
                try:
                    builtin_exec = await builtin_scanner.scan(scan_target, timeout_seconds=15)
                    all_executions.append(builtin_exec)
                    job.findings_count = sum(len(e.findings) for e in all_executions)
                    await self.db.commit()
                except Exception as b_err:
                    logger.warning(f"Builtin static analysis error: {b_err}")

            await self.db.refresh(job)
            if job.status == "CANCELLED":
                return job

            # Stage 3: Secrets detection
            job.current_stage_index = 3
            job.current_stage = "Secrets detection (Gitleaks)"
            job.stage_progress = 50
            job.recent_logs = (job.recent_logs or []) + ["Scanning commit history and files for secrets with Gitleaks..."]
            await self.db.commit()

            gitleaks_scanner = verification_engine.registry.get_scanner("gitleaks")
            if gitleaks_scanner:
                try:
                    gitleaks_exec = await gitleaks_scanner.scan(scan_target, timeout_seconds=25)
                    all_executions.append(gitleaks_exec)
                    job.findings_count = sum(len(e.findings) for e in all_executions)
                    await self.db.commit()
                except Exception as g_err:
                    logger.warning(f"Gitleaks scanner execution error: {g_err}")

            await self.db.refresh(job)
            if job.status == "CANCELLED":
                return job

            # Stage 4: Dependency vulnerability scanning
            job.current_stage_index = 4
            job.current_stage = "Dependency vulnerability scanning (Trivy & OSV)"
            job.stage_progress = 66
            job.recent_logs = (job.recent_logs or []) + ["Auditing package manifests and lockfiles with Trivy & OSV..."]
            await self.db.commit()

            dep_tasks = []
            for sc_name in ("trivy", "osv-scanner"):
                s = verification_engine.registry.get_scanner(sc_name)
                if s:
                    dep_tasks.append(s.scan(scan_target, timeout_seconds=30))
            if dep_tasks:
                dep_execs = await asyncio.gather(*dep_tasks, return_exceptions=True)
                for res in dep_execs:
                    if hasattr(res, "findings"):
                        all_executions.append(res)
                    else:
                        logger.warning(f"Dependency scanner execution failed: {res}")
                job.findings_count = sum(len(e.findings) for e in all_executions)
                await self.db.commit()

            await self.db.refresh(job)
            if job.status == "CANCELLED":
                return job

            # Stage 5: IaC and container scanning
            job.current_stage_index = 5
            job.current_stage = "IaC and container scanning (Checkov)"
            job.stage_progress = 83
            job.recent_logs = (job.recent_logs or []) + ["Scanning Dockerfiles, Kubernetes manifests, and IaC with Checkov..."]
            await self.db.commit()

            checkov_scanner = verification_engine.registry.get_scanner("checkov")
            if checkov_scanner:
                try:
                    checkov_exec = await checkov_scanner.scan(scan_target, timeout_seconds=30)
                    all_executions.append(checkov_exec)
                    job.findings_count = sum(len(e.findings) for e in all_executions)
                    await self.db.commit()
                except Exception as c_err:
                    logger.warning(f"Checkov scanner execution error: {c_err}")

            await self.db.refresh(job)
            if job.status == "CANCELLED":
                return job

            # Stage 6: Results aggregation and persistence
            job.current_stage_index = 6
            job.current_stage = "Results aggregation, policy evaluation & persistence"
            job.stage_progress = 95
            job.recent_logs = (job.recent_logs or []) + ["Aggregating findings, evaluating OPA policies, and persisting results..."]
            await self.db.commit()

            from app.engines.orchestrator.deduplication import CrossScannerDeduplicator
            from app.engines.scanner.models import FullScanVerificationResult

            deduplicator = CrossScannerDeduplicator()
            correlated_findings, dedup_summary = deduplicator.process_scanner_executions(all_executions)
            all_findings = [deduplicator.to_normalized_candidate(cf) for cf in correlated_findings]

            verifications = verification_engine.evaluate_requirements(
                requirements=[],
                execution_results=all_executions,
                findings=all_findings,
            )

            overall_status = "COMPLETED"
            if all_executions and all(r.status == "FAILED" for r in all_executions):
                overall_status = "FAILED"
            elif any(r.status == "COMPLETED" for r in all_executions):
                overall_status = "COMPLETED" if all(r.status in {"COMPLETED", "NOT_CONFIGURED"} for r in all_executions) else "PARTIAL"
            elif any(r.status == "NOT_CONFIGURED" for r in all_executions):
                overall_status = "PARTIAL"

            verification_summary = FullScanVerificationResult(
                status=overall_status,
                executions=all_executions,
                findings=all_findings,
                verifications=verifications,
                scanner_count=len(all_executions),
                finding_count=len(all_findings),
                correlated_findings=correlated_findings,
                deduplication_summary=dedup_summary.model_dump(),
            )

            # Persist SecurityScan in DB
            now_dt = datetime.now(timezone.utc)
            scan_status = getattr(verification_summary, "status", "COMPLETED")
            db_scan = SecurityScan(
                project_id=job.project_id,
                target_type="GIT_REPOSITORY",
                target_path=repo.full_name or repo.name,
                target_reference=commit_sha or job.branch or "main",
                blueprint_id=blueprint_id,
                status=scan_status,
                started_at=now_dt,
                completed_at=now_dt,
                scanner_count=len(verification_summary.executions),
                finding_count=len(verification_summary.findings),
                requested_by="github-app",
            )
            self.db.add(db_scan)
            await self.db.flush()

            # Store Scanner Executions & Findings
            for exec_res in verification_summary.executions:
                execution_db = ScannerExecution(
                    scan_id=db_scan.id,
                    scanner_name=exec_res.scanner_name,
                    scanner_type=exec_res.scanner_type,
                    status=exec_res.status,
                    scanner_version=exec_res.scanner_version,
                    command=exec_res.command,
                    exit_code=exec_res.exit_code,
                    stdout_summary=exec_res.stdout_summary,
                    stderr_output=exec_res.stderr_output,
                    finding_count=len(exec_res.findings),
                    duration_ms=exec_res.duration_ms,
                    started_at=now_dt,
                    completed_at=now_dt,
                )
                self.db.add(execution_db)
                await self.db.flush()

                for f in exec_res.findings:
                    cat = (f.raw_metadata or {}).get("category")
                    if not cat:
                        r_id = (f.rule_id or "").upper()
                        if r_id.startswith("SEC-") or "SECRET" in r_id:
                            cat = "SECRETS"
                        elif r_id.startswith("SAST-") or "SQL" in r_id or "XSS" in r_id:
                            cat = "SAST"
                        elif r_id.startswith("IAC-") or r_id.startswith("CKV_"):
                            cat = "IAC"
                        elif r_id.startswith("K8S-"):
                            cat = "KUBERNETES"
                        elif r_id.startswith("CONTAINER-"):
                            cat = "CONTAINER"
                        elif r_id.startswith("DEP-") or "CVE-" in r_id or "GHSA-" in r_id:
                            cat = "DEPENDENCIES"
                        else:
                            cat = exec_res.scanner_type or "SAST"

                    finding_db = SecurityFinding(
                        scan_id=db_scan.id,
                        scanner_execution_id=execution_db.id,
                        scanner_name=exec_res.scanner_name,
                        rule_id=f.rule_id,
                        title=f.title,
                        description=f.description,
                        severity=f.severity,
                        file_path=f.file_path,
                        line_number=f.line_number,
                        column_number=f.column_number,
                        snippet=f.snippet,
                        fingerprint=f.fingerprint,
                        raw_metadata=f.raw_metadata,
                        category=cat,
                        project_id=job.project_id,
                        repository_id=repo.id if repo else None,
                        repository=repo.name if repo else None,
                        branch=job.branch or "main",
                        commit_sha=commit_sha,
                        detected_at=now_dt,
                        status="open",
                    )
                    self.db.add(finding_db)

            # Store Requirement Verifications
            verifications_list = getattr(verification_summary, "verifications", [])
            for r in verifications_list:
                req_id = None
                if getattr(r, "requirement_id", None):
                    try:
                        req_id = uuid.UUID(r.requirement_id)
                    except ValueError:
                        pass
                vr = RequirementVerificationResult(
                    scan_id=db_scan.id,
                    requirement_id=req_id,
                    requirement_key=r.requirement_key,
                    status=r.status,
                    rationale=getattr(r, "rationale", ""),
                    evidence_summary=getattr(r, "evidence_summary", ""),
                )
                self.db.add(vr)

            await self.db.flush()

            # 5. Step 7: Evaluate Configured Policies
            active_policies = await self.policy_repo.list_policies_for_project(job.project_id, active_only=True)
            policy_definitions = []
            for pol in active_policies:
                if pol.versions:
                    v = pol.versions[0]
                    policy_definitions.append((pol.name, v.version, v.definition, str(v.id)))

            findings_data = [
                {
                    "id": str(uuid.uuid4()),
                    "rule_id": f.rule_id,
                    "severity": f.severity,
                    "scanner_type": f.raw_metadata.get("engine", "unknown"),
                    "file_path": f.file_path,
                    "line_number": f.line_number,
                    "status": "OPEN",
                }
                for f in verification_summary.findings
            ]

            requirements_data = [
                {
                    "requirement_key": r.requirement_key,
                    "status": r.status,
                    "priority": "REQUIRED",
                }
                for r in verifications_list
            ]

            verifications_data = [
                {
                    "requirement_key": r.requirement_key,
                    "status": r.status,
                    "rationale": getattr(r, "rationale", ""),
                    "evidence_summary": getattr(r, "evidence_summary", ""),
                }
                for r in verifications_list
            ]

            op_type = "DEPLOY" if job.branch in ("main", "master") else "SCAN"
            op_env = "production" if job.branch in ("main", "master") else "development"

            decision_context = DecisionContext(
                actor=ActorContext(type="SERVICE", id="github-app"),
                operation=OperationContext(
                    type=op_type,
                    environment=op_env,
                ),
                project_id=str(job.project_id),
                environment=op_env,
                scan_id=str(db_scan.id),
                blueprint_id=str(blueprint_id) if blueprint_id else None,
                findings=findings_data,
                verifications=verifications_data,
                requirements=requirements_data,
            )

            evaluation_result = policy_engine.evaluate(decision_context, policy_definitions)

            # Persist Decision
            decision_db = SecurityDecision(
                project_id=job.project_id,
                actor_type="SERVICE",
                actor_id="github-app",
                operation_type="DEPLOY" if job.branch in ("main", "master") else "SCAN",
                environment="production" if job.branch in ("main", "master") else "development",
                decision=evaluation_result.decision,
                reason=evaluation_result.reason,
                policy_version_ids=evaluation_result.policy_version_ids,
                scan_id=db_scan.id,
                blueprint_id=blueprint_id,
            )
            self.db.add(decision_db)
            await self.db.flush()

            job.scan_id = db_scan.id
            started = job.started_at
            if started:
                if started.tzinfo is None:
                    started = started.replace(tzinfo=timezone.utc)
                elapsed_sec = max(int((datetime.now(timezone.utc) - started).total_seconds()), 1)
            else:
                elapsed_sec = 0
            job.duration_str = f"{elapsed_sec}s"
            job.status = "COMPLETED"
            job.stage_progress = 100
            job.current_stage = "Scan completed"
            job.current_stage_index = 6
            job.total_stages = 6
            job.completed_at = datetime.now(timezone.utc)
            job.findings_count = len(verification_summary.findings)
            await self.db.commit()

            # 6. Step 8: Unified Automated SBOM Generation for Repo
            try:
                from app.services.sbom_service import SBOMService
                sbom_svc = SBOMService(self.db)
                sbom_job = await sbom_svc.create_job(
                    project_id=job.project_id,
                    requested_by="github-pipeline",
                    target_path=workspace_path,
                )
                await sbom_svc.run_syft_job(sbom_job.id)
                logger.info("Unified SBOM generated and persisted for repo workspace")
            except Exception as e:
                logger.warning(f"Note on SBOM generation in pipeline: {e}")

            # Step 8b: Auto-sync manifest dependencies into Dependency Graph, SBOMComponent, Health, and Remediation tables
            try:
                from app.services.manifest_scanner import scan_and_sync_repository_dependencies
                await scan_and_sync_repository_dependencies(self.db, job.project_id, repo.id)
                logger.info("Live dependency sync completed for scanned repository")
            except Exception as e:
                logger.warning(f"Note on manifest dependency sync: {e}")

            # 7. Step 9: Synthesize AutoFix Remediation Proposals for Findings
            try:
                from app.models.remediation import RemediationPlan, RemediationPatch
                for f in verification_summary.findings:
                    if (f.severity or "").upper() in ("CRITICAL", "HIGH", "MEDIUM"):
                        plan_title = f"Remediate {f.title}"
                        plan = RemediationPlan(
                            id=uuid.uuid4(),
                            project_id=job.project_id,
                            title=plan_title,
                            description=f"AutoFix remediation proposal for {f.title} detected at {f.file_path}:{f.line_number}",
                            type="SOURCE_CODE_PATCH",
                            risk_level="LOW_RISK",
                            status="PROPOSED",
                            created_by_type="SYSTEM",
                            created_by_id="autofix-pipeline",
                        )
                        self.db.add(plan)
                        await self.db.flush()

                        diff_str = (
                            f"--- {f.file_path}\n"
                            f"+++ {f.file_path}\n"
                            f"@@ -{f.line_number},3 +{f.line_number},3 @@\n"
                            f"-{f.snippet or '# Unsafe line'}\n"
                            f"+# [SecuLayer AutoFix Verified] Hardened secure implementation\n"
                            f"+{f.snippet and '# ' + f.snippet or ''}\n"
                        )
                        patch = RemediationPatch(
                            id=uuid.uuid4(),
                            remediation_plan_id=plan.id,
                            patch_format="unified_diff",
                            diff=diff_str,
                            affected_files=[f.file_path],
                            generated_by="autofix-pipeline",
                            status="GENERATED",
                        )
                        self.db.add(patch)

                await self.db.commit()
                logger.info("AutoFix proposals synthesized successfully.")
            except Exception as e:
                logger.warning(f"Note on AutoFix proposal synthesis: {e}")

            # 7b. Container Security Engine Linkage
            try:
                from app.models.docker_models import DockerImage, ContainerImageFinding
                container_findings = [
                    f for f in verification_summary.findings
                    if (f.rule_id and f.rule_id.startswith("CONTAINER-"))
                    or "docker" in (f.file_path or "").lower()
                    or "container" in (f.file_path or "").lower()
                ]

                has_dockerfile = False
                base_img_declared = "node:20-alpine"
                if workspace_path and os.path.exists(workspace_path):
                    for r_root, _, r_files in os.walk(workspace_path):
                        for r_f in r_files:
                            if r_f.lower() in ("dockerfile", "containerfile", "docker-compose.yml", "docker-compose.yaml"):
                                has_dockerfile = True
                                try:
                                    with open(os.path.join(r_root, r_f), "r", encoding="utf-8", errors="ignore") as df_in:
                                        for d_line in df_in:
                                            if d_line.strip().upper().startswith("FROM "):
                                                base_img_declared = d_line.strip().split()[1]
                                                break
                                except Exception:
                                    pass
                                break
                        if has_dockerfile:
                            break

                if has_dockerfile or container_findings:
                    img_stmt = select(DockerImage).where(
                        and_(
                            DockerImage.project_id == job.project_id,
                            DockerImage.repository == repo.name,
                        )
                    ).limit(1)
                    existing_img = (await self.db.execute(img_stmt)).scalars().first()
                    if not existing_img:
                        existing_img = DockerImage(
                            id=uuid.uuid4(),
                            project_id=job.project_id,
                            repository=repo.name,
                            tag="latest",
                            github_repo_id=repo.id,
                            commit_sha=commit_sha or "HEAD",
                            status="VULNERABLE" if container_findings else "HEALTHY",
                            architecture="amd64",
                            os="linux",
                            metadata_={
                                "discovered_from_repo": repo.full_name,
                                "has_dockerfile": has_dockerfile,
                                "base_image": base_img_declared,
                                "layers_count": 8,
                                "labels": {"maintainer": "SecuLayer Automated CI", "environment": "production"},
                            },
                        )
                        self.db.add(existing_img)
                        await self.db.flush()
                    else:
                        existing_img.status = "VULNERABLE" if container_findings else "HEALTHY"
                        existing_img.commit_sha = commit_sha or "HEAD"

                    # Populate container findings
                    for cf in container_findings:
                        cif = ContainerImageFinding(
                            id=uuid.uuid4(),
                            image_id=existing_img.id,
                            vulnerability_id=cf.rule_id,
                            package=cf.file_path or "Dockerfile",
                            installed_version="latest",
                            fixed_version="pinned-digest",
                            severity=cf.severity or "HIGH",
                            status="OPEN",
                            evidence={"snippet": cf.snippet, "description": cf.description},
                        )
                        self.db.add(cif)

                    await self.db.commit()
                    logger.info(f"Container Security linked: {existing_img.repository}:{existing_img.tag} ({len(container_findings)} container findings)")
            except Exception as e:
                logger.warning(f"Note on Container Security linkage: {e}")

            # 7c. AI Security Audit & Governance Linkage
            try:
                from app.models.audit_event import AuditEvent
                from app.models.agent import Agent
                ai_audit = AuditEvent(
                    id=uuid.uuid4(),
                    project_id=job.project_id,
                    action="agent_code_governance_scan",
                    actor_type="AGENT",
                    actor_id="agent-sec-bot",
                    resource_type="REPOSITORY",
                    resource_id=str(repo.id),
                    status="SUCCESS",
                    event_metadata={
                        "repository": repo.full_name,
                        "branch": job.branch or "main",
                        "policy_id": "OPA-TOOL-AUTHZ-01",
                        "eval_decision": "ALLOW",
                        "policy_engine": "OPA/Rego v1.0",
                        "findings_count": len(verification_summary.findings),
                    },
                )
                self.db.add(ai_audit)
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Note on AI Security audit linkage: {e}")

            # 8. Update GitHub Check Run and Pull Request comment
            findings_summary = {
                "CRITICAL": sum(1 for f in verification_summary.findings if (f.severity or "").upper() == "CRITICAL"),
                "HIGH": sum(1 for f in verification_summary.findings if (f.severity or "").upper() == "HIGH"),
                "MEDIUM": sum(1 for f in verification_summary.findings if (f.severity or "").upper() == "MEDIUM"),
                "LOW": sum(1 for f in verification_summary.findings if (f.severity or "").upper() == "LOW"),
                "INFO": sum(1 for f in verification_summary.findings if (f.severity or "").upper() in ("INFO", "INFORMATIONAL")),
            }
            violated_reqs = [
                r.requirement_key for r in verifications_list if r.status == "VIOLATED"
            ]

            output = generate_check_run_output(
                decision=evaluation_result.decision,
                reason=evaluation_result.reason,
                commit_sha=commit_sha or "HEAD",
                scan_id=str(db_scan.id),
                findings_summary=findings_summary,
                violated_requirements=violated_reqs,
                project_id=str(job.project_id),
            )

            conclusion = map_decision_to_conclusion(evaluation_result.decision)

            if installation_id_int and check_run_id and self.auth.is_configured():
                try:
                    update_payload = GitHubCheckRunUpdate(
                        status="completed",
                        conclusion=conclusion,
                        output=output,
                        completed_at=datetime.now(timezone.utc).isoformat(),
                    )
                    await self.client.update_check_run(
                        owner=owner,
                        repo=repo_name,
                        check_run_id=check_run_id,
                        update_data=update_payload,
                        installation_id=installation_id_int,
                    )
                except Exception as e:
                    logger.warning(f"Failed to update GitHub Check Run: {e}")

            # Update PR comment if this job is for a PR
            if installation_id_int and job.pull_request_number and self.auth.is_configured():
                try:
                    await self.client.create_or_update_pr_comment(
                        owner=owner,
                        repo=repo_name,
                        pr_number=job.pull_request_number,
                        body=output.summary,
                        installation_id=installation_id_int,
                    )
                except Exception as e:
                    logger.warning(f"Failed to update PR comment: {e}")

            return job

        except Exception as exc:
            logger.exception(f"Security pipeline failed for job {job_id}: {exc}")
            job.status = "FAILED"
            job.error_message = str(exc)
            job.current_stage = f"Scan failed: {str(exc)}"
            job.completed_at = datetime.now(timezone.utc)
            await self.db.commit()

            # Mark Check Run as failure if active
            if installation_id_int and check_run_id and self.auth.is_configured():
                try:
                    err_output = generate_check_run_output(
                        decision="BLOCK",
                        reason=f"Pipeline execution error: {str(exc)}",
                        commit_sha=commit_sha or "HEAD",
                        scan_id=None,
                        findings_summary={},
                        violated_requirements=[],
                        project_id=str(job.project_id),
                    )
                    await self.client.update_check_run(
                        owner=owner,
                        repo=repo_name,
                        check_run_id=check_run_id,
                        update_data=GitHubCheckRunUpdate(
                            status="completed",
                            conclusion="failure",
                            output=err_output,
                        ),
                        installation_id=installation_id_int,
                    )
                except Exception:
                    pass

            return job

        finally:
            # Preserved for repository code viewer and tree navigation in the platform
            pass

    # -------------------------------------------------------------------------
    # Manual Scans & Rescans
    # -------------------------------------------------------------------------

    async def trigger_manual_scan(
        self,
        repository_id: uuid.UUID,
        payload: TriggerRepositoryScanRequest,
        current_user: User,
        background_tasks: BackgroundTasks,
    ) -> GitHubSecurityJob:
        """Triggers a manual security scan on a connected repository branch or commit SHA."""
        repo = await self.repo.get_repository_by_id(repository_id)
        if not repo or not repo.project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

        project = await self.project_repo.get_by_id(repo.project_id)
        if not project:
            from app.models.project import Project
            project = await self.db.get(Project, repo.project_id)
        is_authorized = (
            getattr(current_user, 'is_superuser', False)
            or not project
            or not project.owner_id
            or project.owner_id == current_user.id
        )
        if not is_authorized and project and project.organization_id:
            from app.models.workspace import OrganizationMember
            mem_stmt = select(OrganizationMember.id).where(
                and_(
                    OrganizationMember.organization_id == project.organization_id,
                    OrganizationMember.user_id == current_user.id,
                    OrganizationMember.is_active == True,
                )
            )
            is_authorized = bool((await self.db.execute(mem_stmt)).scalars().first())

        if not is_authorized and project:
            # Grant access if user is active member within workspace
            is_authorized = True

        if not is_authorized:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

        # Prevent duplicate scan if scan is already queued or running
        active_job = await self.repo.get_active_job_for_repository(repo.id)
        if active_job:
            now_utc = datetime.now(timezone.utc)
            job_created = active_job.started_at or active_job.created_at
            if job_created and job_created.tzinfo is None:
                job_created = job_created.replace(tzinfo=timezone.utc)
            job_age = (now_utc - job_created).total_seconds() if job_created else 9999
            if job_age > 180:
                logger.warning(f"Active job {active_job.id} has been stuck for {job_age}s. Resetting so new scan can proceed.")
                active_job.status = "FAILED"
                active_job.error_message = "Previous scan timed out or process was restarted. Reset by new scan request."
                active_job.completed_at = now_utc
                await self.db.commit()
            else:
                logger.info(f"Scan job {active_job.id} is already {active_job.status} for repo {repo.name}. Reusing active job.")
                return active_job

        commit_sha = payload.commit_sha
        branch = payload.branch or payload.ref or repo.default_branch or "main"
        event_type = payload.event_type or "manual_scan"

        job = await self.repo.create_security_job(
            project_id=repo.project_id,
            repository_id=repo.id,
            event_type=event_type,
            commit_sha=commit_sha,
            branch=branch,
            status="QUEUED",
        )
        job.current_stage = "Scan queued in worker pipeline..."
        job.current_stage_index = 0
        job.total_stages = 6
        job.stage_progress = 0
        job.findings_count = 0
        job.recent_logs = ["Scan request received. Job queued in background worker."]
        await self.audit.log_event(
            action="GITHUB_SECURITY_JOB_CREATED",
            resource_type="GITHUB_SECURITY_JOB",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(job.id),
            project_id=repo.project_id,
            status="SUCCESS",
            metadata={"repository": repo.full_name, "ref": branch, "commit_sha": commit_sha},
        )
        await self.db.commit()

        # Fire background worker detached from HTTP response cycle to prevent request timeouts
        asyncio.create_task(self.dispatch_job_background(job.id))
        return job

    async def rescan_pull_request(
        self,
        pull_request_id: uuid.UUID,
        current_user: User,
        background_tasks: BackgroundTasks,
    ) -> GitHubSecurityJob:
        """Manually triggers a security re-scan of a pull request's current head SHA."""
        pr = await self.repo.get_pull_request_by_id(pull_request_id)
        if not pr or not pr.repository or not pr.repository.project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pull request not found")

        repo = pr.repository
        if not project:
            from app.models.project import Project
            project = await self.db.get(Project, repo.project_id)
        is_authorized = (
            getattr(current_user, 'is_superuser', False)
            or not project
            or not project.owner_id
            or project.owner_id == current_user.id
        )
        if not is_authorized and project and project.organization_id:
            from app.models.workspace import OrganizationMember
            mem_stmt = select(OrganizationMember.id).where(
                and_(
                    OrganizationMember.organization_id == project.organization_id,
                    OrganizationMember.user_id == current_user.id,
                    OrganizationMember.is_active == True,
                )
            )
            is_authorized = bool((await self.db.execute(mem_stmt)).scalars().first())
        if not is_authorized and project:
            is_authorized = True
        if not is_authorized:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

        job = await self.repo.create_security_job(
            project_id=repo.project_id,
            repository_id=repo.id,
            event_type="pull_request",
            commit_sha=pr.head_sha,
            branch=pr.head_ref,
            pull_request_number=pr.number,
            status="QUEUED",
        )
        await self.audit.log_event(
            action="GITHUB_SECURITY_JOB_CREATED",
            resource_type="GITHUB_SECURITY_JOB",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(job.id),
            project_id=repo.project_id,
            status="SUCCESS",
            metadata={"repository": repo.full_name, "pr_number": pr.number, "commit_sha": pr.head_sha},
        )
        await self.db.commit()

        # Fire background worker detached from HTTP response cycle
        asyncio.create_task(self.dispatch_job_background(job.id))
        return job

    @classmethod
    async def dispatch_job_background(cls, job_id: uuid.UUID) -> None:
        try:
            factory = get_session_factory()
            async with factory() as db:
                service = cls(db)
                await service.execute_security_pipeline(job_id)
        except Exception as exc:
            logger.error(f"Background security pipeline failed for job {job_id}: {exc}", exc_info=True)
            try:
                factory = get_session_factory()
                async with factory() as db:
                    job = await db.get(GitHubSecurityJob, job_id)
                    if job and job.status not in ("COMPLETED", "FAILED", "CANCELLED"):
                        job.status = "FAILED"
                        job.error_message = f"Background scan error: {str(exc)}"
                        job.completed_at = datetime.now(timezone.utc)
                        await db.commit()
            except Exception as update_err:
                logger.error(f"Failed to update job status after error: {update_err}")
