import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.organization import SubscriptionAuditEvent
from app.services.entitlement_service import EntitlementService, PRODUCT_CATALOG_DEFINITIONS

logger = logging.getLogger("secure-control-plane")

router = APIRouter(prefix="/entitlements", tags=["Product Entitlements & Subscriptions"])


# --- Schemas ---

class ProductSelectionRequest(BaseModel):
    products: List[str] = Field(..., min_length=1, description="List of product keys, e.g. ['thing_code', 'thing_cloud']")
    plan: Optional[str] = Field("PRO_TRIAL", description="Plan: FREE_TIER | PRO_TRIAL | TEAM | ENTERPRISE")
    billing_cycle: Optional[str] = Field("monthly", description="Billing cycle: monthly | annual")


class UpgradeProductRequest(BaseModel):
    product_key: str = Field(..., description="Product key to unlock, e.g. 'thing_cloud'")
    plan_name: Optional[str] = Field(None, description="Plan name or tier")
    payment_token: Optional[str] = Field(None, description="Payment authorization token")


class AuditEventResponse(BaseModel):
    id: str
    event_type: str
    product_key: Optional[str]
    actor_id: str
    details: Optional[dict]
    created_at: str


# --- Endpoints ---

@router.get(
    "/me",
    summary="Get user workspace subscription and product entitlements",
    description="Returns the active organization subscription status, enabled products, and onboarding state.",
)
async def get_my_entitlements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = EntitlementService(db)
    return await service.get_user_entitlements_overview(current_user)


@router.get(
    "/catalog",
    summary="Get product catalog with subscription entitlement statuses",
    description="Returns the complete 4-product suite with feature matrices, pricing, and active workspace status.",
)
async def get_product_catalog(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = EntitlementService(db)
    overview = await service.get_user_entitlements_overview(current_user)
    
    catalog_list = []
    for key, product in overview["products"].items():
        catalog_list.append(product)

    return {
        "organization_id": overview["organization_id"],
        "organization_name": overview["organization_name"],
        "subscription": overview["subscription"],
        "catalog": catalog_list,
    }


@router.post(
    "/onboarding/select-products",
    summary="Select products during onboarding flow",
    description="Configures workspace subscription, enables chosen products, locks remaining products, and completes onboarding.",
)
async def select_onboarding_products(
    payload: ProductSelectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = EntitlementService(db)
    try:
        res = await service.select_onboarding_products(
            user=current_user,
            selected_product_keys=payload.products,
            plan=payload.plan or "PRO_TRIAL",
            billing_cycle=payload.billing_cycle or "monthly",
        )
        return {
            "success": True,
            "message": f"Successfully configured workspace with {len(payload.products)} selected product(s).",
            "data": res,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/upgrade",
    summary="Upgrade or activate an add-on product",
    description="Activates an add-on product (e.g. Thing Cloud) after payment/authorization, updates entitlements, and records audit log.",
)
async def upgrade_product(
    payload: UpgradeProductRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = EntitlementService(db)
    try:
        res = await service.upgrade_product(
            user=current_user,
            product_key=payload.product_key,
            plan_name=payload.plan_name,
            payment_token=payload.payment_token,
        )
        return {
            "success": True,
            "message": f"Product '{payload.product_key}' has been successfully unlocked for your workspace.",
            "data": res,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/audit-log",
    summary="Get subscription and entitlement audit trail",
    description="Returns immutable history of entitlement grants, upgrades, and plan changes.",
)
async def get_subscription_audit_log(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AuditEventResponse]:
    service = EntitlementService(db)
    org = await service.get_or_create_user_organization(current_user)

    stmt = select(SubscriptionAuditEvent).where(
        SubscriptionAuditEvent.organization_id == org.id
    ).order_by(desc(SubscriptionAuditEvent.created_at)).limit(50)
    res = await db.execute(stmt)
    events = res.scalars().all()

    return [
        AuditEventResponse(
            id=str(e.id),
            event_type=e.event_type,
            product_key=e.product_key,
            actor_id=e.actor_id,
            details=e.details,
            created_at=e.created_at.isoformat() if e.created_at else "",
        )
        for e in events
    ]
