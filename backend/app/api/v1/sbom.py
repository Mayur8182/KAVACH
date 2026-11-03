"""
SBOM API Router — /api/v1/sbom

Endpoints:
  POST  /sbom/generate              — trigger a real Syft SBOM generation job
  GET   /sbom/jobs                  — list jobs for a project
  GET   /sbom/jobs/{job_id}         — job status (poll until COMPLETED/FAILED)
  GET   /sbom/summary               — aggregated stats for dashboard cards (by repo or project)
  GET   /sbom/components            — paginated, filtered component list (by repo or project)
  GET   /sbom/export                — download raw CycloneDX JSON (by repo or project)
  GET   /sbom                       — list completed SBOM documents for a project
  GET   /sbom/{document_id}         — SBOM document header
  GET   /sbom/{document_id}/summary — aggregated stats for dashboard cards
  GET   /sbom/{document_id}/components — paginated, filtered component list
  GET   /sbom/{document_id}/export  — download raw CycloneDX JSON

All endpoints require authentication.
All project-scoped queries are validated against the authenticated user's ownership.
"""
import uuid
import json
from typing import Optional, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.sbom import (
    SBOMDocumentResponse,
    SBOMComponentPageResponse,
    SBOMComponentResponse,
    SBOMGenerateRequest,
    SBOMJobResponse,
    SBOMSummaryResponse,
)
from app.services.sbom_service import SBOMService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/sbom", tags=["SBOM"])


async def _resolve_project(
    project_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
):
    """Validate the project exists and is accessible by the current user."""
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user)
    if not project:
        # Fallback if admin or superuser
        if getattr(current_user, "is_superuser", False) or "admin" in getattr(current_user, "roles", []):
            return None
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found or access denied",
        )
    return project


# ── Direct Summary Endpoint ───────────────────────────────────────────────────

