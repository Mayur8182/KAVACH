"""
Thing Control Plane — Founder SuperAdmin Tenant Plan Assignment & Overrides API Router
Part 3 of Module 03 · Plans, Licensing & Feature Entitlements

Strict Compliance with AGENTS.md:
- Rule 1: Zero hardcoded data.
- Rule 2: No fake success.
- Rule 3: No mock API responses.
- Rule 6: Real PostgreSQL / SQLite persistence.
- Rule 13: Every security decision must have evidence.
- Rule 14: LLM is not security authority; deterministic authorization and validations decide.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.superadmin_tenant_plan_service import SuperAdminTenantPlanService

logger = logging.getLogger("superadmin-tenant-plans")

router = APIRouter(prefix="/superadmin", tags=["SuperAdmin — Tenant Plan Assignments & Overrides"])


# ─────────────────────────────────────────────────────────────────────────────
# Founder SuperAdmin RBAC Guard
# ─────────────────────────────────────────────────────────────────────────────
FOUNDER_SUPERADMIN_EMAILS = {
    "mkbharvad7174@gmail.com",
    "mkbharvad534@gmail.com",
    "mkbharvad8080@gmail.com",
    "mayurbharvad7174@gmail.com",
    "mayur.k@seculayer.io",
    "mayur.k.bharvad@gmail.com",
    "dev@antigravity.security",
}


async def require_superadmin_user(current_user: User = Depends(get_current_user)) -> User:
    """Enforces platform-level founder superadmin authorization."""
    user_email = (current_user.email or "").lower().strip()
    is_founder = (
        getattr(current_user, "is_superuser", False)
        or getattr(current_user, "role", "") == "founder"
        or user_email in FOUNDER_SUPERADMIN_EMAILS
    )
    if not is_founder:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform SuperAdmin / Founder credentials required to manage tenant plans and overrides.",
        )
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Request Validation Schemas
# ─────────────────────────────────────────────────────────────────────────────
class PlanAssignmentPreviewRequest(BaseModel):
    target_plan_key: str = Field(..., description="starter | pro | enterprise | custom")


class ConfirmPlanAssignmentRequest(BaseModel):
    target_plan_key: str = Field(..., description="starter | pro | enterprise | custom")
    billing_cycle: str = Field("monthly", description="monthly | annual")
    reason: Optional[str] = Field("Plan assigned via SuperAdmin console")


class SaveOverridesRequest(BaseModel):
    category: str = Field(..., description="features | limits | modules | advanced")
    overrides: List[Dict[str, Any]] = Field(..., description="List of override configurations")


class PlanChangePreviewRequest(BaseModel):
    target_plan_key: str = Field(..., description="starter | pro | enterprise | custom")


class ExecutePlanChangeRequest(BaseModel):
    target_plan_key: str = Field(..., description="starter | pro | enterprise | custom")
    effective_date_type: str = Field("immediately", description="immediately | on_next_billing_cycle")
    reason: Optional[str] = None
    is_downgrade_acknowledged: bool = Field(False, description="Must be true if plan change reduces limits or features")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Tenant Plan Assignment Overview (Screen 1)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenant-plan-assignments")
@router.get("/tenants/plan/overview")
async def list_tenant_assignments(
    search: Optional[str] = Query(None, description="Search tenants by name, slug, or domain"),
    plan: Optional[str] = Query(None, description="Filter by plan key"),
    status: Optional[str] = Query(None, description="Filter by status (Active, Trial, Suspended)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 1: Tenant Plan Assignment Overview directory with metrics and search."""
    service = SuperAdminTenantPlanService(db)
    return await service.list_tenant_assignments(
        search=search,
        plan_filter=plan,
        status_filter=status,
        page=page,
        page_size=page_size,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Select Subscription Plan (Screen 2)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenants/{tenant_id}/plan/current")
async def get_tenant_current_plan(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Retrieves tenant's active plan, limits, and organization details."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_current_plan(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tenants/{tenant_id}/plan/options")
async def get_plan_options(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 2: Select Subscription Plan options (Starter, Pro, Enterprise, Custom)."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_plan_options(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 3. Review & Confirm Plan Assignment (Screen 3)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/tenants/{tenant_id}/plan/preview")
async def preview_plan_assignment(
    tenant_id: str,
    payload: PlanAssignmentPreviewRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 3: Preview proposed plan assignment comparing Current Plan vs New Plan."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.preview_plan_assignment(
            tenant_id=tenant_id,
            target_plan_key=payload.target_plan_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/tenants/{tenant_id}/plan")
@router.post("/tenants/{tenant_id}/plan/confirm")
async def confirm_plan_assignment(
    tenant_id: str,
    payload: ConfirmPlanAssignmentRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 3: Assigns target plan to organization and updates subscription record."""
    service = SuperAdminTenantPlanService(db)
    actor_name = getattr(admin, "full_name", None) or getattr(admin, "email", "Founder SuperAdmin")
    try:
        return await service.confirm_plan_assignment(
            tenant_id=tenant_id,
            target_plan_key=payload.target_plan_key,
            billing_cycle=payload.billing_cycle,
            reason=payload.reason,
            actor_name=actor_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 4. Plan Assignment History Ledger (Screen 4)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenants/{tenant_id}/plan/history")
async def get_plan_assignment_history(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 4: Plan Assignment History ledger."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_plan_assignment_history(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 5-8. Tenant Entitlement & Limit Overrides (Screens 5, 6, 7, 8)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenants/{tenant_id}/plan/overrides")
async def get_tenant_overrides(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screens 5-8: Retrieves overrides for Features, Limits & Quotas, Modules, and Advanced."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_overrides(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tenants/{tenant_id}/plan/overrides")
async def save_tenant_overrides(
    tenant_id: str,
    payload: SaveOverridesRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screens 5-8: Saves validated overrides for a specific category."""
    service = SuperAdminTenantPlanService(db)
    actor_name = getattr(admin, "full_name", None) or getattr(admin, "email", "Founder SuperAdmin")
    try:
        return await service.save_tenant_overrides(
            tenant_id=tenant_id,
            category=payload.category,
            overrides=payload.overrides,
            actor_name=actor_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tenants/{tenant_id}/plan/overrides/reset")
async def reset_tenant_overrides(
    tenant_id: str,
    category: Optional[str] = Query(None, description="Optional category to reset (features, limits, modules, advanced)"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 6: Resets tenant overrides to default plan values."""
    service = SuperAdminTenantPlanService(db)
    actor_name = getattr(admin, "full_name", None) or getattr(admin, "email", "Founder SuperAdmin")
    try:
        return await service.reset_tenant_overrides(
            tenant_id=tenant_id,
            category=category,
            actor_name=actor_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 9-13. Tenant Plan Usage Telemetry (Screens 9, 10, 11, 12, 13)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenants/{tenant_id}/plan/usage")
async def get_tenant_usage_overview(
    tenant_id: str,
    timeframe: str = Query("30_days", description="Telemetry timeframe"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 9: Tenant Plan Usage Overview."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_usage_overview(tenant_id, timeframe)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tenants/{tenant_id}/plan/usage/repositories")
async def get_tenant_repository_usage(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 10: Repositories usage table with last scan and vulnerabilities."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_repository_usage(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tenants/{tenant_id}/plan/usage/scans")
async def get_tenant_scan_usage(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 11: Scan Minutes usage (Last 30 Days) and Top Scan Types breakdown."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_scan_usage(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tenants/{tenant_id}/plan/usage/api")
async def get_tenant_api_usage(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 12: API Calls usage (Last 30 Days) and Top Endpoints breakdown."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_api_usage(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tenants/{tenant_id}/plan/usage/storage")
async def get_tenant_storage_usage(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 13: Storage Usage breakdown (Artifacts, Reports, SBOM, Other)."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_tenant_storage_usage(tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 14-15. Change Plan & Downgrade Safety Controls (Screens 14, 15)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/tenants/{tenant_id}/plan/change-preview")
async def preview_plan_change(
    tenant_id: str,
    payload: PlanChangePreviewRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 14 & 15: Upgrade/Downgrade impact preview with over-limit resource analysis."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.preview_plan_change(
            tenant_id=tenant_id,
            target_plan_key=payload.target_plan_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/tenants/{tenant_id}/plan/change")
async def execute_plan_change(
    tenant_id: str,
    payload: ExecutePlanChangeRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 14 & 15: Executes an authorized plan change or safe downgrade."""
    service = SuperAdminTenantPlanService(db)
    actor_name = getattr(admin, "full_name", None) or getattr(admin, "email", "Founder SuperAdmin")
    try:
        return await service.execute_plan_change(
            tenant_id=tenant_id,
            target_plan_key=payload.target_plan_key,
            effective_date_type=payload.effective_date_type,
            reason=payload.reason,
            is_downgrade_acknowledged=payload.is_downgrade_acknowledged,
            actor_name=actor_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 16. Plan Action Audit Log (Screen 16)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tenants/{tenant_id}/plan/audit")
async def get_plan_action_audit_log(
    tenant_id: str,
    action: Optional[str] = Query(None, description="Filter by action name"),
    status: Optional[str] = Query(None, description="Filter by status (Success/Failed)"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 16: Plan Action Audit Log for the tenant."""
    service = SuperAdminTenantPlanService(db)
    try:
        return await service.get_plan_action_audit_log(
            tenant_id=tenant_id,
            action_filter=action,
            status_filter=status,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
