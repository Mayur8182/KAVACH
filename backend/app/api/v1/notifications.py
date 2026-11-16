"""Notification & Email Delivery API Router.

Provides:
- Template Catalog & HTML Preview for all 38 approved templates
- Administrative Email Delivery Monitoring & Audit Logs
- Delivery Retry for Failed Emails
- User Notification Preference Management
- Live Test Dispatching
"""

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.account import UserNotificationPreferences
from app.models.email_models import EmailDeliveryLog
from app.services.email_template_service import email_template_service, EMAIL_TEMPLATES
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications & Email Delivery"])


# =============================================================================
# Schemas
# =============================================================================

class NotificationPreferencesUpdate(BaseModel):
    email_security_alerts: Optional[bool] = None
    email_weekly_digest: Optional[bool] = None
    email_login_alerts: Optional[bool] = None
    email_scan_completed: Optional[bool] = None
    email_policy_violations: Optional[bool] = None
    slack_notifications_enabled: Optional[bool] = None
    slack_webhook_url: Optional[str] = None


class TestSendPayload(BaseModel):
    template_id: str
    recipient_email: EmailStr
    context_override: Optional[Dict[str, Any]] = None


# =============================================================================
# 1. Template Catalog & Live Preview
# =============================================================================

@router.get("/templates")
async def list_email_templates():
    """Lists all 38 approved email templates in the Kavach template library."""
    result = []
    for tid, tpl in EMAIL_TEMPLATES.items():
        result.append({
            "id": tid,
            "category": tpl["category"],
            "category_label": tpl.get("category_label"),
            "subject": tpl["subject_template"],
            "headline": tpl["headline"],
            "badge": tpl.get("badge"),
            "cta_label": tpl.get("cta_label"),
            "detail_fields": [f[0] for f in tpl.get("detail_fields", [])],
        })
    return {"total": len(result), "templates": result}


@router.get("/templates/{template_id}")
async def get_template_detail(template_id: str):
    """Retrieves full specification for a specific template."""
    try:
        tpl = email_template_service.get_template_def(template_id)
        return tpl
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/templates/{template_id}/preview", response_class=HTMLResponse)
async def preview_template_html(
    template_id: str,
    project_name: str = "kavach-core-api",
    user_name: str = "Mayur",
    recipient: str = "mayur@kavachsecurity.me",
):
    """Renders live HTML preview of any of the 38 email templates with realistic sample data."""
    sample_context = {
        "first_name": user_name,
        "user_email": recipient,
        "workspace_name": "Kavach Engineering",
        "plan_name": "Enterprise",
        "project_name": project_name,
        "project_id": "proj_8f92a10b",
        "created_at": "Nov 15, 2026, 02:17 PM (IST)",
        "repository_name": "kavach-security/control-plane",
        "branch": "main",
        "default_branch": "main",
        "commit_hash": "a7d3f2e",
        "actor_email": recipient,
        "scan_id": "scan_4f92d81a",
        "scan_type": "SAST & Container Reachability",
        "scan_target": "kavach-security/control-plane:main",
        "started_at": "Nov 15, 2026, 02:15 PM (IST)",
        "completed_at": "Nov 15, 2026, 02:17 PM (IST)",
        "duration": "1m 42s",
        "critical_count": 2,
        "high_count": 5,
        "medium_count": 9,
        "low_count": 4,
        "new_findings_count": 3,
        "baseline_label": "commit 8e91f0a (Nov 14)",
        "finding_id": "API-01",
        "finding_title": "Broken Object Level Authorization (BOLA)",
        "severity": "Critical",
        "affected_asset": "/api/v1/users/{id}",
        "detected_at": "Nov 15, 2026, 02:17 PM (IST)",
        "report_type": "API Security Assessment",
        "report_id": "rep_991823",
        "format_display": "PDF (2.8 MB)",
        "file_size": "2.8 MB",
        "api_count": 14,
        "endpoint_count": 48,
        "discovery_source": "OpenAPI / Traffic Inspection",
        "discovered_at": "Nov 15, 2026, 02:10 PM",
        "api_target": "https://api.kavachsecurity.me/v1",
        "endpoints_tested": 48,
        "http_method": "POST",
        "api_endpoint": "/api/v1/users",
        "impact_summary": "An authenticated user can access or modify other users' data by manipulating the user ID.",
        "image_name": "kavach/security-gateway:latest",
        "image_digest_short": "sha256:7b18e9a",
        "registry_name": "ghcr.io/kavach-security",
        "finding_count": 4,
        "amount": "249",
        "amount_due": "249",
        "invoice_number": "INV-2026-0819",
        "paid_at": "Nov 15, 2026",
        "payment_method_label": "Visa ending in 4242",
        "access_until": "Nov 22, 2026",
        "renewal_date": "Dec 15, 2026",
        "safe_decline_reason": "Card declined: insufficient funds",
        "maintenance_date": "Sunday, Nov 22, 2026",
        "maintenance_start": "02:00 UTC",
        "maintenance_end": "03:30 UTC",
        "timezone": "UTC",
        "affected_services": "Scheduled background scanners",
        "service_name": "Container Registry Webhooks",
        "incident_id": "INC-8192",
        "incident_start": "13:20 UTC",
        "resolved_at": "14:05 UTC",
        "deletion_request_id": "DEL-991823",
    }
    try:
        _, html_content, _ = email_template_service.render(template_id, sample_context)
        return HTMLResponse(content=html_content)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# 2. Administrative Delivery Monitoring