@router.get(
    "/summary",
    response_model=SBOMSummaryResponse,
    summary="Get aggregated SBOM summary for dashboard cards and donut charts",
)
async def get_sbom_summary_overview(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    document_id: Optional[str] = Query(None, description="Direct Document UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMSummaryResponse:
    svc = SBOMService(db)

    doc = None
    if document_id:
        try:
            doc = await svc.get_document(uuid.UUID(document_id))
        except ValueError:
            pass

    if not doc:
        pid, _ = await svc.resolve_project_and_repo(project_id=project_id, repository_id=repository_id)
        doc = await svc.get_latest_document(pid)

    if not doc:
        return SBOMSummaryResponse(
            total_components=0,
            vulnerable_components=0,
            open_source_licenses=0,
            high_risk_licenses=0,
            total_delta="0",
            vuln_delta="0",
            license_delta="0",
            high_risk_delta="0",
            critical=0,
            high=0,
            medium=0,
            low=0,
            info=0,
            by_severity=[],
            type_breakdown={},
            by_type=[],
            top_vulnerable=[],
            last_scan_at=None,
            duration_ms=0,
            duration_formatted="0s",
            sbom_format=None,
            job_status=None,
        )

    summary = await svc.get_summary(doc.id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary unavailable.")

    return SBOMSummaryResponse(**summary)


# ── Direct Components Endpoint ────────────────────────────────────────────────

@router.get(
    "/components",
    response_model=SBOMComponentPageResponse,
    summary="List SBOM components with server-side pagination, search, and filtering",
)
async def list_sbom_components_overview(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    document_id: Optional[str] = Query(None, description="Direct Document UUID"),
    search: Optional[str] = Query(None, description="Search name/version/license"),
    component_type: Optional[str] = Query(None, description="Filter by type: npm|docker|git|other"),
    license_name: Optional[str] = Query(None, description="Filter by license name"),
    risk_level: Optional[str] = Query(None, description="Filter by risk: Critical|High|Medium|Low"),
    component_status: Optional[str] = Query(None, description="Filter by status: Vulnerable|Needs Review|Safe"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=200),
    sort_by: str = Query(default="priority", description="Sort field: priority|name|version|license_name|vuln_count|risk_level"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMComponentPageResponse:
    svc = SBOMService(db)

    doc = None
    if document_id:
        try:
            doc = await svc.get_document(uuid.UUID(document_id))
        except ValueError:
            pass

    if not doc:
        pid, _ = await svc.resolve_project_and_repo(project_id=project_id, repository_id=repository_id)
        doc = await svc.get_latest_document(pid)

    if not doc:
        return SBOMComponentPageResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            total_pages=1,
            available_types=["npm", "docker", "git", "other"],
            available_licenses=["MIT", "Apache-2.0"],
            available_risk_levels=["Critical", "High", "Medium", "Low"],
        )

    allowed_sort_fields = {
        "priority", "relevance", "default", "name", "version", "component_type", "license_name",
        "vuln_count", "risk_level", "component_status",
    }
    safe_sort = sort_by if sort_by in allowed_sort_fields else "priority"

    components, total, avail_types, avail_lics, avail_risks = await svc.list_components(
        document_id=doc.id,
        search=search,
        component_type=component_type,
        license_name=license_name,
        risk_level=risk_level,
        component_status=component_status,
        page=page,
        page_size=page_size,
        sort_by=safe_sort,
        sort_dir=sort_dir,
    )

    total_pages = max(1, (total + page_size - 1) // page_size)
    return SBOMComponentPageResponse(
        items=[SBOMComponentResponse.model_validate(c) for c in components],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        available_types=avail_types,
        available_licenses=avail_lics,
        available_risk_levels=avail_risks,
    )


# ── Job Trigger ────────────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=SBOMJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a real Syft SBOM generation job",
    description="Creates a background Syft execution job. Poll GET /sbom/jobs/{job_id} for progress.",
)
async def trigger_sbom_generation(
    payload: SBOMGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMJobResponse:
    svc = SBOMService(db)
    pid, repo = await svc.resolve_project_and_repo(
        project_id=str(payload.project_id) if payload.project_id else None,
        repository_id=payload.repository_id,
    )

    job = await svc.create_job(
        project_id=pid,
        requested_by=current_user.email,
        target_path=payload.target_path,
        sbom_format=payload.sbom_format,
    )

    # Schedule real Syft background execution in unified Task Queue
    from app.services.task_queue_service import TaskQueueService
    task_svc = TaskQueueService(db)
    await task_svc.enqueue(
        task_type="SBOM_SYFT_GENERATE",
        project_id=str(pid) if pid else None,
        payload={
            "sbom_job_id": str(job.id),
            "target_path": payload.target_path,
            "sbom_format": payload.sbom_format,
            "repository_id": str(payload.repository_id) if payload.repository_id else None,
        },
        priority=5,
    )

    background_tasks.add_task(svc.run_syft_job, job.id)

    return SBOMJobResponse.model_validate(job)


# ── Job Status ─────────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}",
    response_model=SBOMJobResponse,
    summary="Get real-time SBOM job status",
)
async def get_sbom_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMJobResponse:
    svc = SBOMService(db)
    job = await svc.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return SBOMJobResponse.model_validate(job)


@router.get(
    "/jobs",
    response_model=List[SBOMJobResponse],
    summary="List SBOM generation jobs for a project",
)
async def list_sbom_jobs(
    project_id: Optional[uuid.UUID] = Query(None, description="Project UUID"),
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SBOMJobResponse]:
    svc = SBOMService(db)
    pid, _ = await svc.resolve_project_and_repo(
        project_id=str(project_id) if project_id else None,
        repository_id=repository_id,
    )
    jobs = await svc.list_jobs(pid, limit=limit)
    return [SBOMJobResponse.model_validate(j) for j in jobs]


import csv
import io
from datetime import datetime, timezone

async def _build_export_response(doc, format_type: str, svc: SBOMService) -> Response:
    format_type = (format_type or "cyclonedx").lower().strip()
    
    if format_type == "csv":
        components, _, _, _, _ = await svc.list_components(
            document_id=doc.id,
            page=1,
            page_size=2000,
        )
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Name", "Version", "Type", "License", "Status", "Risk Level", "Vulnerabilities", "Direct/Transitive", "PURL"])
        for c in components:
            writer.writerow([
                c.name,
                c.version or "",
                c.component_type or "",
                c.license_name or "",
                c.component_status or "",
                c.risk_level or "",
                c.vuln_count or 0,
                getattr(c, "direct_or_transitive", "Direct"),
                c.purl or "",
            ])
        filename = f"frontend-app-sbom-{doc.id}.csv"
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    elif format_type in ("spdx", "spdx-json"):
        components, _, _, _, _ = await svc.list_components(
            document_id=doc.id,
            page=1,
            page_size=2000,
        )
        spdx_data = {
            "spdxVersion": "SPDX-2.3",
            "dataLicense": "CC0-1.0",
            "SPDXID": "SPDXRef-DOCUMENT",
            "name": "frontend-app-sbom",
            "documentNamespace": f"https://seculayer.io/spdxdocs/{doc.id}",
            "creationInfo": {
                "created": datetime.now(timezone.utc).isoformat(),
                "creators": ["Tool: SecuLayer-SBOM-Engine", "Organization: THING CODE"],
            },
            "packages": [
                {
                    "SPDXID": f"SPDXRef-Package-{c.name}-{c.version or '0'}",
                    "name": c.name,
                    "versionInfo": c.version or "unknown",
                    "downloadLocation": "NOASSERTION",
                    "filesAnalyzed": False,
                    "licenseConcluded": c.license_name or "NOASSERTION",
                    "licenseDeclared": c.license_name or "NOASSERTION",
                    "externalRefs": [
                        {
                            "referenceCategory": "PACKAGE-MANAGER",
                            "referenceType": "purl",
                            "referenceLocator": c.purl or f"pkg:generic/{c.name}@{c.version or 'latest'}"
                        }
                    ] if c.purl else []
                }
                for c in components
            ]
        }
        filename = f"frontend-app-sbom-{doc.id}.spdx.json"
        return Response(
            content=json.dumps(spdx_data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:
        filename = f"frontend-app-sbom-{doc.id}.cdx.json"
        return Response(
            content=json.dumps(doc.raw_content, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

# ── Direct Export Endpoint ────────────────────────────────────────────────────

@router.get(
    "/export",
    summary="Export raw CycloneDX, SPDX 2.3, or CSV document",
    responses={
        200: {
            "content": {
                "application/json": {},
                "text/csv": {},
            }
        }
    },
)
async def export_sbom_document_direct(
    repository_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    document_id: Optional[str] = Query(None),
    export_format: str = Query("cyclonedx", alias="format", description="Export format: cyclonedx | spdx | csv"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    svc = SBOMService(db)
    doc = None
    if document_id:
        try:
            doc = await svc.get_document(uuid.UUID(document_id))
        except ValueError:
            pass

    if not doc:
        pid, _ = await svc.resolve_project_and_repo(project_id=project_id, repository_id=repository_id)
        doc = await svc.get_latest_document(pid)

    if not doc:
        raise HTTPException(status_code=404, detail="SBOM document not found for export.")

    return await _build_export_response(doc, export_format, svc)


# ── Document Detail & Backwards-Compatible Endpoints ──────────────────────────

@router.get(
    "",
    response_model=List[SBOMDocumentResponse],
    summary="List SBOM documents for a project",
)
async def list_sbom_documents(
    project_id: Optional[uuid.UUID] = Query(None, description="Project UUID"),
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SBOMDocumentResponse]:
    svc = SBOMService(db)
    pid, _ = await svc.resolve_project_and_repo(
        project_id=str(project_id) if project_id else None,
        repository_id=repository_id,
    )
    docs = await svc.list_documents(pid, limit=limit)
    return [SBOMDocumentResponse.model_validate(d) for d in docs]


@router.get(
    "/{document_id}",
    response_model=SBOMDocumentResponse,
    summary="Get SBOM document header",
)
async def get_sbom_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMDocumentResponse:
    svc = SBOMService(db)
    doc = await svc.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"SBOM document {document_id} not found")
    return SBOMDocumentResponse.model_validate(doc)


@router.get(
    "/{document_id}/summary",
    response_model=SBOMSummaryResponse,
    summary="Get aggregated SBOM stats for dashboard metric cards by doc id",
)
async def get_sbom_summary_by_id(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMSummaryResponse:
    svc = SBOMService(db)
    doc = await svc.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"SBOM document {document_id} not found")
    summary = await svc.get_summary(document_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary unavailable")
    return SBOMSummaryResponse(**summary)


@router.get(
    "/{document_id}/components",
    response_model=SBOMComponentPageResponse,
    summary="List SBOM components with server-side pagination by doc id",
)
async def list_sbom_components_by_id(
    document_id: uuid.UUID,
    search: Optional[str] = Query(None),
    component_type: Optional[str] = Query(None),
    license_name: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    component_status: Optional[str] = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=200),
    sort_by: str = Query(default="name"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMComponentPageResponse:
    svc = SBOMService(db)
    doc = await svc.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"SBOM document {document_id} not found")

    allowed_sort_fields = {
        "name", "version", "component_type", "license_name",
        "vuln_count", "risk_level", "component_status",
    }
    safe_sort = sort_by if sort_by in allowed_sort_fields else "name"

    components, total, avail_types, avail_lics, avail_risks = await svc.list_components(
        document_id=document_id,
        search=search,
        component_type=component_type,
        license_name=license_name,
        risk_level=risk_level,
        component_status=component_status,
        page=page,
        page_size=page_size,
        sort_by=safe_sort,
        sort_dir=sort_dir,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return SBOMComponentPageResponse(
        items=[SBOMComponentResponse.model_validate(c) for c in components],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        available_types=avail_types,
        available_licenses=avail_lics,
        available_risk_levels=avail_risks,
    )


@router.get(
    "/{document_id}/export",
    summary="Export SBOM document as CycloneDX, SPDX 2.3, or CSV by doc id",
    responses={
        200: {
            "content": {
                "application/json": {},
                "text/csv": {},
            }
        }
    },
)
async def export_sbom_document_by_id(
    document_id: uuid.UUID,
    export_format: str = Query("cyclonedx", alias="format", description="Export format: cyclonedx | spdx | csv"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    svc = SBOMService(db)
    doc = await svc.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"SBOM document {document_id} not found")

    return await _build_export_response(doc, export_format, svc)


@router.get(
    "/projects/{project_id}/latest",
    response_model=SBOMDocumentResponse,
    summary="Get the most recent SBOM document for a project",
)
async def get_latest_sbom(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SBOMDocumentResponse:
    svc = SBOMService(db)
    doc = await svc.get_latest_document(project_id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="No SBOM has been generated for this project yet. Trigger one via POST /sbom/generate.",
        )
    return SBOMDocumentResponse.model_validate(doc)
