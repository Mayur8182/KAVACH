import csv
import io
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.schemas.hotspot import (
    AddCommentRequest,
    AssignUserRequest,
    CreateIssueRequest,
    HotspotCodeResponse,
    HotspotDetailResponse,
    HotspotListResponse,
    HotspotSummaryResponse,
    TriggerScanRequest,
    UpdateStatusRequest,
)
from app.services.hotspot_service import DEFAULT_ORG_ID, HotspotService

router = APIRouter(tags=["Security Hotspots"])


def resolve_org_id(x_org_id: Optional[str] = None) -> uuid.UUID:
    if x_org_id:
        try:
            return uuid.UUID(x_org_id)
        except Exception:
            pass
    return DEFAULT_ORG_ID


# -----------------------------------------------------------------------------
# Summary & Overview
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/summary",
    response_model=HotspotSummaryResponse,
    summary="Get Security Hotspots Summary Metrics",
    description="Returns aggregate counts of security hotspots (total, to review, acknowledged, safe, fixed) from the real database.",
)
async def get_hotspots_summary(
    workspace_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> HotspotSummaryResponse:
    service = HotspotService(db)
    # Ensure database is seeded with real scan data if fresh
    await service.ensure_seed_hotspots()

    org_uuid = resolve_org_id(x_organization_id)
    ws_uuid = uuid.UUID(workspace_id) if workspace_id else None
    repo_uuid = uuid.UUID(repository_id) if repository_id else None

    summary = await service.get_summary(
        organization_id=org_uuid,
        workspace_id=ws_uuid,
        repository_id=repo_uuid,
    )
    return HotspotSummaryResponse(**summary)


# -----------------------------------------------------------------------------
# Recent Hotspots
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/recent",
    response_model=List[Dict[str, Any]],
    summary="Get Recent Security Hotspots",
    description="Returns the 10 most recently detected security hotspots from the database.",
)
async def get_recent_hotspots(
    limit: int = Query(10, ge=1, le=50),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[Dict[str, Any]]:
    service = HotspotService(db)
    await service.ensure_seed_hotspots()
    org_uuid = resolve_org_id(x_organization_id)
    return await service.get_recent(limit=limit, organization_id=org_uuid)


# -----------------------------------------------------------------------------
# Hotspots List (Filter, Search, Sort, Pagination)
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots",
    response_model=HotspotListResponse,
    summary="List Security Hotspots",
    description="Searches, filters, sorts, and paginates security hotspots persisted in the database.",
)
async def list_hotspots(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> HotspotListResponse:
    service = HotspotService(db)
    await service.ensure_seed_hotspots()

    org_uuid = resolve_org_id(x_organization_id)
    repo_uuid = uuid.UUID(repository_id) if repository_id else None

    result = await service.list_hotspots(
        search=search,
        severity=severity,
        status=status,
        category=category,
        branch=branch,
        repository_id=repo_uuid,
        organization_id=org_uuid,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return HotspotListResponse(**result)


# -----------------------------------------------------------------------------
# Export Hotspots Report (CSV / JSON)
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/export",
    summary="Export Security Hotspots Report",
    description="Downloads a full export of current security hotspots in CSV or JSON format.",
)
async def export_hotspots(
    format: str = Query("csv", pattern="^(csv|json)$"),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    data = await service.list_hotspots(
        severity=severity,
        status=status,
        organization_id=org_uuid,
        page=1,
        page_size=1000,
    )

    if format == "json":
        return data

    # Produce CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Title",
        "File",
        "Lines",
        "Category",
        "Severity",
        "Status",
        "Detected",
        "Branch",
        "Repository",
        "Assignee",
        "CWE",
        "OWASP",
    ])
    for item in data.get("items", []):
        writer.writerow([
            item.get("display_id"),
            item.get("title"),
            item.get("file"),
            item.get("lines"),
            item.get("category"),
            item.get("severity"),
            item.get("status"),
            item.get("detected"),
            item.get("branch"),
            item.get("repository"),
            item.get("assignee"),
            item.get("cwe") or "",
            item.get("owasp") or "",
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=security_hotspots_report.csv"},
    )


# -----------------------------------------------------------------------------
# Trigger SAST Hotspot Scan
# -----------------------------------------------------------------------------
@router.post(
    "/hotspots/scan",
    status_code=status.HTTP_201_CREATED,
    summary="Trigger Real SAST Security Hotspots Scan",
    description="Executes the Rule Engine against actual repository source code, parses patterns, and persists new Security Hotspots.",
)
async def run_hotspots_scan(
    payload: Optional[TriggerScanRequest] = None,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)
    target = payload.target_path if payload else None
    branch = payload.branch if payload else "main"

    scan_result = await service.trigger_scan(
        target_path=target,
        branch=branch,
        organization_id=org_uuid,
        user=current_user,
    )
    return scan_result


# -----------------------------------------------------------------------------
# Hotspot Rules Listing
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/rules",
    summary="List Hotspot Detection Rules",
    description="Retrieves all registered YAML security hotspot rules.",
)
async def list_hotspot_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    rules = await service.get_all_rules()
    return [
        {
            "id": r.id,
            "title": r.title,
            "patterns": r.patterns,
            "severity": r.severity,
            "risk_level": r.risk_level,
            "category": r.category,
            "description": r.description,
            "remediation": r.remediation,
            "cwe": r.cwe,
            "owasp": r.owasp,
            "cvss_score": r.cvss_score,
            "references": r.references,
        }
        for r in rules
    ]


