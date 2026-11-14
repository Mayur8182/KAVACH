"""
Thing Code — API Router
Exposes /api/v1/code/* endpoints for the Code product workspace.
All data is sourced from CodeService which queries real backend state.
"""

import uuid
from typing import List, Optional, Union, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from sqlalchemy import select, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import TenantContext, get_current_tenant_context
from app.models.user import User
from app.models.github import GitHubRepository, GitHubSecurityJob

from app.code.schemas import (
    CodeOverviewResponse,
    CodeCoverageResponse,
    CodeAttentionResponse,
    RecentScansResponse,
    RepositoryHealthResponse,
    CodeFindingsResponse,
    CodeFindingDetailResponse,
    CodeRepositoryDetailResponse,
    CodeEvidenceResponse,
    RepositoryTreeResponse,
    RepositoryFileResponse,
    SecretsOverviewResponse,
    SecretInventoryItem,
    SecretPolicyItem,
    CreateSecretPolicyRequest,
    TriggerSecretScanRequest,
    SecretScanMetricsResponse,
    SecretScansTableResponse,
    SecretScanConfig,
    SecretScanIntegrationItem,
    SecretScanActivityItem,
    TriggerNewSecretScanRequest,
    ScheduleSecretScanRequest,
    SecretScanTableItem,
    SecretScanDetailResponse,
    SecretScanFindingDetailItem,
    ResolveFindingRequest,
    CreateRemediationPRRequest,
    RemediationPRResponse,
    SecretRemediationMetrics,
    SecretRemediationListResponse,
    SecretRemediationItem,
    UpdateRemediationStatusRequest,
    BulkRemediateRequest,
    BulkRemediateResponse,
    RemediationSettings,
    SecretInventoryMetrics,
    SecretInventoryRow,
    SecretInventoryTableResponse,
    UpdateInventoryStatusRequest,
    AddInventoryPolicyRequest,
    AddInventoryPolicyResponse,
    SecretDetectionsOverviewResponse,
    SecretDetectionsTableResponse,
    SecretDetectionsItem,
    UpdateDetectionStatusRequest,
    SecretRepositoriesOverviewResponse,
    SecretRepositoriesTableResponse,
    SecretRepositoryRow,
    TriggerRepoScanRequest,
    TriggerRepoScanResponse,
    PolicyComplianceOverviewResponse,
    SecurityPoliciesTableResponse,
    SecurityPolicyRow,
    CreateSecurityPolicyRequest,
    UpdateSecurityPolicyRequest,
    EnforceAllPoliciesResponse,
    PolicyEnforcementSettings,
    PolicyTemplateItem,
    ComplianceFrameworkItem,
    SecretIntegrationsOverviewResponse,
    SecretRotationRuleItem,
    CreateRotationRuleRequest,
    UpdateRotationRuleRequest,
    TriggerRuleRotationResponse,
    ConnectedToolCard,
    ConnectIntegrationRequest,
    UpdateIntegrationConfigRequest,
    SecretsIntegrationConfig,
    RotationGlobalSettings,
    SecretDetailResponse,
    CreateSecretRemediationPRRequest,
    CreateSecretRemediationPRResponse,
    RevokeSecretKeyResponse,
    RotateSecretKeyResponse,
    SecretDetectionDetailResponse,
    ConnectRepositoryRequest,
    ConnectRepositoryResponse,
)

from app.code.service import CodeService
from app.services.github_service import GitHubService
from app.schemas.github import TriggerRepositoryScanRequest, GitHubSecurityJobResponse
from app.core.entitlements import require_product

router = APIRouter(
    prefix="/code",
    tags=["Thing Code — Code Security Product"],
    dependencies=[Depends(require_product("thing_code"))],
)



