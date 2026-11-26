"""HubSpot CRM Integration REST API Endpoints.

Part of the Centralized Integration Management System (CIMS).
Allows managing the HubSpot CRM connection, viewing sync health, configuring
event synchronizations, and auditing/retrying outbound operations.
"""

import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.encryption import encrypt_secret
from app.core.security import get_current_user_optional
from app.models.integration_models import RealIntegration
from app.models.user import User
from app.services.hubspot_service import hubspot_service

router = APIRouter(prefix="/integrations/hubspot", tags=["HubSpot CRM Integration"])

DEFAULT_ORGANIZATION_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


class ConnectHubspotPayload(BaseModel):
    access_token: str = Field(description="HubSpot Private App Access Token or Service Key")
    portal_id: Optional[str] = Field(default=None, description="HubSpot Portal ID")
    event_settings: Optional[Dict[str, bool]] = Field(
        default_factory=lambda: {
            "sync_leads": True,
            "sync_users": True,
            "sync_organizations": True,
            "sync_billing": True,
            "sync_demos": True,
            "sync_support": True,
        }
    )


class UpdateSettingsPayload(BaseModel):
    event_settings: Dict[str, bool]
    custom_field_mappings: Optional[Dict[str, str]] = None


@router.get("/status", summary="Get HubSpot connection status and sync health")
async def get_hubspot_status(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Retrieves live connection status, portal details, and synchronization health."""
    health_data = await hubspot_service.get_sync_health()
    return {
        "success": True,
        "provider": "hubspot",
        "name": "HubSpot CRM",
        "category": "crm",
        **health_data,
    }


@router.post("/connect", summary="Connect HubSpot Private App Token")
async def connect_hubspot(
    payload: ConnectHubspotPayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Validates and persists HubSpot credentials in the database."""
    org_id = DEFAULT_ORGANIZATION_ID
    if x_organization_id:
        try:
            org_id = uuid.UUID(x_organization_id)
        except Exception:
            pass

    # 1. Test token with live test
    test_res = await hubspot_service.test_connection(token_override=payload.access_token)
    if not test_res.get("connected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=test_res.get("message", "HubSpot authentication failed. Invalid token."),
        )

    portal_id = test_res.get("portal_id") or payload.portal_id or "HubSpot Portal"

    # 2. Encrypt token and upsert into real_integrations table
    token_encrypted = encrypt_secret(payload.access_token.strip())

    stmt = select(RealIntegration).where(
        RealIntegration.provider == "hubspot",
        RealIntegration.organization_id == org_id,
    ).limit(1)
    res = await db.execute(stmt)
    integ = res.scalar_one_or_none()

    meta = {
        "portal_id": portal_id,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "event_settings": payload.event_settings,
        "timezone": test_res.get("timezone", "UTC"),
        "currency": test_res.get("currency", "USD"),
    }

    if integ:
        integ.status = "connected"
        integ.access_token_encrypted = token_encrypted
        integ.external_account_id = portal_id
        integ.external_account_name = f"Portal {portal_id}"
        integ.integration_metadata = meta
        integ.last_connected_at = datetime.now(timezone.utc)
    else:
        integ = RealIntegration(
            id=uuid.uuid4(),
            organization_id=org_id,
            provider="hubspot",
            name="HubSpot CRM",
            status="connected",
            external_account_id=portal_id,
            external_account_name=f"Portal {portal_id}",
            access_token_encrypted=token_encrypted,
            integration_metadata=meta,
            last_connected_at=datetime.now(timezone.utc),
            created_by=current_user.email if current_user else "admin",
        )
        db.add(integ)

    await db.commit()

    return {
        "success": True,
        "connected": True,
        "portal_id": portal_id,
        "message": f"Successfully connected to HubSpot Portal {portal_id}.",
    }


@router.post("/disconnect", summary="Disconnect HubSpot integration")
async def disconnect_hubspot(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Revokes active HubSpot connection and marks integration disconnected."""
    org_id = DEFAULT_ORGANIZATION_ID
    if x_organization_id:
        try:
            org_id = uuid.UUID(x_organization_id)
        except Exception:
            pass

    stmt = select(RealIntegration).where(
        RealIntegration.provider == "hubspot",
        RealIntegration.organization_id == org_id,
    ).limit(1)
    res = await db.execute(stmt)
    integ = res.scalar_one_or_none()
    if integ:
        integ.status = "disconnected"
        integ.access_token_encrypted = None
        await db.commit()

    return {"success": True, "message": "HubSpot integration disconnected."}


@router.post("/test", summary="Test live HubSpot connectivity")
async def test_hubspot():
    """Runs a live ping against HubSpot CRM API."""
    return await hubspot_service.test_connection()


@router.get("/logs", summary="List synchronization audit logs")
async def list_sync_logs(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query("ALL"),
    entity: Optional[str] = Query("ALL"),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Returns persistent sync logs with filters for entity type and status."""
    logs = await hubspot_service.list_sync_logs(limit=limit, status_filter=status, entity_filter=entity)
    return logs


@router.post("/retry/{log_id}", summary="Retry failed synchronization operation")
async def retry_sync_log(
    log_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Re-executes the operation corresponding to a failed sync log entry."""
    return await hubspot_service.retry_log(log_id)


@router.get("/settings", summary="Get HubSpot event synchronization settings")
async def get_settings(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Returns event toggles and field mapping configuration."""
    org_id = DEFAULT_ORGANIZATION_ID
    if x_organization_id:
        try:
            org_id = uuid.UUID(x_organization_id)
        except Exception:
            pass

    stmt = select(RealIntegration).where(
        RealIntegration.provider == "hubspot",
        RealIntegration.organization_id == org_id,
    ).limit(1)
    res = await db.execute(stmt)
    integ = res.scalar_one_or_none()

    meta = integ.integration_metadata if integ and integ.integration_metadata else {}
    events = meta.get(
        "event_settings",
        {
            "sync_leads": True,
            "sync_users": True,
            "sync_organizations": True,
            "sync_billing": True,
            "sync_demos": True,
            "sync_support": True,
        },
    )

    mappings = {
        "contacts": [
            {"kavach_field": "email", "hubspot_property": "email", "required": True},
            {"kavach_field": "name", "hubspot_property": "firstname / lastname", "required": True},
            {"kavach_field": "company", "hubspot_property": "company", "required": False},
            {"kavach_field": "phone", "hubspot_property": "phone", "required": False},
            {"kavach_field": "plan_tier", "hubspot_property": "kavach_plan", "required": False},
            {"kavach_field": "status", "hubspot_property": "subscription_status", "required": False},
        ],
        "companies": [
            {"kavach_field": "name", "hubspot_property": "name", "required": True},
            {"kavach_field": "domain", "hubspot_property": "domain", "required": False},
            {"kavach_field": "industry", "hubspot_property": "industry", "required": False},
            {"kavach_field": "team_size", "hubspot_property": "numberofemployees", "required": False},
        ],
        "deals": [
            {"kavach_field": "deal_name", "hubspot_property": "dealname", "required": True},
            {"kavach_field": "stage", "hubspot_property": "dealstage", "required": True},
            {"kavach_field": "amount", "hubspot_property": "amount", "required": False},
            {"kavach_field": "pipeline", "hubspot_property": "pipeline", "required": True},
        ],
        "tickets": [
            {"kavach_field": "subject", "hubspot_property": "subject", "required": True},
            {"kavach_field": "content", "hubspot_property": "content", "required": True},
            {"kavach_field": "priority", "hubspot_property": "hs_ticket_priority", "required": True},
        ],
    }

    return {
        "event_settings": events,
        "mappings": mappings,
    }


@router.put("/settings", summary="Update HubSpot event synchronization settings")
async def update_settings(
    payload: UpdateSettingsPayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Updates event synchronization toggles and custom mappings."""
    org_id = DEFAULT_ORGANIZATION_ID
    if x_organization_id:
        try:
            org_id = uuid.UUID(x_organization_id)
        except Exception:
            pass

    stmt = select(RealIntegration).where(
        RealIntegration.provider == "hubspot",
        RealIntegration.organization_id == org_id,
    ).limit(1)
    res = await db.execute(stmt)
    integ = res.scalar_one_or_none()
    if not integ:
        raise HTTPException(status_code=404, detail="HubSpot integration not found.")

    meta = dict(integ.integration_metadata or {})
    meta["event_settings"] = payload.event_settings
    if payload.custom_field_mappings:
        meta["custom_field_mappings"] = payload.custom_field_mappings

    integ.integration_metadata = meta
    await db.commit()

    return {"success": True, "message": "Settings updated successfully.", "event_settings": payload.event_settings}