# =============================================================================

@router.get("/logs")
async def list_delivery_logs(
    recipient: Optional[str] = Query(None, description="Filter by recipient email"),
    template_id: Optional[str] = Query(None, description="Filter by template ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: QUEUED, SENT, FAILED, SKIPPED_PREFERENCE"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Administrative email delivery audit ledger."""
    service = NotificationService(db)
    return await service.list_logs(
        recipient=recipient,
        template_id=template_id,
        category=category,
        status=status_filter,
        project_id=project_id,
        limit=limit,
        offset=offset,
    )


@router.post("/logs/{log_id}/retry")
async def retry_delivery(
    log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retries a failed email delivery attempt."""
    stmt = select(EmailDeliveryLog).where(EmailDeliveryLog.id == log_id)
    log_entry = (await db.execute(stmt)).scalar_one_or_none()
    if not log_entry:
        raise HTTPException(status_code=404, detail="Email delivery log not found")

    service = NotificationService(db)
    res = await service.dispatch(
        template_id=log_entry.template_id,
        recipient_email=log_entry.recipient_email,
        context=log_entry.context_data or {},
        user_id=log_entry.user_id,
        project_id=log_entry.project_id,
        workspace_id=log_entry.workspace_id,
        event_id=log_entry.event_id,
        idempotency_key=f"retry:{log_id}:{uuid.uuid4().hex[:6]}",
        sync_delivery=True,
    )
    return {"status": "retry_completed", "result": res}


# =============================================================================
# 3. User Notification Preferences
# =============================================================================

@router.get("/preferences/{user_id}")
async def get_user_preferences(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves notification preferences for a user."""
    try:
        u_uuid = uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user UUID format")

    stmt = select(UserNotificationPreferences).where(UserNotificationPreferences.user_id == u_uuid)
    prefs = (await db.execute(stmt)).scalar_one_or_none()
    if not prefs:
        # Return default enabled preferences
        return {
            "user_id": str(user_id),
            "email_security_alerts": True,
            "email_weekly_digest": True,
            "email_login_alerts": True,
            "email_scan_completed": True,
            "email_policy_violations": True,
            "slack_notifications_enabled": False,
            "slack_webhook_url": None,
        }
    return {
        "user_id": str(prefs.user_id),
        "email_security_alerts": prefs.email_security_alerts,
        "email_weekly_digest": prefs.email_weekly_digest,
        "email_login_alerts": prefs.email_login_alerts,
        "email_scan_completed": prefs.email_scan_completed,
        "email_policy_violations": prefs.email_policy_violations,
        "slack_notifications_enabled": prefs.slack_notifications_enabled,
        "slack_webhook_url": prefs.slack_webhook_url,
    }


@router.put("/preferences/{user_id}")
async def update_user_preferences(
    user_id: str,
    payload: NotificationPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Updates notification preferences for a user."""
    try:
        u_uuid = uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user UUID format")

    stmt = select(UserNotificationPreferences).where(UserNotificationPreferences.user_id == u_uuid)
    prefs = (await db.execute(stmt)).scalar_one_or_none()
    if not prefs:
        prefs = UserNotificationPreferences(
            user_id=u_uuid,
            email_security_alerts=payload.email_security_alerts if payload.email_security_alerts is not None else True,
            email_weekly_digest=payload.email_weekly_digest if payload.email_weekly_digest is not None else True,
            email_login_alerts=payload.email_login_alerts if payload.email_login_alerts is not None else True,
            email_scan_completed=payload.email_scan_completed if payload.email_scan_completed is not None else True,
            email_policy_violations=payload.email_policy_violations if payload.email_policy_violations is not None else True,
            slack_notifications_enabled=payload.slack_notifications_enabled if payload.slack_notifications_enabled is not None else False,
            slack_webhook_url=payload.slack_webhook_url,
        )
        db.add(prefs)
    else:
        if payload.email_security_alerts is not None:
            prefs.email_security_alerts = payload.email_security_alerts
        if payload.email_weekly_digest is not None:
            prefs.email_weekly_digest = payload.email_weekly_digest
        if payload.email_login_alerts is not None:
            prefs.email_login_alerts = payload.email_login_alerts
        if payload.email_scan_completed is not None:
            prefs.email_scan_completed = payload.email_scan_completed
        if payload.email_policy_violations is not None:
            prefs.email_policy_violations = payload.email_policy_violations
        if payload.slack_notifications_enabled is not None:
            prefs.slack_notifications_enabled = payload.slack_notifications_enabled
        if payload.slack_webhook_url is not None:
            prefs.slack_webhook_url = payload.slack_webhook_url

    await db.commit()
    return {"status": "success", "preferences": {
        "user_id": str(prefs.user_id),
        "email_security_alerts": prefs.email_security_alerts,
        "email_weekly_digest": prefs.email_weekly_digest,
        "email_login_alerts": prefs.email_login_alerts,
        "email_scan_completed": prefs.email_scan_completed,
        "email_policy_violations": prefs.email_policy_violations,
        "slack_notifications_enabled": prefs.slack_notifications_enabled,
        "slack_webhook_url": prefs.slack_webhook_url,
    }}


# =============================================================================
# 4. Live Test Dispatch
# =============================================================================

@router.post("/test-send")
async def send_test_email(
    payload: TestSendPayload,
    db: AsyncSession = Depends(get_db),
):
    """Dispatches a real test email using any of the 38 templates via configured SMTP."""
    tpl = email_template_service.get_template_def(payload.template_id)
    
    context = {
        "first_name": "Security Lead",
        "user_email": payload.recipient_email,
        "workspace_name": "Kavach Security Operations",
        "plan_name": "Enterprise",
        "project_name": "kavach-core-api",
        "project_id": "proj_8f92a10b",
        "created_at": "Nov 15, 2026, 02:17 PM (IST)",
        "repository_name": "kavach-security/control-plane",
        "branch": "main",
        "default_branch": "main",
        "commit_hash": "a7d3f2e",
        "actor_email": payload.recipient_email,
        "scan_id": "scan_4f92d81a",
        "scan_type": "SAST & Container Reachability",
        "scan_target": "kavach-security/control-plane:main",
        "started_at": "Nov 15, 2026, 02:15 PM (IST)",
        "completed_at": "Nov 15, 2026, 02:17 PM (IST)",
        "duration": "1m 42s",
        "critical_count": 2,
        "high_count": 5,
        "medium_count": 9,
        "low_count": 4,
        "new_findings_count": 3,
        "baseline_label": "commit 8e91f0a",
        "finding_id": "API-01",
        "finding_title": "Broken Object Level Authorization (BOLA)",
        "severity": "Critical",
        "affected_asset": "/api/v1/users/{id}",
        "detected_at": "Nov 15, 2026, 02:17 PM (IST)",
        "report_type": "API Security Assessment",
        "report_id": "rep_991823",
        "format_display": "PDF (2.8 MB)",
        "file_size": "2.8 MB",
        "api_count": 14,
        "endpoint_count": 48,
        "discovery_source": "OpenAPI / Traffic Inspection",
        "discovered_at": "Nov 15, 2026, 02:10 PM",
        "api_target": "https://api.kavachsecurity.me/v1",
        "endpoints_tested": 48,
        "http_method": "POST",
        "api_endpoint": "/api/v1/users",
        "impact_summary": "An authenticated user can access or modify other users' data by manipulating the user ID.",
        "image_name": "kavach/security-gateway:latest",
        "image_digest_short": "sha256:7b18e9a",
        "registry_name": "ghcr.io/kavach-security",
        "finding_count": 4,
        "amount": "249",
        "amount_due": "249",
        "invoice_number": "INV-2026-0819",
        "paid_at": "Nov 15, 2026",
        "payment_method_label": "Visa ending in 4242",
        "access_until": "Nov 22, 2026",
        "renewal_date": "Dec 15, 2026",
        "safe_decline_reason": "Card declined: insufficient funds",
        "maintenance_date": "Sunday, Nov 22, 2026",
        "maintenance_start": "02:00 UTC",
        "maintenance_end": "03:30 UTC",
        "timezone": "UTC",
        "affected_services": "Scheduled background scanners",
        "service_name": "Container Registry Webhooks",
        "incident_id": "INC-8192",
        "incident_start": "13:20 UTC",
        "resolved_at": "14:05 UTC",
        "deletion_request_id": "DEL-991823",
    }
    if payload.context_override:
        context.update(payload.context_override)

    svc = NotificationService(db)
    res = await svc.dispatch(
        template_id=payload.template_id,
        recipient_email=payload.recipient_email,
        context=context,
        idempotency_key=f"test:{payload.template_id}:{payload.recipient_email}:{uuid.uuid4().hex[:6]}",
        sync_delivery=True,
    )
    return {"status": "dispatched", "result": res}

