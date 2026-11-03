import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.authorization.errors import (
    AgentNotFoundError,
    AgentRevokedError,
    AgentSuspendedError,
    AuthorizationError,
    CredentialExpiredError,
    CredentialRevokedError,
    NotAuthenticatedError,
    SelfEscalationForbiddenError,
)
from app.authorization.evaluator import (
    AuthorizationResult,
    DeterministicAuthorizationEvaluator,
)
from app.authorization.permissions import get_all_permission_definitions
from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.roles import get_canonical_roles
from app.authorization.scopes import ScopeContext
from app.models.agent import Agent
from app.models.authorization import (
    AgentCredential,
    AgentPermissionOverride,
    AgentRole,
    AuthorizationDecision,
    Permission,
    Role,
    RolePermission,
)
from app.models.mcp import MCPSession


class AuthorizationService:
    """
    Central authorization service managing agent credentials, canonical roles,
    deterministic permission evaluations, and immutable authorization audit records.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        from app.services.audit_service import AuditService
        self.audit = AuditService(db)

    @staticmethod
    def hash_secret(secret_token: str) -> str:
        """Computes SHA-256 digest of secret token."""
        return hashlib.sha256(secret_token.encode("utf-8")).hexdigest()

    async def seed_canonical_roles_and_permissions(self) -> None:
        """
        Idempotently seeds all standard permissions and system roles into database.
        """
        # 1. Seed Permissions
        for pdef in get_all_permission_definitions():
            stmt = select(Permission).where(Permission.name == pdef["name"])
            existing = (await self.db.execute(stmt)).scalar_one_or_none()
            if not existing:
                perm = Permission(
                    name=pdef["name"],
                    description=pdef["description"],
                    resource_type=pdef["resource_type"],
                    action=pdef["action"],
                    risk_level=pdef["risk_level"],
                )
                self.db.add(perm)
        await self.db.flush()

        # 2. Seed Roles and map permissions
        for rdef in get_canonical_roles():
            stmt = select(Role).options(selectinload(Role.permissions)).where(Role.name == rdef["name"])
            existing_role = (await self.db.execute(stmt)).scalar_one_or_none()
            perm_stmt = select(Permission).where(Permission.name.in_(rdef["permissions"]))
            perms = (await self.db.execute(perm_stmt)).scalars().all()

            if not existing_role:
                role = Role(
                    name=rdef["name"],
                    description=rdef["description"],
                    status="ACTIVE",
                    is_system=rdef.get("is_system", True),
                )
                role.permissions = list(perms)
                self.db.add(role)
            else:
                existing_role.permissions = list(perms)
        await self.db.commit()

    async def create_agent_credential(
        self,
        agent_id: uuid.UUID,
        name: str = "Default API Key",
        expires_in_days: Optional[int] = 90,
        metadata: Optional[Dict[str, Any]] = None,
        created_by_user_id: Optional[str] = None,
    ) -> Tuple[AgentCredential, str]:
        """
        Generates a new cryptographically secure API key for an agent.
        The plaintext secret is returned ONLY ONCE upon creation.
        """
        # Verify agent exists and is not revoked
        agent_stmt = select(Agent).where(Agent.id == agent_id)
        agent = (await self.db.execute(agent_stmt)).scalar_one_or_none()
        if not agent:
            raise AgentNotFoundError(f"Agent '{agent_id}' does not exist.")
        if agent.status == "REVOKED":
            raise AgentRevokedError(f"Cannot generate credentials for revoked agent '{agent.name}'.")

        # Key format: agk_<8_hex_prefix>_<32_hex_secret>
        prefix = f"agk_{secrets.token_hex(4)}"
        secret_part = secrets.token_hex(16)
        raw_token = f"{prefix}_{secret_part}"
        secret_hash = self.hash_secret(raw_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=expires_in_days) if expires_in_days else None

        credential = AgentCredential(
            agent_id=agent_id,
            credential_type="API_KEY",
            credential_prefix=prefix,
            secret_hash=secret_hash,
            name=name,
            status="ACTIVE",
            expires_at=expires_at,
            metadata_=metadata or {},
        )
        self.db.add(credential)
        await self.db.flush()

        # Audit event with human actor attribution
        await self.audit.log_event(
            action="AGENT_CREDENTIAL_CREATED",
            resource_type="AGENT_CREDENTIAL",
            actor_type="USER",
            actor_id=created_by_user_id or "system",
            resource_id=str(credential.id),
            project_id=agent.project_id,
            status="SUCCESS",
            metadata={
                "agent_id": str(agent_id),
                "credential_prefix": prefix,
                "expires_at": expires_at.isoformat() if expires_at else None,
            },
        )
        await self.db.commit()
        await self.db.refresh(credential)
        return credential, raw_token

    async def authenticate_credential(self, raw_token: str) -> AuthenticatedPrincipal:
        """
        Validates raw agent credential token, resolves agent identity, and checks status.
        Never trust client assertions without cryptographic proof.
        """
        if not raw_token or not raw_token.startswith("agk_"):
            raise NotAuthenticatedError("Invalid agent credential format.")

        parts = raw_token.split("_")
        if len(parts) < 3:
            raise NotAuthenticatedError("Malformed agent credential token.")

        prefix = f"{parts[0]}_{parts[1]}"
        stmt = select(AgentCredential).where(
            AgentCredential.credential_prefix == prefix,
        )
        credential = (await self.db.execute(stmt)).scalar_one_or_none()
        if not credential:
            raise NotAuthenticatedError("Agent credential not found.")

        # Constant-time hash verification
        computed_hash = self.hash_secret(raw_token)
        if not hmac.compare_digest(computed_hash, credential.secret_hash):
            raise NotAuthenticatedError("Agent credential verification failed.")

        # Check revoked status
        if credential.status == "REVOKED":
            raise CredentialRevokedError("Agent credential has been REVOKED.")
        if credential.status != "ACTIVE":
            raise NotAuthenticatedError(f"Agent credential is not active ({credential.status}).")

        # Expiration check
        now = datetime.now(timezone.utc)
        if credential.expires_at:
            exp = credential.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                credential.status = "EXPIRED"
                await self.db.commit()
                raise CredentialExpiredError("Agent credential has expired.")

        # Agent status verification
        agent_stmt = select(Agent).where(Agent.id == credential.agent_id)
        agent = (await self.db.execute(agent_stmt)).scalar_one_or_none()
        if not agent:
            raise AgentNotFoundError("Associated agent not found.")

        if agent.status == "REVOKED":
            raise AgentRevokedError(f"Agent '{agent.name}' has been REVOKED.")
        if agent.status == "SUSPENDED":
            raise AgentSuspendedError(f"Agent '{agent.name}' is currently SUSPENDED.")

        # Update last used timestamp
        credential.last_used_at = now
        await self.db.commit()

        return AuthenticatedPrincipal(
            principal_id=str(agent.id),
            principal_type="AGENT",
            agent_id=agent.id,
            project_id=agent.project_id,
            credential_id=credential.id,
            authentication_method="AGENT_API_KEY",
            authenticated_at=now,
            trust_level=agent.trust_level,
            metadata={"agent_name": agent.name, "agent_type": agent.agent_type},
        )

    async def rotate_credential(
        self,
        agent_id: uuid.UUID,
        credential_id: uuid.UUID,
        actor_id: str,
    ) -> Tuple[AgentCredential, str]:
        """
        Rotates an existing credential: marks old credential REVOKED and issues new one.
        """
        stmt = select(AgentCredential).where(
            AgentCredential.id == credential_id,
            AgentCredential.agent_id == agent_id,
        )
        old_cred = (await self.db.execute(stmt)).scalar_one_or_none()
        if not old_cred:
            raise AuthorizationError(f"Credential '{credential_id}' not found for agent '{agent_id}'.")

        now = datetime.now(timezone.utc)
        old_cred.status = "REVOKED"
        old_cred.revoked_at = now
        old_cred.revocation_reason = "Rotated"

        # Invalidate existing MCP sessions tied to old credential
        session_update = (
            update(MCPSession)
            .where(MCPSession.credential_id == credential_id)
            .values(status="REVOKED", terminated_at=now)
        )
        await self.db.execute(session_update)

        # Issue new credential
        new_cred, new_token = await self.create_agent_credential(
            agent_id=agent_id,
            name=f"Rotated key ({old_cred.name})",
            created_by_user_id=actor_id,
        )

        await self.audit.log_event(
            action="AGENT_CREDENTIAL_ROTATED",
            resource_type="AGENT_CREDENTIAL",
            actor_type="USER",
            actor_id=actor_id,
            resource_id=str(new_cred.id),
            project_id=old_cred.agent.project_id if old_cred.agent else None,
            status="SUCCESS",
            metadata={
                "old_credential_id": str(credential_id),
                "new_credential_id": str(new_cred.id),
            },
        )
        return new_cred, new_token

    async def revoke_credential(
        self,
        agent_id: uuid.UUID,
        credential_id: uuid.UUID,
        reason: str,
        actor_id: str,
    ) -> None:
        """
        Revokes a credential immediately and terminates all active sessions using it.
        """
        stmt = select(AgentCredential).where(
            AgentCredential.id == credential_id,
            AgentCredential.agent_id == agent_id,
        )
        cred = (await self.db.execute(stmt)).scalar_one_or_none()
        if not cred:
            raise AuthorizationError("Credential not found.")

        now = datetime.now(timezone.utc)
        cred.status = "REVOKED"
        cred.revoked_at = now
        cred.revocation_reason = reason

        # Terminate active sessions
        session_update = (
            update(MCPSession)
            .where(MCPSession.credential_id == credential_id)
            .values(status="REVOKED", terminated_at=now)
        )
        await self.db.execute(session_update)

        await self.audit.log_event(
            action="AGENT_CREDENTIAL_REVOKED",
            resource_type="AGENT_CREDENTIAL",
            actor_type="USER",
            actor_id=actor_id,
            resource_id=str(credential_id),
            project_id=cred.agent.project_id if cred.agent else None,
            status="SUCCESS",
            metadata={"reason": reason},
        )
        await self.db.commit()

    async def assign_role_to_agent(
        self,
        agent_id: uuid.UUID,
        role_id: uuid.UUID,
        scope: Optional[Dict[str, Any]] = None,
        expires_in_days: Optional[int] = None,
        actor_id: str = "system",
        actor_type: str = "USER",
    ) -> AgentRole:
        """
        Assigns a role to an agent with optional scoping and expiration.
        Strictly prevents self-escalation by agents.
        """
        if actor_type == "AGENT":
            raise SelfEscalationForbiddenError("Agents are strictly forbidden from assigning roles.")

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=expires_in_days) if expires_in_days else None

        agent_role = AgentRole(
            agent_id=agent_id,
            role_id=role_id,
            scope=scope or {},
            expires_at=expires_at,
        )
        self.db.add(agent_role)
        await self.db.flush()

        await self.audit.log_event(
            action="AGENT_ROLE_ASSIGNED",
            resource_type="AGENT_ROLE",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(agent_role.id),
            status="SUCCESS",
            metadata={"agent_id": str(agent_id), "role_id": str(role_id), "scope": scope},
        )
        await self.db.commit()
        return agent_role

    async def remove_role_from_agent(
        self,
        agent_id: uuid.UUID,
        role_id: uuid.UUID,
        actor_id: str = "system",
        actor_type: str = "USER",
    ) -> None:
        """Removes a role assignment from an agent."""
        if actor_type == "AGENT":
            raise SelfEscalationForbiddenError("Agents are strictly forbidden from modifying roles.")

        stmt = delete(AgentRole).where(
            AgentRole.agent_id == agent_id,
            AgentRole.role_id == role_id,
        )
        await self.db.execute(stmt)
        await self.audit.log_event(
            action="AGENT_ROLE_REMOVED",
            resource_type="AGENT_ROLE",
            actor_type=actor_type,
            actor_id=actor_id,
            status="SUCCESS",
            metadata={"agent_id": str(agent_id), "role_id": str(role_id)},
        )
        await self.db.commit()

    async def authorize(
        self,
        principal: AuthenticatedPrincipal,
        action: str,
        scope_context: ScopeContext,
        minimum_trust_level: str = "LOW",
    ) -> AuthorizationResult:
        """
        Performs deterministic authorization check and persists an immutable AuthorizationDecision record.
        """
        agent = None
        if principal.is_agent and principal.agent_id:
            # Load agent with all necessary relationships
            stmt = (
                select(Agent)
                .options(
                    selectinload(Agent.agent_roles)
                    .selectinload(AgentRole.role)
                    .selectinload(Role.permissions),
                    selectinload(Agent.permission_overrides)
                    .selectinload(AgentPermissionOverride.permission),
                )
                .where(Agent.id == principal.agent_id)
                .execution_options(populate_existing=True)
            )
            agent = (await self.db.execute(stmt)).scalar_one_or_none()

        # Load active delegations for agent (Step 11)
        delegations = []
        if principal.is_agent and principal.agent_id:
            from app.models.delegation import AgentDelegation
            del_stmt = (
                select(AgentDelegation)
                .options(selectinload(AgentDelegation.delegator))
                .where(
                    AgentDelegation.delegate_agent_id == principal.agent_id,
                    AgentDelegation.status == "ACTIVE",
                )
            )
            delegations = (await self.db.execute(del_stmt)).scalars().all()

        result = DeterministicAuthorizationEvaluator.evaluate(
            principal=principal,
            action=action,
            scope_context=scope_context,
            agent=agent,
            minimum_trust_level=minimum_trust_level,
            delegations=delegations,
        )

        # Persist immutable AuthorizationDecision record
        meta = {
            "trust_level": principal.trust_level,
            "provenance": result.provenance,
            "delegation_id": result.delegation_id,
            "delegating_agent_id": result.delegating_agent_id,
        }
        decision_record = AuthorizationDecision(
            principal_type=principal.principal_type,
            principal_id=principal.principal_id,
            agent_id=principal.agent_id,
            project_id=scope_context.project_id or principal.project_id,
            action=action,
            resource_type=scope_context.resource_type or "PROJECT",
            resource_id=scope_context.resource_id,
            environment=scope_context.environment,
            decision=result.decision,
            reason_code=result.reason_code,
            reason=result.reason,
            permission_snapshot=result.permission_snapshot,
            scope_snapshot=result.scope_snapshot,
            metadata_=meta,
        )
        self.db.add(decision_record)
        await self.db.flush()

        # Audit decision
        audit_status = "SUCCESS" if result.decision == "ALLOW" else "DENIED"
        await self.audit.log_event(
            action=f"AUTHORIZATION_{result.decision}",
            resource_type="AUTHORIZATION_DECISION",
            actor_type=principal.principal_type,
            actor_id=principal.principal_id,
            resource_id=str(decision_record.id),
            project_id=decision_record.project_id,
            status=audit_status,
            metadata={
                "action": action,
                "decision": result.decision,
                "reason_code": result.reason_code,
            },
        )
        await self.db.commit()
        return result