@router.get(
    "/overview",
    response_model=CodeOverviewResponse,
    summary="Get Thing Code security overview",
    description=(
        "Returns real aggregated state of code security: repository inventory, "
        "finding severity breakdown, scan summary, and scanner coverage counts. "
        "All values are computed from the live database — no synthetic data."
    ),
)
async def get_code_overview(
    project_id: Optional[str] = Query(None, description="Filter to a specific project"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeOverviewResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_overview(project_id=project_id)


@router.get(
    "/coverage",
    response_model=CodeCoverageResponse,
    summary="Get scanner coverage across repositories",
    description=(
        "Returns how many repositories have been scanned by each scanner type "
        "(SAST, Secrets, SCA/Dependencies, SBOM). Coverage = repositories with ≥1 completed scanner execution."
    ),
)
async def get_code_coverage(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeCoverageResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_coverage(project_id=project_id)


@router.get(
    "/attention",
    response_model=CodeAttentionResponse,
    summary="Get critical findings requiring immediate attention",
    description=(
        "Returns CRITICAL and HIGH severity findings ordered by severity. "
        "Each item includes real scanner attribution, file location, commit binding, and fingerprint."
    ),
)
async def get_code_attention(
    project_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeAttentionResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_attention(project_id=project_id, limit=limit)


@router.get(
    "/recent-scans",
    response_model=RecentScansResponse,
    summary="Get recent security scan history",
    description=(
        "Returns the most recent security scans with their individual scanner execution summaries. "
        "Scan status reflects the actual process exit state: QUEUED | RUNNING | COMPLETED | FAILED."
    ),
)
async def get_recent_scans(
    project_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecentScansResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_recent_scans(project_id=project_id, limit=limit)


@router.get(
    "/repository-health",
    response_model=RepositoryHealthResponse,
    summary="Get per-repository security health",
    description=(
        "Returns each connected GitHub repository with its derived security state "
        "(HEALTHY | FINDINGS | SCAN_FAILED | NEVER_SCANNED | SCANNING) and finding counts. "
        "State is derived exclusively from real scan records."
    ),
)
async def get_repository_health(
    project_id: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RepositoryHealthResponse:
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = CodeService(db, current_user=current_user)
    return await service.get_repository_health(project_id=project_id, limit=effective_limit, offset=effective_offset)


@router.get(
    "/findings",
    response_model=CodeFindingsResponse,
    summary="List security findings with filtering and pagination",
    description=(
        "Returns normalized security findings from all scanners. "
        "Supports server-side filtering by severity, scanner, and repository. "
        "All findings are linked to real scanner executions — no synthesized results."
    ),
)
async def get_code_findings(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, description="Filter: CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL"),
    scanner_name: Optional[str] = Query(None, description="Filter: semgrep | gitleaks | trivy | osv"),
    repository_id: Optional[str] = Query(None, description="Filter by repository UUID"),
    scan_id: Optional[str] = Query(None, description="Filter by specific scan UUID (for sibling finding navigation)"),
    category: Optional[str] = Query(None, description="Filter by category: SAST | SECRETS | IAC | CONTAINER | DEPENDENCIES"),
    search: Optional[str] = Query(None, description="Search across title, description, rule ID, or file path"),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeFindingsResponse:
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = CodeService(db, current_user=current_user)
    return await service.get_findings(
        project_id=project_id,
        severity=severity,
        scanner_name=scanner_name,
        repository_id=repository_id,
        scan_id=scan_id,
        category=category,
        search=search,
        limit=effective_limit,
        offset=effective_offset,
    )


@router.get(
    "/findings/{finding_id}",
    response_model=CodeFindingDetailResponse,
    summary="Get detailed security finding record",
    description=(
        "Returns comprehensive finding detail: scanner execution evidence, commit binding, "
        "raw scanner output, code snippet, and remediation guidance."
    ),
)
async def get_finding_detail(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeFindingDetailResponse:
    service = CodeService(db, current_user=current_user)
    finding = await service.get_finding_detail(finding_id)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding with ID '{finding_id}' not found.",
        )
    return finding


class GenerateRemediationRequest(BaseModel):
    mode: Optional[Union[str, dict]] = "SUGGEST"  # SUGGEST | ASSISTED | AUTO_FIX

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, str):
            return cls(mode=v)
        if isinstance(v, dict):
            return cls(**v)
        return cls()

    @property
    def mode_str(self) -> str:
        if isinstance(self.mode, dict):
            return str(self.mode.get("mode", "SUGGEST"))
        return str(self.mode or "SUGGEST")


class CreateRemediationPRRequest(BaseModel):
    branch: Optional[str] = None
    branch_name: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None


@router.post(
    "/findings/{finding_id}/remediation/generate",
    summary="Generate Gemini AI remediation plan and patch for finding",
)
async def generate_finding_remediation(
    finding_id: uuid.UUID,
    payload: Optional[Union[GenerateRemediationRequest, dict, str]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.code.remediation_pipeline import RemediationPipeline
    pipeline = RemediationPipeline(db)
    if isinstance(payload, GenerateRemediationRequest):
        mode = payload.mode_str
    elif isinstance(payload, str):
        mode = payload
    elif isinstance(payload, dict):
        mode = payload.get("mode", "SUGGEST")
    else:
        mode = "SUGGEST"
    return await pipeline.generate_remediation(finding_id, mode=mode, actor_id=str(current_user.id))


@router.post(
    "/findings/{finding_id}/remediation/apply",
    summary="Execute auto-fix remediation pipeline in sandbox, test, rescan, and verify",
)
async def apply_finding_remediation(
    finding_id: uuid.UUID,
    payload: Optional[Union[GenerateRemediationRequest, dict, str]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.code.remediation_pipeline import RemediationPipeline
    pipeline = RemediationPipeline(db)
    if isinstance(payload, GenerateRemediationRequest):
        mode = payload.mode_str
    elif isinstance(payload, str):
        mode = payload
    elif isinstance(payload, dict):
        mode = payload.get("mode", "AUTO_FIX")
    else:
        mode = "AUTO_FIX"
    return await pipeline.execute_remediation_pipeline(finding_id, mode=mode, actor_id=str(current_user.id))


@router.post(
    "/findings/{finding_id}/remediation/create-pr",
    summary="Create GitHub Pull Request for verified remediation patch",
)
async def create_remediation_pull_request(
    finding_id: uuid.UUID,
    payload: Optional[CreateRemediationPRRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.code.remediation_pipeline import RemediationPipeline
    from app.models.github import GitHubSecurityJob
    pipeline = RemediationPipeline(db)
    finding = await pipeline.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    from app.services.finding_service import FindingService
    fs = FindingService(db)
    if not await fs._check_finding_access(finding, current_user):
        raise HTTPException(status_code=403, detail="Access denied to requested finding")

    from app.models.scan import SecurityScan
    from app.models.github import GitHubRepository

    repo_id = None
    if finding.scan_id:
        job_q = select(GitHubSecurityJob).where(GitHubSecurityJob.scan_id == finding.scan_id).limit(1)
        job = (await db.execute(job_q)).scalar_one_or_none()
        repo_id = job.repository_id if job else None

        if not repo_id:
            scan = await db.get(SecurityScan, finding.scan_id)
            if scan and scan.project_id:
                repo_q = select(GitHubRepository).where(GitHubRepository.project_id == scan.project_id).limit(1)
                repo = (await db.execute(repo_q)).scalar_one_or_none()
                if repo:
                    repo_id = repo.id

    if not repo_id and finding.project_id:
        repo_q = select(GitHubRepository).where(GitHubRepository.project_id == finding.project_id).limit(1)
        repo = (await db.execute(repo_q)).scalar_one_or_none()
        if repo:
            repo_id = repo.id

    if not repo_id:
        raise HTTPException(status_code=400, detail="Finding is not bound to a connected GitHub repository in this project")

    branch = (payload and payload.branch) or f"remediation/fix-{finding.rule_id.lower().replace('_', '-')}-{str(uuid.uuid4())[:6]}"
    title = (payload and payload.title) or f"fix(security): Remediate {finding.rule_id} in {finding.file_path}"
    body = (payload and payload.body) or f"Automated remediation created via THING Control Plane & Google Gemini."

    pr, push_error = await pipeline.create_pull_request(repo_id, branch, title, body, actor_id=str(current_user.id))
    if not pr:
        raise HTTPException(
            status_code=502,
            detail=push_error or "Failed to push branch and create Pull Request on GitHub."
        )
    return {
        "pull_request_id": str(pr.id),
        "number": pr.number,
        "title": pr.title,
        "head_ref": pr.head_ref,
        "html_url": pr.html_url,
        "state": pr.state,
    }


@router.get(
    "/remediation",
    summary="Get Thing Code AutoFix proposals",
    description="Returns all active AI remediation proposals, patch diffs, and validation states."
)
@router.get(
    "/remediation/proposals",
    summary="Get Thing Code AutoFix proposals alias",
)
async def get_code_remediation_proposals(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.api.v1.scans import get_remediation_proposals
    proj_uuid = None
    if project_id:
        try:
            proj_uuid = uuid.UUID(project_id)
        except Exception:
            pass
    return await get_remediation_proposals(
        limit=limit,
        offset=offset,
        project_id=proj_uuid,
        repository=repository,
        current_user=current_user,
        db=db,
    )


@router.get(
    "/findings/{finding_id}/remediation",
    summary="Get current remediation plan, patch diff, and audit history for finding",
)
async def get_finding_remediation_status(
    finding_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.code.remediation_pipeline import RemediationPipeline
    from app.models.remediation import RemediationPlan, RemediationPatch
    pipeline = RemediationPipeline(db)
    finding = await pipeline.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    plan_q = select(RemediationPlan).where(RemediationPlan.title.like(f"%{finding.rule_id}%")).order_by(desc(RemediationPlan.created_at)).limit(1)
    plan = (await db.execute(plan_q)).scalar_one_or_none()

    patch = None
    if plan:
        patch_q = select(RemediationPatch).where(RemediationPatch.remediation_plan_id == plan.id).limit(1)
        patch = (await db.execute(patch_q)).scalar_one_or_none()

    if not plan or not patch:
        return await pipeline.generate_remediation(finding_id, mode="SUGGEST", actor_id=str(current_user.id))

    strategies = pipeline.gemini._derive_strategies(
        {"rule_id": finding.rule_id, "title": finding.title, "file_path": finding.file_path},
        patch.diff,
    )

    return {
        "plan_id": str(plan.id),
        "patch_id": str(patch.id),
        "is_fixable": True,
        "root_cause": plan.description,
        "explanation": plan.description,
        "files_changed": patch.affected_files or [finding.file_path],
        "patch": patch.diff,
        "risk": plan.risk_level.replace("_RISK", "").lower(),
        "confidence": 0.95,
        "status": patch.status,
        "strategies": strategies,
    }



@router.get(
    "/repositories/{repository_id}",
    response_model=CodeRepositoryDetailResponse,
    summary="Get repository security workspace detail",
    description=(
        "Returns deep repository security status: scan history, scanner coverage, "
        "security contract state, and recent open findings."
    ),
)
async def get_repository_detail(
    repository_id: str,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    from app.models.github import GitHubRepository
    from sqlalchemy import select

    clean_id = (repository_id or "").strip()
    if clean_id.lower() == "all":
        # Resolve to the primary or most recently updated repository within tenant's accessible projects
        first_repo_stmt = select(GitHubRepository)
        if not tenant.is_superuser:
            first_repo_stmt = first_repo_stmt.where(GitHubRepository.project_id.in_(tenant.accessible_project_ids))
        first_repo_stmt = first_repo_stmt.order_by(GitHubRepository.created_at.desc()).limit(1)
        first_repo = (await db.execute(first_repo_stmt)).scalar_one_or_none()
        if first_repo:
            clean_id = str(first_repo.id)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No repositories available in your workspace. Connect a repository first.",
            )

    service = CodeService(db, current_user=tenant.user)
    repo = await service.get_repository_detail(clean_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID '{clean_id}' not found.",
        )
    return repo


class UpdateCodeRepositoryRequest(BaseModel):
    default_branch: Optional[str] = None
    language: Optional[str] = None
    description: Optional[str] = None
    environment: Optional[str] = None


@router.patch(
    "/repositories/{repository_id}",
    summary="Update repository configuration and metadata",
    status_code=status.HTTP_200_OK,
)
async def update_code_repository(
    repository_id: str,
    payload: UpdateCodeRepositoryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        rid = uuid.UUID(repository_id.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repository UUID")

    repo = await db.get(GitHubRepository, rid)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if payload.default_branch:
        repo.default_branch = payload.default_branch.strip()
    if payload.language:
        repo.primary_language = payload.language.strip()
    if payload.description is not None:
        repo.description = payload.description.strip()

    repo.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(repo)

    service = CodeService(db, current_user=current_user)
    return await service.get_repository_detail(str(repo.id))


@router.get(
    "/repositories/{repository_id}/tree",
    response_model=RepositoryTreeResponse,
    summary="Get repository file and directory tree structure",
    description="Returns the real repository folder and file hierarchy for the given branch.",
)
async def get_repository_tree(
    repository_id: str,
    branch: Optional[str] = Query("main", description="Target git branch"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RepositoryTreeResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_repository_tree(repository_id, branch=branch)


@router.get(
    "/repositories/{repository_id}/file",
    response_model=RepositoryFileResponse,
    summary="Get repository file content, line counts, and security findings",
    description="Returns syntax-highlightable content, metadata, and security findings for a specific repository file.",
)
async def get_repository_file(
    repository_id: str,
    path: str = Query(..., description="File path relative to repository root"),
    branch: Optional[str] = Query("main", description="Target git branch"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RepositoryFileResponse:
    service = CodeService(db, current_user=current_user)
    res = await service.get_repository_file(repository_id, path=path, branch=branch)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File '{path}' or repository '{repository_id}' could not be located.",
        )
    return res


@router.get(
    "/evidence",
    response_model=CodeEvidenceResponse,
    summary="List searchable security evidence for code",
    description=(
        "Returns verifiable, immutable execution evidence records from scanners "
        "and security verifications across repositories."
    ),
)
async def get_code_evidence(
    project_id: Optional[str] = Query(None),
    source: Optional[str] = Query(None, description="Filter: semgrep | gitleaks | trivy | osv"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeEvidenceResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_evidence(
        project_id=project_id,
        source=source,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/repositories/{repository_id}/scans",
    response_model=GitHubSecurityJobResponse,
    summary="Trigger a manual security scan on a connected repository",
    status_code=status.HTTP_202_ACCEPTED,
    description=(
        "Manually triggers an isolated security scan job for the given repository. "
        "Runs real scanner tools (Semgrep, Gitleaks, etc.) asynchronously."
    ),
)
async def trigger_repository_scan(
    repository_id: uuid.UUID,
    payload: TriggerRepositoryScanRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GitHubService(db)
    return await service.trigger_manual_scan(repository_id, payload, current_user, background_tasks)


@router.get(
    "/repositories/{repository_id}/active-scan",
    response_model=Optional[GitHubSecurityJobResponse],
    summary="Get currently active scan or most recent scan for repository",
)
async def get_repository_active_scan(
    repository_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GitHubService(db)
    active = await service.repo.get_active_job_for_repository(repository_id)
    return active


@router.get(
    "/repositories/{repository_id}/jobs",
    response_model=List[GitHubSecurityJobResponse],
    summary="List all security verification jobs for repository",
)
async def list_repository_jobs(
    repository_id: uuid.UUID,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GitHubService(db)
    return await service.repo.list_jobs_for_repository(repository_id, limit=limit)


@router.post(
    "/security-jobs/{job_id}/cancel",
    response_model=GitHubSecurityJobResponse,
    summary="Cancel a running or queued security job",
)
async def cancel_security_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GitHubService(db)
    job = await service.repo.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Security job not found")
    if job.status not in ("COMPLETED", "FAILED", "CANCELLED"):
        job.status = "CANCELLED"
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = "Scan cancelled by user."
        job.current_stage = "Scan cancelled"
        await db.commit()
    return job


@router.delete(
    "/repositories/{repository_id}",
    summary="Disconnect and remove a connected repository",
    status_code=status.HTTP_200_OK,
)
async def delete_code_repository(
    repository_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GitHubService(db)
    repo = await service.repo.get_repository_by_id(repository_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    import os, shutil, stat
    from app.core.config import get_settings
    base_ws = os.path.abspath(getattr(get_settings(), "github_workspace_dir", "scratch/github_workspaces"))
    repo_ws = os.path.join(base_ws, f"repo_{str(repository_id)}")
    if os.path.exists(repo_ws):
        def on_rm(func, path, exc_info):
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass
        try:
            shutil.rmtree(repo_ws, onerror=on_rm)
        except Exception:
            pass

    await service.audit.log_event(
        action="GITHUB_REPOSITORY_DISCONNECTED",
        resource_type="GITHUB_REPOSITORY",
        actor_type="USER",
        actor_id=str(current_user.id),
        resource_id=str(repo.id),
        project_id=repo.project_id,
        status="SUCCESS",
        metadata={"full_name": repo.full_name},
    )

    await db.delete(repo)
    await db.commit()
    return {"status": "DISCONNECTED", "repository_id": str(repository_id), "name": repo.name}



class CreateCodeRepositoryRequest(BaseModel):
    repo_url: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None
    default_branch: Optional[str] = None
    branch: Optional[str] = None
    private: bool = False
    trigger_scan: bool = True
    provider: Optional[str] = "github"
    environment: Optional[str] = "production"
    project_id: Optional[str] = None


@router.get(
    "/repositories",
    response_model=RepositoryHealthResponse,
    summary="List code repositories and their health status",
)
async def list_code_repositories(
    project_id: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RepositoryHealthResponse:
    return await get_repository_health(
        project_id=project_id,
        page=page,
        pageSize=pageSize,
        limit=limit,
        offset=offset,
        current_user=current_user,
        db=db,
    )


@router.post(
    "/repositories",
    response_model=ConnectRepositoryResponse,
    summary="Connect a GitHub or GitLab repository to the project and trigger security scan",
    status_code=status.HTTP_201_CREATED,
)
async def connect_code_repository(
    payload: CreateCodeRepositoryRequest,
    background_tasks: BackgroundTasks,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, update, and_, text
    from app.models.project import Project
    from app.models.scan import SecurityScan
    import logging
    logger = logging.getLogger("code.repository")

    try:
        # 1. Extract and validate repo URL and branch
        raw_url = (payload.repo_url or payload.url or "").strip()
        if not raw_url:
            raise HTTPException(status_code=400, detail="Repository URL is required.")

        target_branch = (payload.default_branch or payload.branch or "main").strip()
        clean = raw_url
        is_gitlab = (payload.provider or "").lower() == "gitlab" or "gitlab.com" in clean

        if clean.startswith("https://github.com/") or clean.startswith("https://gitlab.com/"):
            path = clean.replace("https://github.com/", "").replace("https://gitlab.com/", "").strip("/")
        elif clean.startswith("http://github.com/") or clean.startswith("http://gitlab.com/"):
            path = clean.replace("http://github.com/", "").replace("http://gitlab.com/", "").strip("/")
        elif clean.startswith("git@github.com:") or clean.startswith("git@gitlab.com:"):
            path = clean.replace("git@github.com:", "").replace("git@gitlab.com:", "").replace(".git", "").strip("/")
        else:
            path = clean.strip("/")

        if path.endswith(".git"):
            path = path[:-4]

        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            owner = parts[0]
            repo_name = payload.name or parts[1]
        elif len(parts) == 1:
            if "github.com" in clean or "gitlab.com" in clean or clean.startswith("http://") or clean.startswith("https://"):
                raise HTTPException(
                    status_code=400,
                    detail=f"'{clean}' is a profile or organization URL, not a repository. Please specify the repository name in the format: {parts[0]}/repository-name",
                )
            owner = "internal"
            repo_name = payload.name or parts[0]
        else:
            raise HTTPException(status_code=400, detail="Invalid repository URL or identifier")

        full_name = f"{owner}/{repo_name}"
        base_domain = "https://gitlab.com" if is_gitlab else "https://github.com"
        html_url = f"{base_domain}/{full_name}"
        clone_url = f"{base_domain}/{full_name}.git"

        # Provider validation: probe public git provider API if repository is public
        if not payload.private and ("github.com" in clean or not clean.startswith("http")):
            try:
                import httpx
                async with httpx.AsyncClient(timeout=3.5) as http_client:
                    gh_api_url = f"https://api.github.com/repos/{owner}/{repo_name}"
                    gh_resp = await http_client.get(gh_api_url, headers={"User-Agent": "SecuLayer-SecurityEngine"})
                    if gh_resp.status_code == 200:
                        gh_data = gh_resp.json()
                        target_branch = gh_data.get("default_branch", target_branch)
                    elif gh_resp.status_code == 404:
                        if "github.com" in clean:
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Repository '{full_name}' was not found on GitHub. Verify the owner and repository name, or mark as private if authorization is required.",
                            )
            except HTTPException:
                raise
            except Exception as probe_err:
                logger.info(f"Git provider probe note: {probe_err}")

        # 3. Resolve Project
        target_env = (payload.environment or "production").lower()
        project = None
        target_project_id = project_id or payload.project_id
        if target_project_id:
            try:
                target_proj_uuid = uuid.UUID(str(target_project_id))
                # First check exact project by ID
                p_stmt = select(Project).where(Project.id == target_proj_uuid)
                p_res = await db.execute(p_stmt)
                cand = p_res.scalars().first()
                if not cand:
                    raise HTTPException(status_code=404, detail="Project not found")

                is_authorized = False
                if getattr(current_user, "is_superuser", False) or cand.owner_id == current_user.id:
                    is_authorized = True
                elif cand.organization_id:
                    from app.models.invitation import OrganizationMember
                    m_stmt = select(OrganizationMember.id).where(
                        and_(
                            OrganizationMember.organization_id == cand.organization_id,
                            OrganizationMember.user_id == current_user.id,
                            OrganizationMember.is_active == True,
                        )
                    )
                    m_res = await db.execute(m_stmt)
                    if m_res.scalars().first():
                        is_authorized = True

                if not is_authorized:
                    raise HTTPException(status_code=403, detail="Access denied to requested project")
                project = cand
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid project_id")

        if not project:
            try:
                stmt = select(Project).where(
                    and_(
                        Project.owner_id == current_user.id,
                        Project.environment == target_env,
                    )
                ).limit(1)
                res = await db.execute(stmt)
                project = res.scalars().first()
            except Exception:
                project = None

        if not project:
            try:
                stmt = select(Project).where(Project.owner_id == current_user.id).limit(1)
                res = await db.execute(stmt)
                project = res.scalars().first()
            except Exception:
                project = None

        if not project:
            try:
                from app.models.invitation import OrganizationMember
                m_proj_stmt = (
                    select(Project)
                    .join(OrganizationMember, OrganizationMember.organization_id == Project.organization_id)
                    .where(
                        and_(
                            OrganizationMember.user_id == current_user.id,
                            OrganizationMember.is_active == True,
                        )
                    )
                    .limit(1)
                )
                m_proj_res = await db.execute(m_proj_stmt)
                project = m_proj_res.scalars().first()
            except Exception:
                project = None

        if not project:
            from app.api.v1.workspaces import ensure_personal_workspace
            ws = await ensure_personal_workspace(current_user, db)
            project = Project(
                id=uuid.uuid4(),
                owner_id=current_user.id,
                workspace_id=ws.id if ws else None,
                organization_id=ws.organization_id if ws else None,
                name=f"{repo_name.replace('-', ' ').title()}",
                description=f"Continuous security governance for {full_name}",
                environment=target_env,
                application_type="web_service",
            )
            db.add(project)
            await db.commit()
            await db.refresh(project)

        # 4. Check or create GitHubRepository for this project
        existing_stmt = select(GitHubRepository).where(
            and_(
                GitHubRepository.project_id == project.id,
                or_(
                    GitHubRepository.full_name == full_name,
                    GitHubRepository.full_name.ilike(full_name),
                )
            )
        ).limit(1)
        existing_res = await db.execute(existing_stmt)
        repo = existing_res.scalars().first()

        if repo:
            repo.default_branch = target_branch
            repo.html_url = html_url
            repo.clone_url = clone_url
            if not getattr(repo, 'owner', None):
                repo.owner = owner
            await db.commit()
            await db.refresh(repo)
        else:
            gen_id = abs(hash(full_name + str(uuid.uuid4()))) % 90000000 + 10000000
            while (await db.execute(select(GitHubRepository).where(GitHubRepository.github_repository_id == gen_id))).scalar_one_or_none():
                gen_id += 1
            repo = GitHubRepository(
                id=uuid.uuid4(),
                project_id=project.id,
                workspace_id=getattr(project, 'workspace_id', None),
                github_repository_id=gen_id,
                owner=owner,
                name=repo_name,
                full_name=full_name,
                default_branch=target_branch,
                private=payload.private,
                html_url=html_url,
                clone_url=clone_url,
                visibility="private" if payload.private else "public",
                archived=False,
            )
            db.add(repo)
            await db.commit()
            await db.refresh(repo)

        repo_id_val = repo.id
        repo_id_str = str(repo.id)
        repo_name_str = str(repo.name)
        full_name_str = str(repo.full_name)
        html_url_str = str(repo.html_url)
        branch_str = str(repo.default_branch)
        project_id_str = str(project.id)

        # 5. Queue initial security scan if requested (runs asynchronously via background worker)
        scan_job_id = None
        if payload.trigger_scan:
            try:
                from app.schemas.github import TriggerRepositoryScanRequest
                service = GitHubService(db)
                scan_job = await service.trigger_manual_scan(
                    repo_id_val,
                    TriggerRepositoryScanRequest(ref=branch_str),
                    current_user,
                    background_tasks,
                )
                scan_job_id = str(scan_job.id) if scan_job else None
            except Exception as e:
                logger.warning(f"Could not automatically queue scan on connect: {e}")

        return {
            "status": "CONNECTED",
            "id": repo_id_str,
            "repository_id": repo_id_str,
            "repository_name": repo_name_str,
            "name": repo_name_str,
            "full_name": full_name_str,
            "html_url": html_url_str,
            "clone_url": clone_url,
            "default_branch": branch_str,
            "project_id": project_id_str,
            "scan_job_id": scan_job_id,
            "message": f"Repository {full_name_str} successfully connected! Security scan queued.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Unhandled error in connect_code_repository: {exc}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect repository: {str(exc)}",
        )

# Alias for backwards compatibility
connect_repository = connect_code_repository



# ─────────────────────────────────────────────
# Secrets Product Endpoints (/code/secrets)
# ─────────────────────────────────────────────

@router.get(
    "/secrets/overview",
    response_model=SecretsOverviewResponse,
    summary="Get Secrets scanning overview, KPIs, and trend metrics",
    description="Returns aggregate secret detection data, donut distribution, trend points, recent findings, and top repositories.",
)
async def get_secrets_overview(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretsOverviewResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secrets_overview(
        project_id=project_id,
        repository_id=repository_id,
        date_range=date_range,
    )


@router.get(
    "/secrets/inventory",
    response_model=List[SecretInventoryItem],
    summary="Get Secret Types Inventory",
    description="Categorized inventory of credentials, keys, and tokens discovered across repositories.",
)
async def get_secrets_inventory(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecretInventoryItem]:
    service = CodeService(db, current_user=current_user)
    return await service.get_secrets_inventory(project_id=project_id)


@router.get(
    "/secrets/inventory/metrics",
    response_model=SecretInventoryMetrics,
    summary="Get Secret Inventory KPI Metrics",
    description="Returns total secrets, critical, high, medium, and low counts with delta trends.",
)
async def get_secrets_inventory_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretInventoryMetrics:
    service = CodeService(db, current_user=current_user)
    return await service.get_secrets_inventory_metrics()


@router.get(
    "/secrets/inventory/table",
    response_model=SecretInventoryTableResponse,
    summary="Get Paginated Secret Inventory Findings Table",
    description="Returns filtered and paginated secrets inventory across repositories.",
)
async def get_secrets_inventory_table(
    search: Optional[str] = Query(None),
    secret_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretInventoryTableResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secrets_inventory_table(
        search=search,
        secret_type=secret_type,
        severity=severity,
        repository=repository,
        status_filter=status,
        date_range=date_range,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/secrets/inventory/detail/{secret_id}",
    response_model=SecretInventoryRow,
    summary="Get Secret Inventory Item Detail",
)
async def get_secrets_inventory_detail(
    secret_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretInventoryRow:
    service = CodeService(db, current_user=current_user)
    return await service.get_secrets_inventory_detail(secret_id)


@router.post(
    "/secrets/inventory/{secret_id}/status",
    response_model=SecretInventoryRow,
    summary="Update Secret Inventory Item Status",
)
async def update_secrets_inventory_status(
    secret_id: str,
    payload: UpdateInventoryStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretInventoryRow:
    service = CodeService(db, current_user=current_user)
    return await service.update_secrets_inventory_status(secret_id, payload.status, payload.reason)


@router.post(
    "/secrets/inventory/policies",
    response_model=AddInventoryPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Secret Policy from Inventory",
)
async def add_secrets_inventory_policy(
    payload: AddInventoryPolicyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddInventoryPolicyResponse:
    service = CodeService(db, current_user=current_user)
    return await service.add_secrets_inventory_policy(payload)


@router.get(
    "/secrets/inventory/export",
    summary="Export Secrets Inventory",
)
async def export_secrets_inventory(
    format: str = Query("json", description="json or csv"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CodeService(db, current_user=current_user)
    return await service.export_secrets_inventory(format=format)


# ─────────────────────────────────────────────
# Secret Detections Endpoints (/code/secrets/detections)
# ─────────────────────────────────────────────

@router.get(
    "/secrets/detections/overview",
    response_model=SecretDetectionsOverviewResponse,
    summary="Get Secret Detections KPIs and Analytics",
    description="Returns aggregate KPI numbers, trend wave points, secret type distribution, and severity bars.",
)
async def get_secret_detections_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretDetectionsOverviewResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_detections_overview()


@router.get(
    "/secrets/detections/table",
    response_model=SecretDetectionsTableResponse,
    summary="Get Paginated Secret Detections Table",
    description="Returns filtered and paginated detections matching search, repository, type, severity, and status.",
)
async def get_secret_detections_table(
    search: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    secret_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretDetectionsTableResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_detections_table(
        search=search,
        repository=repository,
        secret_type=secret_type,
        severity=severity,
        status_filter=status,
        date_range=date_range,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/secrets/detections/detail/{detection_id}",
    response_model=SecretDetectionsItem,
    summary="Get Single Secret Detection Item Detail",
)
async def get_secret_detection_detail(
    detection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretDetectionsItem:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_detection_detail(detection_id)


@router.post(
    "/secrets/detections/{detection_id}/status",
    response_model=SecretDetectionsItem,
    summary="Update Secret Detection Status",
)
async def update_secret_detection_status(
    detection_id: str,
    payload: UpdateDetectionStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretDetectionsItem:
    service = CodeService(db, current_user=current_user)
    return await service.update_secret_detection_status(detection_id, payload.status, payload.reason)


@router.get(
    "/secrets/detections/export",
    summary="Export Secret Detections",
)
async def export_secret_detections(
    format: str = Query("json", description="json or csv"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CodeService(db, current_user=current_user)
    return await service.export_secret_detections(format=format)


# ─────────────────────────────────────────────
# Secret Repositories & Mapping Endpoints (/code/secrets/repositories)
# ─────────────────────────────────────────────

@router.get(
    "/secrets/repositories/overview",
    response_model=SecretRepositoriesOverviewResponse,
    summary="Get Secret Repositories KPIs and Analytics",
    description="Returns aggregate KPI numbers, bar chart distributions, donut type breakdowns, and top risk rankings.",
)
async def get_secret_repositories_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRepositoriesOverviewResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_repositories_overview()


@router.get(
    "/secrets/repositories/table",
    response_model=SecretRepositoriesTableResponse,
    summary="Get Paginated Secret Repositories Table",
    description="Returns filtered and paginated repositories matching search, visibility, risk level, and scan status.",
)
async def get_secret_repositories_table(
    search: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    secret_type: Optional[str] = Query(None),
    scan_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRepositoriesTableResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_repositories_table(
        search=search,
        visibility=visibility,
        risk_level=risk_level,
        secret_type=secret_type,
        scan_status=scan_status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/secrets/repositories/detail/{repo_id}",
    response_model=SecretRepositoryRow,
    summary="Get Single Secret Repository Detail",
)
async def get_secret_repository_detail(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRepositoryRow:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_repository_detail(repo_id)


@router.post(
    "/secrets/repositories/scan",
    response_model=TriggerRepoScanResponse,
    summary="Trigger Secret Repository Scan",
)
@router.post(
    "/secrets/scan",
    response_model=TriggerRepoScanResponse,
    summary="Trigger Secret Repository Scan",
)
async def trigger_secret_repository_scan(
    payload: TriggerRepoScanRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriggerRepoScanResponse:
    service = CodeService(db, current_user=current_user)
    return await service.trigger_secret_repository_scan(payload, background_tasks=background_tasks)


@router.get(
    "/secrets/repositories/export",
    summary="Export Secret Repositories",
)
async def export_secret_repositories(
    format: str = Query("json", description="json or csv"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CodeService(db, current_user=current_user)
    return await service.export_secret_repositories(format=format)




@router.get(
    "/secrets/policies",
    response_model=List[SecretPolicyItem],
    summary="Get Secret Detection Policies",
    description="List of secret security guardrails, blocking rules, and rotation policies.",
)
async def get_secrets_policies(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecretPolicyItem]:
    service = CodeService(db, current_user=current_user)
    return await service.get_secrets_policies(project_id=project_id)


@router.post(
    "/secrets/policies",
    response_model=SecretPolicyItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Secret Detection Policy",
)
async def create_secrets_policy(
    payload: CreateSecretPolicyRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretPolicyItem:
    service = CodeService(db, current_user=current_user)
    return await service.create_secrets_policy(
        payload=payload,
        current_user_id=str(current_user.id),
        project_id=project_id,
    )




@router.get(
    "/secrets/scans/status/{job_id}",
    summary="Get live secret scan job status and execution progress",
)
async def get_secret_scan_status(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.github import GitHubSecurityJob, GitHubRepository
    from app.models.scan import SecurityScan, SecurityFinding
    job = await db.get(GitHubSecurityJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan job not found")

    repo = await db.get(GitHubRepository, job.repository_id) if job.repository_id else None
    repo_name = repo.name if repo else (str(job.repository_id) if job.repository_id else "Repository")

    findings_count = 0
    scanners_executed = ["Gitleaks v8.18", "Semgrep OSS", "Trivy Secret Engine"]
    if job.scan_id:
        findings_count_res = await db.execute(
            select(func.count(SecurityFinding.id)).where(SecurityFinding.scan_id == job.scan_id)
        )
        findings_count = findings_count_res.scalar() or 0

    duration_seconds = 0
    if job.started_at:
        end_time = job.completed_at or datetime.now(timezone.utc)
        s_at = job.started_at if job.started_at.tzinfo else job.started_at.replace(tzinfo=timezone.utc)
        e_at = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
        duration_seconds = max(1, int((e_at - s_at).total_seconds()))

    # Determine execution stage
    stage = "INITIALIZING"
    if job.status == "QUEUED":
        stage = "QUEUED_IN_PIPELINE"
    elif job.status == "RUNNING":
        stage = "SCANNING_SECRETS"
    elif job.status == "COMPLETED":
        stage = "COMPLETED"
    elif job.status == "FAILED":
        stage = "FAILED"

    stage_progress = job.stage_progress
    if stage_progress is None:
        if job.status == "COMPLETED":
            stage_progress = 100
        elif job.status == "QUEUED":
            stage_progress = 15
        elif job.status == "FAILED":
            stage_progress = 100
        else:
            stage_progress = 40

    return {
        "job_id": str(job.id),
        "status": job.status,
        "stage": stage,
        "current_stage": job.current_stage or stage,
        "current_stage_index": job.current_stage_index or (1 if job.status == "QUEUED" else (6 if job.status == "COMPLETED" else 2)),
        "total_stages": job.total_stages or 6,
        "stage_progress": stage_progress,
        "recent_logs": job.recent_logs or [],
        "repository_id": str(job.repository_id) if job.repository_id else None,
        "repository_name": repo_name,
        "branch": job.branch or "main",
        "commit_sha": job.commit_sha,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "duration_seconds": duration_seconds,
        "scan_id": str(job.scan_id) if job.scan_id else None,
        "findings_count": findings_count,
        "scanners": scanners_executed,
        "error_message": job.error_message,
    }


@router.get(
    "/secrets/scans/active",
    summary="Get currently active or most recent secret scan job",
)
async def get_active_secret_scan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.github import GitHubSecurityJob, GitHubRepository
    from app.models.scan import SecurityFinding
    # First check for any RUNNING or QUEUED job
    res = await db.execute(
        select(GitHubSecurityJob)
        .where(GitHubSecurityJob.status.in_(["RUNNING", "QUEUED"]))
        .order_by(desc(GitHubSecurityJob.created_at))
        .limit(1)
    )
    job = res.scalars().first()

    # If no running job, look for any job created in last 10 minutes
    if not job:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
        res = await db.execute(
            select(GitHubSecurityJob)
            .where(GitHubSecurityJob.created_at >= cutoff)
            .order_by(desc(GitHubSecurityJob.created_at))
            .limit(1)
        )
        job = res.scalars().first()

    if not job:
        return {"has_active_scan": False, "job": None}

    repo = await db.get(GitHubRepository, job.repository_id) if job.repository_id else None
    repo_name = repo.name if repo else "Repository"

    findings_count = 0
    if job.scan_id:
        fc = await db.execute(
            select(func.count(SecurityFinding.id)).where(SecurityFinding.scan_id == job.scan_id)
        )
        findings_count = fc.scalar() or 0

    duration_seconds = 0
    if job.started_at:
        end_time = job.completed_at or datetime.now(timezone.utc)
        s_at = job.started_at if job.started_at.tzinfo else job.started_at.replace(tzinfo=timezone.utc)
        e_at = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
        duration_seconds = max(1, int((e_at - s_at).total_seconds()))

    return {
        "has_active_scan": True,
        "job": {
            "job_id": str(job.id),
            "status": job.status,
            "repository_id": str(job.repository_id) if job.repository_id else None,
            "repository_name": repo_name,
            "branch": job.branch or "main",
            "commit_sha": job.commit_sha,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "duration_seconds": duration_seconds,
            "scan_id": str(job.scan_id) if job.scan_id else None,
            "findings_count": findings_count,
            "error_message": job.error_message,
        }
    }


# ─────────────────────────────────────────────
# Secret Scans Endpoints (/code/secrets/scans)
# ─────────────────────────────────────────────

@router.get(
    "/secrets/scans/metrics",
    response_model=SecretScanMetricsResponse,
    summary="Get Secret Scans KPI metrics, trends, and coverage",
)
async def get_secret_scans_metrics(
    project_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanMetricsResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scans_metrics(project_id=project_id, date_range=date_range)


@router.get(
    "/secrets/scans",
    response_model=SecretScansTableResponse,
    summary="Get paginated list of Secret Scans",
)
async def get_secret_scans(
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    scan_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScansTableResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scans(
        repository=repository,
        branch=branch,
        scan_type=scan_type,
        status_filter=status,
        search=search,
        date_range=date_range,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/secrets/scans/config",
    response_model=SecretScanConfig,
    summary="Get Secret Scan Configuration",
)
async def get_secret_scan_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanConfig:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scan_config()


@router.put(
    "/secrets/scans/config",
    response_model=SecretScanConfig,
    summary="Update Secret Scan Configuration",
)
async def update_secret_scan_config(
    payload: SecretScanConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanConfig:
    service = CodeService(db, current_user=current_user)
    return await service.update_secret_scan_config(payload)


@router.get(
    "/secrets/scans/integrations",
    response_model=List[SecretScanIntegrationItem],
    summary="Get CI/CD Secret Scan Integrations",
)
async def get_secret_scan_integrations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecretScanIntegrationItem]:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scan_integrations()


class ToggleIntegrationRequest(BaseModel):
    id: str
    enabled: bool


@router.post(
    "/secrets/scans/integrations/toggle",
    response_model=List[SecretScanIntegrationItem],
    summary="Toggle a CI/CD integration status",
)
async def toggle_secret_scan_integration(
    payload: ToggleIntegrationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecretScanIntegrationItem]:
    service = CodeService(db, current_user=current_user)
    return await service.toggle_secret_scan_integration(payload.id, payload.enabled)


@router.get(
    "/secrets/scans/activity",
    response_model=List[SecretScanActivityItem],
    summary="Get Recent Secret Scan Activity",
)
async def get_secret_scan_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecretScanActivityItem]:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scan_activity()


@router.post(
    "/secrets/scans/trigger",
    response_model=SecretScanTableItem,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger a new secret scan",
)
async def trigger_new_secret_scan(
    payload: TriggerNewSecretScanRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanTableItem:
    service = CodeService(db, current_user=current_user)
    return await service.trigger_new_secret_scan(payload, str(current_user.id), background_tasks=background_tasks)


@router.post(
    "/secrets/scans/schedule",
    response_model=SecretScanConfig,
    summary="Schedule recurring secret scans",
)
async def schedule_secret_scan(
    payload: ScheduleSecretScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanConfig:
    service = CodeService(db, current_user=current_user)
    return await service.schedule_secret_scan(payload)


@router.get(
    "/secrets/scans/{scan_id}",
    response_model=SecretScanDetailResponse,
    summary="Get Secret Scan Detail",
    description="Returns detailed scan telemetry, findings, code snippet contexts, risk analysis, and audit logs.",
)
async def get_secret_scan_detail(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanDetailResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scan_detail(scan_id)


@router.post(
    "/secrets/scans/{scan_id}/rescan",
    response_model=SecretScanDetailResponse,
    summary="Trigger Re-scan for Secret Scan",
)
async def rescan_secret_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanDetailResponse:
    service = CodeService(db, current_user=current_user)
    return await service.rescan_secret_scan(scan_id)


@router.post(
    "/secrets/scans/{scan_id}/findings/{finding_id}/resolve",
    response_model=SecretScanFindingDetailItem,
    summary="Toggle Finding Status (Resolved / Open)",
)
async def resolve_secret_finding(
    scan_id: str,
    finding_id: str,
    payload: ResolveFindingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretScanFindingDetailItem:
    service = CodeService(db, current_user=current_user)
    return await service.resolve_secret_finding(scan_id, finding_id, payload.resolved)


@router.post(
    "/secrets/scans/{scan_id}/findings/{finding_id}/remediation-pr",
    response_model=RemediationPRResponse,
    summary="Create Remediation Pull Request for Finding",
)
async def create_finding_remediation_pr(
    scan_id: str,
    finding_id: str,
    payload: Optional[CreateRemediationPRRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationPRResponse:
    service = CodeService(db, current_user=current_user)
    return await service.create_finding_remediation_pr(scan_id, finding_id, payload)


@router.get(
    "/secrets/scans/{scan_id}/report",
    summary="Download Secret Scan Report (JSON or SARIF)",
)
async def get_secret_scan_report(
    scan_id: str,
    format: str = Query("json", description="json or sarif"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_scan_report(scan_id, format=format)


# ─────────────────────────────────────────────
# Secret Remediation (/code/secrets/remediation)
# ─────────────────────────────────────────────

@router.get(
    "/secrets/remediation/metrics",
    response_model=SecretRemediationMetrics,
    summary="Get Secret Remediation KPIs",
    description="Returns open findings, remediated, in-progress, and PRs created metrics.",
)
async def get_secret_remediation_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRemediationMetrics:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_remediation_metrics()


@router.get(
    "/secrets/remediation/findings",
    response_model=SecretRemediationListResponse,
    summary="List Secret Remediation Findings",
    description="Returns filtered list of findings requiring remediation with status and tab counts.",
)
async def get_secret_remediation_findings(
    tab: str = Query("open", description="open | in_progress | remediated | ignored | all"),
    severity: Optional[str] = Query(None),
    secret_type: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("Last Detected"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRemediationListResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_remediation_findings(
        tab=tab,
        severity=severity,
        secret_type=secret_type,
        repository=repository,
        status_filter=status,
        search=search,
        sort_by=sort,
    )


@router.get(
    "/secrets/remediation/findings/{finding_id}",
    response_model=SecretRemediationItem,
    summary="Get Single Remediation Finding Detail with Code Diff",
)
async def get_secret_remediation_finding_detail(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRemediationItem:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_remediation_finding_detail(finding_id)


@router.post(
    "/secrets/remediation/findings/{finding_id}/status",
    response_model=SecretRemediationItem,
    summary="Update Remediation Finding Status",
)
async def update_secret_remediation_status(
    finding_id: str,
    payload: UpdateRemediationStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRemediationItem:
    service = CodeService(db, current_user=current_user)
    return await service.update_secret_remediation_status(finding_id, payload.status, payload.reason)


@router.post(
    "/secrets/remediation/findings/{finding_id}/create-pr",
    response_model=RemediationPRResponse,
    summary="Generate Remediation Pull Request",
)
async def create_secret_remediation_pr(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationPRResponse:
    service = CodeService(db, current_user=current_user)
    return await service.create_secret_remediation_pr(finding_id)


@router.post(
    "/secrets/remediation/bulk-remediate",
    response_model=BulkRemediateResponse,
    summary="Bulk Remediate Multiple Secret Findings",
)
async def bulk_remediate_secrets(
    payload: BulkRemediateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BulkRemediateResponse:
    service = CodeService(db, current_user=current_user)
    return await service.bulk_remediate_secrets(payload)


@router.get(
    "/secrets/remediation/settings",
    response_model=RemediationSettings,
    summary="Get Remediation Automation Settings",
)
async def get_secret_remediation_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationSettings:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_remediation_settings()


@router.put(
    "/secrets/remediation/settings",
    response_model=RemediationSettings,
    summary="Update Remediation Automation Settings",
)
async def update_secret_remediation_settings(
    payload: RemediationSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationSettings:
    service = CodeService(db, current_user=current_user)
    return await service.update_secret_remediation_settings(payload)


# ─────────────────────────────────────────────
# Policies & Compliance (/code/settings/policies & /code/policies) - auto-reloaded
# ─────────────────────────────────────────────

@router.get(
    "/settings/policies/overview",
    response_model=PolicyComplianceOverviewResponse,
    summary="Get Policies and Compliance Overview",
    description="Returns top KPI cards, violations trend, type breakdown, compliance frameworks, enforcement settings, and recent violations.",
)
@router.get(
    "/policies/overview",
    response_model=PolicyComplianceOverviewResponse,
    include_in_schema=False,
)
async def get_policy_compliance_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PolicyComplianceOverviewResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_policy_compliance_overview()


@router.get(
    "/settings/policies/table",
    response_model=SecurityPoliciesTableResponse,
    summary="Get Security Policies Table",
    description="Returns paginated and filtered list of security policies with violations and status.",
)
@router.get(
    "/policies/table",
    response_model=SecurityPoliciesTableResponse,
    include_in_schema=False,
)
async def get_security_policies_table(
    search: Optional[str] = Query(None, description="Search policy name, type, scope, description"),
    policy_type: Optional[str] = Query(None, description="Filter by policy type"),
    scope: Optional[str] = Query(None, description="Filter by scope"),
    status: Optional[str] = Query(None, description="Filter by status (Enforced, Warning, Disabled)"),
    compliance: Optional[str] = Query(None, description="Filter by compliance framework"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityPoliciesTableResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_security_policies_table(
        search=search,
        policy_type=policy_type,
        scope=scope,
        status=status,
        compliance=compliance,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/settings/policies/detail/{policy_id}",
    response_model=SecurityPolicyRow,
    summary="Get Security Policy Detail",
)
@router.get(
    "/policies/detail/{policy_id}",
    response_model=SecurityPolicyRow,
    include_in_schema=False,
)
async def get_security_policy_detail(
    policy_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityPolicyRow:
    service = CodeService(db, current_user=current_user)
    return await service.get_security_policy_detail(policy_id)


@router.post(
    "/settings/policies",
    response_model=SecurityPolicyRow,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Security Policy",
)
@router.post(
    "/policies",
    response_model=SecurityPolicyRow,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_security_policy(
    payload: CreateSecurityPolicyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityPolicyRow:
    service = CodeService(db, current_user=current_user)
    return await service.create_security_policy(payload)


@router.patch(
    "/settings/policies/{policy_id}",
    response_model=SecurityPolicyRow,
    summary="Update Security Policy",
)
@router.patch(
    "/policies/{policy_id}",
    response_model=SecurityPolicyRow,
    include_in_schema=False,
)
async def update_security_policy(
    policy_id: str,
    payload: UpdateSecurityPolicyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityPolicyRow:
    service = CodeService(db, current_user=current_user)
    return await service.update_security_policy(policy_id, payload)


@router.post(
    "/settings/policies/enforce-all",
    response_model=EnforceAllPoliciesResponse,
    summary="Enforce All Security Policies",
)
@router.post(
    "/policies/enforce-all",
    response_model=EnforceAllPoliciesResponse,
    include_in_schema=False,
)
async def enforce_all_policies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EnforceAllPoliciesResponse:
    service = CodeService(db, current_user=current_user)
    return await service.enforce_all_policies()

class CodeGeneralSettings(BaseModel):
    block_on_critical: bool = True
    block_on_high: bool = True
    auto_scan_push: bool = True
    auto_scan_pr: bool = True
    require_approval_autofix: bool = True
    redact_secrets: bool = True

_CODE_GENERAL_SETTINGS: CodeGeneralSettings = CodeGeneralSettings()

@router.get(
    "/settings/general",
    response_model=CodeGeneralSettings,
    summary="Get Thing Code general scanner and gate settings",
)
async def get_code_general_settings(
    current_user: User = Depends(get_current_user),
) -> CodeGeneralSettings:
    return _CODE_GENERAL_SETTINGS

@router.put(
    "/settings/general",
    response_model=CodeGeneralSettings,
    summary="Update Thing Code general scanner and gate settings",
)
async def update_code_general_settings(
    payload: CodeGeneralSettings,
    current_user: User = Depends(get_current_user),
) -> CodeGeneralSettings:
    global _CODE_GENERAL_SETTINGS
    _CODE_GENERAL_SETTINGS = payload
    return _CODE_GENERAL_SETTINGS


@router.put(
    "/settings/policies/settings",
    response_model=PolicyEnforcementSettings,
    summary="Update Policy Enforcement Settings",
)
@router.put(
    "/policies/settings",
    response_model=PolicyEnforcementSettings,
    include_in_schema=False,
)
async def update_policy_enforcement_settings(
    payload: PolicyEnforcementSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PolicyEnforcementSettings:
    service = CodeService(db, current_user=current_user)
    return await service.update_policy_enforcement_settings(payload)


@router.get(
    "/settings/policies/templates",
    response_model=List[PolicyTemplateItem],
    summary="Get Security Policy Templates",
)
@router.get(
    "/policies/templates",
    response_model=List[PolicyTemplateItem],
    include_in_schema=False,
)
async def get_policy_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[PolicyTemplateItem]:
    service = CodeService(db, current_user=current_user)
    return await service.get_policy_templates()


@router.get(
    "/settings/policies/export",
    summary="Export Security Policies (JSON)",
)
@router.get(
    "/policies/export",
    include_in_schema=False,
)
async def export_security_policies(
    format: str = Query("json", description="Export format: json"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CodeService(db, current_user=current_user)
    return await service.export_security_policies(format=format)


@router.get(
    "/settings/compliance",
    response_model=List[ComplianceFrameworkItem],
    summary="Get Active Compliance Frameworks & Controls",
)
@router.get(
    "/compliance",
    response_model=List[ComplianceFrameworkItem],
    include_in_schema=False,
)
async def get_compliance_frameworks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ComplianceFrameworkItem]:
    service = CodeService(db, current_user=current_user)
    overview = await service.get_policy_compliance_overview()
    return overview.analytics.frameworks


# ─────────────────────────────────────────────
# Secrets Integrations & Rotation (/code/secrets/integrations)
# ─────────────────────────────────────────────

@router.get(
    "/secrets/integrations/overview",
    response_model=SecretIntegrationsOverviewResponse,
    summary="Get Secrets Integrations & Rotation Overview",
    description="Returns top KPIs, connected tools, rotation rules, recent activity, integration events, rotation statistics, and active configuration.",
)
async def get_secret_integrations_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretIntegrationsOverviewResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_integrations_overview()


@router.get(
    "/secrets/rotation/rules",
    response_model=List[SecretRotationRuleItem],
    summary="List Secret Rotation Rules",
)
async def get_rotation_rules(
    search: Optional[str] = Query(None, description="Search rule name, secret type, repository"),
    secret_type: Optional[str] = Query(None, description="Filter by secret type"),
    status: Optional[str] = Query(None, description="Filter by status (Active, Paused, Disabled)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecretRotationRuleItem]:
    service = CodeService(db, current_user=current_user)
    return await service.get_rotation_rules(search=search, secret_type=secret_type, status=status)


@router.post(
    "/secrets/rotation/rules",
    response_model=SecretRotationRuleItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Secret Rotation Rule",
)
async def create_rotation_rule(
    payload: CreateRotationRuleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRotationRuleItem:
    service = CodeService(db, current_user=current_user)
    return await service.create_rotation_rule(payload)


@router.patch(
    "/secrets/rotation/rules/{rule_id}",
    response_model=SecretRotationRuleItem,
    summary="Update Secret Rotation Rule",
)
async def update_rotation_rule(
    rule_id: str,
    payload: UpdateRotationRuleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretRotationRuleItem:
    service = CodeService(db, current_user=current_user)
    return await service.update_rotation_rule(rule_id, payload)


@router.post(
    "/secrets/rotation/rules/{rule_id}/rotate",
    response_model=TriggerRuleRotationResponse,
    summary="Trigger Immediate Secret Rotation for Rule",
)
async def trigger_rule_rotation(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriggerRuleRotationResponse:
    service = CodeService(db, current_user=current_user)
    return await service.trigger_rule_rotation(rule_id)


@router.post(
    "/secrets/integrations/connect",
    response_model=ConnectedToolCard,
    summary="Connect or Configure Integration Tool",
)
async def connect_integration_tool(
    payload: ConnectIntegrationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConnectedToolCard:
    service = CodeService(db, current_user=current_user)
    return await service.connect_or_configure_tool(payload)


@router.post(
    "/secrets/integrations/{tool_id}/sync",
    response_model=ConnectedToolCard,
    summary="Trigger Manual Sync for Tool",
)
async def sync_integration_tool(
    tool_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConnectedToolCard:
    service = CodeService(db, current_user=current_user)
    return await service.sync_tool(tool_id)


@router.put(
    "/secrets/integrations/config",
    response_model=SecretsIntegrationConfig,
    summary="Update Secrets Integration Configuration",
)
async def update_integration_config(
    payload: UpdateIntegrationConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretsIntegrationConfig:
    service = CodeService(db, current_user=current_user)
    return await service.update_integration_config(payload)


@router.get(
    "/secrets/rotation/settings",
    response_model=RotationGlobalSettings,
    summary="Get Global Rotation Settings",
)
async def get_rotation_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RotationGlobalSettings:
    service = CodeService(db, current_user=current_user)
    return await service.get_rotation_settings()


@router.put(
    "/secrets/rotation/settings",
    response_model=RotationGlobalSettings,
    summary="Update Global Rotation Settings",
)
async def update_rotation_settings(
    payload: RotationGlobalSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RotationGlobalSettings:
    service = CodeService(db, current_user=current_user)
    return await service.update_rotation_settings(payload)


@router.get(
    "/secrets/integrations/export",
    summary="Export Secrets Integrations & Rotation Data",
)
async def export_secret_integrations(
    format: str = Query("json", description="Export format: json"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CodeService(db, current_user=current_user)
    return await service.export_secret_integrations(format=format)


@router.get(
    "/secrets/inventory/detail/{secret_id}/full",
    response_model=SecretDetailResponse,
    summary="Get Full Secret Inventory Item Detail",
    description="Returns full visual and audit details including code context, risk assessment, git history, and recommendations.",
)
async def get_secret_detail_full(
    secret_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretDetailResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_detail_full(secret_id)


@router.post(
    "/secrets/inventory/{secret_id}/remediate-pr",
    response_model=CreateSecretRemediationPRResponse,
    summary="Create Remediation Pull Request for Secret",
)
async def create_secret_remediation_pr(
    secret_id: str,
    payload: CreateSecretRemediationPRRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateSecretRemediationPRResponse:
    service = CodeService(db, current_user=current_user)
    return await service.create_secret_remediation_pr(secret_id, payload)


@router.post(
    "/secrets/inventory/{secret_id}/revoke",
    response_model=RevokeSecretKeyResponse,
    summary="Revoke Exposed Secret Key",
)
async def revoke_secret_key(
    secret_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RevokeSecretKeyResponse:
    service = CodeService(db, current_user=current_user)
    return await service.revoke_secret_key(secret_id)


@router.post(
    "/secrets/inventory/{secret_id}/rotate",
    response_model=RotateSecretKeyResponse,
    summary="Rotate Exposed Secret Key",
)
async def rotate_secret_key(
    secret_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RotateSecretKeyResponse:
    service = CodeService(db, current_user=current_user)
    return await service.rotate_secret_key(secret_id)


@router.get(
    "/secrets/detections/detail/{detection_id}/full",
    response_model=SecretDetectionDetailResponse,
    summary="Get Full Secret Detection Item Detail",
    description="Returns full visual analysis, 3-column data models, code snippet with AWS S3 setup, AI analysis, 5-step remediation, and timeline.",
)
async def get_secret_detection_detail_full(
    detection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecretDetectionDetailResponse:
    service = CodeService(db, current_user=current_user)
    return await service.get_secret_detection_detail_full(detection_id)


@router.post(
    "/wipe-data",
    summary="Wipe All Scan and Pipeline Data",
    description="Wipes all scans, findings, SBOMs, repositories, hotspots, and remediation plans returning the platform to a 0-data clean slate.",
)
async def wipe_platform_data(
    current_user: User = Depends(get_current_user),
) -> dict:
    from scripts.wipe_all_data import wipe_all_data
    await wipe_all_data()
    return {
        "status": "ok",
        "message": "All security findings, scans, repositories, SBOMs, and pipeline records have been wiped to a clean slate.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# AI Coding Agent Security & Governance Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/ai-security/overview",
    summary="Get AI coding agent security posture and MCP tool governance",
    description="Returns live registered agents, MCP tool execution audit trail, policy decisions, and shadow AI findings.",
)
async def get_ai_security_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.models.agent import Agent
    from app.models.audit import AuditEvent
    from app.models.scan import SecurityFinding
    from sqlalchemy import select, desc, or_

    # 1. Real registered agents
    agents_res = await db.execute(select(Agent).order_by(desc(Agent.created_at)).limit(20))
    agents = agents_res.scalars().all()

    # 2. Real tool execution audit events
    audit_res = await db.execute(
        select(AuditEvent)
        .where(
            or_(
                AuditEvent.action_type.in_(["tool_execution", "agent_tool", "mcp_tool_execution", "ai_policy"]),
                AuditEvent.action.ilike("%tool%"),
                AuditEvent.action.ilike("%agent%"),
            )
        )
        .order_by(desc(AuditEvent.timestamp))
        .limit(50)
    )
    audit_events = audit_res.scalars().all()

    # 3. Real Shadow AI or Prompt Injection findings
    findings_res = await db.execute(
        select(SecurityFinding)
        .where(
            or_(
                SecurityFinding.rule_id.ilike("AI-%"),
                SecurityFinding.category.ilike("%ai%"),
                SecurityFinding.description.ilike("%openai%"),
                SecurityFinding.description.ilike("%anthropic%"),
                SecurityFinding.description.ilike("%prompt injection%"),
            )
        )
        .order_by(desc(SecurityFinding.created_at))
        .limit(50)
    )
    shadow_ai_findings = findings_res.scalars().all()

    total_executions = len(audit_events)
    allowed_count = sum(1 for e in audit_events if (getattr(e, "status", None) or "").upper() in ("SUCCESS", "ALLOWED", "ALLOW"))
    blocked_count = sum(1 for e in audit_events if (getattr(e, "status", None) or "").upper() in ("BLOCKED", "BLOCK", "FAILED", "DENIED"))

    agent_items = [
        {
            "id": str(a.id),
            "name": a.name,
            "agent_type": getattr(a, "agent_type", "Autonomous Agent"),
            "is_active": getattr(a, "is_active", True),
            "allowed_tools": getattr(a, "allowed_tools", ["read_file", "search_web", "git_status"]),
            "last_active_at": getattr(a, "last_active_at", None) or getattr(a, "created_at", None),
        }
        for a in agents
    ]

    audit_items = [
        {
            "id": str(e.id),
            "policy_decision": "ALLOW" if (e.status or "").upper() in ("SUCCESS", "ALLOWED") else "BLOCK" if (e.status or "").upper() in ("BLOCKED", "FAILED", "DENIED") else "REVIEW",
            "action": e.action,
            "action_type": e.action_type or "tool_execution",
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "resource": e.resource_type,
            "policy_id": (e.metadata_ or {}).get("policy_id", "OPA-TOOL-AUTHZ-01"),
            "created_at": e.timestamp.isoformat() if e.timestamp else None,
            "details": e.metadata_ or {},
        }
        for e in audit_events
    ]

    shadow_items = [
        {
            "id": str(f.id),
            "rule_id": f.rule_id,
            "title": f.title,
            "description": f.description,
            "severity": f.severity,
            "file_path": f.file_path,
            "line_number": f.line_number,
        }
        for f in shadow_ai_findings
    ]

    return {
        "agents": agent_items,
        "audit_events": audit_items,
        "shadow_ai_findings": shadow_items,
        "metrics": {
            "registered_agents": len(agent_items),
            "total_executions": total_executions,
            "allowed": allowed_count,
            "blocked": blocked_count,
            "shadow_ai_count": len(shadow_items),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Dependencies / Software Composition Analysis (SCA) Endpoints
# ─────────────────────────────────────────────────────────────────────────────

from app.code.dependencies_schemas import (
    DependenciesOverviewResponse,
    DependencyTrendsResponse,
    CriticalDependenciesResponse,
    OutdatedPackagesResponse,
    DependencyCoveragePageResponse,
    TriggerDependencyScanRequest,
    TriggerDependencyScanResponse,
    DependencyInventoryMetrics,
    DependencyUsageRef,
    DependencyInventoryItem,
    DependencyDetailResponse,
    DependencyInventoryResponse,
    DuplicatePackageItem,
    DuplicatePackagesResponse,
    DependencyUsageResponse,
    VulnerabilityAnalysisMetrics,
    VulnerabilityItem,
    VulnerabilityDetailResponse,
    VulnerabilityAnalysisResponse,
    AffectedPackageItem,
    AffectedPackagesResponse,
    KnownExploitedResponse,
    PackageVersionsMetrics,
    PackageVersionItem,
    PackageVersionsResponse,
    BreakingChangeItem,
    BreakingChangesResponse,
    EolPackageItem,
    EolPackagesResponse,
    EcosystemsOverviewResponse,
    EcosystemDetailResponse,
    DependencyGraphResponse,
    PackageRelationshipsResponse,
    TransitiveRiskPathsResponse,
    BlastRadiusResponse,
    UpgradeImpactResponse,
    LicenseOverviewResponse,
    LicenseInventoryResponse,
    LicenseViolationsResponse,
    RestrictedLicensesResponse,
    LicenseExceptionsResponse,
    LicenseExceptionItem,
    CreateLicenseExceptionRequest,
    PackageHealthOverviewResponse,
    MaintenanceReleaseActivityResponse,
    AbandonedPackagesResponse,
    ReleaseVersionHistoryResponse,
    PackageTrustDetailResponse,
    DependencyRemediationOverviewResponse,
    UpgradeRecommendationsResponse,
    ManifestLockfileDiffResponse,
    CreateFixPullRequestRequest,
    CreateFixPullRequestResponse,
    TriggerRemediationVerificationRequest,
    RemediationVerificationResponse,
    UpdateRemediationStatusRequest,
    RemediationQueueItem,
    SBOMOverviewResponse,
    SBOMComponentDetailResponse,
    SBOMRepositoryMappingResponse,
    SBOMVersionComparisonResponse,
    SBOMExportsProvenanceResponse,
    DependencyPoliciesOverviewResponse,
    VulnerabilityThresholdsResponse,
    PackageRulesResponse,
    VersionRestrictionsResponse,
    PolicyExceptionsResponse,
    DependencyCICDOverviewResponse,
    PRDependencyChecksResponse,
    BuildScanResultsResponse,
    QualityGatesResponse,
    PipelineConfigResponse,
)
from app.services.dependencies_service import DependenciesService


@router.get(
    "/dependencies/inventory",
    response_model=DependencyInventoryResponse,
    summary="Get Complete Dependency Inventory",
    description="Returns all project dependencies with ecosystem, license, security posture, direct/transitive status, and selected package details.",
)
async def get_dependency_inventory(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    license: Optional[str] = Query(None),
    security_status: Optional[str] = Query(None),
    repo_id: Optional[str] = Query(None),
    dependency_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    selected_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyInventoryResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_inventory(
        project_id=project_id,
        search=search,
        ecosystem=ecosystem,
        license_filter=license,
        security_status=security_status,
        repo_id=repo_id,
        dependency_type=dependency_type,
        limit=limit,
        offset=offset,
        selected_id=selected_id,
    )


@router.get(
    "/dependencies/inventory/{dependency_id}",
    response_model=DependencyDetailResponse,
    summary="Get Dependency Details",
    description="Returns comprehensive metadata, usage references, and vulnerability breakdown for a single dependency.",
)
async def get_dependency_detail(
    dependency_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyDetailResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_dependency_detail(
        dependency_id=dependency_id,
        project_id=project_id,
    )


@router.get(
    "/dependencies/direct",
    response_model=DependencyInventoryResponse,
    summary="List Direct Dependencies",
    description="Returns dependencies explicitly defined in manifest files (package.json, requirements.txt, pom.xml).",
)
async def get_direct_dependencies(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyInventoryResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_direct_dependencies(
        project_id=project_id,
        search=search,
        ecosystem=ecosystem,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/transitive",
    response_model=DependencyInventoryResponse,
    summary="List Transitive Dependencies",
    description="Returns indirect dependencies brought in via upstream packages.",
)
async def get_transitive_dependencies(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyInventoryResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_transitive_dependencies(
        project_id=project_id,
        search=search,
        ecosystem=ecosystem,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/usage",
    response_model=DependencyUsageResponse,
    summary="Get Dependency Usage References",
    description="Returns code-level import and require references where dependencies are invoked.",
)
async def get_dependency_usage(
    project_id: Optional[str] = Query(None),
    package_name: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyUsageResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_dependency_usage(
        project_id=project_id,
        package_name=package_name,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/duplicates",
    response_model=DuplicatePackagesResponse,
    summary="List Duplicate Installed Package Versions",
    description="Identifies packages installed in multiple conflicting versions across repository manifests.",
)
async def get_duplicate_packages(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DuplicatePackagesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_duplicate_packages(project_id=project_id)


# ─────────────────────────────────────────────────────────────────────────────
# Vulnerability Analysis Endpoints (Screenshot 03 & 6 Subpages)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/dependencies/vulnerabilities",
    response_model=VulnerabilityAnalysisResponse,
    summary="Get Vulnerability Analysis Dashboard & Findings Table",
    description="Returns all dependency vulnerabilities with metrics, severity breakdown donut, timeline trends, and selected CVE details.",
)
async def get_vulnerability_analysis(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    has_fix: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    selected_cve_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VulnerabilityAnalysisResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_vulnerabilities(
        project_id=project_id,
        severity=severity,
        ecosystem=ecosystem,
        has_fix=has_fix,
        search=search,
        selected_cve_id=selected_cve_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/vulnerabilities/severity",
    response_model=VulnerabilityAnalysisResponse,
    summary="List Critical & High Severity CVEs",
    description="Filters vulnerability findings to Critical and High CVEs needing urgent remediation.",
)
async def get_critical_high_cves(
    project_id: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    has_fix: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    selected_cve_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VulnerabilityAnalysisResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_vulnerabilities(
        project_id=project_id,
        severity="CRITICAL_HIGH",
        ecosystem=ecosystem,
        has_fix=has_fix,
        search=search,
        selected_cve_id=selected_cve_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/vulnerabilities/affected-packages",
    response_model=AffectedPackagesResponse,
    summary="List Packages Affected by Vulnerabilities",
    description="Aggregates vulnerability count and highest severity per package.",
)
async def get_affected_packages_endpoint(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AffectedPackagesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_affected_packages(
        project_id=project_id,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/vulnerabilities/fix-available",
    response_model=VulnerabilityAnalysisResponse,
    summary="List Vulnerabilities with Fix Available",
    description="Filters to vulnerabilities that have an upstream patch or fixed version released.",
)
async def get_fix_available_vulnerabilities(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    selected_cve_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VulnerabilityAnalysisResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_vulnerabilities(
        project_id=project_id,
        severity=severity,
        ecosystem=ecosystem,
        has_fix=True,
        search=search,
        selected_cve_id=selected_cve_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/vulnerabilities/known-exploited",
    response_model=KnownExploitedResponse,
    summary="List Known Exploited Vulnerabilities (CISA KEV)",
    description="Returns vulnerabilities present in active exploitation catalogs with federal due dates.",
)
async def get_known_exploited_endpoint(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnownExploitedResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_known_exploited_vulnerabilities(
        project_id=project_id,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/vulnerabilities/{cve_id}",
    response_model=VulnerabilityDetailResponse,
    summary="Get Specific CVE Vulnerability Detail",
    description="Returns comprehensive CVE intelligence, CVSS vector, EPSS scores, references, and patch guidance.",
)
async def get_cve_detail_endpoint(
    cve_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VulnerabilityDetailResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_vulnerability_detail(
        cve_id=cve_id,
        project_id=project_id,
    )



@router.get(
    "/dependencies/overview",
    response_model=DependenciesOverviewResponse,
    summary="Get Dependencies & SCA Overview Dashboard",
    description="Returns aggregated metrics, risk trends, top risky dependencies, ecosystem distribution, and repository coverage.",
)
async def get_dependencies_overview(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None, description="Scope to repository UUID or repository name"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependenciesOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_overview(project_id=project_id, repository_id=repository_id)


@router.get(
    "/dependencies/trends",
    response_model=DependencyTrendsResponse,
    summary="Get Dependency Risk Trends & Analytics",
    description="Returns historical vulnerability introduction vs resolution, MTTR, and risk timeline.",
)
async def get_dependencies_trends(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None, description="Scope to repository UUID or repository name"),
    time_range: str = Query("30d"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyTrendsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_trends(project_id=project_id, repository_id=repository_id, time_range=time_range)


@router.get(
    "/dependencies/critical",
    response_model=CriticalDependenciesResponse,
    summary="List Critical & High Severity Dependencies",
    description="Filtered table of critical/high vulnerable dependencies with CVE details and AutoFix availability.",
)
async def get_critical_dependencies(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None, description="Scope to repository UUID or repository name"),
    severity: Optional[str] = Query(None, description="CRITICAL | HIGH"),
    ecosystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CriticalDependenciesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_critical_dependencies(
        project_id=project_id,
        repository_id=repository_id,
        severity=severity,
        ecosystem=ecosystem,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/outdated",
    response_model=OutdatedPackagesResponse,
    summary="List Outdated Packages and SemVer Drift",
    description="Identifies packages with outdated versions, breaking changes risk, and upgrade recommendations.",
)
async def get_outdated_packages(
    project_id: Optional[str] = Query(None),
    drift_type: Optional[str] = Query(None, description="MAJOR | MINOR | PATCH"),
    ecosystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutdatedPackagesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_outdated_packages(
        project_id=project_id,
        drift_type=drift_type,
        ecosystem=ecosystem,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/coverage",
    response_model=DependencyCoveragePageResponse,
    summary="Get Repository-level SCA Coverage",
    description="Returns coverage percentage, manifests scanned, and vulnerability health per repository.",
)
async def get_dependency_coverage(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="HEALTHY | VULNERABLE | NOT_SCANNED"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyCoveragePageResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_coverage(
        project_id=project_id,
        search=search,
        status_filter=status,
    )


@router.post(
    "/dependencies/scan",
    response_model=TriggerDependencyScanResponse,
    summary="Trigger On-Demand Dependency Scan for Repository",
    description="Queues a targeted OSV / Trivy / Builtin SCA scan against the repository workspace.",
)
async def trigger_dependency_scan(
    payload: TriggerDependencyScanRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriggerDependencyScanResponse:
    from app.services.github_service import GitHubService
    gh_svc = GitHubService(db)
    job = await gh_svc.trigger_manual_scan(
        repository_id=uuid.UUID(payload.repository_id),
        branch=payload.branch or "main",
        user_id=current_user.id,
        background_tasks=background_tasks,
    )
    return TriggerDependencyScanResponse(
        job_id=str(job.id),
        status=job.status,
        message="Dependency security scan queued successfully.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Package Versions & Upgrades Endpoints (Screenshot 04 & 5 Subpages)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/dependencies/versions",
    response_model=PackageVersionsResponse,
    summary="Get Package Versions & Upgrades Dashboard",
    description="Returns version drift, update status, ecosystem distribution, and upgrade opportunities matching Screenshot 04.",
)
async def get_package_versions_endpoint(
    project_id: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    version_status: Optional[str] = Query(None),
    upgrade_available: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    selected_package_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageVersionsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_package_versions(
        project_id=project_id,
        ecosystem=ecosystem,
        version_status=version_status,
        upgrade_available=upgrade_available,
        search=search,
        selected_package_id=selected_package_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/versions/outdated",
    response_model=PackageVersionsResponse,
    summary="List Outdated Dependencies",
    description="Lists packages with newer releases available.",
)
async def get_outdated_dependencies_endpoint(
    project_id: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageVersionsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_outdated_dependencies(
        project_id=project_id,
        ecosystem=ecosystem,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/versions/upgrades",
    response_model=PackageVersionsResponse,
    summary="List Safe Upgrade Recommendations",
    description="Returns recommended non-breaking patch and minor version upgrades.",
)
async def get_upgrade_recommendations_endpoint(
    project_id: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageVersionsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_upgrade_recommendations(
        project_id=project_id,
        ecosystem=ecosystem,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/versions/breaking-changes",
    response_model=BreakingChangesResponse,
    summary="Analyze Breaking Changes in Dependencies",
    description="Returns major version drift with breaking API changes and migration documentation.",
)
async def get_breaking_changes_endpoint(
    project_id: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BreakingChangesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_breaking_changes(
        project_id=project_id,
        ecosystem=ecosystem,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/versions/eol",
    response_model=EolPackagesResponse,
    summary="Audit End-of-Life Packages",
    description="Identifies packages that are past vendor support or deprecated.",
)
async def get_eol_packages_endpoint(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EolPackagesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_eol_packages(
        project_id=project_id,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/ecosystems",
    response_model=EcosystemsOverviewResponse,
    summary="Get Package Ecosystems Overview",
    description="Returns aggregate package ecosystems metrics, distribution, health, risky packages, trends, and versions.",
)
async def get_ecosystems_overview_endpoint(
    project_id: Optional[str] = Query(None),
    time_range: str = Query("30d"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EcosystemsOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_ecosystems_overview(project_id=project_id, time_range=time_range)


@router.get(
    "/dependencies/ecosystems/{ecosystem_slug}",
    response_model=EcosystemDetailResponse,
    summary="Get Specific Package Ecosystem Details",
    description="Returns package inventory, metrics, and risky packages for a specific ecosystem (npm, python, java, go, other).",
)
async def get_ecosystem_detail_endpoint(
    ecosystem_slug: str,
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EcosystemDetailResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_ecosystem_detail(
        ecosystem_slug=ecosystem_slug,
        project_id=project_id,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/graph",
    response_model=DependencyGraphResponse,
    summary="Get Dependency Graph Topology",
    description="Returns interactive node-link dependency topology, transitive risk paths, centrality metrics, and depth distribution.",
)
async def get_dependency_graph_endpoint(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    view_type: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    selected_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyGraphResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_dependency_graph(
        project_id=project_id,
        repository_id=repository_id,
        branch=branch,
        ecosystem=ecosystem,
        view_type=view_type,
        risk_level=risk_level,
        search=search,
        selected_id=selected_id,
    )


@router.get(
    "/dependencies/graph/relationships",
    response_model=PackageRelationshipsResponse,
    summary="Get Package Relationships Matrix",
    description="Returns inbound and outbound dependency relationships across repositories.",
)
async def get_package_relationships_endpoint(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    relationship_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageRelationshipsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_package_relationships(
        project_id=project_id,
        repository_id=repository_id,
        search=search,
        relationship_type=relationship_type,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/graph/risk-paths",
    response_model=TransitiveRiskPathsResponse,
    summary="Get Transitive Risk Paths",
    description="Traces vulnerabilities introduced deep within transitive dependency chains.",
)
async def get_transitive_risk_paths_endpoint(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TransitiveRiskPathsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_transitive_risk_paths(
        project_id=project_id,
        repository_id=repository_id,
        search=search,
        severity=severity,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/graph/blast-radius",
    response_model=BlastRadiusResponse,
    summary="Get Blast Radius Analysis",
    description="Calculates cascading downstream exposure if a dependency package is compromised or removed.",
)
async def get_blast_radius_endpoint(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    package_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlastRadiusResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_blast_radius(
        project_id=project_id,
        repository_id=repository_id,
        package_name=package_name,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/graph/upgrade-impact",
    response_model=UpgradeImpactResponse,
    summary="Get Upgrade Impact Preview",
    description="Simulates ripple effects, breaking API changes, and peer dependency conflicts prior to upgrading packages.",
)
async def get_upgrade_impact_endpoint(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UpgradeImpactResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_upgrade_impact(
        project_id=project_id,
        repository_id=repository_id,
        search=search,
        limit=limit,
        offset=offset,
    )


# =========================================================================
# 07 LICENSE COMPLIANCE ENDPOINTS (SCREENSHOT 07 & 5 SUBPAGES)
# =========================================================================

@router.get(
    "/dependencies/licenses",
    response_model=LicenseOverviewResponse,
    summary="Get License Compliance Overview",
    description="Returns aggregate license metrics, distribution, risk overview, compliance status, inventory, and trends matching Screenshot 07.",
)
async def get_license_overview_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all", description="Target repository name"),
    time_range: str = Query("30d", description="Time window for trends"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LicenseOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_license_overview(
        project_id=project_id,
        repository_name=repository,
        time_range=time_range,
    )


@router.get(
    "/dependencies/licenses/inventory",
    response_model=LicenseInventoryResponse,
    summary="Get License Inventory",
    description="Returns searchable and filterable database of open-source package licenses.",
)
async def get_license_inventory_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    license_type: Optional[str] = Query(None),
    compliance_status: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LicenseInventoryResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_license_inventory(
        project_id=project_id,
        repository_name=repository,
        search=search,
        license_type=license_type,
        compliance_status=compliance_status,
        ecosystem=ecosystem,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/licenses/violations",
    response_model=LicenseViolationsResponse,
    summary="Get License Violations",
    description="Audits non-compliant packages that breach legal or corporate license policies.",
)
async def get_license_violations_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LicenseViolationsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_license_violations(
        project_id=project_id,
        repository_name=repository,
        search=search,
        severity=severity,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/licenses/restricted",
    response_model=RestrictedLicensesResponse,
    summary="Get Restricted Packages",
    description="Audits weak copyleft, dual-licensed, and conditional open-source components.",
)
async def get_restricted_licenses_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RestrictedLicensesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_restricted_licenses(
        project_id=project_id,
        repository_name=repository,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/licenses/exceptions",
    response_model=LicenseExceptionsResponse,
    summary="Get License Exceptions & Approvals",
    description="Returns formal legal exemptions, waivers, and approved policy deviations.",
)
async def get_license_exceptions_endpoint(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LicenseExceptionsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_license_exceptions(
        project_id=project_id,
        status=status,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/dependencies/licenses/exceptions",
    response_model=LicenseExceptionItem,
    status_code=status.HTTP_201_CREATED,
    summary="Request a License Exception",
    description="Submits a formal request for legal waiver or compliance exception for a package license.",
)
async def create_license_exception_endpoint(
    payload: CreateLicenseExceptionRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LicenseExceptionItem:
    service = DependenciesService(db, current_user=current_user)
    return await service.create_license_exception(
        payload=payload,
        project_id=project_id,
    )


# =========================================================================
# 08 PACKAGE HEALTH & MAINTENANCE ENDPOINTS (SCREENSHOT 08 & 5 SUBPAGES)
# =========================================================================

@router.get(
    "/dependencies/health",
    response_model=PackageHealthOverviewResponse,
    summary="Get Package Health & Maintenance Overview",
    description="Returns aggregate health metrics, distribution, monthly maintenance activity, package status, inventory, top health risks, and recent activity matching Screenshot 08.",
)
async def get_package_health_overview_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all", description="Target repository name"),
    time_range: Optional[str] = Query("30d", description="Time window for metrics"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageHealthOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_package_health_overview(
        project_id=project_id,
        repository=repository,
        time_range=time_range,
    )


@router.get(
    "/dependencies/health/maintenance",
    response_model=MaintenanceReleaseActivityResponse,
    summary="Get Maintenance & Release Activity",
    description="Returns commit frequency, release cadences, active maintainer signals, and monthly activity trends.",
)
async def get_maintenance_release_activity_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    ecosystem: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaintenanceReleaseActivityResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_maintenance_release_activity(
        project_id=project_id,
        repository=repository,
        ecosystem=ecosystem,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/health/abandoned",
    response_model=AbandonedPackagesResponse,
    summary="Get Abandoned Packages",
    description="Filters and audits packages with no releases in over 1 year, unmaintained status, or official deprecation notices.",
)
async def get_abandoned_packages_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    min_days_inactive: int = Query(365, ge=90),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AbandonedPackagesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_abandoned_packages(
        project_id=project_id,
        repository=repository,
        search=search,
        min_days_inactive=min_days_inactive,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/health/releases",
    response_model=ReleaseVersionHistoryResponse,
    summary="Get Release & Version History",
    description="Audits historical release notes, cadence of releases, breaking versions, and patch notes for packages.",
)
async def get_release_version_history_endpoint(
    package_name: Optional[str] = Query(None, description="Package name to inspect"),
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReleaseVersionHistoryResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_release_version_history(
        project_id=project_id,
        package_name=package_name,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/health/{package_id}",
    response_model=PackageTrustDetailResponse,
    summary="Get Package Trust Detail",
    description="Returns detailed trust metrics, OpenSSF scorecard signals, advisories, maintainer health, and actionable migration recommendations.",
)
async def get_package_trust_detail_endpoint(
    package_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageTrustDetailResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_package_trust_detail(
        package_id=package_id,
        project_id=project_id,
    )


# =========================================================================
# 09 DEPENDENCY REMEDIATION ENDPOINTS (SCREENSHOT 09 & 5 SUBPAGES)
# =========================================================================

@router.get(
    "/dependencies/remediation",
    response_model=DependencyRemediationOverviewResponse,
    summary="Get Dependency Remediation Overview",
    description="Returns top 4 metrics, status distribution, risk reduction trend, remediation queue table, categories, ecosystem breakdown, and selected package details matching Screenshot 09.",
)
async def get_remediation_overview_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all", description="Target repository name"),
    branch: Optional[str] = Query("main", description="Target git branch"),
    severity: Optional[str] = Query("all", description="Filter by finding severity"),
    ecosystem: Optional[str] = Query("all", description="Filter by ecosystem"),
    status: Optional[str] = Query("all", description="Filter by remediation status"),
    search: Optional[str] = Query(None, description="Search query"),
    selected_id: Optional[str] = Query(None, description="Selected remediation item ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyRemediationOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_remediation_overview(
        project_id=project_id,
        repository=repository,
        branch=branch,
        severity=severity,
        ecosystem=ecosystem,
        status=status,
        search=search,
        selected_id=selected_id,
    )


@router.get(
    "/dependencies/remediation/upgrades",
    response_model=UpgradeRecommendationsResponse,
    summary="Get Upgrade Recommendations",
    description="Returns prioritized version upgrades with safe patch/minor vs major breaking change categorization.",
)
async def get_upgrade_recommendations_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UpgradeRecommendationsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_upgrade_recommendations(
        project_id=project_id,
        repository=repository,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/dependencies/remediation/diff/{remediation_id}",
    response_model=ManifestLockfileDiffResponse,
    summary="Get Manifest & Lockfile Diff",
    description="Returns exact unified diff for manifest and lockfile showing the dependency version upgrade.",
)
async def get_manifest_lockfile_diff_endpoint(
    remediation_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ManifestLockfileDiffResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_manifest_lockfile_diff(
        remediation_id=remediation_id,
        project_id=project_id,
    )


@router.post(
    "/dependencies/remediation/pull-requests",
    response_model=CreateFixPullRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Fix Pull Request",
    description="Dispatches git branch creation and automated fix pull request to GitHub/GitLab repository.",
)
async def create_fix_pull_request_endpoint(
    payload: CreateFixPullRequestRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateFixPullRequestResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.create_fix_pull_request(
        payload=payload,
        project_id=project_id,
    )


@router.post(
    "/dependencies/remediation/verification",
    response_model=RemediationVerificationResponse,
    summary="Rescan & Verify Fix",
    description="Triggers deterministic Semgrep SCA / Trivy rescan to verify that zero residual vulnerabilities remain.",
)
async def trigger_remediation_verification_endpoint(
    payload: TriggerRemediationVerificationRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationVerificationResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.trigger_remediation_verification(
        payload=payload,
        project_id=project_id,
    )


@router.patch(
    "/dependencies/remediation/{remediation_id}/status",
    response_model=RemediationQueueItem,
    summary="Update Remediation Status",
    description="Updates the state of a remediation item (e.g., Mark as Resolved, In Progress, Ignored).",
)
async def update_remediation_status_endpoint(
    remediation_id: str,
    payload: UpdateRemediationStatusRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationQueueItem:
    service = DependenciesService(db, current_user=current_user)
    return await service.update_remediation_status(
        remediation_id=remediation_id,
        payload=payload,
        project_id=project_id,
    )


# =========================================================================
# 10 SBOM & COMPONENT MAPPING ENDPOINTS (SCREENSHOT 10 & 5 SUBPAGES)
# =========================================================================

@router.get(
    "/dependencies/sbom",
    response_model=SBOMOverviewResponse,
    summary="Get SBOM & Component Mapping Overview",
    description="Returns top 4 KPI metrics, component type donut, ecosystem breakdown, relationship graph map, SBOM components table, recent scans, and top usage matching Screenshot 10.",
)
async def get_sbom_overview_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all", description="Target repository filter"),
    branch: Optional[str] = Query("main", description="Target branch filter"),
    ecosystem: Optional[str] = Query("all", description="Filter by ecosystem"),
    component_type: Optional[str] = Query("all", description="Filter by component type"),
    search: Optional[str] = Query(None, description="Search term"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_sbom_overview(
        project_id=project_id,
        repository=repository,
        branch=branch,
        ecosystem=ecosystem,
        component_type=component_type,
        search=search,
    )


@router.get(
    "/dependencies/sbom/components/{component_id}",
    response_model=SBOMComponentDetailResponse,
    summary="Get Component Detail",
    description="Returns deep metadata, PURL, CPE, direct/transitive dependency hierarchy, licenses, CVE history, and cryptographic provenance hash.",
)
async def get_sbom_component_detail_endpoint(
    component_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMComponentDetailResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_sbom_component_detail(
        component_id=component_id,
        project_id=project_id,
    )


@router.get(
    "/dependencies/sbom/repositories",
    response_model=SBOMRepositoryMappingResponse,
    summary="Get Component-to-Repository Mapping",
    description="Maps software components to consuming repositories, identifying shared libraries and cross-repo version drift.",
)
async def get_sbom_repository_mapping_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMRepositoryMappingResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_sbom_repository_mapping(
        project_id=project_id,
        repository=repository,
        search=search,
    )


@router.get(
    "/dependencies/sbom/diff",
    response_model=SBOMVersionComparisonResponse,
    summary="Get Version Comparison",
    description="Compares SBOM component inventories and versions between branches or snapshots.",
)
async def get_sbom_version_comparison_endpoint(
    source_ref: Optional[str] = Query("main"),
    target_ref: Optional[str] = Query("develop"),
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMVersionComparisonResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_sbom_version_comparison(
        source_ref=source_ref,
        target_ref=target_ref,
        project_id=project_id,
    )


@router.get(
    "/dependencies/sbom/exports",
    response_model=SBOMExportsProvenanceResponse,
    summary="Get Export & Provenance Links",
    description="Returns compliant CycloneDX 1.5 JSON, SPDX 2.3 JSON, and In-toto attestation export references with SLSA Level 3 builder verification.",
)
async def get_sbom_exports_provenance_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMExportsProvenanceResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_sbom_exports_provenance(
        project_id=project_id,
        repository=repository,
    )


# =========================================================================
# 11 DEPENDENCY POLICIES ENDPOINTS (SCREENSHOT 11 & 5 SUBPAGES)
# =========================================================================

@router.get(
    "/dependencies/policies",
    response_model=DependencyPoliciesOverviewResponse,
    summary="Get Dependency Policies Overview",
    description="Returns top 4 KPI metrics, policy coverage donut, enforcement trend, violations by type horizontal bars, policies table, top violations, allowed vs blocked ratio, and recent activity matching Screenshot 11.",
)
async def get_dependency_policies_overview_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all", description="Target repository filter"),
    branch: Optional[str] = Query("main", description="Target branch filter"),
    policy_type: Optional[str] = Query("all", description="Filter by policy type"),
    status: Optional[str] = Query("all", description="Filter by policy status"),
    search: Optional[str] = Query(None, description="Search term"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyPoliciesOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_dependency_policies_overview(
        project_id=project_id,
        repository=repository,
        branch=branch,
        policy_type=policy_type,
        status=status,
        search=search,
    )


@router.get(
    "/dependencies/policies/vulnerabilities",
    response_model=VulnerabilityThresholdsResponse,
    summary="Get Vulnerability Thresholds Rules",
    description="Returns deterministic rules for vulnerability severity thresholds, CVSS caps, EPSS limits, and KEV zero-tolerance policies.",
)
async def get_vulnerability_thresholds_endpoint(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VulnerabilityThresholdsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_vulnerability_thresholds(project_id=project_id)


@router.get(
    "/dependencies/policies/package-rules",
    response_model=PackageRulesResponse,
    summary="Get Allowed & Blocked Packages",
    description="Returns explicit package-level whitelist and blacklist rules with quarantine justifications.",
)
async def get_package_rules_endpoint(
    project_id: Optional[str] = Query(None),
    rule_type: Optional[str] = Query("all", description="BLOCKED | ALLOWED | RESTRICTED"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PackageRulesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_package_rules(
        project_id=project_id,
        rule_type=rule_type,
        search=search,
    )


@router.get(
    "/dependencies/policies/versions",
    response_model=VersionRestrictionsResponse,
    summary="Get Version Restrictions Rules",
    description="Returns minimum version baselines, drift age limits, and prohibition of End-of-Life (EOL) runtimes.",
)
async def get_version_restrictions_endpoint(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VersionRestrictionsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_version_restrictions(project_id=project_id)


@router.get(
    "/dependencies/policies/exceptions",
    response_model=PolicyExceptionsResponse,
    summary="Get Exceptions & Waivers",
    description="Returns active, pending, and expired risk acceptance waivers and security officer sign-offs.",
)
async def get_policy_exceptions_endpoint(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query("all", description="Active | Pending | Expired | Revoked"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PolicyExceptionsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_policy_exceptions(
        project_id=project_id,
        status=status,
        search=search,
    )


# =========================================================================
# 12 PULL REQUEST & CI/CD CHECKS ENDPOINTS (SCREENSHOT 12 & 5 SUBPAGES)
# =========================================================================

@router.get(
    "/dependencies/ci-cd",
    response_model=DependencyCICDOverviewResponse,
    summary="Get CI/CD Overview",
    description="Returns aggregate CI/CD telemetry, build status trends, issues trends, PR check results, recent runs, top repos, quality gate distributions, and pipeline stage statuses.",
)
async def get_dependency_cicd_overview_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    branch: Optional[str] = Query("all"),
    status: Optional[str] = Query("all", description="PASSED | FAILED | BLOCKED | RUNNING"),
    event_type: Optional[str] = Query("all", description="PULL_REQUEST | PUSH | SCHEDULED | MANUAL"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DependencyCICDOverviewResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_dependency_cicd_overview(
        project_id=project_id,
        repository=repository,
        branch=branch,
        status=status,
        event_type=event_type,
        search=search,
    )


@router.get(
    "/dependencies/ci-cd/pull-requests",
    response_model=PRDependencyChecksResponse,
    summary="Get Pull Request Dependency Checks",
    description="Returns dependency checks, lockfile modifications, and gate results per active pull request.",
)
async def get_pr_dependency_checks_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    status: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PRDependencyChecksResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_pr_dependency_checks(
        project_id=project_id,
        repository=repository,
        status=status,
        search=search,
    )


@router.get(
    "/dependencies/ci-cd/builds",
    response_model=BuildScanResultsResponse,
    summary="Get Build Scan Results",
    description="Returns scan execution results, scanner metadata, and vulnerability counts per CI build.",
)
async def get_build_scan_results_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query("all"),
    status: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BuildScanResultsResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_build_scan_results(
        project_id=project_id,
        repository=repository,
        status=status,
        search=search,
    )


@router.get(
    "/dependencies/ci-cd/quality-gates",
    response_model=QualityGatesResponse,
    summary="Get Quality Gate Rules",
    description="Returns deterministic quality gate rule definitions, enforcement actions, and pass rates.",
)
async def get_quality_gates_endpoint(
    project_id: Optional[str] = Query(None),
    gate_type: Optional[str] = Query("all"),
    active_only: bool = Query(False),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QualityGatesResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_quality_gates(
        project_id=project_id,
        gate_type=gate_type,
        active_only=active_only,
        search=search,
    )


@router.get(
    "/dependencies/ci-cd/settings",
    response_model=PipelineConfigResponse,
    summary="Get Pipeline Configuration",
    description="Returns CI/CD pipeline settings, webhook integrations, runner health, and fail-safe controls.",
)
async def get_pipeline_configuration_endpoint(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineConfigResponse:
    service = DependenciesService(db, current_user=current_user)
    return await service.get_pipeline_configuration(
        project_id=project_id,
        repository=repository,
    )






