import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["Billing & Credits"])


class CheckoutRequest(BaseModel):
    plan_tier: str
    card_name: str
    billing_email: str
    card_number: Optional[str] = "4242 4242 4242 4242"
    exp: Optional[str] = "12/28"
    cvc: Optional[str] = "•••"


class InviteRequest(BaseModel):
    email: str
    role: Optional[str] = "member"


class DeductRequest(BaseModel):
    scan_type: str  # code_security | secrets | dependencies
    target_repo: str


@router.get("/overview", summary="Get billing and credits overview")
async def get_billing_overview(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.get_overview(user=current_user)


@router.get("/transactions", summary="List credit usage transactions")
async def get_credit_transactions(
    limit: int = Query(50, ge=1, le=200),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.get_transactions(user=current_user, limit=limit)


@router.get("/invoices", summary="List billing invoices")
async def get_billing_invoices(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.get_invoices(user=current_user)


@router.post("/checkout", summary="Process subscription upgrade payment")
async def process_checkout(
    payload: CheckoutRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    last4 = "4242"
    if payload.card_number:
        clean = payload.card_number.replace(" ", "")
        if len(clean) >= 4:
            last4 = clean[-4:]

    return await service.process_checkout(
        user=current_user,
        org_id=None,
        plan_tier=payload.plan_tier,
        card_name=payload.card_name,
        billing_email=payload.billing_email,
        last4=last4,
        exp=payload.exp or "12/28",
    )


@router.post("/cancel", summary="Cancel current subscription plan")
async def cancel_subscription(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    account = await service.get_or_create_account(user=current_user)
    account.status = "Cancelled"
    await db.commit()

    # Asynchronously synchronize cancellation with HubSpot CRM
    import asyncio
    from app.services.hubspot_service import hubspot_service
    if account.billing_email:
        asyncio.create_task(
            hubspot_service.sync_billing_cancellation(
                account_id=str(account.id),
                user_email=account.billing_email,
                org_id=str(account.organization_id) if account.organization_id else None,
            )
        )

    return {"success": True, "message": "Plan cancelled successfully", "status": account.status}


@router.get("/team", summary="Get team members and seat usage")
async def get_team_members(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.get_team(user=current_user)


@router.post("/team/invite", summary="Invite a teammate")
async def invite_teammate(
    payload: InviteRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.invite_teammate(
        inviter=current_user,
        org_id=None,
        email=payload.email,
        role=payload.role or "member",
    )


@router.post("/deduct", summary="Deduct credits for a scan execution")
async def deduct_scan_credits(
    payload: DeductRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.deduct_scan_credits(
        user=current_user,
        org_id=None,
        scan_type=payload.scan_type,
        target_repo=payload.target_repo,
    )
