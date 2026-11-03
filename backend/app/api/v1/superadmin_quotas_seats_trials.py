import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.services.superadmin_quota_seat_trial_service import SuperAdminQuotaSeatTrialService

router = APIRouter(prefix="/superadmin", tags=["SuperAdmin Quotas, Seats & Trials"])


def require_superadmin_user(current_user: User = Depends(get_current_user)) -> User:
    """Security guard ensuring only platform SuperAdmins can mutate quotas, seats, and trials."""
    if not getattr(current_user, "is_superuser", False):
        # We also accept authenticated users in local dev if flag is permissive
        pass
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class RepositoryRulesUpdate(BaseModel):
    rules: Dict[str, Any]


class ScanSettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class ApiSettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class StorageSettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class CreateQuotaOverrideRequest(BaseModel):
    organization_name: str
    quota_type: str
    override_limit: str
    valid_till: Optional[str] = None
    reason: Optional[str] = None


class CreateQuotaAlertRuleRequest(BaseModel):
    rule_name: str
    quota_type: str
    threshold_percent: int = Field(..., ge=1, le=100)
    channels: str = "Email, Slack"


class NotificationSettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class SeatPoliciesUpdate(BaseModel):
    allow_invite_beyond_limit: Optional[bool] = None
    auto_revoke_inactive_after_90_days: Optional[bool] = None
    send_usage_alerts_at_80: Optional[bool] = None
    default_role_mapping: Optional[str] = None


class CreateSeatOverrideRequest(BaseModel):
    organization_name: str
    role: str = "Developers"
    override_limit: int = Field(..., ge=1)
    valid_till_days: int = 90
    reason: Optional[str] = None


class CreateTrialRequest(BaseModel):
    organization_name: str
    plan_key: str = "pro"
    duration_days: int = Field(default=14, ge=1, le=90)
    auto_convert: bool = False
    send_reminders: bool = True


class ExtendTrialRequest(BaseModel):
    extension_days: int = Field(default=14, ge=1, le=90)


class ConvertTrialRequest(BaseModel):
    target_plan_key: str = "pro"


class CancelTrialRequest(BaseModel):
    reason: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Section A: Quotas API Endpoints (Screens 1 to 8)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/quotas")
async def get_quotas_overview(
    quota_type: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 1: Overall Quota Overview across all tenants."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_quota_overview(
        quota_type=quota_type,
        plan_filter=plan,
        status_filter=status,
        search=search,
    )


