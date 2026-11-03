"""
IaC Security Settings Suite API Router — Section 15: Screens 15.1 through 15.7
Prefix: /api/v1/iac/settings-suite
Authoritative REST endpoints for General, Scan, Rules & Policies,
Exclusions, Notifications, Access & Permissions, and Advanced Settings.
"""

from typing import Dict, Any
from fastapi import APIRouter, Path, Query, status

from app.schemas.iac_settings_suite import (
    IaCSettingsSuiteMasterDTO,
    GeneralSettingsDTO,
    UpdateGeneralSettingsRequest,
    ScanSettingsDTO,
    UpdateScanSettingsRequest,
    RulesPoliciesSettingsDTO,
    UpdateRulesPoliciesRequest,
    PolicyPackItem,
    ExclusionsSettingsDTO,
    ExclusionItem,
    AddExclusionRequest,
    PreviewExclusionRequest,
    PreviewExclusionResponse,
    NotificationsSettingsDTO,
    NotificationChannelItem,
    UpdateNotificationsRequest,
    AddNotificationChannelRequest,
    AccessSettingsDTO,
    UserAccessItem,
    AddUserAccessRequest,
    AdvancedSettingsDTO,
    EnvVariableItem,
    UpdateAdvancedSettingsRequest,
)
from app.services.iac_settings_suite_service import IaCSettingsSuiteService

router = APIRouter(prefix="/iac/settings-suite", tags=["IaC Security Settings Suite"])


# ============================================================================
# Master Suite Aggregator
# ============================================================================

@router.get(
    "/all",
    response_model=IaCSettingsSuiteMasterDTO,
    summary="Get comprehensive aggregate settings for all 7 sections (Screens 15.1 - 15.7)",
)
async def get_all_settings() -> IaCSettingsSuiteMasterDTO:
    return IaCSettingsSuiteService.get_all_settings()


@router.post(
    "/reset-all",
    response_model=IaCSettingsSuiteMasterDTO,
    summary="Reset all settings across all 7 sections to factory defaults",
)
async def reset_all_settings() -> IaCSettingsSuiteMasterDTO:
    return IaCSettingsSuiteService.reset_all()


# ============================================================================
# 15.1 General Settings
# ============================================================================

@router.get(
    "/general",
    response_model=GeneralSettingsDTO,
    summary="15.1 General Settings (Repository, branch, working directory, IaC types, scan behavior)",
)
async def get_general_settings() -> GeneralSettingsDTO:
    return IaCSettingsSuiteService.get_general()


@router.put(
    "/general",
    response_model=GeneralSettingsDTO,
    summary="15.1 Update General Settings",
)
async def update_general_settings(payload: UpdateGeneralSettingsRequest) -> GeneralSettingsDTO:
    return IaCSettingsSuiteService.update_general(payload)


@router.post(
    "/general/reset",
    response_model=GeneralSettingsDTO,
    summary="15.1 Reset General Settings to defaults",
)
async def reset_general_settings() -> GeneralSettingsDTO:
    return IaCSettingsSuiteService.reset_general()


# ============================================================================
# 15.2 Scan Settings
# ============================================================================

@router.get(
    "/scan",
    response_model=ScanSettingsDTO,
    summary="15.2 Scan Settings (Scanner, version, additional tools, file extensions, limits)",
)
async def get_scan_settings() -> ScanSettingsDTO:
    return IaCSettingsSuiteService.get_scan()


@router.put(
    "/scan",
    response_model=ScanSettingsDTO,
    summary="15.2 Update Scan Settings",
)
async def update_scan_settings(payload: UpdateScanSettingsRequest) -> ScanSettingsDTO:
    return IaCSettingsSuiteService.update_scan(payload)


@router.post(
    "/scan/reset",
    response_model=ScanSettingsDTO,
    summary="15.2 Reset Scan Settings to defaults",
)
async def reset_scan_settings() -> ScanSettingsDTO:
    return IaCSettingsSuiteService.reset_scan()


