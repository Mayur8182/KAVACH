import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class OAuthClient(Base, TimestampMixin):
    """
    OAuth 2.1 registered client (e.g. ChatGPT, Claude, Cursor, VS Code, Windsurf, Grok, Codex).
    Supports Pre-Registered connectors, Dynamic Client Registration (RFC 7591), and CIMD.
    """
    __tablename__ = "oauth_clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    client_id: Mapped[str] = mapped_column(
        String(512),
        unique=True,
        index=True,
        nullable=False,
    )
    client_secret_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    client_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="MCP Client",
    )
    client_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="dynamic",  # pre_registered | dynamic | cimd
    )
    metadata_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    client_uri: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    logo_uri: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    redirect_uris: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    grant_types: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["authorization_code", "refresh_token"],
    )
    response_types: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["code"],
    )
    scope: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        default="projects:read scans:read scans:run findings:read remediation:propose offline_access",
    )
    token_endpoint_auth_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="none",
    )
    is_confidential: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )


class OAuthAuthorizationCode(Base, TimestampMixin):
    """
    Single-use authorization code for OAuth 2.1 PKCE Authorization Code Grant.
    Lifetime is strictly 10 minutes. Bound to client_id, redirect_uri, resource, and workspace/project context.
    """
    __tablename__ = "oauth_authorization_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(
        String(512),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    redirect_uri: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    resource: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    scope: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    code_challenge: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    code_challenge_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="S256",
    )
    nonce: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class OAuthToken(Base, TimestampMixin):
    """
    Persisted record of issued OAuth 2.1 access and refresh tokens.
    Supports refresh token rotation with reuse detection (token_family_id), instant revocation,
    resource binding, workspace/project context, and per-client management.
    """
    __tablename__ = "oauth_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    access_token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=True,
    )
    authorization_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    token_family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )
    parent_token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    client_id: Mapped[str] = mapped_column(
        String(512),
        index=True,
        nullable=False,
    )
    client_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    resource: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    scope: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    token_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Bearer",
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    access_token_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    refresh_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )


class OAuthPendingTransaction(Base, TimestampMixin):
    """
    Pending OAuth authorization transaction (Outer MCP transaction).
    Bridges ChatGPT/Claude/IDE outer authorization flow with inner identity provider (GitHub, Google, SIWC)
    and stores workspace/project consent selection.
    """
    __tablename__ = "oauth_pending_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    transaction_token: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(
        String(512),
        index=True,
        nullable=False,
    )
    redirect_uri: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    state: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    code_challenge: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    code_challenge_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="S256",
    )
    resource: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    scope: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    nonce: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    prompt: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Inner Identity Provider details
    inner_provider: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    inner_state: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    inner_nonce: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    inner_code_verifier: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Authenticated user ID and selected tenant context
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    selected_org_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    selected_workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    selected_project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class OAuthSigningKey(Base, TimestampMixin):
    """
    Persisted RSA-2048 signing keypair for OAuth 2.1 access tokens, OIDC id_tokens, and JWKS publishing.
    Persisting in DB ensures keys survive restarts across single and multi-worker deployments.
    """
    __tablename__ = "oauth_signing_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    kid: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    algorithm: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="RS256",
    )
    private_key_pem: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    public_key_pem: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )


class MCPClientContext(Base, TimestampMixin):
    """
    Server-side per-(user, client_id) active workspace & project binding.
    Remembers which project a user selected in ChatGPT vs Claude vs Cursor vs VS Code
    without leaking across clients or tenants.
    """
    __tablename__ = "mcp_client_contexts"
    __table_args__ = (
        UniqueConstraint("user_id", "client_id", name="uq_mcp_client_context_user_client"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(
        String(512),
        index=True,
        nullable=False,
    )
    client_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    active_project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    matched_git_remote: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
