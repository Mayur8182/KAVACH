import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import Agent
from app.models.authorization import AgentRole, Role
from app.models.project import Project
from app.mcp.errors import MCPAuthenticationError
from app.mcp.schemas import AgentIdentity


class AgentIdentityResolver:
    """
    Resolves and cryptographically/relationally verifies an Agent's identity
    against real Project records and Role assignments in the PostgreSQL database.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def resolve_identity(
        self,
        agent_id: uuid.UUID,
        project_id: uuid.UUID,
        authenticated_principal: str,
    ) -> AgentIdentity:
        """
        Validates that agent_id exists, is active, is bound to the requested project_id,
        and resolves effective permissions from assigned roles.
        """
        stmt = (
            select(Agent)
            .options(
                selectinload(Agent.agent_roles).selectinload(AgentRole.role).selectinload(Role.permissions)
            )
            .where(
                Agent.id == agent_id,
                Agent.project_id == project_id,
            )
        )
        res = await self.db.execute(stmt)
        agent = res.scalar_one_or_none()

        if not agent:
            raise MCPAuthenticationError(
                f"Agent '{agent_id}' does not exist or is not associated with project '{project_id}'."
            )

        if agent.status.lower() != "active":
            raise MCPAuthenticationError(
                f"Agent '{agent_id}' is inactive (status: {agent.status})."
            )

        permissions = set()
        # Collect permissions from persistent roles if assigned
        if agent.agent_roles:
            for ar in agent.agent_roles:
                if ar.role and ar.role.permissions:
                    for p in ar.role.permissions:
                        permissions.add(p.action)
                        permissions.add(p.name)

        # Step 11: Collect delegated permissions from active delegations
        from datetime import datetime, timezone
        from app.models.delegation import AgentDelegation
        now = datetime.now(timezone.utc)
        del_stmt = (
            select(AgentDelegation)
            .where(
                AgentDelegation.delegate_agent_id == agent.id,
                AgentDelegation.status == "ACTIVE",
                AgentDelegation.expires_at > now,
            )
        )
        delegations = (await self.db.execute(del_stmt)).scalars().all()
        for dl in delegations:
            auth_snap = dl.authority_snapshot or {}
            for act in auth_snap.get("actions", []):
                permissions.add(act)


        # Baseline permissions for active agents
        if not permissions:
            permissions.update([
                "PROJECT_READ",
                "PROJECT_METADATA_READ",
                "BLUEPRINT_READ",
                "REQUIREMENT_READ",
                "SCAN_READ",
                "SCAN_EXECUTE",
                "FINDING_READ",
                "POLICY_READ",
                "POLICY_EVALUATE",
                "GITHUB_READ",
                "GITHUB_SCAN",
                "MCP_TOOL_DISCOVER",
                "MCP_TOOL_EXECUTE",
            ])

        return AgentIdentity(
            agent_id=agent.id,
            project_id=agent.project_id,
            agent_name=agent.name,
            agent_type=agent.agent_type,
            trust_level=agent.trust_level,
            authenticated_principal=authenticated_principal,
            permissions=sorted(list(permissions)),
        )
