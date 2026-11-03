import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.superadmin_plan_service import SuperAdminPlanService

logger = logging.getLogger("secure-control-plane")

router = APIRouter(prefix="/superadmin/plans", tags=["SuperAdmin - Subscription Plans & Entitlements"])


# ─────────────────────────────────────────────────────────────────────────────
# SuperAdmin RBAC Guard
# ─────────────────────────────────────────────────────────────────────────────
FOUNDER_SUPERADMIN_EMAILS = {
    "admin@kavachsecurity.me",
    "mkbharvad7174@gmail.com",
    "mkbharvad534@gmail.com",
    "mkbharvad8080@gmail.com",
    "mayurbharvad7174@gmail.com",
    "mayur.k@seculayer.io",
    "mayur.k.bharvad@gmail.com",
    "dev@antigravity.security",
}


async def require_superadmin_user(current_user: User = Depends(get_current_user)) -> User:
    """Authoritative platform-level permission guard."""
    user_email = (current_user.email or "").lower().strip()
    is_founder = (
        getattr(current_user, "is_superuser", False)
        or getattr(current_user, "role", "") == "founder"
        or user_email in FOUNDER_SUPERADMIN_EMAILS
    )
    if not is_founder:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform SuperAdmin / Founder credentials required to manage subscription plans.",
        )
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Request Validation Schemas
# ─────────────────────────────────────────────────────────────────────────────
class CreatePlanRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    key: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    plan_type: str = Field("PAID", description="PAID | TRIAL | CUSTOM")
    pricing_model: str = Field("FIXED", description="FIXED | CUSTOM")
    status: str = Field("ACTIVE", description="DRAFT | ACTIVE")
    currency: str = Field("USD", max_length=10)
    billing_cycle: str = Field("monthly", description="monthly | annual")
    monthly_price: float = Field(0.0, ge=0)
    annual_price: Optional[float] = Field(None, ge=0)
    discount_percent: Optional[float] = Field(0.0, ge=0, le=100)
    trial_days: int = Field(14, ge=0)
    is_trial_allowed: bool = True
    auto_renew: bool = True
    cancel_at_period_end: bool = False
    payment_provider: str = "stripe"

    # Limits & Quotas
    max_repositories: int = Field(25, ge=0)
    monthly_scan_minutes: int = Field(10000, ge=0)
    concurrent_scans: int = Field(5, ge=1)
    monthly_api_calls: int = Field(500000, ge=0)
    api_rate_limit_per_minute: int = Field(1000, ge=0)
    storage_limit_gb: int = Field(50, ge=0)

    # Seats
    developer_seats: int = Field(25, ge=0)
    admin_seats: int = Field(5, ge=0)
    security_seats: int = Field(5, ge=0)
    auditor_seats: int = Field(5, ge=0)
    seat_counting_rule: str = Field("ACTIVE_ONLY", description="ACTIVE_ONLY | ALL_INVITED")
    over_limit_behavior: str = Field("BLOCK", description="BLOCK | ALLOW_WITH_WARNING")

    # Features
    features: List[str] = Field(default_factory=list)


class UpdatePlanRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan_type: Optional[str] = None
    pricing_model: Optional[str] = None
    monthly_price: Optional[float] = None
    annual_price: Optional[float] = None
    discount_percent: Optional[float] = None
    trial_days: Optional[int] = None
    is_trial_allowed: Optional[bool] = None
    auto_renew: Optional[bool] = None
    cancel_at_period_end: Optional[bool] = None

    # Limits
    max_repositories: Optional[int] = None
    monthly_scan_minutes: Optional[int] = None
    concurrent_scans: Optional[int] = None
    monthly_api_calls: Optional[int] = None
    api_rate_limit_per_minute: Optional[int] = None
    storage_limit_gb: Optional[int] = None

    # Seats
    developer_seats: Optional[int] = None
    admin_seats: Optional[int] = None
    security_seats: Optional[int] = None
    auditor_seats: Optional[int] = None
    seat_counting_rule: Optional[str] = None
    over_limit_behavior: Optional[str] = None

    # Features
    features: Optional[List[str]] = None
    changelog: Optional[str] = None
    reason: Optional[str] = None


class ArchivePlanRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Audit reason for archiving this plan.")


class SaveEntitlementsRequest(BaseModel):
    features: List[str]
    changelog: Optional[str] = "Updated feature entitlements"


class SaveLimitsRequest(BaseModel):
    max_repositories: int
    monthly_scan_minutes: int
    concurrent_scans: int
    monthly_api_calls: int
    api_rate_limit_per_minute: int
    storage_limit_gb: int


class SavePricesRequest(BaseModel):
    monthly_price: float
    annual_price: float
    currency: str = "USD"
    billing_cycle: str = "monthly"


class SaveTrialSettingsRequest(BaseModel):
    trial_days: int
    is_trial_allowed: bool
    auto_renew: bool = True
    cancel_at_period_end: bool = False