@router.post(
    "/scan/check-updates",
    summary="15.2 Check for scanner version and rule catalog updates",
)
async def check_scanner_updates() -> Dict[str, Any]:
    return IaCSettingsSuiteService.check_scanner_updates()


# ============================================================================
# 15.3 Rules & Policies
# ============================================================================

@router.get(
    "/rules-policies",
    response_model=RulesPoliciesSettingsDTO,
    summary="15.3 Rules & Policies (Enabled policy packs, severity mappings)",
)
async def get_rules_policies() -> RulesPoliciesSettingsDTO:
    return IaCSettingsSuiteService.get_rules_policies()


@router.put(
    "/rules-policies",
    response_model=RulesPoliciesSettingsDTO,
    summary="15.3 Update Rules & Policies",
)
async def update_rules_policies(payload: UpdateRulesPoliciesRequest) -> RulesPoliciesSettingsDTO:
    return IaCSettingsSuiteService.update_rules_policies(payload)


@router.patch(
    "/rules-policies/packs/{pack_name}/status",
    response_model=PolicyPackItem,
    summary="15.3 Toggle policy pack status between Enabled and Disabled",
)
async def toggle_policy_pack_status(
    pack_name: str = Path(..., description="Policy pack name"),
    status_val: str = Query(..., alias="status", description="Enabled or Disabled"),
) -> PolicyPackItem:
    return IaCSettingsSuiteService.toggle_policy_pack(pack_name, status_val)


@router.post(
    "/rules-policies/reset",
    response_model=RulesPoliciesSettingsDTO,
    summary="15.3 Reset Rules & Policies to defaults",
)
async def reset_rules_policies() -> RulesPoliciesSettingsDTO:
    return IaCSettingsSuiteService.reset_rules_policies()


# ============================================================================
# 15.4 Exclusions
# ============================================================================

@router.get(
    "/exclusions",
    response_model=ExclusionsSettingsDTO,
    summary="15.4 Exclusions (File, directory, resource exclusion patterns)",
)
async def get_exclusions() -> ExclusionsSettingsDTO:
    return IaCSettingsSuiteService.get_exclusions()


@router.post(
    "/exclusions",
    response_model=ExclusionItem,
    status_code=status.HTTP_201_CREATED,
    summary="15.4 Add new exclusion pattern",
)
async def add_exclusion(payload: AddExclusionRequest) -> ExclusionItem:
    return IaCSettingsSuiteService.add_exclusion(payload)


@router.delete(
    "/exclusions/{exclusion_id}",
    summary="15.4 Delete exclusion pattern by ID",
)
async def delete_exclusion(exclusion_id: str = Path(...)) -> Dict[str, Any]:
    return IaCSettingsSuiteService.delete_exclusion(exclusion_id)


@router.post(
    "/exclusions/preview",
    response_model=PreviewExclusionResponse,
    summary="15.4 Test a file path to preview whether it will be excluded or included in scan",
)
async def preview_exclusion(payload: PreviewExclusionRequest) -> PreviewExclusionResponse:
    return IaCSettingsSuiteService.preview_exclusion(payload)


@router.post(
    "/exclusions/reset",
    response_model=ExclusionsSettingsDTO,
    summary="15.4 Reset Exclusions to defaults",
)
async def reset_exclusions() -> ExclusionsSettingsDTO:
    return IaCSettingsSuiteService.reset_exclusions()


# ============================================================================
# 15.5 Notifications
# ============================================================================

@router.get(
    "/notifications",
    response_model=NotificationsSettingsDTO,
    summary="15.5 Notifications (Master toggles, channels, events checklist)",
)
async def get_notifications() -> NotificationsSettingsDTO:
    return IaCSettingsSuiteService.get_notifications()


@router.put(
    "/notifications",
    response_model=NotificationsSettingsDTO,
    summary="15.5 Update Notifications settings & events",
)
async def update_notifications(payload: UpdateNotificationsRequest) -> NotificationsSettingsDTO:
    return IaCSettingsSuiteService.update_notifications(payload)


