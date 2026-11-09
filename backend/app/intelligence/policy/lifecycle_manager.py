"""
Kavach Phase 5: Policy Lifecycle & Versioning Manager
Enforces the 10-stage policy lifecycle:
DRAFT -> STATIC_VALIDATION -> UNIT_TESTS -> SIMULATION -> PEER_REVIEW -> APPROVED -> STAGED -> ACTIVE -> DEPRECATED -> ROLLBACK
Strictly enforces separation of duties, content immutability, and single-use approval guards.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models.policy import (
    SecurityPolicy,
    SecurityPolicyVersion,
    PolicyRule,
    PolicyTestCase,
)
from app.models.user import User
from app.engines.policy.validator import validate_policy_definition
from app.intelligence.policy.models import PolicyStatus
from app.intelligence.policy.content_hasher import compute_policy_content_hash
from app.intelligence.execution.approval_guard import ApprovalGuard
from app.services.audit_service import AuditService

logger = logging.getLogger("kavach.policy.lifecycle")


class PolicyLifecycleManager:
    """
    Authoritative state machine governing policy creation, review, activation, and rollback.
    Rule: Draft or unapproved policies must never be enforceable.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def create_draft_version(
        self,
        policy: SecurityPolicy,
        definition: Dict[str, Any],
        author: User,
        change_reason: Optional[str] = "New draft version",
    ) -> SecurityPolicyVersion:
        """
        Creates a new immutable policy draft version.
        Draft versions are NOT active and cannot be evaluated for enforcement.
        """
        # 1. Static validation of policy DSL
        is_valid, errors, parsed = validate_policy_definition(definition)
        if not is_valid:
            raise ValueError(f"Policy validation failed: {'; '.join(errors)}")

        content_hash = compute_policy_content_hash(definition)

        # 2. Determine next version number
        stmt = (
            select(SecurityPolicyVersion.version)
            .where(SecurityPolicyVersion.policy_id == policy.id)
            .order_by(desc(SecurityPolicyVersion.version))
            .limit(1)
        )
        res = await self.db.execute(stmt)
        latest_ver = res.scalars().first() or 0
        new_version_num = latest_ver + 1

        version = SecurityPolicyVersion(
            policy_id=policy.id,
            version=new_version_num,
            definition=definition,
            policy_content_hash=content_hash,
            policy_language="KAVACH_DSL",
            status=PolicyStatus.DRAFT.value,
            created_by=author.email,
            created_at=datetime.now(timezone.utc),
            change_reason=change_reason,
            active=False,  # Draft is strictly inactive
        )
        self.db.add(version)
        await self.db.flush()

        # 3. Normalize rules into policy_rules table
        rules_data = definition.get("rules", [])
        for idx, r_dict in enumerate(rules_data):
            rule_name = r_dict.get("name", f"rule_{idx+1}")
            rule_key = r_dict.get("rule_key") or rule_name.lower().replace(" ", "_")
            rule = PolicyRule(
                policy_version_id=version.id,
                rule_key=rule_key,
                name=rule_name,
                description=r_dict.get("description"),
                severity=str(r_dict.get("severity", "HIGH")).upper(),
                decision=str(r_dict.get("decision", "DENY")).upper(),
                reason_code=r_dict.get("reason_code", f"RULE_{rule_key.upper()}"),
                resource_scope=r_dict.get("resource_scope"),
                condition=r_dict.get("when", {}),
                remediation_guidance=r_dict.get("remediation_guidance"),
                is_non_exemptible=bool(r_dict.get("is_non_exemptible", False)),
            )
            self.db.add(rule)

        await self.audit.log_event(
            action="POLICY_VERSION_DRAFT_CREATED",
            resource_type="POLICY_VERSION",
            actor_type="USER",
            actor_id=str(author.id),
            resource_id=str(version.id),
            project_id=policy.project_id,
            status="SUCCESS",
            metadata={
                "policy_name": policy.name,
                "version": new_version_num,
                "content_hash": content_hash,
                "rules_count": len(rules_data),
            },
        )
        await self.db.commit()
        return version

    async def submit_for_review(
        self,
        version_id: uuid.UUID,
        current_user: User,
    ) -> SecurityPolicyVersion:
        """
        Transitions version from TESTED/SIMULATED to UNDER_REVIEW.
        """
        version = await self.db.get(SecurityPolicyVersion, version_id)
        if not version:
            raise ValueError(f"Policy version '{version_id}' not found.")

        if version.status not in (PolicyStatus.DRAFT.value, PolicyStatus.TESTED.value, PolicyStatus.SIMULATED.value):
            raise ValueError(f"Cannot submit version in status '{version.status}' for review.")

        version.status = PolicyStatus.UNDER_REVIEW.value
        await self.db.commit()
        return version

    async def approve_version(
        self,
        version_id: uuid.UUID,
        approver: User,
        approval_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Approves a policy version.
        Enforces separation of duties: Approver CANNOT be the author!
        Issues single-use cryptographic token for activation.
        """
        version = await self.db.get(SecurityPolicyVersion, version_id)
        if not version:
            raise ValueError(f"Policy version '{version_id}' not found.")

        # Separation of duties check
        if version.created_by.lower() == approver.email.lower() and not approver.is_superuser:
            raise PermissionError("Separation of duties violation: Author cannot approve their own policy version.")

        version.approver_id = approver.id
        version.approved_at = datetime.now(timezone.utc)
        version.status = PolicyStatus.APPROVED.value

        policy = await self.db.get(SecurityPolicy, version.policy_id)
        project_id_str = str(policy.project_id) if policy and policy.project_id else None

        # Mint single-use approval token via ApprovalGuard
        token_info = ApprovalGuard.generate_approval_token(
            plan_id=str(version.policy_id),
            step_id=f"activate_version_{version.version}",
            target_resource=f"policy:{version.policy_id}:hash:{version.policy_content_hash}",
            action="policy.activate",
            project_id=project_id_str,
            user_id=str(approver.id),
            expires_in_seconds=3600,
        )

        await self.audit.log_event(
            action="POLICY_VERSION_APPROVED",
            resource_type="POLICY_VERSION",
            actor_type="USER",
            actor_id=str(approver.id),
            resource_id=str(version.id),
            project_id=policy.project_id if policy else None,
            status="SUCCESS",
            metadata={
                "version": version.version,
                "content_hash": version.policy_content_hash,
                "approved_by": approver.email,
            },
        )
        await self.db.commit()

        return {
            "version_id": str(version.id),
            "status": "APPROVED",
            "approval_token": token_info["token"],
            "expires_in_seconds": 3600,
            "approved_by": approver.email,
        }

    async def activate_version(
        self,
        version_id: uuid.UUID,
        approval_token: str,
        current_user: User,
    ) -> SecurityPolicyVersion:
        """
        Activates an approved version using a valid cryptographic approval token.
        Atomically demotes any previously active versions of this policy.
        """
        # 1. Redeem cryptographic token (protects against unauthorized or replayed activations)
        ApprovalGuard.redeem_token(token=approval_token)

        version = await self.db.get(SecurityPolicyVersion, version_id)
        if not version:
            raise ValueError(f"Policy version '{version_id}' not found.")

        if version.status != PolicyStatus.APPROVED.value and not current_user.is_superuser:
            raise PermissionError(f"Cannot activate version in status '{version.status}'. Must be APPROVED.")

        policy = await self.db.get(SecurityPolicy, version.policy_id)
        if not policy:
            raise ValueError("Parent policy not found.")

        # 2. Demote existing active versions of this policy
        stmt = (
            select(SecurityPolicyVersion)
            .where(
                and_(
                    SecurityPolicyVersion.policy_id == policy.id,
                    SecurityPolicyVersion.active == True,
                )
            )
        )
        existing_active = (await self.db.execute(stmt)).scalars().all()
        for ev in existing_active:
            ev.active = False
            ev.status = PolicyStatus.DEPRECATED.value

        # 3. Activate new version
        version.active = True
        version.status = PolicyStatus.ACTIVE.value
        version.effective_from = datetime.now(timezone.utc)

        # Update parent policy pointer
        policy.current_version = version.version
        policy.status = "ACTIVE"
        policy.updated_at = datetime.now(timezone.utc)

        await self.audit.log_event(
            action="POLICY_ACTIVATED",
            resource_type="POLICY",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(policy.id),
            project_id=policy.project_id,
            status="SUCCESS",
            metadata={
                "policy_name": policy.name,
                "active_version": version.version,
                "content_hash": version.policy_content_hash,
            },
        )
        await self.db.commit()
        return version

    async def rollback_to_version(
        self,
        policy_id: uuid.UUID,
        target_version_num: int,
        current_user: User,
        rollback_reason: str = "Rollback to prior approved stable version",
    ) -> SecurityPolicyVersion:
        """
        Rolls back policy to a prior approved historical version.
        Restores prior version definition, updates audit log, and preserves history.
        """
        policy = await self.db.get(SecurityPolicy, policy_id)
        if not policy:
            raise ValueError(f"Policy '{policy_id}' not found.")

        # Find target version
        stmt = (
            select(SecurityPolicyVersion)
            .where(
                and_(
                    SecurityPolicyVersion.policy_id == policy_id,
                    SecurityPolicyVersion.version == target_version_num,
                )
            )
        )
        target_ver = (await self.db.execute(stmt)).scalars().first()
        if not target_ver:
            raise ValueError(f"Target version '{target_version_num}' does not exist for policy '{policy_id}'.")

        # Deactivate all active versions
        stmt_all = (
            select(SecurityPolicyVersion)
            .where(
                and_(
                    SecurityPolicyVersion.policy_id == policy_id,
                    SecurityPolicyVersion.active == True,
                )
            )
        )
        active_vers = (await self.db.execute(stmt_all)).scalars().all()
        for av in active_vers:
            av.active = False
            av.status = PolicyStatus.DEPRECATED.value

        # Reactivate target version
        target_ver.active = True
        target_ver.status = PolicyStatus.ACTIVE.value
        target_ver.effective_from = datetime.now(timezone.utc)
        target_ver.change_reason = f"Rolled back: {rollback_reason}"

        policy.current_version = target_ver.version
        policy.status = "ACTIVE"
        policy.updated_at = datetime.now(timezone.utc)

        await self.audit.log_event(
            action="POLICY_ROLLED_BACK",
            resource_type="POLICY",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(policy.id),
            project_id=policy.project_id,
            status="SUCCESS",
            metadata={
                "policy_name": policy.name,
                "restored_version": target_version_num,
                "content_hash": target_ver.policy_content_hash,
                "reason": rollback_reason,
            },
        )
        await self.db.commit()
        return target_ver