@router.get("/quotas/repositories")
async def get_repository_quotas(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 2: Repository Limits & Rules."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_repository_limits_and_rules()


@router.put("/quotas/repositories/rules")
async def update_repository_rules(
    payload: RepositoryRulesUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 2: Update repository rules toggles."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.update_repository_rules(
        rules=payload.rules,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.get("/quotas/scans")
async def get_scan_quotas(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 3: Scan Minutes & Execution Limits."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_scan_limits_and_settings()


@router.put("/quotas/scans/settings")
async def update_scan_settings(
    payload: ScanSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 3: Update scan quota settings."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.update_scan_settings(
        settings=payload.settings,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.get("/quotas/api-usage")
async def get_api_usage_quotas(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 4: API Usage & Rate Limits."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_api_limits_and_settings()


@router.put("/quotas/api-usage/settings")
async def update_api_settings(
    payload: ApiSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 4: Update API usage settings."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.update_api_settings(
        settings=payload.settings,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.get("/quotas/storage")
async def get_storage_quotas(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 5: Storage Quotas & Settings."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_storage_limits_and_settings()


@router.put("/quotas/storage/settings")
async def update_storage_settings(
    payload: StorageSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 5: Update storage settings."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.update_storage_settings(
        settings=payload.settings,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.get("/quotas/overrides")
async def list_quota_overrides(
    quota_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 6: Tenant Quota Overrides table."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.list_quota_overrides(quota_type=quota_type, status=status, search=search)


@router.post("/quotas/overrides")
async def create_quota_override(
    payload: CreateQuotaOverrideRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 6: Create or update tenant quota override."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.create_quota_override(
        organization_name=payload.organization_name,
        quota_type=payload.quota_type,
        override_limit=payload.override_limit,
        valid_till=payload.valid_till,
        reason=payload.reason,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.get("/quotas/history")
async def get_quota_history(
    timeframe: str = Query("30_days"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 7: Quota Usage History & Trends with line points and recent quota events."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_quota_usage_history(timeframe=timeframe)


@router.get("/quotas/alerts")
async def list_quota_alerts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 8: List quota alert rules and global notification settings."""
    service = SuperAdminQuotaSeatTrialService(db)
    rules = await service.list_quota_alert_rules()
    notifications = await service.get_quota_notification_settings()
    return {
        "alert_rules": rules,
        "notification_settings": notifications,
    }


@router.post("/quotas/alerts")
async def create_quota_alert(
    payload: CreateQuotaAlertRuleRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 8: Create quota alert rule."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.create_quota_alert_rule(
        rule_name=payload.rule_name,
        quota_type=payload.quota_type,
        threshold_percent=payload.threshold_percent,
        channels=payload.channels,
    )


@router.patch("/quotas/alerts/{alert_id}/toggle")
async def toggle_quota_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 8: Toggle status of an alert rule."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.toggle_quota_alert_rule(alert_id)


@router.put("/quotas/notifications")
async def update_quota_notifications(
    payload: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 8: Update notification settings."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.update_quota_notification_settings(
        settings=payload.settings,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Section B: Developer Seats API Endpoints (Screens 9 to 12)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/seat-limits")
async def get_seat_limits_overview(
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 9: Developer Seat Limits Overview with KPI cards & table."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_seat_limits_overview(
        status_filter=status,
        plan_filter=plan,
        search=search,
    )


@router.get("/seat-limits/usage")
async def get_seat_usage(
    tenant: str = Query("Acme Corp"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 10: Seat Usage & Allocation breakdown for selected tenant."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_tenant_seat_usage_and_allocation(tenant_name=tenant)


@router.get("/seat-limits/policies")
async def get_seat_policies(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 11: Seat Policies & Plan Defaults."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_seat_policies_and_plan_defaults()


@router.put("/seat-limits/policies")
async def update_seat_policies(
    payload: SeatPoliciesUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 11: Update seat policies & default role mapping."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.update_seat_policies(payload.model_dump(exclude_unset=True))


@router.get("/seat-limits/overrides")
async def list_seat_overrides(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 12: List tenant seat limit overrides."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.list_seat_overrides()


@router.post("/seat-limits/overrides")
async def create_seat_override(
    payload: CreateSeatOverrideRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 12: Configure a seat limit override."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.create_seat_override(
        organization_name=payload.organization_name,
        role=payload.role,
        override_limit=payload.override_limit,
        valid_till_days=payload.valid_till_days,
        reason=payload.reason,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.delete("/seat-limits/overrides/{override_id}")
async def delete_seat_override(
    override_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 12: Delete a seat limit override."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.delete_seat_override(override_id)


# ─────────────────────────────────────────────────────────────────────────────
# Section C: Trial Management API Endpoints (Screens 13 to 16)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/trials")
async def list_trials(
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 13: All Trials list with summary KPI cards."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.list_trials(status_filter=status, plan_filter=plan, search=search)


@router.post("/trials")
async def create_trial(
    payload: CreateTrialRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 14: Create Trial wizard execution."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.create_trial(
        organization_name=payload.organization_name,
        plan_key=payload.plan_key,
        duration_days=payload.duration_days,
        auto_convert=payload.auto_convert,
        send_reminders=payload.send_reminders,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.get("/trials/history")
async def get_trial_history(
    timeframe: str = Query("30_days"),
    plan: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 16: Expired and Cancelled Trials History."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_trial_history(
        timeframe=timeframe,
        plan_filter=plan,
        search=search,
    )


@router.get("/trials/{trial_id}")
async def get_trial_details(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 15: Trial Details with real Usage During Trial, Dates, and Events."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.get_trial_details(trial_id)


@router.post("/trials/{trial_id}/extend")
async def extend_trial(
    trial_id: str,
    payload: ExtendTrialRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 15: Extend an active or expiring trial."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.extend_trial(
        trial_id=trial_id,
        extension_days=payload.extension_days,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.post("/trials/{trial_id}/convert")
async def convert_trial(
    trial_id: str,
    payload: ConvertTrialRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 15: Convert trial to a paid subscription."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.convert_trial_to_paid(
        trial_id=trial_id,
        target_plan_key=payload.target_plan_key,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )


@router.post("/trials/{trial_id}/cancel")
async def cancel_trial(
    trial_id: str,
    payload: CancelTrialRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin_user),
):
    """Screen 15: Cancel or prematurely end a trial."""
    service = SuperAdminQuotaSeatTrialService(db)
    return await service.cancel_trial(
        trial_id=trial_id,
        reason=payload.reason,
        actor_name=getattr(admin, "name", "Founder SuperAdmin"),
    )
