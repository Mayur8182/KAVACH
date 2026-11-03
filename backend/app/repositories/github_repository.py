import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.github import (
    GitHubCommit,
    GitHubInstallation,
    GitHubPullRequest,
    GitHubRepository,
    GitHubSecurityJob,
    GitHubWebhookEvent,
)


class GitHubRepositoryDB:
    """Handles PostgreSQL persistence for all GitHub integration entities."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # -------------------------------------------------------------------------
    # Installations
    # -------------------------------------------------------------------------

    async def get_installation_by_id(self, installation_id: uuid.UUID) -> Optional[GitHubInstallation]:
        stmt = (
            select(GitHubInstallation)
            .where(GitHubInstallation.id == installation_id)
            .options(selectinload(GitHubInstallation.repositories))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_installation_by_github_id(self, github_installation_id: int) -> Optional[GitHubInstallation]:
        stmt = (
            select(GitHubInstallation)
            .where(GitHubInstallation.github_installation_id == github_installation_id)
            .options(selectinload(GitHubInstallation.repositories))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_installations_for_project(self, project_id: uuid.UUID) -> List[GitHubInstallation]:
        stmt = (
            select(GitHubInstallation)
            .where(GitHubInstallation.project_id == project_id)
            .order_by(desc(GitHubInstallation.created_at))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_or_update_installation(
        self,
        github_installation_id: int,
        github_account_id: int,
        github_account_login: str,
        account_type: str = "User",
        status: str = "ACTIVE",
        permissions: Optional[Dict[str, Any]] = None,
        repository_selection: str = "all",
        project_id: Optional[uuid.UUID] = None,
    ) -> GitHubInstallation:
        existing = await self.get_installation_by_github_id(github_installation_id)
        now = datetime.now(timezone.utc)
        if existing:
            existing.github_account_login = github_account_login
            existing.status = status
            existing.permissions = permissions
            existing.repository_selection = repository_selection
            existing.last_verified_at = now
            if project_id and not existing.project_id:
                existing.project_id = project_id
            existing.updated_at = now
            await self.session.flush()
            return existing

        inst = GitHubInstallation(
            project_id=project_id,
            github_installation_id=github_installation_id,
            github_account_id=github_account_id,
            github_account_login=github_account_login,
            account_type=account_type,
            status=status,
            permissions=permissions,
            repository_selection=repository_selection,
            installed_at=now,
            last_verified_at=now,
        )
        self.session.add(inst)
        await self.session.flush()
        return inst

    # -------------------------------------------------------------------------
    # Repositories
    # -------------------------------------------------------------------------

    async def get_repository_by_id(self, repo_id: uuid.UUID) -> Optional[GitHubRepository]:
        stmt = (
            select(GitHubRepository)
            .where(GitHubRepository.id == repo_id)
            .options(
                selectinload(GitHubRepository.installation),
                selectinload(GitHubRepository.project),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_repository_by_github_id(self, github_repo_id: int) -> Optional[GitHubRepository]:
        stmt = (
            select(GitHubRepository)
            .where(GitHubRepository.github_repository_id == github_repo_id)
            .options(selectinload(GitHubRepository.installation))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_repository_by_full_name(self, full_name: str) -> Optional[GitHubRepository]:
        stmt = (
            select(GitHubRepository)
            .where(GitHubRepository.full_name == full_name)
            .options(selectinload(GitHubRepository.installation))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_repositories_for_project(self, project_id: uuid.UUID) -> List[GitHubRepository]:
        stmt = (
            select(GitHubRepository)
            .where(GitHubRepository.project_id == project_id)
            .order_by(desc(GitHubRepository.created_at))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_or_update_repository(
        self,
        github_repository_id: int,
        owner: str,
        name: str,
        full_name: str,
        default_branch: str,
        private: bool,
        html_url: str,
        clone_url: str,
        ssh_url: Optional[str] = None,
        visibility: str = "private",
        archived: bool = False,
        permissions: Optional[Dict[str, Any]] = None,
        project_id: Optional[uuid.UUID] = None,
        installation_id: Optional[uuid.UUID] = None,
    ) -> GitHubRepository:
        existing = await self.get_repository_by_github_id(github_repository_id)
        now = datetime.now(timezone.utc)
        if existing:
            existing.owner = owner
            existing.name = name
            existing.full_name = full_name
            existing.default_branch = default_branch
            existing.private = private
            existing.html_url = html_url
            existing.clone_url = clone_url
            existing.ssh_url = ssh_url
            existing.visibility = visibility
            existing.archived = archived
            existing.permissions = permissions
            if project_id:
                existing.project_id = project_id
            if installation_id:
                existing.installation_id = installation_id
            existing.last_synced_at = now
            existing.updated_at = now
            await self.session.flush()
            return existing

        repo = GitHubRepository(
            project_id=project_id,
            installation_id=installation_id,
            github_repository_id=github_repository_id,
            owner=owner,
            name=name,
            full_name=full_name,
            default_branch=default_branch,
            private=private,
            html_url=html_url,
            clone_url=clone_url,
            ssh_url=ssh_url,
            visibility=visibility,
            archived=archived,
            permissions=permissions,
            last_synced_at=now,
        )
        self.session.add(repo)
        await self.session.flush()
        return repo

    # -------------------------------------------------------------------------
    # Webhook Events
    # -------------------------------------------------------------------------

    async def get_webhook_event_by_delivery_id(self, delivery_id: str) -> Optional[GitHubWebhookEvent]:
        stmt = select(GitHubWebhookEvent).where(GitHubWebhookEvent.github_delivery_id == delivery_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_webhook_event(
        self,
        github_delivery_id: str,
        event_type: str,
        action: Optional[str] = None,
        installation_id: Optional[int] = None,
        repository_id: Optional[int] = None,
        signature_verified: bool = False,
        payload_reference: Optional[Dict[str, Any]] = None,
        processing_status: str = "RECEIVED",
    ) -> GitHubWebhookEvent:
        event = GitHubWebhookEvent(
            github_delivery_id=github_delivery_id,
            event_type=event_type,
            action=action,
            installation_id=installation_id,
            repository_id=repository_id,
            received_at=datetime.now(timezone.utc),
            signature_verified=signature_verified,
            processing_status=processing_status,
            payload_reference=payload_reference,
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def update_webhook_event_status(
        self,
        event_id: uuid.UUID,
        status: str,
        error_message: Optional[str] = None,
    ) -> Optional[GitHubWebhookEvent]:
        stmt = select(GitHubWebhookEvent).where(GitHubWebhookEvent.id == event_id)
        result = await self.session.execute(stmt)
        event = result.scalar_one_or_none()
        if event:
            event.processing_status = status
            event.error_message = error_message
            event.processed_at = datetime.now(timezone.utc)
            event.updated_at = datetime.now(timezone.utc)
            await self.session.flush()
        return event

    # -------------------------------------------------------------------------
    # Security Jobs
    # -------------------------------------------------------------------------

    async def create_security_job(
        self,
        event_type: str,
        project_id: Optional[uuid.UUID] = None,
        repository_id: Optional[uuid.UUID] = None,
        webhook_event_id: Optional[uuid.UUID] = None,
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
        pull_request_number: Optional[int] = None,
        status: str = "QUEUED",
    ) -> GitHubSecurityJob:
        job = GitHubSecurityJob(
            project_id=project_id,
            repository_id=repository_id,
            webhook_event_id=webhook_event_id,
            event_type=event_type,
            commit_sha=commit_sha,
            branch=branch,
            pull_request_number=pull_request_number,
            status=status,
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_job_by_id(self, job_id: uuid.UUID) -> Optional[GitHubSecurityJob]:
        stmt = (
            select(GitHubSecurityJob)
            .where(GitHubSecurityJob.id == job_id)
            .options(
                selectinload(GitHubSecurityJob.repository),
                selectinload(GitHubSecurityJob.project),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_jobs_for_project(self, project_id: uuid.UUID, limit: int = 50) -> List[GitHubSecurityJob]:
        stmt = (
            select(GitHubSecurityJob)
            .where(GitHubSecurityJob.project_id == project_id)
            .order_by(desc(GitHubSecurityJob.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_jobs_for_repository(self, repository_id: uuid.UUID, limit: int = 50) -> List[GitHubSecurityJob]:
        stmt = (
            select(GitHubSecurityJob)
            .where(GitHubSecurityJob.repository_id == repository_id)
            .order_by(desc(GitHubSecurityJob.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_job_for_repository(self, repository_id: uuid.UUID) -> Optional[GitHubSecurityJob]:
        stmt = (
            select(GitHubSecurityJob)
            .where(
                and_(
                    GitHubSecurityJob.repository_id == repository_id,
                    GitHubSecurityJob.status.in_(["QUEUED", "RUNNING"]),
                )
            )
            .order_by(desc(GitHubSecurityJob.created_at))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        job = result.scalars().first()
        if job and job.created_at:
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            job_time = job.created_at if job.created_at.tzinfo else job.created_at.replace(tzinfo=timezone.utc)
            if now - job_time > timedelta(minutes=15):
                # Stale job from previous server restart — auto-reap as timed out
                job.status = "FAILED"
                await self.session.commit()
                return None
        return job

    async def get_latest_job_for_repository(self, repository_id: uuid.UUID) -> Optional[GitHubSecurityJob]:
        stmt = (
            select(GitHubSecurityJob)
            .where(GitHubSecurityJob.repository_id == repository_id)
            .order_by(desc(GitHubSecurityJob.created_at))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    # -------------------------------------------------------------------------
    # Pull Requests & Commits
    # -------------------------------------------------------------------------

    async def get_pull_request_by_id(self, pr_id: uuid.UUID) -> Optional[GitHubPullRequest]:
        stmt = (
            select(GitHubPullRequest)
            .where(GitHubPullRequest.id == pr_id)
            .options(selectinload(GitHubPullRequest.repository))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pull_request(self, repository_id: uuid.UUID, number: int) -> Optional[GitHubPullRequest]:
        stmt = (
            select(GitHubPullRequest)
            .where(GitHubPullRequest.repository_id == repository_id, GitHubPullRequest.number == number)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_pull_requests_for_repo(self, repository_id: uuid.UUID) -> List[GitHubPullRequest]:
        stmt = (
            select(GitHubPullRequest)
            .where(GitHubPullRequest.repository_id == repository_id)
            .order_by(desc(GitHubPullRequest.updated_at), desc(GitHubPullRequest.id))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_or_update_pull_request(
        self,
        repository_id: uuid.UUID,
        github_pr_id: int,
        number: int,
        title: str,
        state: str,
        head_sha: str,
        base_sha: str,
        head_ref: str,
        base_ref: str,
        html_url: str,
        author_login: Optional[str] = None,
        draft: bool = False,
        merged: bool = False,
    ) -> GitHubPullRequest:
        existing = await self.get_pull_request(repository_id, number)
        now = datetime.now(timezone.utc)
        if existing:
            existing.github_pr_id = github_pr_id
            existing.title = title
            existing.state = state
            existing.head_sha = head_sha
            existing.base_sha = base_sha
            existing.head_ref = head_ref
            existing.base_ref = base_ref
            existing.author_login = author_login
            existing.draft = draft
            existing.merged = merged
            existing.html_url = html_url
            existing.updated_at = now
            await self.session.flush()
            return existing

        pr = GitHubPullRequest(
            repository_id=repository_id,
            github_pr_id=github_pr_id,
            number=number,
            title=title,
            state=state,
            head_sha=head_sha,
            base_sha=base_sha,
            head_ref=head_ref,
            base_ref=base_ref,
            author_login=author_login,
            draft=draft,
            merged=merged,
            html_url=html_url,
        )
        self.session.add(pr)
        await self.session.flush()
        return pr

    async def get_commit(self, repository_id: uuid.UUID, sha: str) -> Optional[GitHubCommit]:
        stmt = select(GitHubCommit).where(
            GitHubCommit.repository_id == repository_id, GitHubCommit.sha == sha
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_commits_for_repo(self, repository_id: uuid.UUID, limit: int = 50) -> List[GitHubCommit]:
        stmt = (
            select(GitHubCommit)
            .where(GitHubCommit.repository_id == repository_id)
            .order_by(desc(GitHubCommit.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_or_update_commit(
        self,
        repository_id: uuid.UUID,
        sha: str,
        branch: Optional[str] = None,
        author_login: Optional[str] = None,
        message: Optional[str] = None,
        committed_at: Optional[datetime] = None,
    ) -> GitHubCommit:
        existing = await self.get_commit(repository_id, sha)
        if existing:
            if branch:
                existing.branch = branch
            if author_login:
                existing.author_login = author_login
            if message:
                existing.message = message
            if committed_at:
                existing.committed_at = committed_at
            await self.session.flush()
            return existing

        cmt = GitHubCommit(
            repository_id=repository_id,
            sha=sha,
            branch=branch,
            author_login=author_login,
            message=message,
            committed_at=committed_at,
        )
        self.session.add(cmt)
        await self.session.flush()
        return cmt
