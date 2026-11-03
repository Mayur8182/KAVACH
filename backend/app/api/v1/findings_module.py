"""
Thing SAST — Findings Module Router
Exposes /findings/* endpoints strictly matching Section 31 requirements.
Includes Finding List, Filters, Search, Severity, Status, Category & Repository matrix,
Detail, Actions, and Exports.
All endpoints require authentication and enforce multi-tenant isolation.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

from app.schemas.findings_module import (
    SecurityFindingItem,
    FindingListResponse,
    FindingSummaryResponse,
    SeverityViewResponse,
    StatusViewResponse,
    CategoryViewResponse,
    RepositoryViewResponse,
    AssignFindingRequest,
    ChangeStatusRequest,
    CreateIssueRequest,
    CreateIssueResponse,
    CreatePRResponse,
)
from app.services.findings_module_service import FindingsModuleService
from app.services.finding_service import FindingService

router = APIRouter(tags=["Thing Code — SAST Findings Module"])


@router.get("", response_model=FindingListResponse, summary="List findings with filters & pagination")
async def get_findings(
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    rule_id: Optional[str] = Query(None),
    cwe_id: Optional[str] = Query(None),
    file_path: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    return await service.get_findings(
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        severity=severity,
        status=status_filter,
        category=category,
        rule_id=rule_id,
        cwe_id=cwe_id,
        file_path=file_path,
        author=author,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=FindingListResponse, summary="Search findings across multiple attributes")
async def search_findings(
    q: Optional[str] = Query("", alias="q"),
    query: Optional[str] = Query(None, alias="query"),
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search_term = q or query or ""
    service = FindingsModuleService(db, current_user)
    return await service.get_findings(
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        severity=severity,
        status=status_filter,
        category=category,
        search=search_term,
        page=page,
        page_size=page_size,
    )


@router.get("/summary", response_model=FindingSummaryResponse, summary="Get dynamic filter counts and overview")
async def get_findings_summary(
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    return await service.get_summary(
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        severity=severity,
        status=status_filter,
        category=category,
        date_range=date_range,
        search=search,
    )


@router.get("/severity", response_model=SeverityViewResponse, summary="Findings by Severity with pill counts")
async def get_findings_by_severity(
    severity: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    return await service.get_severity_view(
        severity_filter=severity,
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        status=status_filter,
        category=category,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/status", response_model=StatusViewResponse, summary="Findings by Status with pill counts")
async def get_findings_by_status(
    status_filter: Optional[str] = Query(None, alias="status"),
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    return await service.get_status_view(
        status_filter=status_filter,
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        severity=severity,
        category=category,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/categories", response_model=CategoryViewResponse, summary="Matrix: Category x Severity counts")
async def get_category_matrix(
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_range: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    return await service.get_category_matrix(
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        status=status_filter,
        date_range=date_range,
    )


@router.get("/repositories", response_model=RepositoryViewResponse, summary="Matrix: Repository x Severity counts")
async def get_repository_matrix(
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_range: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    return await service.get_repository_matrix(
        project_id=project_id,
        organization_id=organization_id,
        branch=branch,
        status=status_filter,
        date_range=date_range,
    )


@router.get("/trends", summary="Finding trends over time")
async def get_finding_trends(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.code.sast_service import SASTService
    service = SASTService(db, current_user)
    return await service.get_trends(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        date_range=date_range,
    )


@router.get("/export", summary="Export real findings as CSV or JSON")
async def export_findings(
    format: Optional[str] = Query("csv"),
    project_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    media_type, filename, content = await service.export_findings(
        format=format or "csv",
        project_id=project_id,
        organization_id=organization_id,
        repository=repository,
        branch=branch,
        severity=severity,
        status=status_filter,
        category=category,
        search=search,
    )
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=content, media_type=media_type, headers=headers)


@router.get("/{finding_id}", response_model=SecurityFindingItem, summary="Get finding detail by ID")
async def get_finding_by_id(
    finding_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    item = await service.get_finding_by_id(finding_id, project_id=project_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security finding '{finding_id}' not found or access denied.",
        )
    return item


@router.patch("/{finding_id}", response_model=SecurityFindingItem, summary="Update finding status or metadata")
async def patch_finding(
    finding_id: str,
    payload: ChangeStatusRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    updated = await service.update_finding_status(
        finding_id=finding_id,
        new_status=payload.status,
        resolution_note=payload.resolution_note,
        project_id=project_id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found or access denied.",
        )
    return updated


@router.post("/{finding_id}/assign", response_model=SecurityFindingItem, summary="Assign finding to engineer")
async def assign_finding(
    finding_id: str,
    payload: AssignFindingRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    updated = await service.assign_finding(
        finding_id=finding_id,
        assigned_to=payload.assigned_to,
        project_id=project_id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found or access denied.",
        )
    return updated


@router.post("/{finding_id}/resolve", response_model=SecurityFindingItem, summary="Mark finding resolved")
async def resolve_finding(
    finding_id: str,
    payload: Optional[ChangeStatusRequest] = None,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = payload.resolution_note if payload else "Resolved by security review"
    service = FindingsModuleService(db, current_user)
    updated = await service.update_finding_status(
        finding_id=finding_id,
        new_status="resolved",
        resolution_note=note,
        project_id=project_id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return updated


@router.post("/{finding_id}/false-positive", response_model=SecurityFindingItem, summary="Mark finding as false positive")
async def mark_false_positive(
    finding_id: str,
    payload: Optional[ChangeStatusRequest] = None,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = payload.resolution_note if payload else "Marked as False Positive"
    service = FindingsModuleService(db, current_user)
    updated = await service.update_finding_status(
        finding_id=finding_id,
        new_status="false_positive",
        resolution_note=note,
        project_id=project_id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return updated


@router.post("/{finding_id}/ignore", response_model=SecurityFindingItem, summary="Ignore finding")
async def ignore_finding(
    finding_id: str,
    payload: Optional[ChangeStatusRequest] = None,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = payload.resolution_note if payload else "Ignored"
    service = FindingsModuleService(db, current_user)
    updated = await service.update_finding_status(
        finding_id=finding_id,
        new_status="ignored",
        resolution_note=note,
        project_id=project_id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return updated


@router.post("/{finding_id}/reopen", response_model=SecurityFindingItem, summary="Reopen finding")
async def reopen_finding(
    finding_id: str,
    payload: Optional[ChangeStatusRequest] = None,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = payload.resolution_note if payload else "Reopened"
    service = FindingsModuleService(db, current_user)
    updated = await service.update_finding_status(
        finding_id=finding_id,
        new_status="open",
        resolution_note=note,
        project_id=project_id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return updated


@router.post("/{finding_id}/issue", response_model=CreateIssueResponse, summary="Create issue in GitHub/GitLab/Jira")
async def create_issue(
    finding_id: str,
    payload: Optional[CreateIssueRequest] = None,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FindingsModuleService(db, current_user)
    integration = payload.integration if payload else "github"
    title = payload.title if payload else None
    desc = payload.description if payload else None
    labels = payload.labels if payload else None
    return await service.create_issue(
        finding_id=finding_id,
        integration=integration,
        title=title,
        description=desc,
        labels=labels,
        project_id=project_id,
    )


@router.post("/{finding_id}/autofix", summary="Execute closed-loop AutoFix with Antigravity / AI Provider and verification re-scan")
async def execute_autofix(
    finding_id: str,
    dry_run: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.ai_remediation_orchestrator import AIRemediationOrchestrator
    orchestrator = AIRemediationOrchestrator(db)
    return await orchestrator.execute_closed_loop_autofix(finding_id, current_user, dry_run=dry_run)


@router.post("/{finding_id}/fix", summary="Run AST remediation check or propose patch")
async def create_fix(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.ai_remediation_orchestrator import AIRemediationOrchestrator
    orchestrator = AIRemediationOrchestrator(db)
    return await orchestrator.execute_closed_loop_autofix(finding_id, current_user, dry_run=False)


@router.post("/{finding_id}/pr", summary="Create remediation pull request")
async def create_pr(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FindingService(db)
    return await service.create_pr(finding_id, None, "Remediate Security Finding", "security-fix", current_user)