feature_router = APIRouter(prefix="/superadmin", tags=["SuperAdmin - Feature Catalog"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. Feature Catalog
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/feature-catalog", summary="Retrieve supported feature catalog")
@feature_router.get("/feature-catalog", summary="Retrieve supported feature catalog (Root alias)")
async def get_feature_catalog(
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SuperAdminPlanService(db)
    return await service.get_feature_catalog()


# ─────────────────────────────────────────────────────────────────────────────
# 2. List & Search Plans
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", summary="List subscription plans with search, filters, and stats")
async def list_plans(
    status: Optional[str] = Query(None),
    plan_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    return await service.list_plans(
        status_filter=status,
        plan_type=plan_type,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. Create Plan (Wizard confirmation)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a subscription plan with version 1")
async def create_plan(
    req: CreatePlanRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.create_plan(
        payload=req.model_dump(),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4. Plan Details (Overview & All Sub-panels)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{plan_id}", summary="Retrieve detailed plan overview, quotas, pricing, and history")
async def get_plan(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    return await service.get_plan_details(plan_id)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Update Plan (Versioning Policy Enforced)
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/{plan_id}", summary="Update plan configuration or publish next version")
async def update_plan(
    plan_id: str,
    req: UpdatePlanRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_plan(
        plan_id=plan_id,
        payload=req.model_dump(exclude_unset=True),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 6. Publish Plan
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{plan_id}/publish", summary="Publish a draft plan version")
async def publish_plan(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.publish_plan(plan_id=plan_id, actor_id=str(admin.id), actor_name=actor_name)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Archive Plan
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{plan_id}/archive", summary="Archive a plan with reason and lifecycle validation")
async def archive_plan(
    plan_id: str,
    req: ArchivePlanRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.archive_plan(
        plan_id=plan_id,
        payload=req.model_dump(),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 8. Plan Tenants
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{plan_id}/tenants", summary="List organizations assigned to this plan")
async def get_plan_tenants(
    plan_id: str,
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    return await service.get_plan_tenants(
        plan_id=plan_id,
        search=search,
        page=page,
        page_size=page_size,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 9. Plan Usage
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{plan_id}/usage", summary="Retrieve actual usage aggregates across assigned organizations")
async def get_plan_usage(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    return await service.get_plan_usage(plan_id)


# ─────────────────────────────────────────────────────────────────────────────
# 10. Plan History
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{plan_id}/history", summary="Retrieve change and audit history for this plan")
async def get_plan_history(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SuperAdminPlanService(db)
    details = await service.get_plan_details(plan_id)
    return details.get("history", [])


# ─────────────────────────────────────────────────────────────────────────────
# 11–14. Focused Sub-resource Endpoints (Entitlements, Limits, Prices, Trials)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{plan_id}/entitlements", summary="Retrieve plan feature entitlements")
async def get_plan_entitlements(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    details = await service.get_plan_details(plan_id)
    return {
        "features": details["features"],
        "enabled_feature_keys": details["enabled_feature_keys"],
    }


@router.put("/{plan_id}/entitlements", summary="Save feature entitlements for plan")
async def save_plan_entitlements(
    plan_id: str,
    req: SaveEntitlementsRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_plan(
        plan_id=plan_id,
        payload={"features": req.features, "changelog": req.changelog},
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


@router.get("/{plan_id}/limits", summary="Retrieve configured plan limits")
async def get_plan_limits(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    details = await service.get_plan_details(plan_id)
    return details["limits"]


@router.put("/{plan_id}/limits", summary="Save validated plan limits")
async def save_plan_limits(
    plan_id: str,
    req: SaveLimitsRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_plan(
        plan_id=plan_id,
        payload=req.model_dump(),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


@router.get("/{plan_id}/prices", summary="Retrieve configured prices for plan")
async def get_plan_prices(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    details = await service.get_plan_details(plan_id)
    return details["pricing"]


@router.put("/{plan_id}/prices", summary="Save supported price configuration")
async def save_plan_prices(
    plan_id: str,
    req: SavePricesRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_plan(
        plan_id=plan_id,
        payload=req.model_dump(),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


@router.get("/{plan_id}/trial-settings", summary="Retrieve trial settings")
async def get_plan_trial_settings(
    plan_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    details = await service.get_plan_details(plan_id)
    return {
        "trial_days": details["pricing"]["trial_days"],
        "is_trial_allowed": details["pricing"]["is_trial_allowed"],
        "auto_renew": details["pricing"]["auto_renew"],
        "cancel_at_period_end": details["pricing"]["cancel_at_period_end"],
    }


@router.put("/{plan_id}/trial-settings", summary="Save trial settings")
async def save_plan_trial_settings(
    plan_id: str,
    req: SaveTrialSettingsRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminPlanService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_plan(
        plan_id=plan_id,
        payload=req.model_dump(),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )
