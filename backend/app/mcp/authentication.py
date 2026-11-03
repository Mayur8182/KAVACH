import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.service import AuthorizationService
from app.core.config import get_settings
from app.models.agent import Agent
from app.models.authorization import AgentCredential
from app.models.mcp import MCPSession
from app.mcp.errors import MCPAuthenticationError, MCPSessionExpiredError
from app.mcp.identity import AgentIdentityResolver
from app.mcp.schemas import AgentIdentity, MCPContext

settings = get_settings()


class MCPAuthenticator:
    """
    Manages MCP Session authentication and verification with real Agent Identity and Credentials.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.identity_resolver = AgentIdentityResolver(db)
        self.authz_service = AuthorizationService(db)

    async def create_session(
        self,
        agent_id: uuid.UUID,
        project_id: uuid.UUID,
        authenticated_principal: str,
        credential_id: Optional[uuid.UUID] = None,
        transport: str = "stdio",
        client_name: str = "unknown-client",
        client_version: str = "1.0.0",
    ) -> MCPSession:
        """
        Validates identity and creates a new persistent session in PostgreSQL.
        """
        # 1. Verify agent and project exist and match
        identity = await self.identity_resolver.resolve_identity(
            agent_id=agent_id,
            project_id=project_id,
            authenticated_principal=authenticated_principal,
        )

        # 2. If credential provided, verify active
        if credential_id:
            cred_stmt = select(AgentCredential).where(
                AgentCredential.id == credential_id,
                AgentCredential.agent_id == agent_id,
            )
            cred = (await self.db.execute(cred_stmt)).scalar_one_or_none()
            if not cred or cred.status != "ACTIVE":
                raise MCPAuthenticationError("Provided agent credential is not active.")

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=settings.mcp_session_ttl_seconds)

        session = MCPSession(
            agent_id=identity.agent_id,
            project_id=identity.project_id,
            authenticated_principal=authenticated_principal,
            credential_id=credential_id,
            principal_id=str(agent_id),
            transport=transport,
            client_name=client_name,
            client_version=client_version,
            status="ACTIVE",
            last_activity_at=now,
            expires_at=expires_at,
            metadata_={},
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def authenticate_session(
        self,
        session_id: uuid.UUID,
    ) -> MCPContext:
        """
        Validates an active session, performs live revalidation against agent and credential revocation,
        and returns a fully hydrated MCPContext with AuthenticatedPrincipal.
        """
        stmt = select(MCPSession).where(MCPSession.id == session_id)
        res = await self.db.execute(stmt)
        session = res.scalar_one_or_none()

        if not session:
            raise MCPAuthenticationError(f"MCP Session '{session_id}' not found.")

        if session.status != "ACTIVE":
            if session.status == "REVOKED":
                raise MCPAuthenticationError(f"MCP Session '{session_id}' has been REVOKED.")
            raise MCPSessionExpiredError(str(session_id))

        now = datetime.now(timezone.utc)
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            session.status = "EXPIRED"
            await self.db.commit()
            raise MCPSessionExpiredError(str(session_id))

        # Revalidate Agent status (Section 54, 59)
        agent_stmt = select(Agent).where(Agent.id == session.agent_id)
        agent = (await self.db.execute(agent_stmt)).scalar_one_or_none()
        if not agent:
            raise MCPAuthenticationError(f"Bound agent '{session.agent_id}' no longer exists.")

        if agent.status == "REVOKED":
            session.status = "REVOKED"
            await self.db.commit()
            raise MCPAuthenticationError(f"Agent '{agent.name}' is REVOKED. Session terminated.")
        elif agent.status == "SUSPENDED":
            raise MCPAuthenticationError(f"Agent '{agent.name}' is SUSPENDED.")

        # Revalidate Credential status if bound (Section 54, 60)
        if session.credential_id:
            cred_stmt = select(AgentCredential).where(AgentCredential.id == session.credential_id)
            cred = (await self.db.execute(cred_stmt)).scalar_one_or_none()
            if not cred or cred.status != "ACTIVE":
                session.status = "REVOKED"
                await self.db.commit()
                raise MCPAuthenticationError("Agent credential has been revoked or expired.")

        # Update last activity
        session.last_activity_at = now
        await self.db.commit()

        # Resolve identity
        identity = await self.identity_resolver.resolve_identity(
            agent_id=session.agent_id,
            project_id=session.project_id,
            authenticated_principal=session.authenticated_principal,
        )

        principal = AuthenticatedPrincipal(
            principal_id=str(session.agent_id),
            principal_type="AGENT",
            agent_id=session.agent_id,
            project_id=session.project_id,
            credential_id=session.credential_id,
            authentication_method="AGENT_API_KEY" if session.credential_id else "SESSION_TOKEN",
            authenticated_at=now,
            session_id=session.id,
            trust_level=agent.trust_level,
            metadata={"agent_name": agent.name, "agent_type": agent.agent_type},
        )

        return MCPContext(
            session_id=session.id,
            identity=identity,
            request_id=f"mcp-req-{uuid.uuid4().hex[:12]}",
            client_name=session.client_name,
            client_version=session.client_version,
            transport=session.transport,
            started_at=now,
            principal=principal,
            metadata={},
        )