@router.post(
    "/notifications/channels",
    response_model=NotificationChannelItem,
    status_code=status.HTTP_201_CREATED,
    summary="15.5 Add notification channel (Slack, Email, Webhook, Jira)",
)
async def add_notification_channel(payload: AddNotificationChannelRequest) -> NotificationChannelItem:
    return IaCSettingsSuiteService.add_notification_channel(payload)


@router.delete(
    "/notifications/channels/{channel_id}",
    summary="15.5 Delete notification channel",
)
async def delete_notification_channel(channel_id: str = Path(...)) -> Dict[str, Any]:
    return IaCSettingsSuiteService.delete_notification_channel(channel_id)


@router.post(
    "/notifications/reset",
    response_model=NotificationsSettingsDTO,
    summary="15.5 Reset Notifications to defaults",
)
async def reset_notifications() -> NotificationsSettingsDTO:
    return IaCSettingsSuiteService.reset_notifications()


# ============================================================================
# 15.6 Access & Permissions
# ============================================================================

@router.get(
    "/access",
    response_model=AccessSettingsDTO,
    summary="15.6 Access & Permissions (Users with access and role definitions)",
)
async def get_access() -> AccessSettingsDTO:
    return IaCSettingsSuiteService.get_access()


@router.post(
    "/access/users",
    response_model=UserAccessItem,
    status_code=status.HTTP_201_CREATED,
    summary="15.6 Add user access",
)
async def add_user_access(payload: AddUserAccessRequest) -> UserAccessItem:
    return IaCSettingsSuiteService.add_user_access(payload)


@router.delete(
    "/access/users/{user_id}",
    summary="15.6 Remove user access",
)
async def delete_user_access(user_id: str = Path(...)) -> Dict[str, Any]:
    return IaCSettingsSuiteService.delete_user_access(user_id)


@router.put(
    "/access/users/{user_id}/role",
    response_model=UserAccessItem,
    summary="15.6 Update user role",
)
async def update_user_role(
    user_id: str = Path(...),
    new_role: str = Query(..., description="Admin, Editor, Viewer, Custom"),
) -> UserAccessItem:
    return IaCSettingsSuiteService.update_user_role(user_id, new_role)


@router.post(
    "/access/reset",
    response_model=AccessSettingsDTO,
    summary="15.6 Reset Access & Permissions to defaults",
)
async def reset_access() -> AccessSettingsDTO:
    return IaCSettingsSuiteService.reset_access()


# ============================================================================
# 15.7 Advanced Settings
# ============================================================================

@router.get(
    "/advanced",
    response_model=AdvancedSettingsDTO,
    summary="15.7 Advanced Settings (Performance, CLI arguments, environment variables)",
)
async def get_advanced() -> AdvancedSettingsDTO:
    return IaCSettingsSuiteService.get_advanced()


@router.put(
    "/advanced",
    response_model=AdvancedSettingsDTO,
    summary="15.7 Update Advanced Settings",
)
async def update_advanced(payload: UpdateAdvancedSettingsRequest) -> AdvancedSettingsDTO:
    return IaCSettingsSuiteService.update_advanced(payload)


@router.post(
    "/advanced/env-vars",
    response_model=EnvVariableItem,
    summary="15.7 Add or update environment variable",
)
async def add_env_variable(payload: EnvVariableItem) -> EnvVariableItem:
    return IaCSettingsSuiteService.add_env_var(payload)


@router.delete(
    "/advanced/env-vars/{var_name}",
    summary="15.7 Delete environment variable",
)
async def delete_env_variable(var_name: str = Path(...)) -> Dict[str, Any]:
    return IaCSettingsSuiteService.delete_env_var(var_name)


@router.post(
    "/advanced/reset",
    response_model=AdvancedSettingsDTO,
    summary="15.7 Reset Advanced Settings to defaults",
)
async def reset_advanced() -> AdvancedSettingsDTO:
    return IaCSettingsSuiteService.reset_advanced()
