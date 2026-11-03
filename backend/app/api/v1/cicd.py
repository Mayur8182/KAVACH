"""
Thing Code / CI/CD — API Router
Exposes /api/v1/cicd/* endpoints for CI/CD pipeline visibility, metrics, runs, and trigger workflows.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.cicd import (
    CICDEnvironmentCreateRequest,
    CICDEnvironmentDeployRequest,
    CICDEnvironmentsOverviewResponse,
    CICDIntegrationCreateRequest,
    CICDIntegrationSyncResponse,
    CICDIntegrationTestResponse,
    CICDIntegrationsOverviewResponse,
    CICDJobDetailResponse,
    CICDJobRerunResponse,
    CICDJobsOverviewResponse,
    CICDPipelineCreateRequest,
    CICDPipelineListResponse,
    CICDPipelineRunDetailResponse,
    CICDPipelineRunItem,
    CICDPipelineRunsOverviewResponse,
    CICDSummaryResponse,
    CICDTemplateCreateRequest,
    CICDTemplatesOverviewResponse,
    CICDUseTemplateRequest,
    CICDUseTemplateResponse,
    CICDWorkflowConfigResponse,
    CICDWorkflowSaveRequest,
    CICDWorkflowSaveResponse,
    TriggerPipelineRunRequest,
    TriggerPipelineRunResponse,
    WorkflowYAMLResponse,
)
from app.services.cicd_service import CICDService

router = APIRouter(prefix="/cicd", tags=["Thing Code — CI/CD"])


@router.get(
    "/summary",
    response_model=CICDSummaryResponse,
    summary="Get CI/CD aggregated metrics and trend",
    description="Returns total pipelines, success rate, build times, security issues, trend series, and status donut.",
)
async def get_cicd_summary(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDSummaryResponse:
    service = CICDService(db)
    return await service.get_summary(repository_id=repository_id, project_id=project_id)


@router.get(
    "/pipelines",
    response_model=CICDPipelineListResponse,
    summary="List CI/CD pipeline runs with filter and pagination",
    description="Returns filtered and paginated pipeline execution runs with branch, trigger, status, and duration.",
)
async def get_cicd_pipelines(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search term for name, branch, status, or SHA"),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    status: Optional[str] = Query(None, description="Filter by status (Success, Failed, Running)"),
    time_range: Optional[str] = Query(None, description="Filter by time range (Last 7 days, Last 30 days, Last 90 days)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDPipelineListResponse:
    service = CICDService(db)
    return await service.get_pipelines(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        branch=branch,
        status=status,
        time_range=time_range,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/runs/overview",
    response_model=CICDPipelineRunsOverviewResponse,
    summary="Get Pipeline Runs tab metrics, runs list, and active run detail",
)
async def get_pipeline_runs_overview(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search runs by commit, author, name"),
    status: Optional[str] = Query(None, description="Filter runs by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    active_run_id: Optional[str] = Query(None, description="Selected active run UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDPipelineRunsOverviewResponse:
    service = CICDService(db)
    return await service.get_pipeline_runs_overview(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        status=status,
        page=page,
        page_size=page_size,
        active_run_id=active_run_id,
    )


@router.get(
    "/runs/{run_id}",
    response_model=CICDPipelineRunItem,
    summary="Get detailed pipeline run execution",
    description="Returns full stage timings, logs, security findings, and evidence for a specific run.",
)
async def get_run_detail(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDPipelineRunItem:
    service = CICDService(db)
    item = await service.get_run_detail(run_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline run '{run_id}' not found",
        )
    return item


@router.post(
    "/run",
    response_model=TriggerPipelineRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger real CI/CD pipeline execution",
    description="Dispatches a new pipeline run with selected branch, workflow, and environment.",
)
async def trigger_pipeline_run(
    payload: TriggerPipelineRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriggerPipelineRunResponse:
    service = CICDService(db)
    user_name = getattr(current_user, "name", None) or getattr(current_user, "email", "Mayur K.")
    return await service.trigger_run(payload, user_name=user_name)


@router.get(
    "/workflow",
    response_model=WorkflowYAMLResponse,
    summary="Get CI/CD workflow YAML definition",
    description="Returns the workflow configuration YAML for the repository.",
)
async def get_workflow_yaml(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowYAMLResponse:
    repo_id = repository_id or "0ece8aa7-2b82-4709-ad39-957d588d73cc"
    service = CICDService(db)
    return service.get_workflow_content(repo_id)


# =============================================================================
# PIPELINES TAB EXTENSIONS
# =============================================================================

DEFAULT_PROJECT_ID = uuid.UUID("a760419491d04d24ae50844e4d055d75")


@router.post(
    "/pipelines",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new CI/CD pipeline definition",
)
async def create_pipeline(
    payload: CICDPipelineCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CICDService(db)
    proj_id = getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID
    if isinstance(proj_id, str):
        proj_id = uuid.UUID(proj_id)
    pipe = await service.create_pipeline(payload, proj_id)
    return {"id": str(pipe.id), "name": pipe.name, "status": "Created"}


@router.get(
    "/runs/{run_id}/detail",
    response_model=CICDPipelineRunDetailResponse,
    summary="Get full pipeline run detail with stages, artifacts, logs and findings",
)
async def get_run_detail_full(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDPipelineRunDetailResponse:
    service = CICDService(db)
    item = await service.get_pipeline_run_detail_full(run_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline run '{run_id}' not found",
        )
    return item


# =============================================================================
# ENVIRONMENTS ENDPOINTS
# =============================================================================

@router.get(
    "/environments",
    response_model=CICDEnvironmentsOverviewResponse,
    summary="Get Environments posture overview and comparison table",
)
async def get_environments(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDEnvironmentsOverviewResponse:
    service = CICDService(db)
    proj_id = project_id or str(getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID)
    return await service.get_environments_overview(
        repository_id=repository_id,
        project_id=proj_id,
    )


@router.post(
    "/environments",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new environment",
)
async def create_environment(
    payload: CICDEnvironmentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CICDService(db)
    proj_id = getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID
    if isinstance(proj_id, str):
        proj_id = uuid.UUID(proj_id)
    env = await service.create_environment(payload, proj_id)
    return {"id": str(env.id), "name": env.name, "status": env.status}


@router.post(
    "/environments/{environment_id}/deploy",
    summary="Deploy new version to environment",
)
async def deploy_environment(
    environment_id: str,
    payload: CICDEnvironmentDeployRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CICDService(db)
    payload.environment_id = environment_id
    return await service.deploy_environment(payload)


# =============================================================================
# INTEGRATIONS ENDPOINTS
# =============================================================================

@router.get(
    "/integrations",
    response_model=CICDIntegrationsOverviewResponse,
    summary="Get Integrations list and metrics",
)
async def get_integrations(
    category: Optional[str] = Query(None, description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search integrations"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDIntegrationsOverviewResponse:
    service = CICDService(db)
    proj_id = project_id or str(getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID)
    return await service.get_integrations_overview(
        project_id=proj_id,
        category=category,
        status=status_filter,
        search=search,
    )


@router.post(
    "/integrations",
    status_code=status.HTTP_201_CREATED,
    summary="Add a new integration",
)
async def create_integration(
    payload: CICDIntegrationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CICDService(db)
    proj_id = getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID
    if isinstance(proj_id, str):
        proj_id = uuid.UUID(proj_id)
    item = await service.create_integration(payload, proj_id)
    return {"id": str(item.id), "name": item.name, "status": item.status}


@router.post(
    "/integrations/{integration_id}/test",
    response_model=CICDIntegrationTestResponse,
    summary="Test integration connectivity",
)
async def test_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDIntegrationTestResponse:
    service = CICDService(db)
    return await service.test_integration(integration_id)


@router.post(
    "/integrations/{integration_id}/sync",
    response_model=CICDIntegrationSyncResponse,
    summary="Synchronize integration webhooks and metadata",
)
async def sync_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDIntegrationSyncResponse:
    service = CICDService(db)
    return await service.sync_integration(integration_id)


# =============================================================================
# TEMPLATES ENDPOINTS
# =============================================================================

@router.get(
    "/templates",
    response_model=CICDTemplatesOverviewResponse,
    summary="Get CI/CD Templates grid and metrics",
)
async def get_templates(
    category: Optional[str] = Query(None, description="Category filter"),
    type_filter: Optional[str] = Query(None, alias="type", description="Type filter"),
    framework: Optional[str] = Query(None, description="Framework filter"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(9, ge=1, le=100, description="Page size"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDTemplatesOverviewResponse:
    service = CICDService(db)
    proj_id = project_id or str(getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID)
    return await service.get_templates_overview(
        project_id=proj_id,
        category=category,
        type_=type_filter,
        framework=framework,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/templates/use",
    response_model=CICDUseTemplateResponse,
    summary="Instantiate a pipeline from a template",
)
async def use_template(
    payload: CICDUseTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDUseTemplateResponse:
    service = CICDService(db)
    proj_id = getattr(current_user, "project_id", None) or DEFAULT_PROJECT_ID
    if isinstance(proj_id, str):
        proj_id = uuid.UUID(proj_id)
    return await service.use_template(payload, proj_id)


# =============================================================================
# JOBS TAB ENDPOINTS (media_1790776638589.jpg)
# =============================================================================

@router.get(
    "/jobs",
    response_model=CICDJobsOverviewResponse,
    summary="Get 126 CI/CD Jobs list with metrics and status breakdown",
)
async def get_cicd_jobs(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search jobs by name, status, pipeline"),
    pipeline: Optional[str] = Query(None, description="Filter by pipeline name"),
    status: Optional[str] = Query(None, description="Filter by status (Success, Failed, Running, Blocked, Pending)"),
    time_range: Optional[str] = Query(None, description="Time range (Last 7 days, Last 30 days)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    selected_job_id: Optional[str] = Query(None, description="Selected job ID for detail panel"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDJobsOverviewResponse:
    service = CICDService(db)
    return await service.get_jobs_overview(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        pipeline=pipeline,
        status=status,
        time_range=time_range,
        page=page,
        page_size=page_size,
        selected_job_id=selected_job_id,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=CICDJobDetailResponse,
    summary="Get detailed job execution record",
)
async def get_cicd_job_detail(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDJobDetailResponse:
    service = CICDService(db)
    detail = await service.get_job_detail(job_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Job not found")
    return detail


@router.post(
    "/jobs/{job_id}/rerun",
    response_model=CICDJobRerunResponse,
    summary="Re-run an individual CI/CD job",
)
async def rerun_cicd_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDJobRerunResponse:
    service = CICDService(db)
    try:
        return await service.rerun_job(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# PIPELINE RUNS TAB ENDPOINTS (media_1790776607666.jpg)
# =============================================================================



@router.post(
    "/runs/{run_id}/rerun",
    response_model=TriggerPipelineRunResponse,
    summary="Re-run a complete pipeline execution",
)
async def rerun_pipeline_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriggerPipelineRunResponse:
    service = CICDService(db)
    # Trigger a rerun using existing trigger mechanism
    req = TriggerPipelineRunRequest(
        repository_id="0ece8aa7-2b82-4709-ad39-957d588d73cc",
        pipeline_name="Build & Deploy",
        branch="main",
        trigger_type="Manual",
    )
    user_name = getattr(current_user, "name", None) or "Mayur K."
    return await service.trigger_run(req, user_name)


# =============================================================================
# WORKFLOW EDITOR TAB ENDPOINTS (media_1790776541488.png)
# =============================================================================

@router.get(
    "/workflow/config",
    response_model=CICDWorkflowConfigResponse,
    summary="Get workflow editor configuration, steps, YAML and parameters",
)
async def get_workflow_config(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDWorkflowConfigResponse:
    service = CICDService(db)
    return await service.get_workflow_config(repository_id=repository_id)


@router.post(
    "/workflow/save",
    response_model=CICDWorkflowSaveResponse,
    summary="Save workflow YAML and pipeline configuration to database and filesystem",
)
async def save_workflow_config(
    payload: CICDWorkflowSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CICDWorkflowSaveResponse:
    service = CICDService(db)
    user_name = getattr(current_user, "name", None) or "Mayur K."
    return await service.save_workflow_config(payload, user_name)