# -----------------------------------------------------------------------------
# Hotspot Detail
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/{hotspot_id}",
    response_model=HotspotDetailResponse,
    summary="Get Security Hotspot Details",
    description="Fetches full detail for a single security hotspot including tags, risk information, and review comments.",
)
async def get_hotspot_detail(
    hotspot_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> HotspotDetailResponse:
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID format")

    h = await service.get_by_id(hs_uuid, org_uuid)

    comments_data = [
        {
            "id": str(c.id),
            "user": c.user_name,
            "comment": c.comment,
            "created_at": c.created_at.strftime("%b %d, %Y, %I:%M %p") if c.created_at else "—",
        }
        for c in (h.comments or [])
    ]

    history_data = [
        {
            "id": str(hist.id),
            "action": hist.action,
            "user": hist.user_name or "system",
            "status": hist.status_at_event or h.status,
            "comment": (hist.metadata_json or {}).get("comment", ""),
            "date_time": hist.created_at.strftime("%b %d, %Y, %I:%M %p") if hist.created_at else "—",
        }
        for hist in (h.history or [])
    ]

    return HotspotDetailResponse(
        id=str(h.id),
        display_id=f"HS-{str(h.id)[:6].upper()}",
        title=h.title,
        description=h.description,
        severity=h.severity,
        risk_level=h.risk_level,
        category=h.category,
        file_path=h.file_path,
        branch=h.branch,
        commit_sha=h.commit_sha,
        start_line=h.start_line,
        end_line=h.end_line,
        code_snippet=h.code_snippet,
        status=h.status,
        assignee_user_id=str(h.assignee_user_id) if h.assignee_user_id else None,
        assignee_name=h.assignee_name or "Unassigned",
        author=h.author or "mayur.bharvad",
        review_comment=h.review_comment,
        tags=h.tags or [],
        cwe=h.cwe,
        owasp=h.owasp,
        cvss_score=h.cvss_score,
        confidence=h.confidence,
        exploit_maturity=h.exploit_maturity,
        references=h.references or [],
        created_at=h.created_at.isoformat() if h.created_at else "",
        updated_at=h.updated_at.isoformat() if h.updated_at else "",
        reviewed_at=h.reviewed_at.isoformat() if h.reviewed_at else None,
        repository_name=h.repository_name or "frontend-app",
        comments=comments_data,
        history=history_data,
    )


# -----------------------------------------------------------------------------
# Code Tab: Real Repository Code (20 lines before / after)
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/{hotspot_id}/code",
    response_model=HotspotCodeResponse,
    summary="Get Hotspot Code with Surrounding Context",
    description="Fetches actual repository code with 20 lines before, dangerous hotspot lines, and 20 lines after.",
)
async def get_hotspot_code(
    hotspot_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> HotspotCodeResponse:
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID")

    code_data = await service.get_code_context(hs_uuid, org_uuid)
    return HotspotCodeResponse(**code_data)


# -----------------------------------------------------------------------------
# Review History Timeline
# -----------------------------------------------------------------------------
@router.get(
    "/hotspots/{hotspot_id}/history",
    summary="Get Complete Review Audit History",
    description="Returns the historical timeline of actions taken on this security hotspot.",
)
async def get_hotspot_history(
    hotspot_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID")

    return await service.get_history(hs_uuid, org_uuid)


# -----------------------------------------------------------------------------
# Review Action: Update Status (Mark Safe, Acknowledge, False Positive, Fixed)
# -----------------------------------------------------------------------------
@router.patch(
    "/hotspots/{hotspot_id}/status",
    summary="Update Hotspot Review Status",
    description="Applies a review status change (SAFE, ACKNOWLEDGED, FALSE_POSITIVE, FIXED, TO_REVIEW) with history and audit logging.",
)
async def update_hotspot_status(
    hotspot_id: str,
    payload: UpdateStatusRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID")

    updated = await service.update_status(
        hotspot_id=hs_uuid,
        new_status=payload.status,
        comment=payload.comment,
        user=current_user,
        organization_id=org_uuid,
    )
    return {
        "success": True,
        "id": str(updated.id),
        "status": updated.status,
        "reviewed_at": updated.reviewed_at.isoformat() if updated.reviewed_at else None,
        "message": f"Hotspot status successfully updated to {updated.status}",
    }


# -----------------------------------------------------------------------------
# Review Action: Assign User
# -----------------------------------------------------------------------------
@router.post(
    "/hotspots/{hotspot_id}/assign",
    summary="Assign Reviewer to Hotspot",
    description="Assigns a security reviewer to this hotspot.",
)
async def assign_hotspot_reviewer(
    hotspot_id: str,
    payload: AssignUserRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID")

    assignee_uuid = None
    if payload.assignee_id:
        try:
            assignee_uuid = uuid.UUID(payload.assignee_id)
        except Exception:
            pass

    assignee_name = payload.assignee_name or payload.user_id or "Security Reviewer"
    updated = await service.assign_user(
        hotspot_id=hs_uuid,
        assignee_id=assignee_uuid,
        assignee_name=assignee_name,
        user=current_user,
        organization_id=org_uuid,
    )
    return {
        "success": True,
        "id": str(updated.id),
        "assignee_name": updated.assignee_name,
        "message": f"Assigned to {updated.assignee_name}",
    }


# -----------------------------------------------------------------------------
# Review Action: Add Review Comment
# -----------------------------------------------------------------------------
@router.post(
    "/hotspots/{hotspot_id}/comments",
    status_code=status.HTTP_201_CREATED,
    summary="Add Review Comment to Hotspot",
    description="Adds a comment to the security review thread.",
)
async def add_hotspot_comment(
    hotspot_id: str,
    payload: AddCommentRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID")

    comment = await service.add_comment(
        hotspot_id=hs_uuid,
        comment_text=payload.comment,
        user=current_user,
        organization_id=org_uuid,
    )
    return {
        "success": True,
        "id": str(comment.id),
        "user": comment.user_name,
        "comment": comment.comment,
        "created_at": comment.created_at.strftime("%b %d, %Y, %I:%M %p") if comment.created_at else "—",
    }


# -----------------------------------------------------------------------------
# Review Action: Create Issue (GitHub / Jira / Linear)
# -----------------------------------------------------------------------------
@router.post(
    "/hotspots/{hotspot_id}/issue",
    summary="Create Issue Ticket for Hotspot",
    description="Dispatches creation of an issue ticket on GitHub, Jira, or Linear.",
)
async def create_hotspot_issue(
    hotspot_id: str,
    payload: CreateIssueRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = HotspotService(db)
    org_uuid = resolve_org_id(x_organization_id)

    try:
        hs_uuid = uuid.UUID(hotspot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Hotspot UUID")

    tracker = payload.tracker or payload.provider or "github"
    result = await service.create_issue(
        hotspot_id=hs_uuid,
        tracker=tracker,
        title=payload.title,
        description=payload.description,
        user=current_user,
        organization_id=org_uuid,
    )
    return result
