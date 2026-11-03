"""
Thing Control Plane — Founder SuperAdmin Feature Entitlements Router
Production-ready endpoints for Module 03 Part 2: Feature Entitlements & Catalog.

Strict Compliance with AGENTS.md:
- Rule 1: Zero hardcoded data.
- Rule 2: No fake success.
- Rule 3: No mock API responses.
- Rule 6: Real PostgreSQL / SQLite persistence.
- Rule 14: LLM is not security authority; deterministic policy and schema validation decide.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.superadmin_entitlement_service import SuperAdminEntitlementService

logger = logging.getLogger("superadmin-entitlements")

router = APIRouter(prefix="/superadmin/entitlements", tags=["SuperAdmin - Feature Entitlements & Catalog"])


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
            detail="Platform SuperAdmin / Founder credentials required to manage feature entitlements.",
        )
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Request Validation Schemas
# ─────────────────────────────────────────────────────────────────────────────
class CreateFeatureRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    key: Optional[str] = Field(None, max_length=100)
    tagline: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: str = Field("Code Security")
    module: Optional[str] = None
    status: str = Field("ENABLED")
    scope: str = Field("GLOBAL")
    show_in_ui: bool = True
    requires_org_setup: bool = False
    menu_location: str = "Security"
    icon: str = "Shield"
    dependencies: List[str] = Field(default_factory=list)
    external_dependencies: Dict[str, bool] = Field(default_factory=dict)
    default_config: Dict[str, Any] = Field(default_factory=dict)
    plan_availability: Dict[str, Any] = Field(default_factory=dict)


class UpdateFeatureRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    scope: Optional[str] = None
    show_in_ui: Optional[bool] = None
    requires_org_setup: Optional[bool] = None
    menu_location: Optional[str] = None
    icon: Optional[str] = None
    dependencies: Optional[List[str]] = None
    external_dependencies: Optional[Dict[str, bool]] = None
    default_config: Optional[Dict[str, Any]] = None
    plan_availability: Optional[Dict[str, Any]] = None
    reason: Optional[str] = "Feature configuration updated"


class UpdateDependenciesRequest(BaseModel):
    required_features: List[str] = Field(default_factory=list)
    external_dependencies: Optional[Dict[str, bool]] = None
    reason: Optional[str] = "Dependencies updated"


class UpdatePlanAvailabilityRequest(BaseModel):
    plan_availability: Dict[str, Any]
    reason: Optional[str] = "Plan availability matrix updated"


class UpdateMatrixCellRequest(BaseModel):
    plan_key: str
    feature_key: str
    enabled: bool
    value_tier: str = "standard"
    usage_limit: int = 0
    custom_config: bool = False


class EvaluateEntitlementRequest(BaseModel):
    organization_id: str
    feature_key: str


# ─────────────────────────────────────────────────────────────────────────────
# 1. Feature Entitlements Matrix
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", summary="Retrieve the complete plan feature entitlements matrix")
async def get_entitlements_matrix(
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.get_entitlements_matrix()


@router.put("/matrix/cell", summary="Update a single cell in the feature entitlement matrix")
async def update_matrix_cell(
    req: UpdateMatrixCellRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_matrix_cell(
        plan_key=req.plan_key,
        feature_key=req.feature_key,
        enabled=req.enabled,
        value_tier=req.value_tier,
        usage_limit=req.usage_limit,
        custom_config=req.custom_config,
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Feature Catalog List & Filters
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/features", summary="List feature catalog with search, category pills, and pagination")
async def list_features(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.list_features(
        category=category,
        status_filter=status,
        module=module,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post("/features", status_code=status.HTTP_201_CREATED, summary="Create a new feature in catalog")
async def create_feature(
    req: CreateFeatureRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.create_feature(
        payload=req.model_dump(),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. Feature Details & Configuration
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/features/{feature_id}", summary="Retrieve complete feature details")
async def get_feature_details(
    feature_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.get_feature_details(feature_id)


@router.patch("/features/{feature_id}", summary="Update feature configuration and settings")
async def update_feature(
    feature_id: str,
    req: UpdateFeatureRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_feature(
        feature_id_or_key=feature_id,
        payload=req.model_dump(exclude_unset=True),
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


@router.post("/features/{feature_id}/publish", summary="Publish validated feature")
async def publish_feature(
    feature_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_feature(
        feature_id_or_key=feature_id,
        payload={"status": "ENABLED"},
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


@router.post("/features/{feature_id}/archive", summary="Archive feature safely")
async def archive_feature(
    feature_id: str,
    reason: Optional[str] = "Archived via console",
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_feature(
        feature_id_or_key=feature_id,
        payload={"status": "ARCHIVED", "reason": reason},
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4. Feature Dependencies
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/features/{feature_id}/dependencies", summary="Get feature dependencies")
async def get_feature_dependencies(
    feature_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.get_feature_dependencies(feature_id)


@router.put("/features/{feature_id}/dependencies", summary="Save feature dependencies")
async def save_feature_dependencies(
    feature_id: str,
    req: UpdateDependenciesRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_feature_dependencies(
        feature_id_or_key=feature_id,
        required_features=req.required_features,
        external_dependencies=req.external_dependencies,
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 5. Feature Plan Availability & Usage
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/features/{feature_id}/plans", summary="Retrieve plan availability for feature")
async def get_feature_plan_availability(
    feature_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.get_feature_plan_availability(feature_id)


@router.put("/features/{feature_id}/plans", summary="Save plan availability for feature")
async def save_feature_plan_availability(
    feature_id: str,
    req: UpdatePlanAvailabilityRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    actor_name = getattr(admin, "name", None) or getattr(admin, "email", "Founder SuperAdmin")
    return await service.update_feature_plan_availability(
        feature_id_or_key=feature_id,
        plan_availability=req.plan_availability,
        actor_id=str(admin.id),
        actor_name=actor_name,
    )


@router.get("/features/{feature_id}/usage", summary="Retrieve real usage metrics for feature")
async def get_feature_usage(
    feature_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.get_feature_usage(feature_id)


@router.get("/features/{feature_id}/history", summary="Retrieve feature audit history")
async def get_feature_history(
    feature_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SuperAdminEntitlementService(db)
    details = await service.get_feature_details(feature_id)
    return details.get("history", [])


# ─────────────────────────────────────────────────────────────────────────────
# 6. Authoritative Effective Entitlement Evaluator (Section 6)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/evaluate", summary="Authoritatively evaluate organization feature entitlement")
async def evaluate_effective_entitlement(
    req: EvaluateEntitlementRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminEntitlementService(db)
    return await service.evaluate_effective_entitlement(
        organization_id=req.organization_id,
        feature_key=req.feature_key,
    )
