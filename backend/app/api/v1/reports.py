"""
Kavach Platform — Central Unified Reports Router
Exposes endpoints for the 13 Enterprise Security Reports catalogue,
live on-demand report generation from PostgreSQL, and instant stream downloads.
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional, get_current_user
from app.models.user import User
from app.schemas.reports import (
    ReportCatalogueResponse,
    ReportCatalogueItem,
    GenerateReportRequest,
    GeneratedReportResponse,
)
from app.services.reporting_engine import ReportingEngineService, REPORT_CATALOGUE

router = APIRouter(prefix="/reports", tags=["Platform Reports & Audit Dossiers"])


@router.get(
    "/catalogue",
    response_model=ReportCatalogueResponse,
    summary="Get Enterprise Security Reports Catalogue (13 Report Types)",
    description="Returns the authoritative inventory of 13 security reports across 7 operational areas.",
)
async def get_reports_catalogue():
    svc = ReportingEngineService(None)
    items = svc.get_catalogue()
    return ReportCatalogueResponse(
        total_reports=len(items),
        reports=[ReportCatalogueItem(**i) for i in items],
    )


@router.get(
    "/types",
    summary="List Available Report Identifiers & Titles",
)
async def list_report_types():
    return [
        {
            "report_id": r["report_id"],
            "name": r["name"],
            "priority": r["priority"],
            "product_area": r["product_area"],
            "formats": r["supported_formats"],
        }
        for r in REPORT_CATALOGUE.values()
    ]


@router.post(
    "/generate",
    response_model=GeneratedReportResponse,
    summary="Generate Authoritative Security Report from Live PostgreSQL Data",
)
async def generate_security_report(
    payload: GenerateReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    svc = ReportingEngineService(db, current_user)
    try:
        report_data = await svc.aggregate_report_data(
            report_id=payload.report_id,
            project_id=payload.project_id,
            repository=payload.repository,
            branch=payload.branch,
            timeframe=payload.timeframe or "30d",
            resource_id=payload.resource_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    meta = report_data["metadata"]
    report_uuid = uuid.uuid4().hex[:12]
    fmt = payload.format.upper()

    download_url = f"/api/v1/reports/download/{payload.report_id}?format={fmt}&project_id={payload.project_id or ''}&timeframe={payload.timeframe or '30d'}"
    preview_url = f"/api/v1/reports/preview/{payload.report_id}?project_id={payload.project_id or ''}&timeframe={payload.timeframe or '30d'}"

    # Calculate posture score from key measures
    score = None
    for km in report_data.get("key_measures", []):
        if km["measure"] == "Overall Posture Score":
            val_str = str(km["value"]).split("/")[0]
            if val_str.isdigit():
                score = int(val_str)
            break

    return GeneratedReportResponse(
        report_uuid=report_uuid,
        report_id=meta["report_id"],
        title=meta["title"],
        format=fmt,
        status="READY",
        generated_at_utc=meta["generated_at_utc"],
        download_url=download_url,
        preview_url=preview_url,
        provenance_hash=report_data["provenance"]["canonical_payload_hash"],
        total_findings=len(report_data.get("findings_register", [])),
        executive_posture_score=score,
    )


@router.get(
    "/download/{report_id}",
    summary="Download Authoritative Security Report (PDF, HTML, SARIF, JSON, CSV)",
)
async def download_security_report(
    report_id: str,
    format: Optional[str] = Query("PDF", description="PDF, HTML, SARIF, CYCLONEDX, CSV, or JSON"),
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query("main"),
    timeframe: Optional[str] = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    svc = ReportingEngineService(db, current_user)
    try:
        report_data = await svc.aggregate_report_data(
            report_id=report_id,
            project_id=project_id,
            repository=repository,
            branch=branch,
            timeframe=timeframe or "30d",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    meta = report_data["metadata"]
    fmt = (format or "PDF").upper().strip()
    safe_name = f"{meta['report_id'].lower()}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    if fmt == "PDF":
        pdf_bytes = svc.generate_pdf(report_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
        )
    elif fmt == "HTML":
        html_str = svc.generate_html(report_data)
        return HTMLResponse(
            content=html_str,
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.html"'},
        )
    elif fmt == "SARIF":
        sarif_str = svc.generate_sarif(report_data)
        return Response(
            content=sarif_str,
            media_type="application/sarif+json",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.sarif"'},
        )
    elif fmt in ("CYCLONEDX", "SPDX"):
        cdx_str = svc.generate_cyclonedx(report_data)
        return Response(
            content=cdx_str,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_cyclonedx.json"'},
        )
    elif fmt == "CSV":
        csv_str = svc.generate_csv(report_data)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.csv"'},
        )
    else:
        # Default JSON
        return Response(
            content=json.dumps(report_data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.json"'},
        )


@router.get(
    "/preview/{report_id}",
    response_class=HTMLResponse,
    summary="Preview Authoritative Report in Browser as Interactive HTML",
)
async def preview_security_report(
    report_id: str,
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query("main"),
    timeframe: Optional[str] = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    svc = ReportingEngineService(db, current_user)
    try:
        report_data = await svc.aggregate_report_data(
            report_id=report_id,
            project_id=project_id,
            repository=repository,
            branch=branch,
            timeframe=timeframe or "30d",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    html_str = svc.generate_html(report_data)
    return HTMLResponse(content=html_str)

