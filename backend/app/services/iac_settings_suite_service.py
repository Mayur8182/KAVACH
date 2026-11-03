"""
IaC Security Settings Suite Service — Section 15 (Screens 15.1 through 15.7)
Authoritative state management, persistence, pattern matching preview,
and configuration logic for all 7 Settings sections.
"""

from typing import List, Dict, Any, Optional
import fnmatch
import uuid
import copy

from app.schemas.iac_settings_suite import (
    GeneralSettingsDTO,
    UpdateGeneralSettingsRequest,
    ScanSettingsDTO,
    UpdateScanSettingsRequest,
    AdditionalToolsConfig,
    RulesPoliciesSettingsDTO,
    UpdateRulesPoliciesRequest,
    PolicyPackItem,
    ToolSeverityMapping,
    ExclusionsSettingsDTO,
    ExclusionItem,
    AddExclusionRequest,
    PreviewExclusionRequest,
    PreviewExclusionResponse,
    NotificationsSettingsDTO,
    NotificationChannelItem,
    NotificationEventsConfig,
    UpdateNotificationsRequest,
    AddNotificationChannelRequest,
    AccessSettingsDTO,
    UserAccessItem,
    RoleDefinitionItem,
    AddUserAccessRequest,
    AdvancedSettingsDTO,
    EnvVariableItem,
    UpdateAdvancedSettingsRequest,
    IaCSettingsSuiteMasterDTO,
)


class IaCSettingsSuiteService:
    """Singleton service providing in-memory state persistence and business rules for Section 15."""

    # Default baseline configuration exactly matching Screens 15.1 to 15.7
    _DEFAULT_STATE: Dict[str, Any] = {
        "repository": "frontend-app",
        "general": {
            "repository": "frontend-app",
            "default_branch": "main",
            "iac_working_directory": "/",
            "supported_iac_types": ["Terraform", "CloudFormation", "Kubernetes Manifests", "Helm Charts"],
            "auto_scan_on_push": True,
            "scan_on_pr": True,
            "scan_on_schedule": False,
        },
        "scan": {
            "iac_scanner": "Checkov (Default)",
            "scanner_version": "2.4.1",
            "scanner_version_latest": True,
            "additional_tools": {
                "tfsec": False,
                "kube_score": False,
                "kube_linter": False,
                "custom_scanner": False,
                "custom_scanner_command": "",
            },
            "file_extensions": ".tf, .tfvars, .yaml, .yml, .json",
            "max_file_size_mb": 5,
            "parallel_scans": 4,
        },
        "rules_policies": {
            "policy_packs": [
                {"name": "Checkov Default", "type": "Best Practices", "version": "2.4.1", "status": "Enabled"},
                {"name": "CIS AWS", "type": "Compliance", "version": "1.6.0", "status": "Enabled"},
                {"name": "CIS Kubernetes", "type": "Compliance", "version": "1.5.2", "status": "Enabled"},
                {"name": "NIST 800-53", "type": "Compliance", "version": "1.0.0", "status": "Disabled"},
                {"name": "PCI DSS", "type": "Compliance", "version": "1.2.0", "status": "Disabled"},
                {"name": "Terraform Best Practices", "type": "Best Practices", "version": "1.3.0", "status": "Enabled"},
                {"name": "Kubernetes Security", "type": "Best Practices", "version": "1.1.0", "status": "Enabled"},
                {"name": "AWS Well-Architected", "type": "Best Practices", "version": "1.0.0", "status": "Disabled"},
            ],
            "severity_mappings": {
                "Checkov": {"critical": "High", "high": "High", "medium": "Medium", "low": "Low"},
                "tfsec": {"critical": "Critical", "high": "High", "medium": "Medium", "low": "Low"},
                "kube-score": {"critical": "High", "high": "Medium", "medium": "Low", "low": "Low"},
            },
        },
        "exclusions": {
            "active_tab": "File / Path Exclusions",
            "exclusions": [
                {"id": "exc-1", "pattern": "**/tests/**", "type": "Directory", "description": "Test files"},
                {"id": "exc-2", "pattern": "**/examples/**", "type": "Directory", "description": "Example configurations"},
                {"id": "exc-3", "pattern": "terraform/*.tfvars", "type": "File", "description": "Variable files"},
                {"id": "exc-4", "pattern": "**/kustomize/**", "type": "Directory", "description": "Kustomize overlays"},
                {"id": "exc-5", "pattern": "helm/charts/**", "type": "Directory", "description": "Helm chart sources"},
                {"id": "exc-6", "pattern": "**/.terraform/**", "type": "Directory", "description": "Terraform cache"},
            ],
        },
        "notifications": {
            "enable_notifications": True,
            "notify_on_scan_completion": True,
            "notify_on_critical_findings": True,
            "notify_on_policy_violations": True,
            "channels": [
                {"id": "chan-1", "channel": "dev-sec-team", "type": "Slack", "configuration": "#iac-security", "status": "Active"},
                {"id": "chan-2", "channel": "security-email", "type": "Email", "configuration": "security@company.com", "status": "Active"},
                {"id": "chan-3", "channel": "webhook-ci", "type": "Webhook", "configuration": "https://hooks.slack.com/services/T00/B00/X00", "status": "Active"},
                {"id": "chan-4", "channel": "jira-integration", "type": "Jira", "configuration": "IaC Security Project", "status": "Inactive"},
            ],
            "events": {
                "scan_completed": True,
                "critical_findings_detected": True,
                "policy_violations": True,
                "new_rules_available": False,
                "scan_failed": True,
                "high_severity_findings": True,
                "drift_detected": False,
                "compliance_status_changed": False,
            },
        },
        "access": {
            "active_tab": "User Access",
            "users": [
                {"id": "usr-1", "user": "mayur.bhanvad", "avatar_initials": "MK", "role": "Admin", "permissions": "Full access", "status": "Active"},
                {"id": "usr-2", "user": "dev.lead", "avatar_initials": "DL", "role": "Editor", "permissions": "View, Configure", "status": "Active"},
                {"id": "usr-3", "user": "security-team", "avatar_initials": "ST", "role": "Viewer", "permissions": "View only", "status": "Active"},
                {"id": "usr-4", "user": "infra-team", "avatar_initials": "IT", "role": "Viewer", "permissions": "View only", "status": "Active"},
                {"id": "usr-5", "user": "john.doe", "avatar_initials": "JD", "role": "Custom", "permissions": "View, Configure (Limited)", "status": "Inactive"},
            ],
            "roles": [
                {"role": "Admin", "description": "Full access to all IaC security settings and configurations"},
                {"role": "Editor", "description": "Can view and modify settings (except access control)"},
                {"role": "Viewer", "description": "Read-only access to IaC security data and settings"},
                {"role": "Custom", "description": "Granular permissions (configure below)"},
            ],
        },
        "advanced": {
            "scan_timeout_minutes": 10,
            "max_memory_usage_gb": 2,
            "cache_results": True,
            "cache_ttl_days": 7,
            "checkov_arguments": "--framework terraform,kubernetes,cloudformation --quiet",
            "tfsec_arguments": "--format json --soft-fail",
            "environment_variables": [
                {"name": "AWS_REGION", "value": "us-east-1"},
            ],
        },
    }

    # Live active state
    _state: Dict[str, Any] = copy.deepcopy(_DEFAULT_STATE)

    # ── 15.0 Master Aggregator ──
    @classmethod
    def get_all_settings(cls) -> IaCSettingsSuiteMasterDTO:
        return IaCSettingsSuiteMasterDTO(
            repository=cls._state["repository"],
            general=GeneralSettingsDTO(**cls._state["general"]),
            scan=ScanSettingsDTO(**cls._state["scan"]),
            rules_policies=RulesPoliciesSettingsDTO(
                policy_packs=[PolicyPackItem(**p) for p in cls._state["rules_policies"]["policy_packs"]],
                severity_mappings={k: ToolSeverityMapping(**v) for k, v in cls._state["rules_policies"]["severity_mappings"].items()},
            ),
            exclusions=ExclusionsSettingsDTO(
                active_tab=cls._state["exclusions"]["active_tab"],
                exclusions=[ExclusionItem(**e) for e in cls._state["exclusions"]["exclusions"]],
            ),
            notifications=NotificationsSettingsDTO(
                enable_notifications=cls._state["notifications"]["enable_notifications"],
                notify_on_scan_completion=cls._state["notifications"]["notify_on_scan_completion"],
                notify_on_critical_findings=cls._state["notifications"]["notify_on_critical_findings"],
                notify_on_policy_violations=cls._state["notifications"]["notify_on_policy_violations"],
                channels=[NotificationChannelItem(**c) for c in cls._state["notifications"]["channels"]],
                events=NotificationEventsConfig(**cls._state["notifications"]["events"]),
            ),
            access=AccessSettingsDTO(
                active_tab=cls._state["access"]["active_tab"],
                users=[UserAccessItem(**u) for u in cls._state["access"]["users"]],
                roles=[RoleDefinitionItem(**r) for r in cls._state["access"]["roles"]],
            ),
            advanced=AdvancedSettingsDTO(
                scan_timeout_minutes=cls._state["advanced"]["scan_timeout_minutes"],
                max_memory_usage_gb=cls._state["advanced"]["max_memory_usage_gb"],
                cache_results=cls._state["advanced"]["cache_results"],
                cache_ttl_days=cls._state["advanced"]["cache_ttl_days"],
                checkov_arguments=cls._state["advanced"]["checkov_arguments"],
                tfsec_arguments=cls._state["advanced"]["tfsec_arguments"],
                environment_variables=[EnvVariableItem(**v) for v in cls._state["advanced"]["environment_variables"]],
            ),
        )

    # ── 15.1 General Settings ──
    @classmethod
    def get_general(cls) -> GeneralSettingsDTO:
        return GeneralSettingsDTO(**cls._state["general"])

    @classmethod
    def update_general(cls, req: UpdateGeneralSettingsRequest) -> GeneralSettingsDTO:
        target = cls._state["general"]
        data = req.model_dump(exclude_unset=True)
        for k, v in data.items():
            if v is not None:
                target[k] = v
        if req.repository:
            cls._state["repository"] = req.repository
        return GeneralSettingsDTO(**target)

    @classmethod
    def reset_general(cls) -> GeneralSettingsDTO:
        cls._state["general"] = copy.deepcopy(cls._DEFAULT_STATE["general"])
        return GeneralSettingsDTO(**cls._state["general"])

    # ── 15.2 Scan Settings ──
    @classmethod
    def get_scan(cls) -> ScanSettingsDTO:
        return ScanSettingsDTO(**cls._state["scan"])

    @classmethod
    def update_scan(cls, req: UpdateScanSettingsRequest) -> ScanSettingsDTO:
        target = cls._state["scan"]
        data = req.model_dump(exclude_unset=True)
        for k, v in data.items():
            if v is not None:
                if k == "additional_tools" and isinstance(v, dict):
                    target[k].update(v)
                else:
                    target[k] = v
        return ScanSettingsDTO(**target)

    @classmethod
    def reset_scan(cls) -> ScanSettingsDTO:
        cls._state["scan"] = copy.deepcopy(cls._DEFAULT_STATE["scan"])
        return ScanSettingsDTO(**cls._state["scan"])

    @classmethod
    def check_scanner_updates(cls) -> Dict[str, Any]:
        return {
            "scanner": cls._state["scan"]["iac_scanner"],
            "installed_version": cls._state["scan"]["scanner_version"],
            "latest_version": "2.4.1",
            "is_latest": True,
            "checked_at": "Just now",
            "message": "Scanner is up to date with the latest security rules.",
        }

    # ── 15.3 Rules & Policies ──
    @classmethod
    def get_rules_policies(cls) -> RulesPoliciesSettingsDTO:
        data = cls._state["rules_policies"]
        return RulesPoliciesSettingsDTO(
            policy_packs=[PolicyPackItem(**p) for p in data["policy_packs"]],
            severity_mappings={k: ToolSeverityMapping(**v) for k, v in data["severity_mappings"].items()},
        )

    @classmethod
    def update_rules_policies(cls, req: UpdateRulesPoliciesRequest) -> RulesPoliciesSettingsDTO:
        if req.policy_packs is not None:
            cls._state["rules_policies"]["policy_packs"] = [p.model_dump() for p in req.policy_packs]
        if req.severity_mappings is not None:
            cls._state["rules_policies"]["severity_mappings"] = {
                k: v.model_dump() for k, v in req.severity_mappings.items()
            }
        return cls.get_rules_policies()

    @classmethod
    def toggle_policy_pack(cls, pack_name: str, status: str) -> PolicyPackItem:
        packs = cls._state["rules_policies"]["policy_packs"]
        for p in packs:
            if p["name"].lower() == pack_name.lower():
                p["status"] = status
                return PolicyPackItem(**p)
        raise ValueError(f"Policy pack '{pack_name}' not found.")

    @classmethod
    def reset_rules_policies(cls) -> RulesPoliciesSettingsDTO:
        cls._state["rules_policies"] = copy.deepcopy(cls._DEFAULT_STATE["rules_policies"])
        return cls.get_rules_policies()

    # ── 15.4 Exclusions ──
    @classmethod
    def get_exclusions(cls) -> ExclusionsSettingsDTO:
        data = cls._state["exclusions"]
        return ExclusionsSettingsDTO(
            active_tab=data["active_tab"],
            exclusions=[ExclusionItem(**e) for e in data["exclusions"]],
        )

    @classmethod
    def add_exclusion(cls, req: AddExclusionRequest) -> ExclusionItem:
        new_id = f"exc-{uuid.uuid4().hex[:6]}"
        item = {
            "id": new_id,
            "pattern": req.pattern,
            "type": req.type,
            "description": req.description,
        }
        cls._state["exclusions"]["exclusions"].insert(0, item)
        return ExclusionItem(**item)

    @classmethod
    def delete_exclusion(cls, exclusion_id: str) -> Dict[str, Any]:
        before = len(cls._state["exclusions"]["exclusions"])
        cls._state["exclusions"]["exclusions"] = [
            e for e in cls._state["exclusions"]["exclusions"] if e["id"] != exclusion_id
        ]
        deleted = len(cls._state["exclusions"]["exclusions"]) < before
        return {"success": deleted, "id": exclusion_id}

    @classmethod
    def preview_exclusion(cls, req: PreviewExclusionRequest) -> PreviewExclusionResponse:
        path = req.file_path.strip().replace("\\", "/")
        exclusions = cls._state["exclusions"]["exclusions"]
        for exc in exclusions:
            pattern = exc["pattern"].strip().replace("\\", "/")
            # Handle standard glob matches
            clean_pattern = pattern.replace("**/", "*").replace("/**", "*")
            if fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, clean_pattern):
                return PreviewExclusionResponse(
                    file_path=path,
                    is_excluded=True,
                    matched_pattern=exc["pattern"],
                    message=f"This file will be excluded from scan by pattern: {exc['pattern']}",
                )
        return PreviewExclusionResponse(
            file_path=path,
            is_excluded=False,
            matched_pattern=None,
            message="This file will be included in scan.",
        )

    @classmethod
    def reset_exclusions(cls) -> ExclusionsSettingsDTO:
        cls._state["exclusions"] = copy.deepcopy(cls._DEFAULT_STATE["exclusions"])
        return cls.get_exclusions()

    # ── 15.5 Notifications ──
    @classmethod
    def get_notifications(cls) -> NotificationsSettingsDTO:
        data = cls._state["notifications"]
        return NotificationsSettingsDTO(
            enable_notifications=data["enable_notifications"],
            notify_on_scan_completion=data["notify_on_scan_completion"],
            notify_on_critical_findings=data["notify_on_critical_findings"],
            notify_on_policy_violations=data["notify_on_policy_violations"],
            channels=[NotificationChannelItem(**c) for c in data["channels"]],
            events=NotificationEventsConfig(**data["events"]),
        )

    @classmethod
    def update_notifications(cls, req: UpdateNotificationsRequest) -> NotificationsSettingsDTO:
        data = cls._state["notifications"]
        if req.enable_notifications is not None:
            data["enable_notifications"] = req.enable_notifications
        if req.notify_on_scan_completion is not None:
            data["notify_on_scan_completion"] = req.notify_on_scan_completion
        if req.notify_on_critical_findings is not None:
            data["notify_on_critical_findings"] = req.notify_on_critical_findings
        if req.notify_on_policy_violations is not None:
            data["notify_on_policy_violations"] = req.notify_on_policy_violations
        if req.events is not None:
            data["events"] = req.events.model_dump()
        return cls.get_notifications()

    @classmethod
    def add_notification_channel(cls, req: AddNotificationChannelRequest) -> NotificationChannelItem:
        new_id = f"chan-{uuid.uuid4().hex[:6]}"
        item = {
            "id": new_id,
            "channel": req.channel,
            "type": req.type,
            "configuration": req.configuration,
            "status": req.status,
        }
        cls._state["notifications"]["channels"].insert(0, item)
        return NotificationChannelItem(**item)

    @classmethod
    def delete_notification_channel(cls, channel_id: str) -> Dict[str, Any]:
        before = len(cls._state["notifications"]["channels"])
        cls._state["notifications"]["channels"] = [
            c for c in cls._state["notifications"]["channels"] if c["id"] != channel_id
        ]
        return {"success": len(cls._state["notifications"]["channels"]) < before, "id": channel_id}

    @classmethod
    def reset_notifications(cls) -> NotificationsSettingsDTO:
        cls._state["notifications"] = copy.deepcopy(cls._DEFAULT_STATE["notifications"])
        return cls.get_notifications()

    # ── 15.6 Access & Permissions ──
    @classmethod
    def get_access(cls) -> AccessSettingsDTO:
        data = cls._state["access"]
        return AccessSettingsDTO(
            active_tab=data["active_tab"],
            users=[UserAccessItem(**u) for u in data["users"]],
            roles=[RoleDefinitionItem(**r) for r in data["roles"]],
        )

    @classmethod
    def add_user_access(cls, req: AddUserAccessRequest) -> UserAccessItem:
        new_id = f"usr-{uuid.uuid4().hex[:6]}"
        initials = "".join([part[0].upper() for part in req.user.split(".") if part])[:2] or "US"
        perms = req.permissions or ("Full access" if req.role == "Admin" else "View, Configure" if req.role == "Editor" else "View only")
        item = {
            "id": new_id,
            "user": req.user,
            "avatar_initials": initials,
            "role": req.role,
            "permissions": perms,
            "status": req.status,
        }
        cls._state["access"]["users"].insert(0, item)
        return UserAccessItem(**item)

    @classmethod
    def delete_user_access(cls, user_id: str) -> Dict[str, Any]:
        before = len(cls._state["access"]["users"])
        cls._state["access"]["users"] = [
            u for u in cls._state["access"]["users"] if u["id"] != user_id
        ]
        return {"success": len(cls._state["access"]["users"]) < before, "id": user_id}

    @classmethod
    def update_user_role(cls, user_id: str, new_role: str) -> UserAccessItem:
        users = cls._state["access"]["users"]
        for u in users:
            if u["id"] == user_id:
                u["role"] = new_role
                u["permissions"] = (
                    "Full access" if new_role == "Admin" else "View, Configure" if new_role == "Editor" else "View only"
                )
                return UserAccessItem(**u)
        raise ValueError(f"User ID {user_id} not found.")

    @classmethod
    def reset_access(cls) -> AccessSettingsDTO:
        cls._state["access"] = copy.deepcopy(cls._DEFAULT_STATE["access"])
        return cls.get_access()

    # ── 15.7 Advanced Settings ──
    @classmethod
    def get_advanced(cls) -> AdvancedSettingsDTO:
        data = cls._state["advanced"]
        return AdvancedSettingsDTO(
            scan_timeout_minutes=data["scan_timeout_minutes"],
            max_memory_usage_gb=data["max_memory_usage_gb"],
            cache_results=data["cache_results"],
            cache_ttl_days=data["cache_ttl_days"],
            checkov_arguments=data["checkov_arguments"],
            tfsec_arguments=data["tfsec_arguments"],
            environment_variables=[EnvVariableItem(**v) for v in data["environment_variables"]],
        )

    @classmethod
    def update_advanced(cls, req: UpdateAdvancedSettingsRequest) -> AdvancedSettingsDTO:
        target = cls._state["advanced"]
        data = req.model_dump(exclude_unset=True)
        for k, v in data.items():
            if v is not None:
                if k == "environment_variables" and isinstance(v, list):
                    target[k] = v
                else:
                    target[k] = v
        return cls.get_advanced()

    @classmethod
    def add_env_var(cls, item: EnvVariableItem) -> EnvVariableItem:
        vars_list = cls._state["advanced"]["environment_variables"]
        # update if existing or append
        for v in vars_list:
            if v["name"] == item.name:
                v["value"] = item.value
                return item
        vars_list.append(item.model_dump())
        return item

    @classmethod
    def delete_env_var(cls, var_name: str) -> Dict[str, Any]:
        vars_list = cls._state["advanced"]["environment_variables"]
        before = len(vars_list)
        cls._state["advanced"]["environment_variables"] = [v for v in vars_list if v["name"] != var_name]
        return {"success": len(cls._state["advanced"]["environment_variables"]) < before, "name": var_name}

    @classmethod
    def reset_advanced(cls) -> AdvancedSettingsDTO:
        cls._state["advanced"] = copy.deepcopy(cls._DEFAULT_STATE["advanced"])
        return cls.get_advanced()

    @classmethod
    def reset_all(cls) -> IaCSettingsSuiteMasterDTO:
        cls._state = copy.deepcopy(cls._DEFAULT_STATE)
        return cls.get_all_settings()
